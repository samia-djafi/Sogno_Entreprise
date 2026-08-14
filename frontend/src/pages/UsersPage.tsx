import {
  useEffect,
  useMemo,
  useState } from 'react'
import {
  Search,
  ChevronDown,
  Download
} from 'lucide-react'

import AppLayout from '../components/AppLayout'
import DemoNotice from '../components/DemoNotice'

import {
  supabase,
  type ProfileRow,
} from '../lib/supabaseClient'

import { useTheme } from '../context/ThemeContext'
import { useRequiredUser } from '../context/AuthContext'

const PROTECTED_ADMIN_EMAIL =
  'djafi.samia16@gmail.com'


export default function UsersPage() {
  const { theme } = useTheme()
  const { user } = useRequiredUser()

  const isDark = theme === 'dark'
  const isManager = user.role === 'manager'
  const isAdmin = user.role === 'admin'

  const muted = isDark
    ? 'text-[#8a92a0]'
    : 'text-[#6b6455]'

  const [users, setUsers] = useState<ProfileRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] =
    useState('All roles')

  /* =========================================================
     LOAD USERS FROM SUPABASE
     ========================================================= */

  const loadUsers = async () => {
    setLoading(true)
    setError(null)

    const { data, error: usersError } =
      await supabase
        .from('profiles')
        .select('*')
        .order('created_at', {
          ascending: true,
        })

    if (usersError) {
      console.error(
        'Failed to load users:',
        usersError
      )

      setError('Could not load users.')
      setUsers([])
      setLoading(false)

      return
    }

    setUsers(
      (data ?? []) as ProfileRow[]
    )

    setLoading(false)
  }

  useEffect(() => {
    void loadUsers()
  }, [])

  /* =========================================================
     PROTECTED ADMIN
     ========================================================= */

  const isProtectedAdmin = (
    profile: ProfileRow
  ) => {
    return (
      profile.email.toLowerCase() ===
      PROTECTED_ADMIN_EMAIL.toLowerCase()
    )
  }

  /* =========================================================
     CHANGE ROLE
     ========================================================= */

  const setRole = async (
    id: string,
    role: ProfileRow['role']
  ) => {
    /*
     * Only admins and managers can
     * change roles.
     */

    if (!isManager && !isAdmin) {
      return
    }

    const profile = users.find(
      (userProfile) =>
        userProfile.id === id
    )

    if (!profile) {
      return
    }

    /*
     * The main Samia administrator account
     * can NEVER be modified.
     */

    if (isProtectedAdmin(profile)) {
      setError(
        'This administrator account is protected and cannot be modified.'
      )

      return
    }

    /*
     * Nobody can change their own role.
     */

    if (id === user.id) {
      setError(
        'You cannot change your own role.'
      )

      return
    }

    /*
     * Don't perform an unnecessary update.
     */

    if (profile.role === role) {
      return
    }

    setError(null)

    const previousUsers = users

    /*
     * Optimistic UI update.
     */

    setUsers((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              role,
            }
          : item
      )
    )

    /*
     * Update Supabase.
     */

    const { error: updateError } =
      await supabase
        .from('profiles')
        .update({
          role,
        })
        .eq('id', id)

    if (updateError) {
      console.error(
        'Failed to update role:',
        updateError
      )

      /*
       * Restore previous state.
       */

      setUsers(previousUsers)

      setError(
        'Unable to update this user role.'
      )
    }
  }

  /* =========================================================
     FILTER USERS
     ========================================================= */

  const filteredUsers = useMemo(() => {
    const searchValue =
      search.trim().toLowerCase()

    return users.filter((profile) => {
      const matchesSearch =
        !searchValue ||
        profile.full_name
          .toLowerCase()
          .includes(searchValue) ||
        profile.email
          .toLowerCase()
          .includes(searchValue) ||
        profile.department
          .toLowerCase()
          .includes(searchValue)

      if (!matchesSearch) {
        return false
      }

      if (
        roleFilter !== 'All roles' &&
        profile.role !==
          roleFilter.toLowerCase()
      ) {
        return false
      }

      return true
    })
  }, [
    users,
    search,
    roleFilter,
  ])

  /* =========================================================
     FORMAT DATE
     ========================================================= */

  const formatDate = (date: string) => {
    return new Date(
      date
    ).toLocaleDateString()
  }

  const handleExportUsers = () => {
    if (!users.length) {
      return
    }

    const headers = [
      'Full Name',
      'Email',
      'Department',
      'Role',
      'Initials',
    ]

    const escapeCsv = (value: unknown) => {
      const text = String(value ?? '')
      return `"${text.replace(/"/g, '""')}"`
    }

    const rows = users.map((user) => [
      user.full_name,
      user.email,
      user.department,
      user.role,
      user.initials,
    ])

    const csv = [
      headers.map(escapeCsv).join(','),
      ...rows.map((row) =>
        row.map(escapeCsv).join(',')
      ),
    ].join('\r\n')

    const blob = new Blob([`\uFEFF${csv}`], {
      type: 'text/csv;charset=utf-8;',
    })

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = `users-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`

    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  /* =========================================================
     PAGE
     ========================================================= */

  return (
    <AppLayout>
      <div className="mx-auto max-w-6xl px-8 py-8">

        {/* =====================================================
            HEADER
        ====================================================== */}

        <div className="flex items-start justify-between">

          <div>
            <h1 className="text-[22px] font-semibold">
              Users &amp; access
            </h1>

            <p
              className={`mt-1 text-[13.5px] ${muted}`}
            >
              Assign roles and control who can
              query which parts of the knowledge
              base.
            </p>
          </div>

          <button
            type="button"
            onClick={handleExportUsers}
            disabled={!users.length}
            className="flex items-center gap-2 rounded-md bg-[#0f3d3d] px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-[#134949] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download size={14} />
            Export Users
          </button>

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
            className={`flex min-w-[220px] flex-1 items-center gap-2 rounded-md border px-3 py-2 text-[13px] ${
              isDark
                ? 'border-[#1c2430] bg-[#10151c] text-[#6b7480]'
                : 'border-[#e8e1d3] bg-white text-[#9a927e]'
            }`}
          >
            <Search size={15} />

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search by name, email or department..."
              className={`w-full bg-transparent outline-none ${
                isDark
                  ? 'text-[#e3e5e8] placeholder:text-[#6b7480]'
                  : 'text-[#1c2127] placeholder:text-[#9a927e]'
              }`}
            />
          </div>

          {/* ROLE FILTER */}

          <div className="relative">

            <select
              value={roleFilter}
              onChange={(event) =>
                setRoleFilter(
                  event.target.value
                )
              }
              className={`appearance-none rounded-md border py-2 pl-3 pr-8 text-[13px] outline-none ${
                isDark
                  ? 'border-[#1c2430] bg-[#10151c] text-[#c7cdd6]'
                  : 'border-[#e8e1d3] bg-white text-[#1c2127]'
              }`}
            >
              <option value="All roles">
                All roles
              </option>

              <option value="Employee">
                Employee
              </option>

              <option value="Manager">
                Manager
              </option>

              <option value="Admin">
                Admin
              </option>
            </select>

            <ChevronDown
              size={14}
              className={`pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 ${
                isDark
                  ? 'text-[#8a92a0]'
                  : 'text-[#6b6455]'
              }`}
            />

          </div>
        </div>

        {/* =====================================================
            USER TABLE
        ====================================================== */}

        <div
          className={`mt-5 overflow-x-auto rounded-xl border ${
            isDark
              ? 'border-[#1c2430]'
              : 'border-[#e8e1d3]'
          }`}
        >
        

<table className="w-full border-collapse text-left text-[13px]">

            {/* TABLE HEADER */}

            <thead>
              <tr
                className={
                  isDark
                    ? 'bg-[#10151c] text-[#8a92a0]'
                    : 'bg-[#f7f2e9] text-[#6b6455]'
                }
              >
                <th className="px-4 py-3 font-medium">
                  User
                </th>

                <th className="px-4 py-3 font-medium">
                  Department
                </th>

                <th className="px-4 py-3 font-medium">
                  Role
                </th>

                <th className="px-4 py-3 font-medium">
                  Status
                </th>

                <th className="px-4 py-3 font-medium">
                  Created
                </th>
              </tr>
            </thead>

            <tbody>

              {/* LOADING */}

              {loading && (
                <tr>
                  <td
                    colSpan={5}
                    className={`px-4 py-12 text-center ${muted}`}
                  >
                    Loading users...
                  </td>
                </tr>
              )}

              {/* EMPTY */}

              {!loading &&
                filteredUsers.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className={`px-4 py-12 text-center ${muted}`}
                    >
                      <div className="font-medium">
                        No users found
                      </div>

                      <div className="mt-1 text-[12px] opacity-70">
                        Try changing your
                        search or role filter.
                      </div>
                    </td>
                  </tr>
                )}

              {/* USERS */}

              {!loading &&
                filteredUsers.map(
                  (profile) => {

                    const protectedAdmin =
                      isProtectedAdmin(
                        profile
                      )

                    const disabled =
                      profile.id === user.id ||
                      protectedAdmin

                    return (
                      <tr
                        key={profile.id}
                        className={`border-t ${
                          isDark
                            ? 'border-[#1c2430]'
                            : 'border-[#e8e1d3]'
                        } ${
                          protectedAdmin
                            ? isDark
                              ? 'bg-[#11161d]'
                              : 'bg-[#faf8f3]'
                            : ''
                        }`}
                      >

                        {/* USER */}

                        <td className="px-4 py-3">

                          <div className="flex items-center gap-3">

                            <div
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11.5px] font-semibold ${
                                protectedAdmin
                                  ? 'bg-[#3a2c17] text-[#e3a857]'
                                  : 'bg-[#3a2c17] text-[#e3a857]'
                              }`}
                            >
                              {profile.initials ||
                                profile.full_name
                                  .slice(0, 2)
                                  .toUpperCase()}
                            </div>

                            <div>

                              <div
                                className={`flex items-center gap-2 font-medium ${
                                  isDark
                                    ? 'text-[#f2f1ec]'
                                    : 'text-[#1c2127]'
                                }`}
                              >
                                {profile.full_name}

                                {protectedAdmin && (
                                  <span
                                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                      isDark
                                        ? 'bg-[#33291b] text-[#e3a857]'
                                        : 'bg-[#f3e7ce] text-[#7a5b20]'
                                    }`}
                                  >
                                    Protected Admin
                                  </span>
                                )}
                              </div>

                              <div
                                className={`text-[11.5px] ${
                                  isDark
                                    ? 'text-[#6b7480]'
                                    : 'text-[#9a927e]'
                                }`}
                              >
                                {profile.email}
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
                          {profile.department}
                        </td>

                        {/* ROLE */}

                        <td className="px-4 py-3">

                          {isManager || isAdmin ? (

                            <div
                              className={`relative inline-flex items-center rounded-md border ${
                                disabled
                                  ? isDark
                                    ? 'border-[#1c2430] bg-[#0d1119] text-[#6b7480]'
                                    : 'border-[#e8e1d3] bg-[#f5f2eb] text-[#9a927e]'
                                  : isDark
                                    ? 'border-[#1c2430] bg-[#0d1119] text-[#e3e5e8]'
                                    : 'border-[#e8e1d3] bg-white text-[#1c2127]'
                              }`}
                            >

                              <select
                                value={
                                  profile.role
                                }
                                disabled={
                                  disabled
                                }
                                onChange={(
                                  event
                                ) =>
                                  void setRole(
                                    profile.id,
                                    event.target
                                      .value as ProfileRow['role']
                                  )
                                }
                                className="appearance-none bg-transparent py-1.5 pl-2.5 pr-7 text-[12.5px] outline-none disabled:cursor-not-allowed disabled:opacity-50"
                              >

                                <option value="employee">
                                  Employee
                                </option>

                                <option value="manager">
                                  Manager
                                </option>

                                <option value="admin">
                                  Admin
                                </option>

                              </select>

                              <ChevronDown
                                size={13}
                                className="pointer-events-none absolute right-2"
                              />

                            </div>

                          ) : (

                            <span
                              className={`rounded-md px-2.5 py-1.5 text-[12.5px] ${
                                isDark
                                  ? 'bg-[#10151c] text-[#c7cdd6]'
                                  : 'bg-[#f0ece1] text-[#4a4536]'
                              }`}
                            >
                              {profile.role}
                            </span>

                          )}

                        </td>

                        {/* STATUS */}

                        <td className="px-4 py-3">

                          <span className="inline-flex items-center gap-1.5 text-[#4ade80] opacity-60">

                            <span className="h-1.5 w-1.5 rounded-full bg-[#4ade80]" />

                            Active

                          </span>

                        </td>

                        {/* CREATED */}

                        <td
                          className={`whitespace-nowrap px-4 py-3 ${
                            isDark
                              ? 'text-[#c7cdd6]'
                              : 'text-[#3a3628]'
                          }`}
                        >
                          {formatDate(
                            profile.created_at
                          )}
                        </td>

                      </tr>
                    )
                  }
                )}

            </tbody>
          </table>
        </div>
      </div>

      <DemoNotice />
    </AppLayout>
  )
}