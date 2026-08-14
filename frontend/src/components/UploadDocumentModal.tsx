import { useState } from 'react'
import { X, UploadCloud } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useRequiredUser } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'

const departments = ['HR', 'IT', 'Finance', 'Operations', 'Engineering']

export default function UploadDocumentModal({
  onClose,
}: {
  onClose: () => void
}) {
  const { theme } = useTheme()
  const { user } = useRequiredUser()

  const isDark = theme === 'dark'

  const [file, setFile] = useState<File | null>(null)
  const [name, setName] = useState('')
  const [department, setDepartment] = useState('HR')
  const [version, setVersion] = useState('1.0')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<'Active' | 'Archived'>('Active')

  const [employees, setEmployees] = useState(true)
  const [managers, setManagers] = useState(true)
  const [restricted, setRestricted] = useState(false)
  const [restrictedDepartment, setRestrictedDepartment] = useState('')

  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fieldBg = isDark
    ? 'border-[#1c2430] bg-[#0d1119] text-[#e3e5e8]'
    : 'border-[#e8e1d3] bg-white text-[#1c2127]'

  const panelBg = isDark ? 'bg-[#10151c]' : 'bg-[#f7f2e9]'

  const handleFileChange = (selectedFile: File | null) => {
    if (!selectedFile) return

    const extension = selectedFile.name.split('.').pop()?.toLowerCase()

    if (extension !== 'pdf' && extension !== 'docx') {
      setError('Only PDF and DOCX files are supported.')
      return
    }

    if (selectedFile.size > 50 * 1024 * 1024) {
      setError('The file must be smaller than 50 MB.')
      return
    }

    setError(null)
    setFile(selectedFile)

    if (!name) {
      setName(selectedFile.name.replace(/\.(pdf|docx)$/i, ''))
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a PDF or DOCX file.')
      return
    }

    if (!name.trim()) {
      setError('Please enter a document name.')
      return
    }

    setUploading(true)
    setError(null)

    try {
      const extension = file.name.split('.').pop()?.toLowerCase()

      if (extension !== 'pdf' && extension !== 'docx') {
        throw new Error('Only PDF and DOCX files are supported.')
      }

      const type = extension as 'pdf' | 'docx'

      /*
       * Keep files inside a unique folder.
       * This prevents collisions between documents with the same filename.
       */
      const storagePath = `${crypto.randomUUID()}/${file.name}`

      const { error: storageError } = await supabase.storage
        .from('documents')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (storageError) {
        throw storageError
      }

      /*
       * Access is derived from the selected permissions.
       */
      let access: 'all_employees' | 'managers_only' | 'restricted'

      if (restricted) {
        access = 'restricted'
      } else if (employees) {
        access = 'all_employees'
      } else if (managers) {
        access = 'managers_only'
      } else {
        access = 'managers_only'
      }

      /*
       * Insert metadata into public.documents.
       */
      const { error: databaseError } = await supabase
        .from('documents')
        .insert({
          name: name.trim(),
          department,
          version: version.trim() || '1.0',
          status,
          access,
          restricted_department: restricted
            ? restrictedDepartment || null
            : null,
          type,
          size_bytes: file.size,
          pages: 0,
          description: description.trim(),
          storage_path: storagePath,
          uploaded_by: user.id,
        })

      if (databaseError) {
        /*
         * If the database insert fails, remove the uploaded file
         * so we don't leave an orphan file in Storage.
         */
        await supabase.storage.from('documents').remove([storagePath])

        throw databaseError
      }

      onClose()
    } catch (uploadError) {
      console.error(uploadError)

      setError(
        uploadError instanceof Error
          ? uploadError.message
          : 'Could not upload the document.',
      )
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8">
      <div
        className={`flex max-h-[88vh] w-full max-w-lg flex-col overflow-y-auto scrollbar-thin rounded-xl border p-6 ${
          isDark
            ? 'border-[#1c2430] bg-[#10151c] text-[#e3e5e8]'
            : 'border-[#e8e1d3] bg-[#f7f2e9] text-[#1c2127]'
        }`}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-[17px] font-semibold">Upload document</h2>

            <p
              className={`mt-1 max-w-sm text-[13px] leading-relaxed ${
                isDark ? 'text-[#8a92a0]' : 'text-[#6b6455]'
              }`}
            >
              PDF and DOCX files are indexed and become searchable by the AI
              assistant.
            </p>
          </div>

          <button
            onClick={onClose}
            disabled={uploading}
            className={
              isDark
                ? 'text-[#8a92a0] hover:text-white'
                : 'text-[#6b6455] hover:text-black'
            }
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* FILE PICKER */}
        <label
          className={`mt-5 flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed py-8 text-center ${
            isDark ? 'border-[#2a3340]' : 'border-[#d8cfba]'
          } ${panelBg}`}
        >
          <UploadCloud
            size={22}
            className={isDark ? 'text-[#8a92a0]' : 'text-[#6b6455]'}
          />

          <div className="text-[13.5px] font-medium">
            {file ? file.name : 'Drag & drop a file, or click to browse'}
          </div>

          <div
            className={`text-[12px] ${
              isDark ? 'text-[#6b7480]' : 'text-[#9a927e]'
            }`}
          >
            PDF or DOCX · up to 50 MB
          </div>

          <input
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            onChange={(event) =>
              handleFileChange(event.target.files?.[0] ?? null)
            }
          />
        </label>

        {/* DOCUMENT NAME */}
        <div className="mt-5">
          <label className="mb-1.5 block text-[13px] font-medium">
            Document name
          </label>

          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. International Travel Policy"
            className={`w-full rounded-md border px-3 py-2 text-[13.5px] outline-none focus:border-[#e3a857] ${fieldBg}`}
          />
        </div>

        {/* DEPARTMENT + VERSION */}
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-[13px] font-medium">
              Department
            </label>

            <select
              value={department}
              onChange={(event) => setDepartment(event.target.value)}
              className={`w-full rounded-md border px-3 py-2 text-[13.5px] outline-none ${fieldBg}`}
            >
              {departments.map((departmentName) => (
                <option key={departmentName}>{departmentName}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-medium">
              Version
            </label>

            <input
              value={version}
              onChange={(event) => setVersion(event.target.value)}
              className={`w-full rounded-md border px-3 py-2 text-[13.5px] outline-none ${fieldBg}`}
            />
          </div>
        </div>

        {/* DESCRIPTION */}
        <div className="mt-4">
          <label className="mb-1.5 block text-[13px] font-medium">
            Description
          </label>

          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            placeholder="What does this document cover?"
            className={`w-full resize-none rounded-md border px-3 py-2 text-[13.5px] outline-none ${fieldBg}`}
          />
        </div>

        {/* STATUS */}
        <div className="mt-4">
          <label className="mb-1.5 block text-[13px] font-medium">
            Status
          </label>

          <select
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as 'Active' | 'Archived')
            }
            className={`w-full rounded-md border px-3 py-2 text-[13.5px] outline-none ${fieldBg}`}
          >
            <option>Active</option>
            <option>Archived</option>
          </select>
        </div>

        {/* ACCESS */}
        <div
          className={`mt-5 rounded-lg border p-4 ${
            isDark
              ? 'border-[#1c2430] bg-[#0d1119]'
              : 'border-[#e8e1d3] bg-white'
          }`}
        >
          <div className="text-[13.5px] font-medium">
            Access permissions
          </div>

          <div className="mt-3 flex flex-col gap-2.5">
            <label className="flex items-center gap-2 text-[13.5px]">
              <input
                type="checkbox"
                checked={employees}
                onChange={() => setEmployees((value) => !value)}
                className="h-4 w-4 accent-[#0f3d3d]"
              />
              Employees
            </label>

            <label className="flex items-center gap-2 text-[13.5px]">
              <input
                type="checkbox"
                checked={managers}
                onChange={() => setManagers((value) => !value)}
                className="h-4 w-4 accent-[#0f3d3d]"
              />
              Managers
            </label>

            <label className="flex items-center gap-2 text-[13.5px]">
              <input
                type="checkbox"
                checked={restricted}
                onChange={() => setRestricted((value) => !value)}
                className="h-4 w-4 accent-[#0f3d3d]"
              />
              Restricted to a specific department
            </label>

            {restricted && (
              <select
                value={restrictedDepartment}
                onChange={(event) =>
                  setRestrictedDepartment(event.target.value)
                }
                className={`mt-1 w-full rounded-md border px-3 py-2 text-[13.5px] outline-none ${fieldBg}`}
              >
                <option value="">Select department</option>

                {departments.map((departmentName) => (
                  <option key={departmentName}>{departmentName}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* ERROR */}
        {error && (
          <div className="mt-4 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-[12.5px] text-red-400">
            {error}
          </div>
        )}

        {/* BUTTONS */}
        <div className="mt-6 flex justify-end gap-2.5">
          <button
            onClick={onClose}
            disabled={uploading}
            className={`rounded-md border px-4 py-2 text-[13px] font-medium ${
              isDark
                ? 'border-[#2a3340] text-[#e3e5e8] hover:bg-[#141a22]'
                : 'border-[#d8cfba] text-[#1c2127] hover:bg-[#efe6d8]'
            }`}
          >
            Cancel
          </button>

          <button
            onClick={() => void handleUpload()}
            disabled={uploading}
            className="rounded-md bg-[#0f3d3d] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#134949] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : 'Upload document'}
          </button>
        </div>
      </div>
    </div>
  )
}