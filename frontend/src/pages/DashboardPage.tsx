import { useEffect, useState } from 'react'
import { useNavigate, NavLink } from 'react-router-dom'
import {
  Bot,
  BookOpen,
  MessageSquare,
  Library,
  MessagesSquare,
  ArrowUpRight,
  FileText,
  File,
  Users,
  ShieldCheck,
  Clock,
  Loader2,
  SearchX,
} from 'lucide-react'

import AppLayout from '../components/AppLayout'
import DemoNotice from '../components/DemoNotice'
import { useTheme } from '../context/ThemeContext'
import { useRequiredUser } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'

type DashboardDocument = {
  id: string
  name?: string
  title?: string
  file_name?: string
  type?: string
  mime_type?: string
  department?: string
  version?: string
  status?: string
  created_at?: string
  updated_at?: string
  uploaded_at?: string
}

type DashboardConversation = {
  id: string
  title?: string
  created_at: string
}

type ActivityItem = {
  id: string
  text: string
  time: string
}

function formatDate(date?: string) {
  if (!date) return ''

  const value = new Date(date)
  if (Number.isNaN(value.getTime())) return ''

  return value.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatTime(date?: string) {
  if (!date) return ''

  const value = new Date(date)
  if (Number.isNaN(value.getTime())) return ''

  return value.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getDocumentName(document: DashboardDocument) {
  return (
    document.name ||
    document.title ||
    document.file_name ||
    'Untitled document'
  )
}

function getDocumentType(document: DashboardDocument) {
  const type =
    document.type ||
    document.mime_type ||
    getDocumentName(document).split('.').pop() ||
    ''

  return type.toLowerCase()
}

export default function DashboardPage() {
  const { user } = useRequiredUser()

  if (user.role === 'manager' || user.role === 'admin') {
    return <ManagerDashboard />
  }

  return <EmployeeDashboard />
}


/* =========================================================
   EMPLOYEE DASHBOARD
   ========================================================= */

function EmployeeDashboard() {
  const navigate = useNavigate()
  const { theme } = useTheme()
  const { user } = useRequiredUser()

  const isDark = theme === 'dark'

  const [conversations, setConversations] = useState<DashboardConversation[]>([])
  const [documents, setDocuments] = useState<DashboardDocument[]>([])
  const [conversationCount, setConversationCount] = useState(0)
  const [documentCount, setDocumentCount] = useState(0)
  const [savedCount, setSavedCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const cardBg = isDark
    ? 'bg-[#10151c] border-[#1c2430]'
    : 'bg-white border-[#e8e1d3]'

  const heroBg = isDark
    ? 'bg-[#10151c] border-[#1c2430]'
    : 'bg-[#efe6d8] border-[#e0d5bd]'

  const muted = isDark
    ? 'text-[#8a92a0]'
    : 'text-[#6b6455]'

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true)

      const [
        conversationsResult,
        documentsCountResult,
        documentsResult,
        savedCountResult,
      ] = await Promise.all([
        supabase
          .from('conversations')
          .select('id, title, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5),

        supabase
          .from('documents')
          .select('*', { count: 'exact', head: true }),

        supabase
          .from('documents')
          .select('*')
          .order('updated_at', { ascending: false })
          .limit(5),

        supabase
          .from('conversations')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('saved', true),
      ])

      if (conversationsResult.error) {
        console.error(
          'Could not load conversations:',
          conversationsResult.error
        )
      } else {
        setConversations(
          (conversationsResult.data ?? []) as DashboardConversation[]
        )
      }

      setConversationCount(conversationsResult.data?.length ?? 0)

      if (documentsCountResult.error) {
        console.error(
          'Could not count documents:',
          documentsCountResult.error
        )
      } else {
        setDocumentCount(documentsCountResult.count ?? 0)
      }

      if (documentsResult.error) {
        console.error(
          'Could not load recent documents:',
          documentsResult.error
        )
      } else {
        setDocuments(
          (documentsResult.data ?? []) as DashboardDocument[]
        )
      }

      if (savedCountResult.error) {
        console.error(
          'Could not count saved conversations:',
          savedCountResult.error
        )
      } else {
        setSavedCount(savedCountResult.count ?? 0)
      }

      setLoading(false)
    }

    void loadDashboard()
  }, [user.id])

  return (
    <AppLayout>
      <div className="mx-auto max-w-6xl px-8 py-8">

        {/* Header */}
        <div>
          <h1 className="text-[24px] font-semibold">
            Good morning, {user.name.split(' ')[0]}
          </h1>

          <p className={`mt-1 text-[13.5px] ${muted}`}>
            Here&apos;s what&apos;s happening with your company knowledge.
          </p>
        </div>


        {/* Main actions */}
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">

          {/* Ask AI */}
          <div className={`rounded-xl border p-6 ${heroBg}`}>
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#e3a857] text-[#1a1207]">
              <Bot size={17} />
            </div>

            <div className="mt-4 text-[16px] font-semibold">
              Ask AI
            </div>

            <p className={`mt-1.5 text-[13.5px] leading-relaxed ${muted}`}>
              Ask questions about your company&apos;s knowledge.
              Document-grounded answers will become available when
              the RAG pipeline is connected.
            </p>

            <button
              onClick={() => navigate('/assistant')}
              className="mt-4 flex items-center gap-2 rounded-md bg-[#e3a857] px-4 py-2 text-[13px] font-semibold text-[#1a1207] hover:bg-[#eab668]"
            >
              Open AI Assistant
              <ArrowUpRight size={14} />
            </button>
          </div>


          {/* Documents */}
          <div className={`rounded-xl border p-6 ${cardBg}`}>
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-md ${
                isDark
                  ? 'bg-[#1a2028] text-[#c7cdd6]'
                  : 'bg-[#f0ece1] text-[#4a4536]'
              }`}
            >
              <Library size={17} />
            </div>

            <div className="mt-4 text-[16px] font-semibold">
              Browse Documents
            </div>

            <p className={`mt-1.5 text-[13.5px] leading-relaxed ${muted}`}>
              Explore the documents available to your account.
            </p>

            <button
              onClick={() => navigate('/documents')}
              className={`mt-4 rounded-md border px-4 py-2 text-[13px] font-semibold ${
                isDark
                  ? 'border-[#2a3340] text-[#e3e5e8] hover:bg-[#141a22]'
                  : 'border-[#d8cfba] text-[#1c2127] hover:bg-[#efe6d8]'
              }`}
            >
              View Documents
            </button>
          </div>
        </div>


        {/* Real statistics */}
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">

          <StatCard
            icon={MessageSquare}
            value={loading ? '—' : String(conversationCount)}
            label="Conversations"
            sub="Your conversations"
            theme={theme}
          />

          <StatCard
            icon={BookOpen}
            value={loading ? '—' : String(documentCount)}
            label="Available Documents"
            sub="Based on your access"
            theme={theme}
          />

          <StatCard
            icon={MessagesSquare}
            value={loading ? '—' : String(savedCount)}
            label="Saved Conversations"
            sub="Bookmarked from the assistant"
            theme={theme}
          />

        </div>


        {/* Bottom content */}
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">

          {/* Recent conversations */}
          <div className={`rounded-xl border p-5 ${cardBg}`}>

            <div className="flex items-center justify-between">
              <h2 className="text-[14.5px] font-semibold">
                Recent conversations
              </h2>

              <button
                onClick={() => navigate('/assistant')}
                className="text-[12.5px] font-medium text-[#e3a857] hover:underline"
              >
                View all
              </button>
            </div>

            <div className="mt-3 flex flex-col divide-y divide-[#1c2430]/60">

              {loading && (
                <div className={`flex items-center gap-2 py-4 text-[13px] ${muted}`}>
                  <Loader2 size={14} className="animate-spin" />
                  Loading conversations...
                </div>
              )}

              {!loading && conversations.length === 0 && (
                <div className={`py-5 text-[13px] ${muted}`}>
                  No conversations yet.
                  <button
                    onClick={() => navigate('/assistant')}
                    className="ml-1 text-[#e3a857] hover:underline"
                  >
                    Ask your first question.
                  </button>
                </div>
              )}

              {conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  onClick={() => navigate('/assistant')}
                  className={`flex items-center gap-3 py-2.5 text-left first:pt-0 last:pb-0 ${muted}`}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${
                      isDark
                        ? 'bg-[#1a2028]'
                        : 'bg-[#f0ece1]'
                    }`}
                  >
                    <MessageSquare size={14} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div
                      className={`truncate text-[13.5px] font-medium ${
                        isDark
                          ? 'text-[#e3e5e8]'
                          : 'text-[#1c2127]'
                      }`}
                    >
                      {conversation.title || 'Untitled conversation'}
                    </div>

                    <div className="text-[11.5px]">
                      {formatTime(conversation.created_at)}
                    </div>
                  </div>

                  <ArrowUpRight
                    size={14}
                    className="shrink-0"
                  />
                </button>
              ))}

            </div>
          </div>


          {/* Recent documents */}
          <div className={`rounded-xl border p-5 ${cardBg}`}>

            <div className="flex items-center justify-between">
              <h2 className="text-[14.5px] font-semibold">
                Recent documents
              </h2>

              <button
                onClick={() => navigate('/documents')}
                className="text-[12.5px] font-medium text-[#e3a857] hover:underline"
              >
                View all
              </button>
            </div>

            <div className="mt-3 flex flex-col divide-y divide-[#1c2430]/60">

              {loading && (
                <div className={`flex items-center gap-2 py-4 text-[13px] ${muted}`}>
                  <Loader2 size={14} className="animate-spin" />
                  Loading documents...
                </div>
              )}

              {!loading && documents.length === 0 && (
                <div className={`py-5 text-[13px] ${muted}`}>
                  No documents available.
                </div>
              )}

              {documents.map((document) => {
                const documentType = getDocumentType(document)

                return (
                  <button
                    key={document.id}
                    onClick={() =>
                      navigate(`/documents/${document.id}`)
                    }
                    className={`flex items-center gap-3 py-2.5 text-left first:pt-0 last:pb-0 ${muted}`}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#3a1f1f] text-[#e07a6f]">
                      {documentType.includes('pdf') ? (
                        <FileText size={14} />
                      ) : (
                        <File size={14} />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div
                        className={`truncate text-[13.5px] font-medium ${
                          isDark
                            ? 'text-[#e3e5e8]'
                            : 'text-[#1c2127]'
                        }`}
                      >
                        {getDocumentName(document)}
                      </div>

                      <div className="text-[11.5px]">
                        {document.department || 'Company document'}
                        {document.updated_at
                          ? ` · Updated ${formatDate(document.updated_at)}`
                          : ''}
                      </div>
                    </div>

                    <ArrowUpRight
                      size={14}
                      className="shrink-0"
                    />
                  </button>
                )
              })}

            </div>
          </div>

        </div>
      </div>

      <DemoNotice />
    </AppLayout>
  )
}


