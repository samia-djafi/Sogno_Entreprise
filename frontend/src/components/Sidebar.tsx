import { NavLink } from 'react-router-dom'
import {
  LayoutGrid,
  Bot,
  BookOpen,
  Settings,
  LogOut,
  BarChart3,
  Users,
} from 'lucide-react'
import { useAuth, useRequiredUser } from '../context/AuthContext'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutGrid },
  { to: '/assistant', label: 'AI Assistant', icon: Bot },
  { to: '/documents', label: 'Documents', icon: BookOpen },
]

const managementItems = [
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/users', label: 'Users', icon: Users },
]

export default function Sidebar({ collapsed }: { collapsed: boolean }) {
  const { user } = useRequiredUser()
  const { signOut } = useAuth()

  const isManager = user.role === 'manager'

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13.5px] transition-colors ${
      isActive
        ? 'bg-[#123a3d] text-white font-medium'
        : 'text-[#9aa3af] hover:bg-[#11161e] hover:text-[#e3e5e8]'
    }`

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <aside
      className={`flex h-screen shrink-0 flex-col border-r border-[#161c25] bg-[#090c11] transition-all duration-200 ${
        collapsed ? 'w-[68px]' : 'w-[256px]'
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 border-b border-[#161c25] px-4 py-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-[#1a2028]">
          <img
            src="/sa.png"
            alt="Sogno Enterprise"
            className="h-full w-full object-cover"
          />
        </div>

        {!collapsed && (
          <div className="min-w-0 leading-tight">
            <div className="truncate text-[13.5px] font-semibold text-[#f2f1ec]">
              Sogno Enterprise
            </div>

            <div className="truncate text-[10px] tracking-wide text-[#7a8290]">
              KNOWLEDGE &middot; INTELLIGENCE
            </div>
          </div>
        )}
      </div>

      {/* Workspace */}
      {!collapsed && (
        <div className="px-4 pb-1 pt-4 text-[11px] font-medium tracking-wide text-[#6b7480]">
          Workspace
        </div>
      )}

      <nav className="flex flex-col gap-1 px-2.5">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={linkClass}>
            <Icon size={16} className="shrink-0" />

            {!collapsed && (
              <span className="truncate">
                {label}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Management */}
      {isManager && (
        <>
          {!collapsed && (
            <div className="px-4 pb-1 pt-5 text-[11px] font-medium tracking-wide text-[#6b7480]">
              Management
            </div>
          )}

          <nav className="flex flex-col gap-1 px-2.5">
            {managementItems.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} className={linkClass}>
                <Icon size={16} className="shrink-0" />

                {!collapsed && (
                  <span className="truncate">
                    {label}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
        </>
      )}

      {/* Bottom section */}
      <div className="mt-auto flex flex-col gap-1 border-t border-[#161c25] px-2.5 py-2.5">

        {/* Settings */}
        <NavLink to="/settings" className={linkClass}>
          <Settings size={16} className="shrink-0" />

          {!collapsed && (
            <span>
              Settings
            </span>
          )}
        </NavLink>

        {/* User */}
        <div className="mt-1 flex items-center gap-2.5 rounded-md border-t border-[#161c25] px-2.5 pb-2 pt-3">

          {/* Avatar */}
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#3a2c17] text-[12px] font-semibold text-[#e3a857]">
            {user.initials}
          </div>

          {/* User information */}
          {!collapsed && (
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate text-[13px] font-medium text-[#f2f1ec]">
                {user.name}
              </div>

              <div className="truncate text-[11px] text-[#6b7480]">
                {user.roleLabel} &middot; {user.department}
              </div>
            </div>
          )}

          {/* Sign out */}
          {!collapsed && (
            <button
              type="button"
              onClick={handleSignOut}
              className="shrink-0 text-[#6b7480] transition-colors hover:text-[#e3e5e8]"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut size={15} />
            </button>
          )}
        </div>
      </div>
    </aside>
  )
}