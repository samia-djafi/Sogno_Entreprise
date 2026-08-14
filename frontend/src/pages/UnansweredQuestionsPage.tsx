import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, FileText, Inbox } from 'lucide-react'
import AppLayout from '../components/AppLayout'
import DemoNotice from '../components/DemoNotice'
import { useTheme } from '../context/ThemeContext'
import { supabase } from '../lib/supabaseClient'
import UploadDocumentModal from '../components/UploadDocumentModal'
/*
 * ============================================================
 * `question_gaps` is the canonical record of unanswered/unhelpful
 * questions. A row is created (and incremented on repeats) at the
 * moment a gap happens — see lib/questionGaps.ts's
 * recordQuestionGap, called from AssistantPage's callAssistant
 * (no sources) and handleFeedback (marked not helpful).
 *
 * This page just reads that table — no more re-scanning every
 * message on every load. Run migrations/question_gaps.sql once in
 * the Supabase SQL editor before this table exists.
 * ============================================================
 */

type GapStatus = 'open' | 'in_review' | 'resolved'
type StatusFilter = 'all' | GapStatus

interface QuestionGapRow {
  question_key: string
  question: string
  department: string
  times_asked: number
  status: GapStatus
  last_asked_at: string
}

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'in_review', label: 'In review' },
  { value: 'resolved', label: 'Resolved' },
]

const STATUS_LABEL: Record<GapStatus, string> = {
  open: 'Open',
  in_review: 'In review',
  resolved: 'Resolved',
}