/* =========================================================
   MANAGER DASHBOARD
   ========================================================= */

function ManagerDashboard() {
  const navigate = useNavigate()
  const { theme } = useTheme()
  const { user } = useRequiredUser()

  const isDark = theme === 'dark'

  const [documentCount, setDocumentCount] = useState(0)
  const [userCount, setUserCount] = useState(0)
  const [conversationCount, setConversationCount] = useState(0)
  const [questionCount, setQuestionCount] = useState(0)

  const [documents, setDocuments] = useState<DashboardDocument[]>([])
  const [conversations, setConversations] = useState<DashboardConversation[]>([])
  const [loading, setLoading] = useState(true)

  /*
   * ==========================================================
   * AI OVERVIEW (real signals from messages.feedback,
   * plus question_gaps for unresolved questions — see
   * migrations/question_gaps.sql and lib/questionGaps.ts)
   * ==========================================================
   */

  const [questionsToday, setQuestionsToday] = useState(0)
  const [questionsThisWeek, setQuestionsThisWeek] = useState(0)
  const [questionsThisMonth, setQuestionsThisMonth] = useState(0)
  const [avgResponseTime, setAvgResponseTime] = useState<number | null>(null)
  const [helpfulCount, setHelpfulCount] = useState(0)
  const [notHelpfulCount, setNotHelpfulCount] = useState(0)
  const [openGapsCount, setOpenGapsCount] = useState(0)

  const cardBg = isDark
    ? 'bg-[#10151c] border-[#1c2430]'
    : 'bg-white border-[#e8e1d3]'

  const muted = isDark
    ? 'text-[#8a92a0]'
    : 'text-[#6b6455]'

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true)

      const [
        documentsCount,
        usersCount,
        conversationsCount,
        documentsResult,
        conversationsResult,
        feedbackResult,
        openGapsResult,
      ] = await Promise.all([
        supabase
          .from('documents')
          .select('*', { count: 'exact', head: true }),

        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true }),

        supabase
          .from('conversations')
          .select('*', { count: 'exact', head: true }),

        supabase
          .from('documents')
          .select('*')
          .order('updated_at', { ascending: false })
          .limit(6),

        supabase
          .from('conversations')
          .select('id, title, created_at')
          .order('created_at', { ascending: false })
          .limit(6),

        supabase
          .from('messages')
          .select('id, conversation_id, role, created_at, feedback')
          .order('created_at', { ascending: true }),

        // Unresolved gaps, from the canonical question_gaps table.
        // Falls back to 0 (via the error branch below) if the
        // migration hasn't been run yet.
        supabase
          .from('question_gaps')
          .select('*', { count: 'exact', head: true })
          .neq('status', 'resolved'),
      ])

      setDocumentCount(documentsCount.count ?? 0)
      setUserCount(usersCount.count ?? 0)
      setConversationCount(conversationsCount.count ?? 0)

      if (documentsResult.error) {
        console.error(
          'Could not load manager documents:',
          documentsResult.error
        )
      } else {
        setDocuments(
          (documentsResult.data ?? []) as DashboardDocument[]
        )
      }

      if (conversationsResult.error) {
        console.error(
          'Could not load manager conversations:',
          conversationsResult.error
        )
      } else {
        setConversations(
          (conversationsResult.data ?? []) as DashboardConversation[]
        )
      }

      /*
       * We do not have a separate analytics/RAG table yet.
       *
       * Count questions from the messages table.
       * This is only an actual database count — no mock number.
       */
      const { count: messagesCount, error: messagesError } =
        await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'user')

      if (messagesError) {
        console.error(
          'Could not count questions:',
          messagesError
        )
      } else {
        setQuestionCount(messagesCount ?? 0)
      }

      /* =========================================================
       * REAL AI ANALYTICS
       * Everything below comes directly from Supabase messages.
       * ========================================================= */

      if (feedbackResult.error) {
        console.error(
          'Could not load AI analytics:',
          feedbackResult.error
        )
      } else {
        const rows = (feedbackResult.data ?? []) as {
          id: string
          conversation_id: string
          role: 'user' | 'assistant'
          created_at: string
          feedback: 'helpful' | 'not_helpful' | null
        }[]

        const now = new Date()

        // Start of today
        const startOfToday = new Date(now)
        startOfToday.setHours(0, 0, 0, 0)

        // Start of this week — Monday
        const startOfWeek = new Date(startOfToday)
        const day = startOfWeek.getDay()
        const daysFromMonday = day === 0 ? 6 : day - 1
        startOfWeek.setDate(startOfWeek.getDate() - daysFromMonday)

        // Start of this month
        const startOfMonth = new Date(
          now.getFullYear(),
          now.getMonth(),
          1
        )

        const userMessages = rows.filter(
          (row) => row.role === 'user'
        )

        const todayQuestions = userMessages.filter(
          (row) => new Date(row.created_at) >= startOfToday
        ).length

        const weekQuestions = userMessages.filter(
          (row) => new Date(row.created_at) >= startOfWeek
        ).length

        const monthQuestions = userMessages.filter(
          (row) => new Date(row.created_at) >= startOfMonth
        ).length

        setQuestionsToday(todayQuestions)
        setQuestionsThisWeek(weekQuestions)
        setQuestionsThisMonth(monthQuestions)

        // Real response time:
        // user message -> next assistant message in same conversation.
        const responseTimes: number[] = []

        const messagesByConversation = new Map<
          string,
          typeof rows
        >()

        for (const row of rows) {
          const existing =
            messagesByConversation.get(row.conversation_id) ?? []

          existing.push(row)
          messagesByConversation.set(
            row.conversation_id,
            existing
          )
        }

        for (const conversationMessages of messagesByConversation.values()) {
          for (let i = 0; i < conversationMessages.length; i++) {
            const current = conversationMessages[i]

            if (current.role !== 'user') continue

            const next = conversationMessages[i + 1]

            if (!next || next.role !== 'assistant') continue

            const userTime = new Date(current.created_at).getTime()
            const assistantTime = new Date(next.created_at).getTime()

            const seconds = (assistantTime - userTime) / 1000

            if (
              Number.isFinite(seconds) &&
              seconds >= 0 &&
              seconds < 300
            ) {
              responseTimes.push(seconds)
            }
          }
        }

        if (responseTimes.length > 0) {
          const average =
            responseTimes.reduce((sum, value) => sum + value, 0) /
            responseTimes.length

          setAvgResponseTime(Math.round(average * 10) / 10)
        } else {
          setAvgResponseTime(null)
        }

        // Real feedback
        let helpful = 0
        let notHelpful = 0

        for (const row of rows) {
          if (row.feedback === 'helpful') {
            helpful += 1
          }

          if (row.feedback === 'not_helpful') {
            notHelpful += 1
          }
        }

        setHelpfulCount(helpful)
        setNotHelpfulCount(notHelpful)
      }

      if (openGapsResult.error) {
        console.error(
          'Could not load open question gaps:',
          openGapsResult.error
        )
      } else {
        setOpenGapsCount(openGapsResult.count ?? 0)
      }

      setLoading(false)
    }

    void loadDashboard()
  }, [user.id])

  const totalRated = helpfulCount + notHelpfulCount

  const satisfactionPct =
    totalRated > 0
      ? Math.round((helpfulCount / totalRated) * 100)
      : null

  const activity: ActivityItem[] = [
    ...documents.slice(0, 3).map((document) => ({
      id: `document-${document.id}`,
      text: `Document "${getDocumentName(document)}" was updated`,
      time: formatTime(
        document.updated_at || document.created_at
      ),
    })),

    ...conversations.slice(0, 3).map((conversation) => ({
      id: `conversation-${conversation.id}`,
      text: `New conversation "${conversation.title || 'Untitled conversation'}"`,
      time: formatTime(conversation.created_at),
    })),
  ]
    .filter((item) => item.time)
    .slice(0, 6)

  return (
    <AppLayout>
      <div className="mx-auto max-w-6xl px-8 py-8">

        {/* Header */}
        <div>
          <h1 className="text-[24px] font-semibold">
            Good morning, {user.name.split(' ')[0]}
          </h1>

          <p className={`mt-1 text-[13.5px] ${muted}`}>
            Here&apos;s how your organization&apos;s knowledge system
            is performing.
          </p>
        </div>


        {/* Real manager stats */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <ManagerStatCard
            icon={FileText}
            value={loading ? '—' : String(documentCount)}
            label="Documents"
            sub="Currently available"
            theme={theme}
          />

          <ManagerStatCard
            icon={MessageSquare}
            value={loading ? '—' : String(questionCount)}
            label="Questions"
            sub="Stored in conversations"
            theme={theme}
          />

          <ManagerStatCard
            icon={Users}
            value={loading ? '—' : String(userCount)}
            label="Users"
            sub="Registered profiles"
            theme={theme}
          />

          <ManagerStatCard
            icon={ShieldCheck}
            value={loading ? '—' : String(conversationCount)}
            label="Conversations"
            sub="Stored in Supabase"
            theme={theme}
          />

        </div>


        {/* Activity + AI overview */}
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">

          {/* Recent activity */}
          <div className={`rounded-xl border p-5 ${cardBg}`}>

            <div className="flex items-center justify-between">
              <h2 className="text-[14.5px] font-semibold">
                Recent activity
              </h2>

              <span className={`flex items-center gap-1.5 text-[11.5px] font-medium ${muted}`}>
                <span className="h-1.5 w-1.5 rounded-full bg-[#3fa66c]" />
                Database connected
              </span>
            </div>

            <div className="mt-4 flex flex-col">

              {loading && (
                <div className={`flex items-center gap-2 py-4 text-[13px] ${muted}`}>
                  <Loader2 size={14} className="animate-spin" />
                  Loading activity...
                </div>
              )}

              {!loading && activity.length === 0 && (
                <div className={`py-4 text-[13px] ${muted}`}>
                  No activity yet.
                </div>
              )}

              {activity.map((item, index) => (
                <div
                  key={item.id}
                  className="flex gap-3 pb-4 last:pb-0"
                >
                  <div className="flex flex-col items-center">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#0f3d3d] ring-4 ring-[#0f3d3d]/15" />

                    {index < activity.length - 1 && (
                      <span
                        className={`w-px flex-1 ${
                          isDark
                            ? 'bg-[#1c2430]'
                            : 'bg-[#e8e1d3]'
                        }`}
                      />
                    )}
                  </div>

                  <div className="min-w-0 pb-1">
                    <div className="text-[13.5px]">
                      {item.text}
                    </div>

                    <div
                      className={`mt-0.5 flex items-center gap-1 text-[11.5px] ${muted}`}
                    >
                      <Clock size={11} />
                      {item.time}
                    </div>
                  </div>
                </div>
              ))}

            </div>
          </div>


          {/* Right column: AI overview + unanswered questions */}
          <div className="flex flex-col gap-4">

            {/* AI overview */}
            <div className={`rounded-xl border p-5 ${cardBg}`}>

              <div className="flex items-center gap-2">
                <Bot size={17} className="text-[#e3a857]" />

                <h2 className="text-[14.5px] font-semibold">
                  AI overview
                </h2>
              </div>

              <div className="mt-4 flex flex-col gap-3">

                <div className="flex items-center justify-between">
                  <span className={`text-[12.5px] ${muted}`}>
                    Questions today
                  </span>
                  <span className="text-[13.5px] font-semibold">
                    {loading ? '—' : questionsToday}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className={`text-[12.5px] ${muted}`}>
                    This week
                  </span>
                  <span className="text-[13.5px] font-semibold">
                    {loading ? '—' : questionsThisWeek}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className={`text-[12.5px] ${muted}`}>
                    This month
                  </span>
                  <span className="text-[13.5px] font-semibold">
                    {loading ? '—' : questionsThisMonth}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className={`text-[12.5px] ${muted}`}>
                    Avg. response time
                  </span>
                  <span className="text-[13.5px] font-semibold">
                    {loading || avgResponseTime === null
                      ? '—'
                      : `${avgResponseTime}s`}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className={`text-[12.5px] ${muted}`}>
                    Satisfaction
                  </span>
                  <span className="text-[13.5px] font-semibold">
                    {loading || satisfactionPct === null
                      ? '—'
                      : `${satisfactionPct}%`}
                  </span>
                </div>

              </div>

              {!loading && totalRated === 0 && (
                <p className={`mt-3 text-[11.5px] leading-relaxed ${muted}`}>
                  No feedback recorded yet. Satisfaction appears once
                  users rate assistant answers as helpful or not.
                </p>
              )}
            </div>

            {/* Unanswered questions */}
            <div className={`h-fit rounded-xl border p-5 ${cardBg}`}>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <SearchX size={17} className="text-[#e3a857]" />

                  <h2 className="text-[14.5px] font-semibold">
                    Unanswered questions
                  </h2>
                </div>

                <span className="text-[18px] font-semibold">
                  {loading ? '—' : openGapsCount}
                </span>
              </div>

              <p className={`mt-2 text-[12.5px] leading-relaxed ${muted}`}>
                Questions that could not be fully answered from your
                company knowledge.
              </p>

              <button
                type="button"
                onClick={() => navigate('/analytics/unanswered')}
                className={`mt-3 flex w-full items-center justify-center gap-2 rounded-md border px-3 py-2 text-[12.5px] font-medium transition-colors ${
                  isDark
                    ? 'border-[#2a3340] hover:bg-[#141a22]'
                    : 'border-[#d8cfba] hover:bg-[#f7f3ea]'
                }`}
              >
                View unanswered questions
                <ArrowUpRight size={13} />
              </button>

            </div>

          </div>

        </div>


        {/* Documents */}
        <div className={`mt-4 rounded-xl border p-5 ${cardBg}`}>

          <div className="flex items-center justify-between">
            <h2 className="text-[14.5px] font-semibold">
              Recently uploaded or updated
            </h2>

            <NavLink
              to="/documents"
              className="text-[12.5px] font-medium text-[#e3a857] hover:underline"
            >
              Manage documents
            </NavLink>
          </div>

          <div className="mt-3 flex flex-col">

            {loading && (
              <div className={`flex items-center gap-2 py-4 text-[13px] ${muted}`}>
                <Loader2 size={14} className="animate-spin" />
                Loading documents...
              </div>
            )}

            {!loading && documents.length === 0 && (
              <div className={`py-4 text-[13px] ${muted}`}>
                No documents available.
              </div>
            )}

            {documents.map((document, index) => {
              const documentType = getDocumentType(document)

              return (
                <NavLink
                  key={document.id}
                  to={`/documents/${document.id}`}
                  className={`flex items-center gap-3 rounded-lg px-2 py-2.5 ${
                    index % 2 === 0
                      ? isDark
                        ? 'bg-[#141a22]'
                        : 'bg-[#efe6d8]'
                      : ''
                  }`}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#3a1f1f] text-[#e07a6f]">
                    {documentType.includes('pdf') ? (
                      <FileText size={14} />
                    ) : (
                      <File size={14} />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">

                    <div className="truncate text-[13.5px] font-medium">
                      {getDocumentName(document)}
                    </div>

                    <div className={`text-[11.5px] ${muted}`}>
                      {document.department || 'Company document'}
                      {document.version
                        ? ` · ${document.version}`
                        : ''}
                      {document.updated_at
                        ? ` · ${formatDate(document.updated_at)}`
                        : ''}
                    </div>

                  </div>

                  {document.status && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#123a2d] px-2.5 py-1 text-[11.5px] text-[#4ade80]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#4ade80]" />
                      {document.status}
                    </span>
                  )}

                  <ArrowUpRight
                    size={14}
                    className="shrink-0"
                  />
                </NavLink>
              )
            })}

          </div>
        </div>

      </div>

      <DemoNotice />
    </AppLayout>
  )
}


/* =========================================================
   STAT COMPONENTS
   ========================================================= */

function StatCard({
  icon: Icon,
  value,
  label,
  sub,
  theme,
}: {
  icon: typeof MessageSquare
  value: string
  label: string
  sub: string
  theme: string
}) {
  const isDark = theme === 'dark'

  return (
    <div
      className={`flex items-center gap-3 rounded-xl border p-5 ${
        isDark
          ? 'bg-[#10151c] border-[#1c2430]'
          : 'bg-white border-[#e8e1d3]'
      }`}
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${
          isDark
            ? 'bg-[#1a2028] text-[#c7cdd6]'
            : 'bg-[#f0ece1] text-[#4a4536]'
        }`}
      >
        <Icon size={17} />
      </div>

      <div>
        <div className="text-[20px] font-semibold leading-none">
          {value}
        </div>

        <div
          className={`mt-1.5 text-[13px] font-medium ${
            isDark
              ? 'text-[#e3e5e8]'
              : 'text-[#1c2127]'
          }`}
        >
          {label}
        </div>

        <div
          className={`text-[11.5px] ${
            isDark
              ? 'text-[#6b7480]'
              : 'text-[#9a927e]'
          }`}
        >
          {sub}
        </div>
      </div>
    </div>
  )
}


function ManagerStatCard({
  icon: Icon,
  value,
  label,
  sub,
  theme,
}: {
  icon: typeof FileText
  value: string
  label: string
  sub: string
  theme: string
}) {
  const isDark = theme === 'dark'

  return (
    <div
      className={`rounded-xl border p-5 ${
        isDark
          ? 'bg-[#10151c] border-[#1c2430]'
          : 'bg-white border-[#e8e1d3]'
      }`}
    >
      <div className="flex items-center justify-between">

        <div
          className={`text-[13.5px] ${
            isDark
              ? 'text-[#8a92a0]'
              : 'text-[#6b6455]'
          }`}
        >
          {label}
        </div>

        <div
          className={`flex h-8 w-8 items-center justify-center rounded-md ${
            isDark
              ? 'bg-[#1a2028] text-[#c7cdd6]'
              : 'bg-[#f0ece1] text-[#4a4536]'
          }`}
        >
          <Icon size={15} />
        </div>

      </div>

      <div className="mt-3 text-[24px] font-semibold">
        {value}
      </div>

      <div
        className={`mt-1.5 text-[12px] ${
          isDark
            ? 'text-[#6b7480]'
            : 'text-[#9a927e]'
        }`}
      >
        {sub}
      </div>
    </div>
  )
}