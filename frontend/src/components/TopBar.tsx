import { useEffect, useRef, useState } from 'react'
import {
  PanelLeft,
  Search,
  Bell,
  Sun,
  Moon,
  Bot,
  FileText,
  MessageSquare,
  X,
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useNavigate } from 'react-router-dom'
import { useRequiredUser } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'

type SearchDocument = {
  id: string
  name?: string
  title?: string
  file_name?: string
  department?: string
}

type SearchResult =
  | {
      type: 'document'
      id: string
      title: string
      subtitle: string
    }
  | {
      type: 'conversation'
      id: string
      title: string
      subtitle: string
    }

type DocumentNotification = {
  id: string
  title: string
  created_at: string
  department?: string
}

// How long to wait after the user stops typing before searching.
const SEARCH_DEBOUNCE_MS = 300

export default function TopBar({
  onToggleSidebar,
}: {
  onToggleSidebar: () => void
}) {
  const { theme, toggleTheme } = useTheme()
  const { user } = useRequiredUser()
  const navigate = useNavigate()

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [showResults, setShowResults] = useState(false)

  const [notifications, setNotifications] = useState<DocumentNotification[]>(
    []
  )
  const [showNotifications, setShowNotifications] = useState(false)

  const searchRef = useRef<HTMLDivElement>(null)
  const notificationRef = useRef<HTMLDivElement>(null)

  const isDark = theme === 'dark'

  /* =========================================================
     CLOSE DROPDOWNS WHEN CLICKING OUTSIDE
     ========================================================= */

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node

      if (
        searchRef.current &&
        !searchRef.current.contains(target)
      ) {
        setShowResults(false)
      }

      if (
        notificationRef.current &&
        !notificationRef.current.contains(target)
      ) {
        setShowNotifications(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  /* =========================================================
     KEYBOARD SHORTCUTS
     ========================================================= */

  useEffect(() => {
    const handleKeyboard = (event: KeyboardEvent) => {
      const isShortcut =
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === 'k'

      if (isShortcut) {
        event.preventDefault()

        const input = searchRef.current?.querySelector(
          'input'
        ) as HTMLInputElement | null

        input?.focus()
      }

      if (event.key === 'Escape') {
        setShowResults(false)
        setShowNotifications(false)
      }
    }

    window.addEventListener('keydown', handleKeyboard)

    return () => {
      window.removeEventListener('keydown', handleKeyboard)
    }
  }, [])

  /* =========================================================
     REAL-TIME DOCUMENT NOTIFICATIONS
     ========================================================= */

  useEffect(() => {
    /*
     * Listen for newly uploaded documents.
     *
     * Supabase sends this event whenever a new row is inserted
     * into the documents table.
     */

    const channel = supabase
      .channel('document-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'documents',
        },
        (payload) => {
          const document = payload.new as SearchDocument & {
            created_at?: string
          }

          const notification: DocumentNotification = {
            id: document.id,
            title:
              document.name ||
              document.title ||
              document.file_name ||
              'New document',
            created_at:
              document.created_at ||
              new Date().toISOString(),
            department: document.department,
          }

          setNotifications((current) => [
            notification,
            ...current,
          ])
        }
      )
      .subscribe((status) => {
        console.log(
          'Document notification subscription:',
          status
        )
      })

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [])

  /* =========================================================
     SEARCH SUPABASE
     ========================================================= */

  const performSearch = async (searchTerm: string) => {
  if (!searchTerm) {
    setResults([])
    setHasSearched(false)
    setShowResults(false)
    return
  }

  setSearching(true)
  setHasSearched(true)
  setShowResults(true)

  const pattern = `%${searchTerm}%`

  try {
    /* =========================================================
       DOCUMENT SEARCH
       ========================================================= */

    let documentsQuery = supabase
      .from('documents')
      .select('id, name, department, status, access')
      .or(
        `name.ilike.${pattern},department.ilike.${pattern}`
      )
      .limit(8)

    /*
     * EMPLOYEE:
     * Only active documents available to employees.
     *
     * MANAGER:
     * Can search everything, including archived and
     * managers_only documents.
     */
    if (
      user.role !== 'manager' &&
      user.role !== 'admin'
    ) {
      documentsQuery = documentsQuery
        .eq('status', 'Active')
        .eq('access', 'all_employees')
    }

    /* =========================================================
       DISCUSSION SEARCH
       ========================================================= */

    let conversationsQuery = supabase
      .from('conversations')
      .select('id, title, created_at')
      .ilike('title', pattern)
      .order('created_at', {
        ascending: false,
      })
      .limit(8)

    /*
     * EMPLOYEE:
     * Only their own discussions.
     *
     * MANAGER / ADMIN:
     * Can search all discussions.
     */
    if (
      user.role !== 'manager' &&
      user.role !== 'admin'
    ) {
      conversationsQuery =
        conversationsQuery.eq(
          'user_id',
          user.id
        )
    }

    /* =========================================================
       RUN BOTH SEARCHES
       ========================================================= */

    const [
      documentsResult,
      conversationsResult,
    ] = await Promise.all([
      documentsQuery,
      conversationsQuery,
    ])

    /* =========================================================
       DOCUMENT ERRORS
       ========================================================= */

    if (documentsResult.error) {
      console.error(
        'Search documents error:',
        documentsResult.error
      )
    }

    /* =========================================================
       DISCUSSION ERRORS
       ========================================================= */

    if (conversationsResult.error) {
      console.error(
        'Search conversations error:',
        conversationsResult.error
      )
    }

    /* =========================================================
       DOCUMENT RESULTS
       ========================================================= */

    const documentResults: SearchResult[] = (
      documentsResult.data ?? []
    ).map((document) => ({
      type: 'document',
      id: document.id,
      title: document.name || 'Untitled document',
      subtitle:
        document.department ||
        'Company document',
    }))

    /* =========================================================
       DISCUSSION RESULTS
       ========================================================= */

    const conversationResults: SearchResult[] = (
      conversationsResult.data ?? []
    ).map((conversation) => ({
      type: 'conversation',
      id: conversation.id,
      title:
        conversation.title ||
        'Untitled discussion',
      subtitle: 'Discussion',
    }))

    /* =========================================================
       COMBINE RESULTS
       ========================================================= */

    setResults([
      ...documentResults,
      ...conversationResults,
    ])
  } catch (error) {
    console.error(
      'Search failed:',
      error
    )

    setResults([])
  } finally {
    setSearching(false)
  }
}

  /* =========================================================
     SEARCH AS YOU TYPE (DEBOUNCED)

     Fires performSearch automatically a short moment after the
     user stops typing, instead of waiting for Enter. Enter (see
     onKeyDown below) still works and searches immediately.
     ========================================================= */

  useEffect(() => {
    const trimmed = query.trim()

    if (!trimmed) {
      setResults([])
      setHasSearched(false)
      setShowResults(false)
      return
    }

    setShowResults(true)

    const timeoutId = window.setTimeout(() => {
      void performSearch(trimmed)
    }, SEARCH_DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timeoutId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  /* =========================================================
     CLEAR SEARCH
     ========================================================= */

  const clearSearch = () => {
    setQuery('')
    setResults([])
    setHasSearched(false)
    setShowResults(false)
  }

  /* =========================================================
     SEARCH RESULT CLICK
     ========================================================= */

  const handleResultClick = (
    result: SearchResult
  ) => {
    setShowResults(false)

    if (result.type === 'document') {
      navigate(`/documents/${result.id}`)
      return
    }

    navigate('/assistant')
  }

  /* =========================================================
     NOTIFICATION CLICK
     ========================================================= */

  const handleNotificationClick = (
    notification: DocumentNotification
  ) => {
    setShowNotifications(false)

    /*
     * Remove the notification once the user opens it.
     */
    setNotifications((current) =>
      current.filter(
        (item) => item.id !== notification.id
      )
    )

    navigate(`/documents/${notification.id}`)
  }

  /* =========================================================
     CLEAR ALL NOTIFICATIONS
     ========================================================= */

  const clearNotifications = () => {
    setNotifications([])
  }

  /* =========================================================
     TIME FORMAT
     ========================================================= */

  const formatNotificationTime = (
    date: string
  ) => {
    const created = new Date(date)
    const now = new Date()

    const diff =
      Math.floor(
        (now.getTime() - created.getTime()) /
          1000
      )

    if (diff < 60) {
      return 'Just now'
    }

    if (diff < 3600) {
      return `${Math.floor(diff / 60)} min ago`
    }

    if (diff < 86400) {
      return `${Math.floor(diff / 3600)} hr ago`
    }

    return created.toLocaleDateString()
  }

  return (
    <header
      className={`relative z-30 flex h-14 shrink-0 items-center gap-3 border-b px-4 ${
        isDark
          ? 'border-[#161c25] bg-[#0a0d12]'
          : 'border-[#e8e1d3] bg-[#f7f2e9]'
      }`}
    >
      {/* =====================================================
          SIDEBAR TOGGLE
      ====================================================== */}

      <button
        onClick={onToggleSidebar}
        className={`shrink-0 rounded-md p-1.5 transition-colors ${
          isDark
            ? 'text-[#9aa3af] hover:bg-[#141a22] hover:text-[#e3e5e8]'
            : 'text-[#6b6455] hover:bg-[#efe6d8] hover:text-[#1c2127]'
        }`}
        aria-label="Toggle sidebar"
      >
        <PanelLeft size={17} />
      </button>

      {/* =====================================================
          SEARCH
      ====================================================== */}

      <div
        ref={searchRef}
        className="relative flex-1 max-w-xl"
      >
        <div
          className={`flex h-9 items-center gap-2 rounded-md border px-3 transition-colors ${
            isDark
              ? 'border-[#1c2430] bg-[#10151c] text-[#8a92a0] focus-within:border-[#34404f]'
              : 'border-[#e8e1d3] bg-white text-[#9a927e] focus-within:border-[#cfc4ad]'
          }`}
        >
          <Search
            size={15}
            className="shrink-0"
          />

          <input
            type="text"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
            }}
            onFocus={() => {
              if (query.trim()) {
                setShowResults(true)
              }
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                void performSearch(query.trim())
              }

              if (event.key === 'Escape') {
                setShowResults(false)
              }
            }}
            placeholder="Search knowledge, documents or discussions..."
            className={`min-w-0 flex-1 bg-transparent text-[13px] outline-none ${
              isDark
                ? 'text-[#e3e5e8] placeholder:text-[#6b7480]'
                : 'text-[#1c2127] placeholder:text-[#9a927e]'
            }`}
          />

          {searching && (
            <div
              className={`h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-t-transparent ${
                isDark
                  ? 'border-[#8a92a0]'
                  : 'border-[#8c8472]'
              }`}
            />
          )}

          {!searching && query && (
            <button
              onClick={clearSearch}
              className={`shrink-0 rounded p-0.5 ${
                isDark
                  ? 'text-[#6b7480] hover:text-[#e3e5e8]'
                  : 'text-[#9a927e] hover:text-[#1c2127]'
              }`}
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}

          {!query && (
            <kbd
              className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] ${
                isDark
                  ? 'border-[#1c2430] text-[#6b7480]'
                  : 'border-[#e8e1d3] text-[#9a927e]'
              }`}
            >
              Ctrl K
            </kbd>
          )}
        </div>

        {/* SEARCH DROPDOWN */}

        {showResults && (
          <div
            className={`absolute left-0 right-0 top-[42px] overflow-hidden rounded-lg border shadow-lg ${
              isDark
                ? 'border-[#1c2430] bg-[#10151c] shadow-black/30'
                : 'border-[#e8e1d3] bg-white shadow-black/10'
            }`}
          >
            {searching && (
              <div
                className={`px-4 py-3 text-[12.5px] ${
                  isDark
                    ? 'text-[#8a92a0]'
                    : 'text-[#6b6455]'
                }`}
              >
                Searching company knowledge...
              </div>
            )}

            {!searching &&
              hasSearched &&
              results.length === 0 && (
                <div className="px-4 py-5 text-center">
                  <div
                    className={`mx-auto flex h-8 w-8 items-center justify-center rounded-md ${
                      isDark
                        ? 'bg-[#1a2028] text-[#6b7480]'
                        : 'bg-[#f0ece1] text-[#8c8472]'
                    }`}
                  >
                    <Search size={15} />
                  </div>

                  <div
                    className={`mt-2 text-[13px] font-medium ${
                      isDark
                        ? 'text-[#e3e5e8]'
                        : 'text-[#1c2127]'
                    }`}
                  >
                    Nothing found
                  </div>

                  <div
                    className={`mt-1 text-[11.5px] ${
                      isDark
                        ? 'text-[#6b7480]'
                        : 'text-[#9a927e]'
                    }`}
                  >
                    No documents or discussions match
                    &quot;{query}&quot;.
                  </div>
                </div>
              )}

            {!searching &&
              results.length > 0 && (
                <div className="max-h-[360px] overflow-y-auto p-1.5">
                  <div
                    className={`px-2.5 py-1.5 text-[10.5px] font-medium uppercase tracking-wide ${
                      isDark
                        ? 'text-[#6b7480]'
                        : 'text-[#9a927e]'
                    }`}
                  >
                    Search results
                  </div>

                  {results.map((result) => (
                    <button
                      key={`${result.type}-${result.id}`}
                      onClick={() =>
                        handleResultClick(result)
                      }
                      className={`flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left transition-colors ${
                        isDark
                          ? 'hover:bg-[#171e27]'
                          : 'hover:bg-[#f5f0e7]'
                      }`}
                    >
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${
                          result.type ===
                          'document'
                            ? 'bg-[#3a1f1f] text-[#e07a6f]'
                            : isDark
                              ? 'bg-[#1a2028] text-[#8fa0b5]'
                              : 'bg-[#f0ece1] text-[#5f594b]'
                        }`}
                      >
                        {result.type ===
                        'document' ? (
                          <FileText size={14} />
                        ) : (
                          <MessageSquare
                            size={14}
                          />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div
                          className={`truncate text-[13px] font-medium ${
                            isDark
                              ? 'text-[#e3e5e8]'
                              : 'text-[#1c2127]'
                          }`}
                        >
                          {result.title}
                        </div>

                        <div
                          className={`truncate text-[11px] ${
                            isDark
                              ? 'text-[#6b7480]'
                              : 'text-[#9a927e]'
                          }`}
                        >
                          {result.subtitle}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

            {!searching && (
              <div
                className={`flex items-center justify-between border-t px-3 py-2 text-[10.5px] ${
                  isDark
                    ? 'border-[#1c2430] text-[#6b7480]'
                    : 'border-[#e8e1d3] text-[#9a927e]'
                }`}
              >
                <span>
                  Search documents &amp; discussions
                </span>

                <span>
                  Enter to search · Esc to close
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* =====================================================
          RIGHT SIDE
      ====================================================== */}

      <div className="ml-auto flex items-center gap-3">

        {/* ===================================================
            THEME
        =================================================== */}

        <button
          onClick={toggleTheme}
          className={`rounded-md p-1.5 transition-colors ${
            isDark
              ? 'text-[#9aa3af] hover:bg-[#141a22] hover:text-[#e3e5e8]'
              : 'text-[#6b6455] hover:bg-[#efe6d8] hover:text-[#1c2127]'
          }`}
          aria-label="Toggle theme"
        >
          {isDark ? (
            <Sun size={17} />
          ) : (
            <Moon size={17} />
          )}
        </button>

        {/* ===================================================
            NOTIFICATIONS
        =================================================== */}

        <div
          ref={notificationRef}
          className="relative"
        >
          <button
            onClick={() =>
              setShowNotifications(
                (current) => !current
              )
            }
            className={`relative rounded-md p-1.5 transition-colors ${
              isDark
                ? 'text-[#9aa3af] hover:bg-[#141a22] hover:text-[#e3e5e8]'
                : 'text-[#6b6455] hover:bg-[#efe6d8] hover:text-[#1c2127]'
            }`}
            aria-label="Notifications"
          >
            <Bell size={17} />

            {/* RED NOTIFICATION BADGE */}

            {notifications.length > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white ring-2 ring-[#f7f2e9]">
                {notifications.length > 9
                  ? '9+'
                  : notifications.length}
              </span>
            )}
          </button>

          {/* NOTIFICATION DROPDOWN */}

          {showNotifications && (
            <div
              className={`absolute right-0 top-[42px] z-50 w-80 overflow-hidden rounded-lg border shadow-xl ${
                isDark
                  ? 'border-[#1c2430] bg-[#10151c] shadow-black/40'
                  : 'border-[#e8e1d3] bg-white shadow-black/10'
              }`}
            >
              {/* Header */}

              <div
                className={`flex items-center justify-between border-b px-4 py-3 ${
                  isDark
                    ? 'border-[#1c2430]'
                    : 'border-[#e8e1d3]'
                }`}
              >
                <div>
                  <div
                    className={`text-[13px] font-semibold ${
                      isDark
                        ? 'text-[#e3e5e8]'
                        : 'text-[#1c2127]'
                    }`}
                  >
                    Notifications
                  </div>

                  <div
                    className={`mt-0.5 text-[11px] ${
                      isDark
                        ? 'text-[#6b7480]'
                        : 'text-[#9a927e]'
                    }`}
                  >
                    New document uploads
                  </div>
                </div>

                {notifications.length > 0 && (
                  <button
                    onClick={clearNotifications}
                    className={`text-[11px] ${
                      isDark
                        ? 'text-[#8a92a0] hover:text-white'
                        : 'text-[#6b6455] hover:text-black'
                    }`}
                  >
                    Clear all
                  </button>
                )}
              </div>

              {/* Empty */}

              {notifications.length === 0 && (
                <div className="px-4 py-8 text-center">
                  <div
                    className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full ${
                      isDark
                        ? 'bg-[#1a2028] text-[#6b7480]'
                        : 'bg-[#f0ece1] text-[#9a927e]'
                    }`}
                  >
                    <Bell size={16} />
                  </div>

                  <div
                    className={`mt-2 text-[12.5px] font-medium ${
                      isDark
                        ? 'text-[#e3e5e8]'
                        : 'text-[#1c2127]'
                    }`}
                  >
                    No new notifications
                  </div>

                  <div
                    className={`mt-1 text-[11px] ${
                      isDark
                        ? 'text-[#6b7480]'
                        : 'text-[#9a927e]'
                    }`}
                  >
                    You will be notified when a new
                    document is uploaded.
                  </div>
                </div>
              )}

              {/* Notifications */}

              {notifications.length > 0 && (
                <div className="max-h-[360px] overflow-y-auto">
                  {notifications.map(
                    (notification) => (
                      <button
                        key={notification.id}
                        onClick={() =>
                          handleNotificationClick(
                            notification
                          )
                        }
                        className={`flex w-full items-start gap-3 border-b px-4 py-3 text-left transition-colors last:border-b-0 ${
                          isDark
                            ? 'border-[#1c2430] hover:bg-[#171e27]'
                            : 'border-[#e8e1d3] hover:bg-[#f8f4eb]'
                        }`}
                      >
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${
                            isDark
                              ? 'bg-[#1a2028] text-[#e3a857]'
                              : 'bg-[#efe6d8] text-[#0f3d3d]'
                          }`}
                        >
                          <FileText size={15} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div
                            className={`truncate text-[12.5px] font-medium ${
                              isDark
                                ? 'text-[#e3e5e8]'
                                : 'text-[#1c2127]'
                            }`}
                          >
                            New document uploaded
                          </div>

                          <div
                            className={`mt-0.5 truncate text-[12px] ${
                              isDark
                                ? 'text-[#a5adb8]'
                                : 'text-[#5f594b]'
                            }`}
                          >
                            {notification.title}
                          </div>

                          <div
                            className={`mt-1 text-[10.5px] ${
                              isDark
                                ? 'text-[#6b7480]'
                                : 'text-[#9a927e]'
                            }`}
                          >
                            {formatNotificationTime(
                              notification.created_at
                            )}
                          </div>
                        </div>
                      </button>
                    )
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ===================================================
            ASK AI
        =================================================== */}

        <button
          onClick={() => navigate(`/assistant?new=${Date.now()}`) }
          className={`flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
            isDark
              ? 'bg-[#e3a857] text-[#1a1207] hover:bg-[#eab668]'
              : 'bg-[#0f3d3d] text-white hover:bg-[#134949]'
          }`}
        >
          <Bot size={15} />
          Ask AI
        </button>
      </div>
    </header>
  )
}