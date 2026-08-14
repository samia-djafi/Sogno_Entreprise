import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export interface DayCount {
  day: string
  value: number
}

export interface DeptCount {
  dept: string
  value: number
}

export interface AnalyticsData {
  loading: boolean
  error: string | null
  questionsToday: number
  questionsThisWeek: number
  questionsThisMonth: number
  questionsOverTime: DayCount[]
  questionsByDepartment: DeptCount[]
}

const RANGE_DAYS: Record<string, number> = {
  '7 days': 7,
  '30 days': 30,
  '90 days': 90,
}

const EMPTY_STATE: AnalyticsData = {
  loading: true,
  error: null,
  questionsToday: 0,
  questionsThisWeek: 0,
  questionsThisMonth: 0,
  questionsOverTime: [],
  questionsByDepartment: [],
}

/**
 * Pulls real question-volume analytics from Supabase.
 *
 * Notes on scope:
 * - "Top topics", "AI performance" (grounded rate, satisfaction), and
 *   "unanswered questions" have NO backing columns/tables yet (no topic
 *   classification, no rating, no answered/status flag). Those stay empty
 *   until that data is captured. This hook only computes what's actually
 *   derivable from `messages` + `conversations` + `profiles`.
 */
export function useAnalyticsData(range: string): AnalyticsData {
  const [data, setData] = useState<AnalyticsData>(EMPTY_STATE)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setData((d) => ({ ...d, loading: true, error: null }))

      const days = RANGE_DAYS[range] ?? 7
      const since = new Date()
      since.setDate(since.getDate() - days)

      // Questions (user messages) within the selected range, for the chart
      const { data: rangeMessages, error: rangeError } = await supabase
        .from('messages')
        .select('id, created_at, conversation_id')
        .eq('role', 'user')
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: true })

      if (rangeError) {
        if (!cancelled) setData((d) => ({ ...d, loading: false, error: rangeError.message }))
        return
      }

      const msgs = rangeMessages ?? []

      // Last 30 days of user messages, for the today/week/month stat cards
      const monthAgo = new Date()
      monthAgo.setDate(monthAgo.getDate() - 30)

      const { data: monthMessages, error: monthError } = await supabase
        .from('messages')
        .select('id, created_at')
        .eq('role', 'user')
        .gte('created_at', monthAgo.toISOString())

      if (monthError) {
        if (!cancelled) setData((d) => ({ ...d, loading: false, error: monthError.message }))
        return
      }

      const monthMsgs = monthMessages ?? []

      const now = new Date()
      const startOfToday = new Date(now)
      startOfToday.setHours(0, 0, 0, 0)
      const startOfWeek = new Date(now)
      startOfWeek.setDate(startOfWeek.getDate() - 7)

      const questionsToday = monthMsgs.filter((m) => new Date(m.created_at) >= startOfToday).length
      const questionsThisWeek = monthMsgs.filter((m) => new Date(m.created_at) >= startOfWeek).length
      const questionsThisMonth = monthMsgs.length

      // Bucket the range messages by day for the line chart
      const dayBuckets = new Map<string, { label: string; value: number }>()
      for (const m of msgs) {
        const d = new Date(m.created_at)
        const sortKey = d.toISOString().slice(0, 10)
        const label = d.toLocaleDateString('en-US', { weekday: 'short' })
        const existing = dayBuckets.get(sortKey)
        dayBuckets.set(sortKey, { label, value: (existing?.value ?? 0) + 1 })
      }
      const questionsOverTime: DayCount[] = Array.from(dayBuckets.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, v]) => ({ day: v.label, value: v.value }))

      // Questions by department: messages -> conversations -> profiles.department
      let questionsByDepartment: DeptCount[] = []
      const conversationIds = Array.from(new Set(msgs.map((m) => m.conversation_id)))

      if (conversationIds.length > 0) {
        const { data: convs, error: convError } = await supabase
          .from('conversations')
          .select('id, user_id')
          .in('id', conversationIds)

        if (convError) {
          if (!cancelled) setData((d) => ({ ...d, loading: false, error: convError.message }))
          return
        }

        const convList = convs ?? []
        const userIds = Array.from(new Set(convList.map((c) => c.user_id)))

        const { data: profiles, error: profError } = await supabase
          .from('profiles')
          .select('id, department')
          .in('id', userIds)

        if (profError) {
          if (!cancelled) setData((d) => ({ ...d, loading: false, error: profError.message }))
          return
        }

        const deptByUser = new Map((profiles ?? []).map((p) => [p.id, p.department]))
        const deptByConversation = new Map(
          convList.map((c) => [c.id, deptByUser.get(c.user_id) ?? 'Unknown'])
        )

        const deptCounts = new Map<string, number>()
        for (const m of msgs) {
          const dept = deptByConversation.get(m.conversation_id) ?? 'Unknown'
          deptCounts.set(dept, (deptCounts.get(dept) ?? 0) + 1)
        }
        questionsByDepartment = Array.from(deptCounts.entries())
          .map(([dept, value]) => ({ dept, value }))
          .sort((a, b) => b.value - a.value)
      }

      if (!cancelled) {
        setData({
          loading: false,
          error: null,
          questionsToday,
          questionsThisWeek,
          questionsThisMonth,
          questionsOverTime,
          questionsByDepartment,
        })
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [range])

  return data
}