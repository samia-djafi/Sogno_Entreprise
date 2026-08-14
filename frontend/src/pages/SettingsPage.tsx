import { useEffect, useState } from 'react'
import { Sun, Moon, Loader2 } from 'lucide-react'

import AppLayout from '../components/AppLayout'
import DemoNotice from '../components/DemoNotice'
import { useTheme } from '../context/ThemeContext'
import { useRequiredUser } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'


type UserSettings = {
  user_id: string
  citations: boolean
  grounding: boolean
  history: boolean
}

function Toggle({
  checked,
  onChange,
  disabled = false,
}: {
  checked: boolean
  onChange: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      disabled={disabled}
      className={`
        group relative flex h-7 w-12 shrink-0 items-center rounded-full
        p-0.5 transition-all duration-200 ease-out
        focus:outline-none focus-visible:ring-2
        focus-visible:ring-[#e3a857]/50
        disabled:cursor-not-allowed disabled:opacity-50
        ${
          checked
            ? 'bg-[#e3a857] shadow-[0_0_0_1px_rgba(227,168,87,0.25),0_2px_8px_rgba(227,168,87,0.18)]'
            : 'bg-[#252c36] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]'
        }
      `}
    >
      <span
        className={`
          block h-6 w-6 rounded-full
          bg-white shadow-[0_1px_3px_rgba(0,0,0,0.25)]
          transition-transform duration-200 ease-out
          ${
            checked
              ? 'translate-x-5'
              : 'translate-x-0'
          }
        `}
      />
    </button>
  )
}

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme()
  const { user } = useRequiredUser()

  const isDark = theme === 'dark'

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [roleLabel, setRoleLabel] = useState('')
  const [department, setDepartment] = useState('')

  const [citations, setCitations] = useState(true)
  const [grounding, setGrounding] = useState(true)
  const [history, setHistory] = useState(true)

  const [loadingProfile, setLoadingProfile] = useState(true)
  const [loadingSettings, setLoadingSettings] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingSetting, setSavingSetting] = useState(false)

  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)


  const cardBg = isDark
    ? 'border-[#1c2430] bg-[#10151c]'
    : 'border-[#e8e1d3] bg-white'


  const muted = isDark
    ? 'text-[#8a92a0]'
    : 'text-[#6b6455]'


  const inputClass = isDark
    ? 'border-[#1c2430] bg-[#0d1119] text-[#c7cdd6]'
    : 'border-[#e8e1d3] bg-[#f7f2e9] text-[#3a3628]'


  /*
   * Load the real profile from Supabase.
   */
  useEffect(() => {
    const loadProfile = async () => {
      setLoadingProfile(true)
      setError(null)

      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, email, role, department')
        .eq('id', user.id)
        .single()

      if (profileError) {
        console.error('Failed to load profile:', profileError)

        /*
         * Email can still come from the authenticated Supabase user.
         */
        setEmail(user.email || '')
        setFullName(user.name || '')
        setRoleLabel(user.roleLabel || '')
        setDepartment(user.department || '')

        setError('Unable to load your profile from the database.')
      } else {
        setFullName(data?.full_name || '')
        setEmail(data?.email || user.email || '')
        setDepartment(data?.department || '')

        const role = data?.role || ''

        setRoleLabel(
          role
            ? role.charAt(0).toUpperCase() + role.slice(1)
            : ''
        )
      }

      setLoadingProfile(false)
    }

    void loadProfile()
  }, [
    user.id,
    user.email,
    user.name,
    user.roleLabel,
    user.department,
  ])


  /*
   * Load real AI preferences from Supabase.
   */
  useEffect(() => {
    const loadSettings = async () => {
      setLoadingSettings(true)

      const { data, error: settingsError } = await supabase
        .from('user_settings')
        .select('user_id, citations, grounding, history')
        .eq('user_id', user.id)
        .maybeSingle()

      if (settingsError) {
        console.error(
          'Failed to load user settings:',
          settingsError
        )

        setError(
          'Unable to load your assistant preferences.'
        )

        setLoadingSettings(false)
        return
      }

      /*
       * If no settings row exists yet, create the default
       * settings for this user.
       */
      if (!data) {
        const defaults: UserSettings = {
          user_id: user.id,
          citations: true,
          grounding: true,
          history: true,
        }

        const { error: insertError } = await supabase
          .from('user_settings')
          .insert(defaults)

        if (insertError) {
          console.error(
            'Failed to create default settings:',
            insertError
          )

          setError(
            'Unable to create your assistant preferences.'
          )
        }

        setCitations(true)
        setGrounding(true)
        setHistory(true)
      } else {
        setCitations(data.citations)
        setGrounding(data.grounding)
        setHistory(data.history)
      }

      setLoadingSettings(false)
    }

    void loadSettings()
  }, [user.id])


  /*
   * Save profile changes.
   */
  const handleSaveProfile = async () => {
    setSavingProfile(true)
    setMessage(null)
    setError(null)

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim(),
        email: email.trim(),
      })
      .eq('id', user.id)

    if (updateError) {
      console.error(
        'Failed to save profile:',
        updateError
      )

      setError('Unable to save your profile changes.')
    } else {
      setMessage('Profile changes saved.')
    }

    setSavingProfile(false)
  }


  /*
   * Save one AI preference immediately.
   */
  const updateSetting = async (
    field: 'citations' | 'grounding' | 'history',
    value: boolean
  ) => {
    setSavingSetting(true)
    setMessage(null)
    setError(null)

    /*
     * Optimistic UI update.
     */
    if (field === 'citations') {
      setCitations(value)
    }

    if (field === 'grounding') {
      setGrounding(value)
    }

    if (field === 'history') {
      setHistory(value)
    }

    const { error: updateError } = await supabase
      .from('user_settings')
      .upsert(
        {
          user_id: user.id,
          [field]: value,
        },
        {
          onConflict: 'user_id',
        }
      )

    if (updateError) {
      console.error(
        `Failed to update ${field}:`,
        updateError
      )

      /*
       * Revert optimistic change.
       */
      if (field === 'citations') {
        setCitations((current) => !current)
      }

      if (field === 'grounding') {
        setGrounding((current) => !current)
      }

      if (field === 'history') {
        setHistory((current) => !current)
      }

      setError(
        'Unable to save that preference.'
      )
    }

    setSavingSetting(false)
  }


  const initials =
    fullName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'U'


  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl px-8 py-8">

        {/* Header */}
        <h1 className="text-[22px] font-semibold">
          Settings
        </h1>

        <p className={`mt-1 text-[13.5px] ${muted}`}>
          Your profile and assistant preferences.
        </p>


        {/* Global message */}
        {error && (
          <div
            className={`mt-4 rounded-lg border px-4 py-3 text-[13px] ${
              isDark
                ? 'border-red-900/50 bg-red-950/20 text-red-300'
                : 'border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {error}
          </div>
        )}

        {message && (
          <div
            className={`mt-4 rounded-lg border px-4 py-3 text-[13px] ${
              isDark
                ? 'border-[#24533f] bg-[#10251d] text-[#72d6a2]'
                : 'border-[#cfe4d8] bg-[#eef8f2] text-[#28704a]'
            }`}
          >
            {message}
          </div>
        )}


        {/* =====================================================
            PROFILE
        ====================================================== */}

        <div className={`mt-6 rounded-xl border p-6 ${cardBg}`}>

          <h2 className="text-[15px] font-semibold">
            Profile
          </h2>

          <p className={`mt-1 text-[13px] ${muted}`}>
            Your workspace identity and department.
          </p>


          {loadingProfile ? (
            <div
              className={`mt-5 flex items-center gap-2 text-[13px] ${muted}`}
            >
              <Loader2
                size={15}
                className="animate-spin"
              />
              Loading profile...
            </div>
          ) : (
            <>
              {/* Avatar */}
              <div className="mt-4 flex items-center gap-3">

                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#3a2c17] text-[13px] font-semibold text-[#e3a857]">
                  {initials}
                </div>

                <div>
                  <div className="text-[14px] font-medium">
                    {fullName || 'Unnamed user'}
                  </div>

                  <div className={`text-[12.5px] ${muted}`}>
                    {roleLabel || 'User'}
                    {department
                      ? ` · ${department}`
                      : ''}
                  </div>
                </div>

              </div>


              {/* Profile fields */}
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">

                <div>
                  <label
                    className={`mb-1.5 block text-[13px] font-medium ${
                      isDark
                        ? 'text-[#c7cdd6]'
                        : 'text-[#3a3628]'
                    }`}
                  >
                    Full name
                  </label>

                  <input
                    value={fullName}
                    onChange={(event) =>
                      setFullName(event.target.value)
                    }
                    className={`w-full rounded-md border px-3 py-2 text-[13.5px] outline-none ${inputClass}`}
                  />
                </div>


                <div>
                  <label
                    className={`mb-1.5 block text-[13px] font-medium ${
                      isDark
                        ? 'text-[#c7cdd6]'
                        : 'text-[#3a3628]'
                    }`}
                  >
                    Work email
                  </label>

                  <input
                    value={email}
                    onChange={(event) =>
                      setEmail(event.target.value)
                    }
                    className={`w-full rounded-md border px-3 py-2 text-[13.5px] outline-none ${inputClass}`}
                  />
                </div>

              </div>


              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className="mt-4 flex items-center gap-2 rounded-md bg-[#e3a857] px-4 py-2 text-[13px] font-semibold text-[#1a1207] hover:bg-[#eab668] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingProfile && (
                  <Loader2
                    size={14}
                    className="animate-spin"
                  />
                )}

                {savingProfile
                  ? 'Saving...'
                  : 'Save changes'}
              </button>
            </>
          )}
        </div>


        {/* =====================================================
            APPEARANCE
        ====================================================== */}

        <div className={`mt-4 rounded-xl border p-6 ${cardBg}`}>

          <h2 className="text-[15px] font-semibold">
            Appearance
          </h2>

          <div className="mt-3 flex gap-2">

            <button
              type="button"
              onClick={() => isDark && toggleTheme()}
              className={`flex items-center gap-2 rounded-md border px-4 py-2 text-[13px] font-medium ${
                !isDark
                  ? 'border-[#e3a857] text-[#e3a857]'
                  : 'border-[#2a3340] text-[#c7cdd6]'
              }`}
            >
              <Sun size={15} />
              Light Mode
            </button>


            <button
              type="button"
              onClick={() => !isDark && toggleTheme()}
              className={`flex items-center gap-2 rounded-md border px-4 py-2 text-[13px] font-medium ${
                isDark
                  ? 'border-[#e3a857] text-[#e3a857]'
                  : 'border-[#d8cfba] text-[#3a3628]'
              }`}
            >
              <Moon size={15} />
              Dark Mode
            </button>

          </div>
        </div>


        {/* =====================================================
            AI ASSISTANT
        ====================================================== */}

        <div className={`mt-4 rounded-xl border p-6 ${cardBg}`}>

          <h2 className="text-[15px] font-semibold">
            AI assistant
          </h2>

          <p className={`mt-1 text-[13px] ${muted}`}>
            How the assistant answers your questions.
          </p>


          {loadingSettings ? (
            <div
              className={`mt-5 flex items-center gap-2 text-[13px] ${muted}`}
            >
              <Loader2
                size={15}
                className="animate-spin"
              />
              Loading assistant preferences...
            </div>
          ) : (
            <>
              <SettingRow
                title="Always show citations"
                desc="Display the source document and page under every answer."
                checked={citations}
                disabled={savingSetting}
                onChange={() =>
                  updateSetting(
                    'citations',
                    !citations
                  )
                }
                isDark={isDark}
              />

              <SettingRow
                title="Strict grounding"
                desc="Refuse to answer when no supporting company document is found."
                checked={grounding}
                disabled={savingSetting}
                onChange={() =>
                  updateSetting(
                    'grounding',
                    !grounding
                  )
                }
                isDark={isDark}
              />

              <SettingRow
                title="Save conversation history"
                desc="Keep your conversations available in the assistant sidebar."
                checked={history}
                disabled={savingSetting}
                onChange={() =>
                  updateSetting(
                    'history',
                    !history
                  )
                }
                isDark={isDark}
                last
              />
            </>
          )}

        </div>

      </div>

      <DemoNotice />
    </AppLayout>
  )
}


/* =========================================================
   SETTING ROW
========================================================= */

function SettingRow({
  title,
  desc,
  checked,
  onChange,
  isDark,
  last,
  disabled,
}: {
  title: string
  desc: string
  checked: boolean
  onChange: () => void
  isDark: boolean
  last?: boolean
  disabled?: boolean
}) {
  return (
    <div
      className={`flex items-center justify-between py-4 ${
        !last
          ? `border-b ${
              isDark
                ? 'border-[#1c2430]'
                : 'border-[#e8e1d3]'
            }`
          : ''
      }`}
    >
      <div className="pr-6">

        <div className="text-[13.5px] font-medium">
          {title}
        </div>

        <div
          className={`mt-0.5 text-[12.5px] ${
            isDark
              ? 'text-[#8a92a0]'
              : 'text-[#6b6455]'
          }`}
        >
          {desc}
        </div>

      </div>

      <Toggle
        checked={checked}
        onChange={onChange}
        disabled={disabled}
      />
    </div>
  )
}