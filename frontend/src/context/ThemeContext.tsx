import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

import { supabase } from '../lib/supabaseClient'
import { useAuth } from './AuthContext'

type Theme = 'dark' | 'light'

interface ThemeContextValue {
  theme: Theme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()

  // LIGHT is the default for every user
  const [theme, setTheme] = useState<Theme>('light')

  // Load the user's saved theme
  useEffect(() => {
    let cancelled = false

    async function loadUserTheme() {
      // No logged-in user → light
      if (!user) {
        setTheme('light')
        return
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('theme')
        .eq('id', user.id)
        .maybeSingle()

      if (cancelled) return

      if (error) {
        console.error('Error loading theme:', error)
        setTheme('light')
        return
      }

      // User has dark saved
      if (data?.theme === 'dark') {
        setTheme('dark')
      } else {
        // New user / no preference = light
        setTheme('light')
      }
    }

    loadUserTheme()

    return () => {
      cancelled = true
    }
  }, [user])

  /*
   * Keep your existing theme system.
   *
   * Your pages already use:
   *
   * theme === 'dark'
   *
   * so we don't need Tailwind's global dark mode.
   */
  useEffect(() => {
    document.documentElement.classList.toggle(
      'light',
      theme === 'light'
    )
  }, [theme])

  /*
   * Toggle ONLY for the current user.
   */
  const toggleTheme = async () => {
    if (!user) return

    const newTheme: Theme =
      theme === 'light' ? 'dark' : 'light'

    // Change the UI immediately
    setTheme(newTheme)

    // Save this user's preference
    const { error } = await supabase
      .from('profiles')
      .update({
        theme: newTheme,
      })
      .eq('id', user.id)

    if (error) {
      console.error('Error saving theme:', error)

      // If saving failed, return to previous theme
      setTheme(theme)
    }
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)

  if (!context) {
    throw new Error(
      'useTheme must be used within ThemeProvider'
    )
  }

  return context
}