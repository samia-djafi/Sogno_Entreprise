import { useState, type ReactNode } from 'react'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import { useTheme } from '../context/ThemeContext'

export default function AppLayout({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const { theme } = useTheme()

  return (
    <div className={`flex h-screen w-full overflow-hidden ${theme === 'light' ? 'bg-[#f7f2e9]' : 'bg-[#0a0d12]'}`}>
      <Sidebar collapsed={collapsed} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar onToggleSidebar={() => setCollapsed((c) => !c)} />
        <main className={`flex-1 overflow-y-auto scrollbar-thin ${theme === 'light' ? 'text-[#1c2127]' : 'text-[#f2f1ec]'}`}>
          {children}
        </main>
      </div>
    </div>
  )
}
