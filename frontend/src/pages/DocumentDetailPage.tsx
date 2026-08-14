import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  FileText,
  Download,
  ExternalLink,
  Send,
  History,
} from 'lucide-react'
import AppLayout from '../components/AppLayout'
import {
  supabase,
  type DocumentRow,
} from '../lib/supabaseClient'
import { useTheme } from '../context/ThemeContext'

export default function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { theme } = useTheme()

  const isDark = theme === 'dark'

  const [document, setDocument] =
    useState<DocumentRow | null>(null)

  const [fileUrl, setFileUrl] =
    useState<string | null>(null)

  const [loading, setLoading] = useState(true)

  const [error, setError] =
    useState<string | null>(null)

  const [question, setQuestion] =
    useState('')

  /*
   * =========================================================
   * LOAD DOCUMENT
   * =========================================================
   */

  useEffect(() => {
    const loadDocument = async () => {
      if (!id) {
        setError('Document ID is missing.')
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      const {
        data,
        error: documentError,
      } = await supabase
        .from('documents')
        .select('*')
        .eq('id', id)
        .single()

      if (documentError) {
        console.error(
          'Document loading error:',
          documentError,
        )

        setError('Could not find this document.')
        setLoading(false)
        return
      }

      const documentRow = data as DocumentRow

      setDocument(documentRow)

      /*
       * =======================================================
       * PRIVATE STORAGE
       *
       * We only create a signed URL so the Open and Download
       * buttons can access the actual file.
       *
       * We DO NOT display the file inside this page.
       * =======================================================
       */

      const {
        data: signedUrlData,
        error: signedUrlError,
      } = await supabase.storage
        .from('documents')
        .createSignedUrl(
          documentRow.storage_path,
          60 * 60,
        )

      if (signedUrlError) {
        console.error(
          'Signed URL error:',
          signedUrlError,
        )

        setError(
          'Could not access the document file.',
        )

        setLoading(false)
        return
      }

      setFileUrl(
        signedUrlData.signedUrl,
      )

      setLoading(false)
    }

    void loadDocument()
  }, [id])

  /*
   * =========================================================
   * OPEN DOCUMENT
   * =========================================================
   */

  const handleOpen = () => {
    if (!fileUrl) return

    window.open(
      fileUrl,
      '_blank',
      'noopener,noreferrer',
    )
  }

  /*
   * =========================================================
   * DOWNLOAD DOCUMENT
   * =========================================================
   */

  const handleDownload = () => {
    if (!fileUrl) return

    const link =
      window.document.createElement('a')

    link.href = fileUrl
    link.download =
      document?.name ?? 'document'

    link.target = '_blank'
    link.rel = 'noopener noreferrer'

    link.click()
  }

  /*
   * =========================================================
   * ASK AI ABOUT THIS DOCUMENT
   *
   * QUICK QUESTION:
   *
   * /assistant?document=DOCUMENT_ID&question=QUESTION
   *
   * MANUAL QUESTION:
   *
   * /assistant?document=DOCUMENT_ID&question=QUESTION
   *
   * The Assistant page will later read both values.
   * =========================================================
   */

  const askQuestion = (text?: string) => {
  const question = text?.trim()

  if (!question || !document?.id) {
    return
  }

  const params = new URLSearchParams({
    new: String(Date.now()),
    document: document.id,
    question,
  })

  navigate(`/assistant?${params.toString()}`)
}

  /*
   * =========================================================
   * LOADING
   * =========================================================
   */

  if (loading) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-6xl px-8 py-8">

          <div
            className={`rounded-xl border p-10 text-center ${
              isDark
                ? 'border-[#1c2430] bg-[#10151c] text-[#8a92a0]'
                : 'border-[#e8e1d3] bg-white text-[#6b6455]'
            }`}
          >
            Loading document...
          </div>

        </div>
      </AppLayout>
    )
  }

  /*
   * =========================================================
   * ERROR
   * =========================================================
   */

  if (error || !document) {
    return (
      <AppLayout>

        <div className="mx-auto max-w-6xl px-8 py-8">

          <button
            onClick={() =>
              navigate('/documents')
            }
            className={`mb-6 flex items-center gap-2 text-[13px] ${
              isDark
                ? 'text-[#c7cdd6] hover:text-white'
                : 'text-[#3a3628] hover:text-black'
            }`}
          >
            <ArrowLeft size={15} />
            Back to documents
          </button>

          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-8 text-center text-red-400">
            {error ?? 'Document not found.'}
          </div>

        </div>

      </AppLayout>
    )
  }

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

        <div className="mb-6 flex items-start justify-between">

          {/* LEFT */}

          <div>

            <button
              onClick={() =>
                navigate('/documents')
              }
              className={`mb-4 flex items-center gap-2 text-[13px] ${
                isDark
                  ? 'text-[#8a92a0] hover:text-white'
                  : 'text-[#6b6455] hover:text-black'
              }`}
            >
              <ArrowLeft size={15} />
              Back to documents
            </button>

            <div className="flex items-center gap-3">

              {/* FILE ICON */}

              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#3a1f1f] text-[#e07a6f]">
                <FileText size={18} />
              </div>

              {/* DOCUMENT NAME */}

              <div>

                <h1 className="text-[22px] font-semibold">
                  {document.name}
                </h1>

                <p
                  className={`mt-1 text-[13px] ${
                    isDark
                      ? 'text-[#8a92a0]'
                      : 'text-[#6b6455]'
                  }`}
                >
                  {document.department} · v
                  {document.version}
                </p>

              </div>

            </div>

          </div>

          {/* =================================================
              RIGHT BUTTONS
          ================================================== */}

          <div className="flex gap-2">

            {/* OPEN */}

            <button
              onClick={handleOpen}
              disabled={!fileUrl}
              className={`flex items-center gap-2 rounded-md border px-3.5 py-2 text-[13px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                isDark
                  ? 'border-[#2a3340] bg-[#10151c] text-[#e3e5e8] hover:bg-[#171e27]'
                  : 'border-[#d8cfba] bg-white text-[#1c2127] hover:bg-[#efe6d8]'
              }`}
            >
              <ExternalLink size={14} />
              Open
            </button>

            {/* DOWNLOAD */}

            <button
              onClick={handleDownload}
              disabled={!fileUrl}
              className="flex items-center gap-2 rounded-md bg-[#0f3d3d] px-3.5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#134949] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download size={14} />
              Download
            </button>

          </div>

        </div>

        {/* =====================================================
            TWO COLUMN CONTENT
        ====================================================== */}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.35fr_1fr]">

          {/* ===================================================
              LEFT — DOCUMENT INFORMATION
          ==================================================== */}

          <div
            className={`rounded-xl border p-6 ${
              isDark
                ? 'border-[#1c2430] bg-[#10151c]'
                : 'border-[#e8e1d3] bg-white'
            }`}
          >

            <h2 className="text-[15px] font-semibold">
              Document information
            </h2>

            <p
              className={`mt-1 text-[13px] ${
                isDark
                  ? 'text-[#8a92a0]'
                  : 'text-[#6b6455]'
              }`}
            >
              Information about this company document.
            </p>

            {/* DESCRIPTION */}

            <div
              className={`mt-5 rounded-lg border p-5 ${
                isDark
                  ? 'border-[#2a3340] bg-[#0d1119]'
                  : 'border-[#e8e1d3] bg-[#fcfaf6]'
              }`}
            >

              <div
                className={`text-[14px] font-medium ${
                  isDark
                    ? 'text-[#e3e5e8]'
                    : 'text-[#102f3d]'
                }`}
              >
                {document.name}
              </div>

              <p
                className={`mt-3 text-[13.5px] leading-6 ${
                  isDark
                    ? 'text-[#aab2bf]'
                    : 'text-[#5f594b]'
                }`}
              >
                {document.description ||
                  'No description is available for this document.'}
              </p>

            </div>

            {/* =================================================
                METADATA
            ================================================== */}

            <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-5">

              <div>

                <div
                  className={`text-[10.5px] uppercase tracking-wide ${
                    isDark
                      ? 'text-[#6b7480]'
                      : 'text-[#9a927e]'
                  }`}
                >
                  Department
                </div>

                <div className="mt-1 text-[13px] font-medium">
                  {document.department}
                </div>

              </div>

              <div>

                <div
                  className={`text-[10.5px] uppercase tracking-wide ${
                    isDark
                      ? 'text-[#6b7480]'
                      : 'text-[#9a927e]'
                  }`}
                >
                  Version
                </div>

                <div className="mt-1 text-[13px] font-medium">
                  {document.version}
                </div>

              </div>

              <div>

                <div
                  className={`text-[10.5px] uppercase tracking-wide ${
                    isDark
                      ? 'text-[#6b7480]'
                      : 'text-[#9a927e]'
                  }`}
                >
                  Status
                </div>

                <div className="mt-1 text-[13px] font-medium">
                  {document.status}
                </div>

              </div>

              <div>

                <div
                  className={`text-[10.5px] uppercase tracking-wide ${
                    isDark
                      ? 'text-[#6b7480]'
                      : 'text-[#9a927e]'
                  }`}
                >
                  Access
                </div>

                <div className="mt-1 text-[13px] font-medium">
                  {document.access}
                </div>

              </div>

            </div>

            {/* =================================================
                VERSION HISTORY
            ================================================== */}

            <div
              className={`mt-6 border-t pt-5 ${
                isDark
                  ? 'border-[#2a3340]'
                  : 'border-[#e8e1d3]'
              }`}
            >

              <div className="flex items-center gap-2">

                <History
                  size={15}
                  className={
                    isDark
                      ? 'text-[#8a92a0]'
                      : 'text-[#6b6455]'
                  }
                />

                <h3 className="text-[13.5px] font-medium">
                  Version history
                </h3>

              </div>

              <div className="mt-4 flex items-start justify-between">

                <div>

                  <div className="text-[13px] font-medium">
                    v{document.version}
                  </div>

                  <div
                    className={`mt-1 text-[12px] ${
                      isDark
                        ? 'text-[#8a92a0]'
                        : 'text-[#6b6455]'
                    }`}
                  >
                    Current version
                  </div>

                </div>

                <div
                  className={`text-[12px] ${
                    isDark
                      ? 'text-[#8a92a0]'
                      : 'text-[#6b6455]'
                  }`}
                >
                  {document.updated_at
                    ? new Date(
                        document.updated_at,
                      ).toLocaleDateString()
                    : ''}
                </div>

              </div>

            </div>

          </div>

          {/* ===================================================
              RIGHT — ASK AI
          ==================================================== */}

          <div
            className={`rounded-xl border p-6 ${
              isDark
                ? 'border-[#1c2430] bg-[#10151c]'
                : 'border-[#e8e1d3] bg-white'
            }`}
          >

            <h2 className="text-[15px] font-semibold">
              Ask about this document
            </h2>

            <p
              className={`mt-1 text-[13px] ${
                isDark
                  ? 'text-[#8a92a0]'
                  : 'text-[#6b6455]'
              }`}
            >
              Ask the AI Assistant a question about this
              document.
            </p>

            {/* =================================================
                QUICK QUESTIONS
            ================================================== */}

            <div className="mt-5 flex flex-col items-start gap-2">

              <button
                onClick={() =>
                  askQuestion(
                    'Summarize this document in five bullet points.',
                  )
                }
                className={`rounded-full border px-3 py-2 text-left text-[12px] transition-colors ${
                  isDark
                    ? 'border-[#2a3340] text-[#c7cdd6] hover:bg-[#171e27]'
                    : 'border-[#ddd5c6] text-[#3a3628] hover:bg-[#f7f2e9]'
                }`}
              >
                Summarize this document in five bullet points.
              </button>

              <button
                onClick={() =>
                  askQuestion(
                    'What are the three most important rules?',
                  )
                }
                className={`rounded-full border px-3 py-2 text-left text-[12px] transition-colors ${
                  isDark
                    ? 'border-[#2a3340] text-[#c7cdd6] hover:bg-[#171e27]'
                    : 'border-[#ddd5c6] text-[#3a3628] hover:bg-[#f7f2e9]'
                }`}
              >
                What are the three most important rules?
              </button>

              <button
                onClick={() =>
                  askQuestion(
                    'What does this document say about remote work?',
                  )
                }
                className={`rounded-full border px-3 py-2 text-left text-[12px] transition-colors ${
                  isDark
                    ? 'border-[#2a3340] text-[#c7cdd6] hover:bg-[#171e27]'
                    : 'border-[#ddd5c6] text-[#3a3628] hover:bg-[#f7f2e9]'
                }`}
              >
                What does this document say about remote work?
              </button>

              <button
                onClick={() =>
                  askQuestion(
                    'Who approves exceptions, and how?',
                  )
                }
                className={`rounded-full border px-3 py-2 text-left text-[12px] transition-colors ${
                  isDark
                    ? 'border-[#2a3340] text-[#c7cdd6] hover:bg-[#171e27]'
                    : 'border-[#ddd5c6] text-[#3a3628] hover:bg-[#f7f2e9]'
                }`}
              >
                Who approves exceptions, and how?
              </button>

            </div>

            {/* =================================================
                QUESTION INPUT
            ================================================== */}

            <div className="mt-5 flex gap-2">

              <input
                value={question}
                onChange={(event) =>
                  setQuestion(event.target.value)
                }
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    askQuestion()
                  }
                }}
                placeholder="Ask a question about this document..."
                className={`h-10 min-w-0 flex-1 rounded-md border px-3 text-[13px] outline-none ${
                  isDark
                    ? 'border-[#2a3340] bg-[#0d1119] text-[#e3e5e8] placeholder:text-[#6b7480] focus:border-[#3d4a5a]'
                    : 'border-[#ddd5c6] bg-white text-[#1c2127] placeholder:text-[#9a927e] focus:border-[#bfb5a2]'
                }`}
              />

              <button
                onClick={() =>
                  askQuestion()
                }
                disabled={!question.trim()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#005c6b] text-white transition-colors hover:bg-[#006d7d] disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Send question to AI Assistant"
                title="Ask AI Assistant"
              >
                <Send size={15} />
              </button>

            </div>

            {/* =================================================
                INFO
            ================================================== */}

            <p
              className={`mt-4 text-[12px] ${
                isDark
                  ? 'text-[#8a92a0]'
                  : 'text-[#6b6455]'
              }`}
            >
              Your question will be sent to the AI Assistant
              with this document selected as the context.
            </p>

          </div>

        </div>

      </div>

    </AppLayout>
  )
}