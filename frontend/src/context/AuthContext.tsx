import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

import type { User as SupabaseUser } from '@supabase/supabase-js'

import { supabase, type ProfileRow } from '../lib/supabaseClient'

export type Role = 'employee' | 'manager' | 'admin'

export interface CurrentUser {
  id: string
  name: string
  initials: string
  role: Role
  roleLabel: string
  department: string
  email: string
}

interface AuthContextValue {
  user: CurrentUser | null
  loading: boolean

  signIn: (
    email: string,
    password: string
  ) => Promise<{ error: string | null }>

  signUp: (
    email: string,
    password: string,
    fullName: string,
    role: Role,
    department: string
  ) => Promise<{ error: string | null }>

  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function profileToCurrentUser(profile: ProfileRow): CurrentUser {
  return {
    id: profile.id,
    name: profile.full_name,
    initials: profile.initials,
    role: profile.role,

    roleLabel:
      profile.role === 'admin'
        ? 'Administrator'
        : profile.role === 'manager'
          ? 'Manager'
          : 'Employee',

    department: profile.department,
    email: profile.email,
  }
}

async function loadProfile(
  authUser: SupabaseUser
): Promise<CurrentUser | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authUser.id)
    .single()

  if (error || !data) {
    console.error('Profile loading error:', error)
    return null
  }

  return profileToCurrentUser(data as ProfileRow)
}

export function AuthProvider({
  children,
}: {
  children: ReactNode
}) {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const initialize = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!mounted) return

      if (session?.user) {
        const profile = await loadProfile(session.user)

        if (mounted) {
          setUser(profile)
        }
      } else {
        setUser(null)
      }

      if (mounted) {
        setLoading(false)
      }
    }

    void initialize()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return

      if (session?.user) {
        const profile = await loadProfile(session.user)

        if (mounted) {
          setUser(profile)
        }
      } else {
        setUser(null)
      }

      if (mounted) {
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (
    email: string,
    password: string
  ) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error('Sign in error:', error)

      return {
        error: error.message,
      }
    }

    return {
      error: null,
    }
  }

  // Added from the second version
  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    role: Role,
    department: string
  ) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role,
          department,
        },
      },
    })

    if (error) {
      console.error('Sign up error:', error)

      return {
        error: error.message,
      }
    }

    return {
      error: null,
    }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('Sign out error:', error)
    }

    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }

  return context
}

export function useRequiredUser() {
  const { user, loading } = useAuth()

  if (!loading && !user) {
    throw new Error('Authenticated user is required')
  }

  return {
    user: user as CurrentUser,
    loading,
  }
}

