import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import AppLayout from '../components/AppLayout'
import DemoNotice from '../components/DemoNotice'
import LineChartSimple from '../components/charts/LineChartSimple'
import DonutChart from '../components/charts/DonutChart'
import BarChartHorizontal from '../components/charts/BarChartHorizontal'
import { useTheme } from '../context/ThemeContext'
import { useAnalyticsData } from '../hooks/useAnalyticsData'
import { supabase } from '../lib/supabaseClient'

const ranges = ['7 days', '30 days', '90 days']

/*
 * ============================================================
 * FEEDBACK / GROUNDING / RESPONSE TIME / TOPIC STATS
 * ============================================================
 *
 * Matches the real `messages` schema:
 *   id uuid, conversation_id uuid not null, role text not null,
 *   content text not null, created_at timestamptz not null,
 *   sources jsonb null, feedback text null
 *     (DB-level CHECK: feedback in ('helpful','not_helpful') or null
 *      -- see messages_feedback_check constraint)
 *
 * Avg response time is derived by pairing each assistant message
 * with the user message immediately before it in the same
 * conversation and diffing created_at timestamps.
 *
 * Top topics is a keyword heuristic over message content — see
 * TOPIC_RULES below. Swap this for a real classifier (edge
 * function / LLM call / stored `topic` column) when available;
 * the shape of `topTopics` downstream doesn't need to change.
 */

interface FeedbackMessageRow {
  id: string
  conversation_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
  // DB has a CHECK constraint limiting this to 'helpful' | 'not_helpful' | null,
  // but we still normalize defensively below in case older rows predate it.
  feedback: string | null
  sources:
    | { document: string; page: number; section?: string }[]
    | null
}

function normalizeFeedback(value: string | null): 'helpful' | 'not_helpful' | null {
  if (!value) return null
  const v = value.trim().toLowerCase()
  if (v === 'helpful') return 'helpful'
  if (v === 'not_helpful') return 'not_helpful'
  return null
}

function rangeToDays(range: string) {
  const match = range.match(/\d+/)
  return match ? Number(match[0]) : 7
}

function formatDuration(ms: number) {
  if (ms < 1000) return `${Math.round(ms)}ms`
  const seconds = ms / 1000
  if (seconds < 60) return `${seconds.toFixed(1)}s`
  const minutes = Math.floor(seconds / 60)
  const remSeconds = Math.round(seconds % 60)
  return `${minutes}m ${remSeconds}s`
}

// --- Topic heuristic -------------------------------------------------
// Each rule is checked against lowercased message content. First
// matching rule wins. Order matters: put more specific rules first.
// This is a placeholder until real topic classification exists
// (e.g. an edge function that calls an LLM, or a stored `topic` column).
const TOPIC_RULES: { label: string; color: string; keywords: string[] }[] = [
  { label: 'IT & Access', color: '#3b6ea5', keywords: ['password', 'login', 'vpn', 'wifi', 'access', 'account locked', 'reset', 'software', 'laptop', 'install'] },
  { label: 'HR & Policies', color: '#a5763b', keywords: ['leave', 'vacation', 'pto', 'benefits', 'payroll', 'salary', 'onboarding', 'policy', 'hr', 'sick day'] },
  { label: 'Finance', color: '#3ba55c', keywords: ['invoice', 'expense', 'budget', 'reimbursement', 'purchase order', 'billing', 'finance'] },
  { label: 'Sales & CRM', color: '#a53b6e', keywords: ['lead', 'deal', 'crm', 'pipeline', 'quote', 'customer', 'client', 'contract'] },
  { label: 'Product & Docs', color: '#6e3ba5', keywords: ['how do i', 'documentation', 'feature', 'spec', 'roadmap', 'release notes'] },
]

function classifyTopic(content: string): string {
  const lower = content.toLowerCase()
  for (const rule of TOPIC_RULES) {
    if (rule.keywords.some((kw) => lower.includes(kw))) return rule.label
  }
  return 'Other'
}
// -----------------------------------------------------------------------

