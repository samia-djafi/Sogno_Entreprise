import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'

export default function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#0a0d12] text-[#8a92a0]">
        Loading...
      </div>
    )
  }

  if (!user && location.pathname !== '/') {
    return <Navigate to="/" replace />
  }

  if (user && location.pathname === '/') {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}