export default function UnansweredQuestionsPage() {
  const navigate = useNavigate()
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const muted = isDark ? 'text-[#8a92a0]' : 'text-[#6b6455]'
  const cardBg = isDark ? 'border-[#1c2430] bg-[#10151c]' : 'border-[#e8e1d3] bg-white'
  const headerBorder = isDark ? 'border-[#1c2430]' : 'border-[#e8e1d3]'
  const rowBorder = isDark ? 'border-[#1c2430]' : 'border-[#f1ecdf]'
  const rowHover = isDark ? 'hover:bg-[#161c25]' : 'hover:bg-[#faf7ee]'

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [gaps, setGaps] = useState<QuestionGapRow[]>([])
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [pendingKeys, setPendingKeys] = useState<Set<string>>(new Set())
  const [showUpload, setShowUpload] = useState(false)
  useEffect(() => {
    const loadGaps = async () => {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('question_gaps')
        .select('question_key, question, department, times_asked, status, last_asked_at')
        .order('last_asked_at', { ascending: false })

      if (fetchError) {
        console.error('Failed to load unanswered questions:', fetchError)
        setError(
          "Unable to load unanswered questions. If you haven't run the question_gaps migration yet, that's why.",
        )
        setLoading(false)
        return
      }

      setGaps((data ?? []) as QuestionGapRow[])
      setLoading(false)
    }

    void loadGaps()
  }, [])

  const updateStatus = async (gap: QuestionGapRow, status: GapStatus) => {
    setPendingKeys((prev) => new Set(prev).add(gap.question_key))

    setGaps((prev) =>
      prev.map((g) => (g.question_key === gap.question_key ? { ...g, status } : g)),
    )

    const { error: updateError } = await supabase
      .from('question_gaps')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('question_key', gap.question_key)

    if (updateError) {
      console.error('Could not update status:', updateError)
    }

    setPendingKeys((prev) => {
      const next = new Set(prev)
      next.delete(gap.question_key)
      return next
    })
  }

  const filteredGaps = useMemo(() => {
    if (statusFilter === 'all') return gaps
    return gaps.filter((g) => g.status === statusFilter)
  }, [gaps, statusFilter])

  const counts = useMemo(() => {
    const c: Record<StatusFilter, number> = { all: gaps.length, open: 0, in_review: 0, resolved: 0 }
    for (const g of gaps) c[g.status] += 1
    return c
  }, [gaps])

  return (
    <AppLayout>
      <div className="mx-auto max-w-6xl px-8 py-8">
        <button
          onClick={() => navigate('/analytics')}
          className={`mb-4 flex items-center gap-1.5 text-[13px] ${isDark ? 'text-[#9aa3af] hover:text-white' : 'text-[#6b6455] hover:text-black'}`}
        >
          <ArrowLeft size={14} />
          Back to analytics
        </button>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-semibold">Unanswered questions</h1>
            <p className={`mt-1 max-w-2xl text-[13.5px] leading-relaxed ${muted}`}>
              Questions employees asked that the assistant couldn't ground in an indexed document, or that were
              marked not helpful. Each one is a missing piece of company knowledge.
            </p>
          </div>

          <button
           onClick={() => setShowUpload(true)}
           className="flex shrink-0 items-center gap-2 rounded-md bg-[#0f3d3d] px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-[#134949]"
          >
          <FileText size={15} />
            Upload missing document
          </button>
        </div>

        {error && (
          <div className={`mt-4 rounded-md border px-4 py-3 text-[13px] ${isDark ? 'border-[#3a2416] bg-[#1c1410] text-[#e3a857]' : 'border-[#f0d9a8] bg-[#fbf3e0] text-[#8a5a10]'}`}>
            {error}
          </div>
        )}

        {/* Status tabs */}
        <div
          className={`mt-6 inline-flex items-center gap-1 rounded-lg border p-1 ${isDark ? 'border-[#1c2430] bg-[#0c1015]' : 'border-[#e8e1d3] bg-[#f4f1ea]'}`}
        >
          {STATUS_TABS.map((tab) => {
            const active = statusFilter === tab.value
            return (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={`rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${
                  active
                    ? isDark
                      ? 'bg-[#1c2430] text-white'
                      : 'bg-white text-black shadow-sm'
                    : muted
                }`}
              >
                {tab.label}
                {tab.value !== 'all' && counts[tab.value] > 0 && (
                  <span className="ml-1.5 opacity-60">{counts[tab.value]}</span>
                )}
              </button>
            )
          })}
        </div>

        {loading && (
          <div className={`mt-4 flex items-center justify-center rounded-xl border py-16 text-[13px] ${cardBg} ${muted}`}>
            Loading unanswered questions…
          </div>
        )}

        {!loading && filteredGaps.length === 0 && !error && (
          <div className={`mt-4 flex flex-col items-center justify-center gap-3 rounded-xl border py-16 text-center ${cardBg}`}>
            <Inbox size={28} className={muted} />
            <div className="max-w-sm">
              <div className="text-[14px] font-medium">Nothing to show</div>
              <p className={`mt-1 text-[12.5px] leading-relaxed ${muted}`}>
                {statusFilter === 'all'
                  ? "Every recent answer cited a source and hasn't been marked not helpful. New gaps will show up here as soon as the assistant can't ground an answer, or someone flags one."
                  : `No questions in "${STATUS_TABS.find((t) => t.value === statusFilter)?.label}" right now.`}
              </p>
            </div>
          </div>
        )}

        {!loading && filteredGaps.length > 0 && (
          <div className={`mt-4 overflow-hidden rounded-xl border ${cardBg}`}>
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className={`border-b ${headerBorder}`}>
                  <th className={`px-4 py-3 text-[12px] font-medium ${muted}`}>Question</th>
                  <th className={`px-4 py-3 text-[12px] font-medium ${muted}`}>Times asked</th>
                  <th className={`px-4 py-3 text-[12px] font-medium ${muted}`}>Department</th>
                  <th className={`px-4 py-3 text-[12px] font-medium ${muted}`}>Last asked</th>
                  <th className={`px-4 py-3 text-[12px] font-medium ${muted}`}>Status</th>
                  <th className={`px-4 py-3 text-right text-[12px] font-medium ${muted}`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredGaps.map((gap) => {
                  const isPending = pendingKeys.has(gap.question_key)
                  const isResolved = gap.status === 'resolved'

                  return (
                    <tr key={gap.question_key} className={`border-b last:border-b-0 ${rowBorder} ${rowHover}`}>
                      <td className="max-w-[280px] px-4 py-3 text-[13.5px] font-medium">
                        {gap.question}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex min-w-[28px] items-center justify-center rounded-md px-2 py-0.5 text-[12px] font-medium ${isDark ? 'bg-[#1c2430] text-[#c9cfd8]' : 'bg-[#f1ecdf] text-[#5a5346]'}`}
                        >
                          {gap.times_asked}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-[13px] ${muted}`}>{gap.department}</td>
                      <td className={`px-4 py-3 text-[13px] ${muted}`}>
                        {new Date(gap.last_asked_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                            gap.status === 'in_review'
                              ? isDark
                                ? 'border-sky-900/50 bg-sky-950/30 text-sky-300'
                                : 'border-sky-200 bg-sky-50 text-sky-700'
                              : gap.status === 'resolved'
                                ? isDark
                                  ? 'border-[#1c2430] bg-[#0c1015] text-[#6b7280]'
                                  : 'border-[#e8e1d3] bg-[#f4f1ea] text-[#9a9384]'
                                : isDark
                                  ? 'border-[#3a2416] bg-[#1c1410] text-[#e3a857]'
                                  : 'border-[#f0d9a8] bg-[#fbf3e0] text-[#8a5a10]'
                          }`}
                        >
                          {STATUS_LABEL[gap.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-3 text-[12.5px] font-medium">
                          {isResolved ? (
                            <button
                              disabled={isPending}
                              onClick={() => updateStatus(gap, 'in_review')}
                              className={`${isDark ? 'text-[#9aa3af] hover:text-white' : 'text-[#6b6455] hover:text-black'} disabled:opacity-50`}
                            >
                              Mark in review
                            </button>
                          ) : (
                            <>
                              {gap.status !== 'in_review' && (
                                <button
                                  disabled={isPending}
                                  onClick={() => updateStatus(gap, 'in_review')}
                                  className={`${isDark ? 'text-[#9aa3af] hover:text-white' : 'text-[#6b6455] hover:text-black'} disabled:opacity-50`}
                                >
                                  Mark in review
                                </button>
                              )}
                              <button
                                disabled={isPending}
                                onClick={() => updateStatus(gap, 'resolved')}
                                className={`${isDark ? 'text-[#7dd3a8] hover:text-[#a3e8c4]' : 'text-[#0f3d3d] hover:text-[#134949]'} disabled:opacity-50`}
                              >
                                Resolve
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <DemoNotice />
      {showUpload && (
  <UploadDocumentModal
    onClose={() => {
      setShowUpload(false)
    }}
  />
)}
    </AppLayout>
    
  )
}