export default function AnalyticsPage() {
  const navigate = useNavigate()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [range, setRange] = useState('7 days')

  const { loading, error, questionsToday, questionsThisWeek, questionsThisMonth, questionsOverTime, questionsByDepartment } =
    useAnalyticsData(range)

  /*
   * ==========================================================
   * LOAD FEEDBACK / RESPONSE TIME / TOPIC STATS FOR THE RANGE
   * ==========================================================
   */

  const [feedbackLoading, setFeedbackLoading] = useState(true)
  const [feedbackError, setFeedbackError] = useState<string | null>(null)
  const [helpfulCount, setHelpfulCount] = useState(0)
  const [notHelpfulCount, setNotHelpfulCount] = useState(0)
  const [groundedCount, setGroundedCount] = useState(0)
  const [assistantMessageCount, setAssistantMessageCount] = useState(0)
  const [openGaps, setOpenGaps] = useState(0)
  const [avgResponseMs, setAvgResponseMs] = useState<number | null>(null)
  const [topTopics, setTopTopics] = useState<{ label: string; value: number; color: string }[]>([])

  useEffect(() => {
    const loadFeedbackStats = async () => {
      setFeedbackLoading(true)
      setFeedbackError(null)

      const since = new Date(
        Date.now() - rangeToDays(range) * 86400000,
      ).toISOString()

      // Pull both roles: assistant rows give us feedback/grounding,
      // user rows give us topic content, and having both lets us
      // pair turns within a conversation for response time.
      const { data, error: feedbackFetchError } = await supabase
        .from('messages')
        .select('id, conversation_id, role, content, created_at, feedback, sources')
        .gte('created_at', since)
        .order('conversation_id', { ascending: true })
        .order('created_at', { ascending: true })

      if (feedbackFetchError) {
        console.error(
          'Failed to load feedback stats:',
          feedbackFetchError,
        )

        setFeedbackError('Unable to load feedback stats.')
        setFeedbackLoading(false)

        return
      }

      const rows = (data ?? []) as FeedbackMessageRow[]
      const assistantRows = rows.filter((r) => r.role === 'assistant')

      let helpful = 0
      let notHelpful = 0
      let grounded = 0
      let gaps = 0

      for (const row of assistantRows) {
        const fb = normalizeFeedback(row.feedback)
        if (fb === 'helpful') helpful += 1
        if (fb === 'not_helpful') notHelpful += 1

        const hasSources =
          Array.isArray(row.sources) && row.sources.length > 0

        if (hasSources) grounded += 1

        // An "open gap" is an answer that either couldn't cite a
        // source, or that a person explicitly marked not helpful.
        if (fb === 'not_helpful' || !hasSources) {
          gaps += 1
        }
      }

      // --- Avg response time ---------------------------------------
      // Group by conversation (rows already sorted conversation_id,
      // then created_at asc by the query above), then for each
      // assistant message find the nearest preceding user message
      // in the same conversation and diff timestamps.
      const byConversation = new Map<string, FeedbackMessageRow[]>()
      for (const row of rows) {
        if (!byConversation.has(row.conversation_id)) {
          byConversation.set(row.conversation_id, [])
        }
        byConversation.get(row.conversation_id)!.push(row)
      }

      const responseTimes: number[] = []
      for (const convoRows of byConversation.values()) {
        let lastUserAt: number | null = null
        for (const row of convoRows) {
          if (row.role === 'user') {
            lastUserAt = new Date(row.created_at).getTime()
          } else if (row.role === 'assistant' && lastUserAt !== null) {
            const diff = new Date(row.created_at).getTime() - lastUserAt
            // discard negative/absurd gaps (bad data, long idle time)
            if (diff > 0 && diff < 5 * 60 * 1000) {
              responseTimes.push(diff)
            }
            lastUserAt = null
          }
        }
      }

      const avgMs =
        responseTimes.length > 0
          ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
          : null

      // --- Top topics -------------------------------------------------
      const topicCounts = new Map<string, number>()
      const userRows = rows.filter((r) => r.role === 'user')
      for (const row of userRows) {
        const label = classifyTopic(row.content)
        topicCounts.set(label, (topicCounts.get(label) ?? 0) + 1)
      }

      const totalClassified = userRows.length
      const topicColors = new Map(TOPIC_RULES.map((r) => [r.label, r.color]))
      topicColors.set('Other', '#9a9488')

      const topicsSorted = Array.from(topicCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([label, count]) => ({
          label,
          value: totalClassified > 0 ? Math.round((count / totalClassified) * 100) : 0,
          color: topicColors.get(label) ?? '#9a9488',
        }))

      setHelpfulCount(helpful)
      setNotHelpfulCount(notHelpful)
      setGroundedCount(grounded)
      setAssistantMessageCount(assistantRows.length)
      setOpenGaps(gaps)
      setAvgResponseMs(avgMs)
      setTopTopics(topicsSorted)
      setFeedbackLoading(false)
    }

    void loadFeedbackStats()
  }, [range])

  const totalRated = helpfulCount + notHelpfulCount

  const satisfactionPct =
    totalRated > 0
      ? Math.round((helpfulCount / totalRated) * 100)
      : null

  const groundedPct =
    assistantMessageCount > 0
      ? Math.round((groundedCount / assistantMessageCount) * 100)
      : null

  const aiPerformance =
    assistantMessageCount === 0
      ? []
      : [
          {
            label: 'Answers grounded in documents',
            value: groundedPct ?? 0,
            display: `${groundedPct}%`,
            desc: `${groundedCount} of ${assistantMessageCount} answers cited at least one source`,
          },
          {
            label: 'User satisfaction',
            value: satisfactionPct ?? 0,
            display:
              totalRated > 0 ? `${satisfactionPct}%` : 'No ratings yet',
            desc:
              totalRated > 0
                ? `${helpfulCount} of ${totalRated} rated answers marked helpful`
                : 'Waiting on the first thumbs up / down',
          },
        ]

  const cardBg = isDark ? 'bg-[#10151c] border-[#1c2430]' : 'bg-white border-[#e8e1d3]'
  const muted = isDark ? 'text-[#8a92a0]' : 'text-[#6b6455]'

  const topStats = [
    { label: 'Questions today', value: loading ? '—' : String(questionsToday) },
    { label: 'Questions this week', value: loading ? '—' : String(questionsThisWeek) },
    { label: 'Questions this month', value: loading ? '—' : String(questionsThisMonth) },
    {
      label: 'Avg. response time',
      value: feedbackLoading ? '—' : avgResponseMs !== null ? formatDuration(avgResponseMs) : '—',
    },
    {
      label: 'User satisfaction',
      value:
        feedbackLoading
          ? '—'
          : satisfactionPct !== null
            ? `${satisfactionPct}%`
            : '—',
    },
  ]

  return (
    <AppLayout>
      <div className="mx-auto max-w-6xl px-8 py-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-[22px] font-semibold">Analytics</h1>
            <p className={`mt-1 text-[13.5px] ${muted}`}>How the company uses Sogno Enterprise, and how reliably the assistant answers.</p>
          </div>
          <button
            onClick={() => navigate('/analytics/unanswered')}
            className={`flex items-center gap-1.5 rounded-md border px-3.5 py-2 text-[13px] font-medium ${
              isDark ? 'border-[#2a3340] text-[#e3e5e8] hover:bg-[#141a22]' : 'border-[#d8cfba] text-[#1c2127] hover:bg-[#efe6d8]'
            }`}
          >
            {feedbackLoading ? '—' : openGaps} open knowledge gaps
            <ChevronRight size={15} />
          </button>
        </div>

        {(error || feedbackError) && (
          <div className={`mt-4 rounded-md border px-4 py-3 text-[13px] ${isDark ? 'border-[#3a2416] bg-[#1c1410] text-[#e3a857]' : 'border-[#f0d9a8] bg-[#fbf3e0] text-[#8a5a10]'}`}>
            Couldn't load analytics: {error || feedbackError}
          </div>
        )}

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
          {topStats.map((s) => (
            <div key={s.label} className={`rounded-xl border p-4 ${cardBg}`}>
              <div className={`text-[10.5px] font-semibold tracking-wide ${muted}`}>{s.label.toUpperCase()}</div>
              <div className="mt-2 text-[19px] font-semibold">{s.value}</div>
            </div>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
          <div className={`rounded-xl border p-5 ${cardBg}`}>
            <div className="flex items-center justify-between">
              <h2 className="text-[14.5px] font-semibold">Questions over time</h2>
              <div className={`flex rounded-md border p-0.5 ${isDark ? 'border-[#1c2430]' : 'border-[#e8e1d3]'}`}>
                {ranges.map((r) => (
                  <button
                    key={r}
                    onClick={() => setRange(r)}
                    className={`rounded px-2.5 py-1 text-[12px] font-medium ${
                      range === r
                        ? isDark
                          ? 'bg-[#1a2028] text-white'
                          : 'bg-[#f0ece1] text-[#1c2127]'
                        : muted
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-4">
              {loading ? (
                <div className={`flex h-48 items-center justify-center text-[13px] ${muted}`}>Loading…</div>
              ) : questionsOverTime.length === 0 ? (
                <div className={`flex h-48 items-center justify-center text-[13px] ${muted}`}>No questions in this range yet.</div>
              ) : (
                <LineChartSimple data={questionsOverTime} />
              )}
            </div>
          </div>

          <div className={`rounded-xl border p-5 ${cardBg}`}>
            <h2 className="text-[14.5px] font-semibold">Top topics</h2>
            {feedbackLoading ? (
              <div className={`mt-4 flex h-40 items-center justify-center text-[13px] ${muted}`}>Loading…</div>
            ) : topTopics.length === 0 ? (
              <div className={`mt-4 flex h-40 items-center justify-center text-center text-[13px] ${muted}`}>
                No questions in this range yet.
              </div>
            ) : (
              <>
                <div className="mt-4">
                  <DonutChart data={topTopics} />
                </div>
                <div className="mt-4 flex flex-col gap-2">
                  {topTopics.map((t) => (
                    <div key={t.label} className="flex items-center justify-between text-[12.5px]">
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ background: t.color }} />
                        {t.label}
                      </span>
                      <span className={muted}>{t.value}%</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className={`rounded-xl border p-5 ${cardBg}`}>
            <h2 className="text-[14.5px] font-semibold">Questions by department</h2>
            <div className="mt-5">
              {loading ? (
                <div className={`flex h-40 items-center justify-center text-[13px] ${muted}`}>Loading…</div>
              ) : questionsByDepartment.length === 0 ? (
                <div className={`flex h-40 items-center justify-center text-[13px] ${muted}`}>No questions yet.</div>
              ) : (
                <BarChartHorizontal data={questionsByDepartment} />
              )}
            </div>
          </div>

          <div className={`rounded-xl border p-5 ${cardBg}`}>
            <h2 className="text-[14.5px] font-semibold">AI performance</h2>
            {feedbackLoading ? (
              <div className={`mt-4 flex h-40 items-center justify-center text-[13px] ${muted}`}>Loading…</div>
            ) : aiPerformance.length === 0 ? (
              <div className={`mt-4 flex h-40 items-center justify-center text-center text-[13px] ${muted}`}>
                No assistant answers in this range yet.
              </div>
            ) : (
              <div className="mt-4 flex flex-col gap-4">
                {aiPerformance.map((p) => (
                  <div key={p.label}>
                    <div className="flex items-center justify-between text-[13.5px]">
                      <span className="font-medium">{p.label}</span>
                      <span className="font-semibold">{p.display ?? `${p.value}%`}</span>
                    </div>
                    <div className={`mt-1.5 h-1.5 rounded-full ${isDark ? 'bg-[#1c2430]' : 'bg-[#efe6d8]'}`}>
                      <div className="h-full rounded-full bg-[#0f3d3d]" style={{ width: `${p.value}%` }} />
                    </div>
                    <div className={`mt-1 text-[11.5px] ${muted}`}>{p.desc}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <DemoNotice />
    </AppLayout>
  )
}