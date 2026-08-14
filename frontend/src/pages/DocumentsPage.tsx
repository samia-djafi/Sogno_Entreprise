import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  FileText,
  File,
  Eye,
  Bot,
  Upload,
  Archive,
  Trash2,
} from 'lucide-react'

import AppLayout from '../components/AppLayout'
import DemoNotice from '../components/DemoNotice'
import UploadDocumentModal from '../components/UploadDocumentModal'

import {
  supabase,
  type DocumentRow,
  type ProfileRow,
} from '../lib/supabaseClient'

import { useTheme } from '../context/ThemeContext'
import { useRequiredUser } from '../context/AuthContext'

type DocumentWithUploader = DocumentRow & {
  uploader_name: string
}

export default function DocumentsPage() {
  const navigate = useNavigate()
  const { theme } = useTheme()
  const { user } = useRequiredUser()

  const isDark = theme === 'dark'
  const isManager = user.role === 'manager'

  const [showUpload, setShowUpload] = useState(false)

  const [documents, setDocuments] = useState<DocumentWithUploader[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [departmentFilter, setDepartmentFilter] =
    useState('All Departments')

  const [typeFilter, setTypeFilter] =
    useState('All Types')

  const [statusFilter, setStatusFilter] =
    useState('All Statuses')

  const [dateFilter, setDateFilter] =
    useState('All Dates')

  /*
   * =========================================================
   * LOAD DOCUMENTS
   * =========================================================
   *
   * Manager:
   *   - sees active + archived
   *   - sees all access levels
   *
   * Employee:
   *   - active only
   *   - all_employees only
   *
   * IMPORTANT:
   * These frontend filters improve the UI, but you should ALSO
   * enforce the same rules with Supabase RLS policies.
   */

  const loadDocuments = async () => {
    setLoading(true)
    setError(null)

    let query = supabase
      .from('documents')
      .select('*')
      .order('updated_at', { ascending: false })

    /*
     * Employees must NEVER receive:
     *
     * - archived documents
     * - managers_only documents
     */

    if (!isManager) {
      query = query
        .eq('status', 'Active')
        .eq('access', 'all_employees')
    }

    const { data, error: documentsError } = await query

    if (documentsError) {
      console.error(
        'Failed to load documents:',
        documentsError,
      )

      setError('Could not load documents.')
      setLoading(false)

      return
    }

    const rows = (data ?? []) as DocumentRow[]

    /*
     * Get uploader profiles.
     */

    const uploaderIds = [
      ...new Set(
        rows
          .map((document) => document.uploaded_by)
          .filter(
            (id): id is string => Boolean(id),
          ),
      ),
    ]

    let profiles: ProfileRow[] = []

    if (uploaderIds.length > 0) {
      const {
        data: profileData,
        error: profilesError,
      } = await supabase
        .from('profiles')
        .select('*')
        .in('id', uploaderIds)

      if (profilesError) {
        console.error(
          'Failed to load uploader profiles:',
          profilesError,
        )
      } else {
        profiles = (profileData ?? []) as ProfileRow[]
      }
    }

    const profileMap = new Map(
      profiles.map((profile) => [
        profile.id,
        profile.full_name,
      ]),
    )

    setDocuments(
      rows.map((document) => ({
        ...document,

        uploader_name: document.uploaded_by
          ? profileMap.get(document.uploaded_by) ??
            'Unknown user'
          : 'Unknown user',
      })),
    )

    setLoading(false)
  }

  useEffect(() => {
    void loadDocuments()

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.role])

  /*
   * =========================================================
   * FORMAT HELPERS
   * =========================================================
   */

  const formatSize = (bytes: number) => {
    if (bytes < 1024) {
      return `${bytes} B`
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString()
  }

  const normalize = (value: string | null | undefined) => {
    return String(value ?? '').toLowerCase()
  }

  /*
   * =========================================================
   * ARCHIVE DOCUMENT
   * =========================================================
   */

  const archiveDocument = async (
    document: DocumentWithUploader,
  ) => {
    if (!isManager) {
      return
    }

    const confirmed = window.confirm(
      `Archive "${document.name}"?\n\nEmployees will no longer see this document.`,
    )

    if (!confirmed) {
      return
    }

    setError(null)

    const {
      error: archiveError,
    } = await supabase
      .from('documents')
      .update({
        status: 'Archived',
      })
      .eq('id', document.id)

    if (archiveError) {
      console.error(
        'Failed to archive document:',
        archiveError,
      )

      setError('Unable to archive this document.')

      return
    }

    /*
     * Keep it in the manager's list.
     *
     * This is why we DON'T remove it from state.
     */

    setDocuments((current) =>
      current.map((item) =>
        item.id === document.id
          ? {
              ...item,
              status: 'Archived',
            }
          : item,
      ),
    )
  }

  /*
   * =========================================================
   * DELETE DOCUMENT
   * =========================================================
   */

  const deleteDocument = async (
    document: DocumentWithUploader,
  ) => {
    if (!isManager) {
      return
    }

    const confirmed = window.confirm(
      `Delete "${document.name}" permanently?\n\nThis cannot be undone.`,
    )

    if (!confirmed) {
      return
    }

    setError(null)

    const {
      error: deleteError,
    } = await supabase
      .from('documents')
      .delete()
      .eq('id', document.id)

    if (deleteError) {
      console.error(
        'Failed to delete document:',
        deleteError,
      )

      setError('Unable to delete this document.')

      return
    }

    setDocuments((current) =>
      current.filter(
        (item) => item.id !== document.id,
      ),
    )
  }

  /*
   * =========================================================
   * ASK AI ABOUT DOCUMENT
   * =========================================================
   */

  const askAIAboutDocument = (
    documentId: string,
  ) => {
    navigate(`/assistant?new=${Date.now()}&document=${documentId}`)   
  }

  /*
   * =========================================================
   * FILTER OPTIONS
   * =========================================================
   */

  const departments = useMemo(() => {
    const values = [
      ...new Set(
        documents
          .map((document) => document.department)
          .filter(Boolean),
      ),
    ]

    return [
      'All Departments',
      ...values,
    ]
  }, [documents])

  const types = useMemo(() => {
    const values = [
      ...new Set(
        documents
          .map((document) => document.type)
          .filter(Boolean),
      ),
    ]

    return [
      'All Types',
      ...values,
    ]
  }, [documents])

  /*
   * =========================================================
   * FILTER DOCUMENTS
   * =========================================================
   */

  const filteredDocuments = useMemo(() => {
    const now = new Date()

    return documents.filter((document) => {
      /*
       * SEARCH
       */

      const searchValue =
        normalize(search)

      const matchesSearch =
        !searchValue ||
        normalize(document.name).includes(
          searchValue,
        ) ||
        normalize(document.department).includes(
          searchValue,
        )

      if (!matchesSearch) {
        return false
      }

      /*
       * DEPARTMENT
       */

      if (
        departmentFilter !==
          'All Departments' &&
        document.department !==
          departmentFilter
      ) {
        return false
      }

      /*
       * TYPE
       */

      if (
        typeFilter !== 'All Types' &&
        normalize(document.type) !==
          normalize(typeFilter)
      ) {
        return false
      }

      /*
       * STATUS
       */

      if (
        statusFilter !== 'All Statuses' &&
        normalize(document.status) !==
          normalize(statusFilter)
      ) {
        return false
      }

      /*
       * DATE
       */

      if (dateFilter !== 'All Dates') {
        const updated = new Date(
          document.updated_at,
        )

        const difference =
          now.getTime() -
          updated.getTime()

        const days =
          difference /
          (1000 * 60 * 60 * 24)

        if (
          dateFilter === 'Last 7 days' &&
          days > 7
        ) {
          return false
        }

        if (
          dateFilter === 'Last 30 days' &&
          days > 30
        ) {
          return false
        }

        if (
          dateFilter === 'Last 90 days' &&
          days > 90
        ) {
          return false
        }
      }

      return true
    })
  }, [
    documents,
    search,
    departmentFilter,
    typeFilter,
    statusFilter,
    dateFilter,
  ])

  /*
   * =========================================================
   * PAGE
   * =========================================================
   */

  return (
    <AppLayout>
      <div className="mx-auto max-w-6xl px-8 py-8">

        {/* =====================================================
            HEADER
        ====================================================== */}

        <div className="flex items-start justify-between">

          <div>
            <h1 className="text-[22px] font-semibold">
              Documents
            </h1>

            <p
              className={`mt-1 text-[13.5px] ${
                isDark
                  ? 'text-[#8a92a0]'
                  : 'text-[#6b6455]'
              }`}
            >
              {isManager
                ? 'Manage the company knowledge base: upload, archive, delete and control access.'
                : 'Browse the company knowledge you have access to.'}
            </p>
          </div>

          {isManager ? (
            <button
              onClick={() =>
                setShowUpload(true)
              }
              className="flex items-center gap-2 rounded-md bg-[#0f3d3d] px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-[#134949]"
            >
              <Upload size={15} />
              Upload document
            </button>
          ) : (
            <button
              onClick={() =>
                navigate('/assistant')
              }
              className={`flex items-center gap-2 rounded-md border px-3.5 py-2 text-[13px] font-medium ${
                isDark
                  ? 'border-[#2a3340] text-[#e3e5e8] hover:bg-[#141a22]'
                  : 'border-[#d8cfba] text-[#1c2127] hover:bg-[#efe6d8]'
              }`}
            >
              <Bot size={15} />
              Ask AI instead
            </button>
          )}
        </div>

        {/* =====================================================
            ERROR
        ====================================================== */}

        {error && (
          <div
            className={`mt-5 rounded-lg border px-4 py-3 text-[13px] ${
              isDark
                ? 'border-red-900/50 bg-red-950/20 text-red-300'
                : 'border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {error}
          </div>
        )}
      
        {/* =====================================================
            SEARCH / FILTERS
        ====================================================== */}

        <div className="mt-6 flex flex-wrap gap-2.5">

          {/* SEARCH */}

          <div
            className={`flex min-w-[220px] flex-1 items-center gap-2 rounded-md border px-3 py-2 ${
              isDark
                ? 'border-[#1c2430] bg-[#10151c] text-[#6b7480]'
                : 'border-[#e8e1d3] bg-white text-[#9a927e]'
            }`}
          >
            <Search size={15} />

            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search documents..."
              className={`w-full bg-transparent text-[13px] outline-none ${
                isDark
                  ? 'text-[#e3e5e8]'
                  : 'text-[#1c2127]'
              }`}
            />
          </div>

          {/* DEPARTMENT */}

          <select
            value={departmentFilter}
            onChange={(event) =>
              setDepartmentFilter(
                event.target.value,
              )
            }
            className={`rounded-md border px-3 py-2 text-[13px] outline-none ${
              isDark
                ? 'border-[#1c2430] bg-[#10151c] text-[#c7cdd6]'
                : 'border-[#e8e1d3] bg-white text-[#1c2127]'
            }`}
          >
            {departments.map((department) => (
              <option
                key={department}
                value={department}
              >
                {department}
              </option>
            ))}
          </select>

          {/* TYPE */}

          <select
            value={typeFilter}
            onChange={(event) =>
              setTypeFilter(
                event.target.value,
              )
            }
            className={`rounded-md border px-3 py-2 text-[13px] outline-none ${
              isDark
                ? 'border-[#1c2430] bg-[#10151c] text-[#c7cdd6]'
                : 'border-[#e8e1d3] bg-white text-[#1c2127]'
            }`}
          >
            {types.map((type) => (
              <option
                key={type}
                value={type}
              >
                {type === 'All Types'
                  ? type
                  : type.toUpperCase()}
              </option>
            ))}
          </select>

          {/* STATUS */}

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value,
              )
            }
            className={`rounded-md border px-3 py-2 text-[13px] outline-none ${
              isDark
                ? 'border-[#1c2430] bg-[#10151c] text-[#c7cdd6]'
                : 'border-[#e8e1d3] bg-white text-[#1c2127]'
            }`}
          >
            <option value="All Statuses">
              All Statuses
            </option>

            <option value="Active">
              Active
            </option>

            {isManager && (
              <option value="Archived">
                Archived
              </option>
            )}
          </select>

          {/* DATE */}

          <select
            value={dateFilter}
            onChange={(event) =>
              setDateFilter(
                event.target.value,
              )
            }
            className={`rounded-md border px-3 py-2 text-[13px] outline-none ${
              isDark
                ? 'border-[#1c2430] bg-[#10151c] text-[#c7cdd6]'
                : 'border-[#e8e1d3] bg-white text-[#1c2127]'
            }`}
          >
            <option value="All Dates">
              All Dates
            </option>

            <option value="Last 7 days">
              Last 7 days
            </option>

            <option value="Last 30 days">
              Last 30 days
            </option>

            <option value="Last 90 days">
              Last 90 days
            </option>
          </select>
        </div>

        {/* =====================================================
            DOCUMENT TABLE
        ====================================================== */}

        <div
          className={`mt-5 overflow-x-auto rounded-xl border ${
            isDark
              ? 'border-[#1c2430]'
              : 'border-[#e8e1d3]'
          }`}
        >
          <table className="w-full border-collapse text-left text-[13px]">

            <thead>
              <tr
                className={
                  isDark
                    ? 'bg-[#10151c] text-[#8a92a0]'
                    : 'bg-[#f7f2e9] text-[#6b6455]'
                }
              >
                <th className="px-4 py-3 font-medium">
                  Document
                </th>

                <th className="px-4 py-3 font-medium">
                  Department
                </th>

                <th className="px-4 py-3 font-medium">
                  Version
                </th>

                {isManager && (
                  <th className="px-4 py-3 font-medium">
                    Uploaded by
                  </th>
                )}

                <th className="px-4 py-3 font-medium">
                  Updated
                </th>

                <th className="px-4 py-3 font-medium">
                  Status
                </th>

                <th className="px-4 py-3 font-medium">
                  Access
                </th>

                <th className="px-4 py-3 font-medium">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>

              {/* LOADING */}

              {loading && (
                <tr>
                  <td
                    colSpan={isManager ? 8 : 7}
                    className={`px-4 py-10 text-center ${
                      isDark
                        ? 'text-[#8a92a0]'
                        : 'text-[#6b6455]'
                    }`}
                  >
                    Loading documents...
                  </td>
                </tr>
              )}

              {/* EMPTY */}

              {!loading &&
                filteredDocuments.length === 0 && (
                  <tr>
                    <td
                      colSpan={isManager ? 8 : 7}
                      className={`px-4 py-14 text-center ${
                        isDark
                          ? 'text-[#8a92a0]'
                          : 'text-[#6b6455]'
                      }`}
                    >
                      <FileText
                        className="mx-auto mb-3 opacity-50"
                        size={28}
                      />

                      <div className="font-medium">
                        No documents found
                      </div>

                      <div className="mt-1 text-[12px] opacity-70">
                        Try changing your search
                        or filters.
                      </div>
                    </td>
                  </tr>
                )}

              {/* DOCUMENTS */}

              {!loading &&
                [...filteredDocuments].sort((a, b) => {
  if (a.status === 'Archived' && b.status !== 'Archived') return 1
  if (a.status !== 'Archived' && b.status === 'Archived') return -1
  return 0
}).map(
                  (document) => {
                    const isArchived =
                      normalize(
                        document.status,
                      ) === 'archived'

                    const isManagerOnly =
                      normalize(
                        document.access,
                      ) === 'managers_only'

                    return (
                      <tr
                        key={document.id}
                        className={`border-t ${
                          isDark
                            ? 'border-[#1c2430]'
                            : 'border-[#e8e1d3]'
                        } ${
                          isArchived
                            ? isDark
                              ? 'bg-[#15171b]'
                              : 'bg-[#faf7f0]'
                            : ''
                        }`}
                      >

                        {/* DOCUMENT */}

                        <td className="px-4 py-3">

                          <div className="flex items-center gap-2.5">

                            <div
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${
                                isArchived
                                  ? isDark
                                    ? 'bg-[#24272c] text-[#858b94]'
                                    : 'bg-[#e8e4db] text-[#8b8475]'
                                  : 'bg-[#3a1f1f] text-[#e07a6f]'
                              }`}
                            >
                              {document.type ===
                              'pdf' ? (
                                <FileText size={14} />
                              ) : (
                                <File size={14} />
                              )}
                            </div>

                            <div>

                              <button
                                onClick={() =>
                                  navigate(
                                    `/documents/${document.id}`,
                                  )
                                }
                                className={`text-left font-medium hover:underline ${
                                  isArchived
                                    ? isDark
                                      ? 'text-[#a5abb3]'
                                      : 'text-[#777063]'
                                    : isDark
                                      ? 'text-[#f2f1ec]'
                                      : 'text-[#1c2127]'
                                }`}
                              >
                                {document.name}
                              </button>

                              <div
                                className={
                                  isDark
                                    ? 'text-[11.5px] text-[#6b7480]'
                                    : 'text-[11.5px] text-[#9a927e]'
                                }
                              >
                                {document.type.toUpperCase()}{' '}
                                ·{' '}
                                {formatSize(
                                  document.size_bytes,
                                )}{' '}
                                ·{' '}
                                {document.pages}{' '}
                                pages
                              </div>

                            </div>
                          </div>
                        </td>

                        {/* DEPARTMENT */}

                        <td
                          className={`px-4 py-3 ${
                            isDark
                              ? 'text-[#c7cdd6]'
                              : 'text-[#3a3628]'
                          }`}
                        >
                          {document.department}
                        </td>

                        {/* VERSION */}

                        <td
                          className={`px-4 py-3 ${
                            isDark
                              ? 'text-[#c7cdd6]'
                              : 'text-[#3a3628]'
                          }`}
                        >
                          {document.version}
                        </td>

                        {/* UPLOADER */}

                        {isManager && (
                          <td
                            className={`whitespace-nowrap px-4 py-3 ${
                              isDark
                                ? 'text-[#c7cdd6]'
                                : 'text-[#3a3628]'
                            }`}
                          >
                            {document.uploader_name}
                          </td>
                        )}

                        {/* UPDATED */}

                        <td
                          className={`whitespace-nowrap px-4 py-3 ${
                            isDark
                              ? 'text-[#c7cdd6]'
                              : 'text-[#3a3628]'
                          }`}
                        >
                          {formatDate(
                            document.updated_at,
                          )}
                        </td>

                        {/* STATUS */}

                        <td className="px-4 py-3">

                          {isArchived ? (
                            <span className="inline-flex items-center gap-1.5 text-[#9ca3af]">
                              <span className="h-1.5 w-1.5 rounded-full bg-[#9ca3af]" />
                              Archived
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-[#4ade80]">
                              <span className="h-1.5 w-1.5 rounded-full bg-[#4ade80]" />
                              Active
                            </span>
                          )}

                        </td>

                        {/* ACCESS */}

                        <td className="px-4 py-3">

                          <span
                            className={`rounded-full px-2.5 py-1 text-[11.5px] ${
                              isManagerOnly
                                ? isDark
                                  ? 'bg-[#33291b] text-[#e3a857]'
                                  : 'bg-[#f3e7ce] text-[#7a5b20]'
                                : isDark
                                  ? 'bg-[#1a2028] text-[#c7cdd6]'
                                  : 'bg-[#f0ece1] text-[#4a4536]'
                            }`}
                          >
                            {isManagerOnly
                              ? 'managers_only'
                              : 'all_employees'}
                          </span>

                        </td>

                        {/* ACTIONS */}

                        <td className="px-4 py-3">

                          <div className="flex items-center gap-3 whitespace-nowrap">

                            {/* VIEW */}

                            {!isArchived  && (
  <button
    onClick={() =>
      navigate(`/documents/${document.id}`)
    }
    className={`flex items-center gap-1.5 text-[12.5px] font-medium ${
      isDark
        ? 'text-[#c7cdd6] hover:text-white'
        : 'text-[#3a3628] hover:text-black'
    }`}
  >
    <Eye size={13} />
    View
  </button>
)}

                            {/* ASK AI */}

                            {!isArchived && (
                              <button
                                onClick={() =>
                                  askAIAboutDocument(
                                    document.id,
                                  )
                                }
                                className="flex items-center gap-1.5 text-[12.5px] font-medium text-[#e3a857] hover:underline"
                              >
                                <Bot size={13} />
                                Ask AI
                              </button>
                            )}

                            {/* MANAGER ACTIONS */}

                            {isManager && (
                              <>
                                {!isArchived && (
                                  <button
                                    onClick={() =>
                                      void archiveDocument(
                                        document,
                                      )
                                    }
                                    className={`flex items-center gap-1.5 text-[12.5px] font-medium ${
                                      isDark
                                        ? 'text-[#aeb5bf] hover:text-white'
                                        : 'text-[#6b6455] hover:text-black'
                                    }`}
                                  >
                                    <Archive
                                      size={13}
                                    />
                                    Archive
                                  </button>
                                )}

                                <button
                                  onClick={() =>
                                    void deleteDocument(
                                      document,
                                    )
                                  }
                                  className="flex items-center gap-1.5 text-[12.5px] font-medium text-red-500 hover:text-red-600"
                                >
                                  <Trash2
                                    size={13}
                                  />
                                  Delete
                                </button>
                              </>
                            )}

                          </div>

                        </td>

                      </tr>
                    )
                  },
                )}

            </tbody>
          </table>
        </div>

      </div>

      {/* =====================================================
          DEMO NOTICE
      ====================================================== */}

      <DemoNotice />

      {/* =====================================================
          UPLOAD MODAL
      ====================================================== */}

      {showUpload && (
        <UploadDocumentModal
          onClose={() => {
            setShowUpload(false)
            void loadDocuments()
          }}
        />
      )}
      
    </AppLayout>
  )
}