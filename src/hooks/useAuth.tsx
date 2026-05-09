import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { Profile, Employee, AuthUser } from '../types'
import toast from 'react-hot-toast'

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: Profile | null
  employee: Employee | null
  authUser: AuthUser | null
  loading: boolean
  signInWithEmail: (email: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)

  // Helper to add timeout to promises
  const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number, errorMsg: string): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(errorMsg)), timeoutMs)
      )
    ])
  }

  // Fetch profile data
  const fetchProfile = async (userId: string) => {
    try {
      console.log('📋 Fetching profile for user:', userId)
      console.log('⏱️ Profile fetch starting at:', new Date().toISOString())

      const startTime = Date.now()
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      const elapsed = Date.now() - startTime
      console.log(`⏱️ Profile query completed in ${elapsed}ms`)

      if (error) {
        console.error('❌ Profile fetch error:', error)
        console.error('❌ Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        })
        setProfile(null)
        return null
      }
      console.log('✅ Profile fetched:', data)
      setProfile(data)
      return data
    } catch (error) {
      console.error('❌ Error fetching profile:', error)
      setProfile(null)
      return null
    }
  }

  // Fetch employee data (for clinicians)
  const fetchEmployee = async (email: string) => {
    try {
      console.log('👔 Fetching employee for email:', email)
      console.log('⏱️ Employee fetch starting at:', new Date().toISOString())

      // Try to fetch employee by email (without status filter first for better compatibility)
      const startTime = Date.now()
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('email', email)
        .maybeSingle()

      const elapsed = Date.now() - startTime
      console.log(`⏱️ Employee query completed in ${elapsed}ms`)

      if (error) {
        console.error('❌ Employee fetch error:', error)
        console.error('❌ Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        })
        setEmployee(null)
        return null
      }

      if (!data) {
        console.log('ℹ️ No employee record found for email:', email)
        setEmployee(null)
        return null
      }

      console.log('✅ Employee fetched:', data)
      setEmployee(data)
      return data
    } catch (error) {
      console.error('❌ Error fetching employee:', error)
      setEmployee(null)
      return null
    }
  }

  // Initialize auth state
  useEffect(() => {
    if (initialized) return

    console.log('🔐 Initializing auth...')
    console.log('📍 Current URL:', window.location.href)
    console.log('🔑 Storage check:', localStorage.getItem('routecare-auth') ? 'Has stored auth' : 'No stored auth')

    // Check if this is a magic link callback (has auth tokens in URL)
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    const hasAuthTokens = hashParams.has('access_token') || hashParams.has('refresh_token')

    if (hasAuthTokens) {
      console.log('🔗 Magic link detected in URL - processing...')
      console.log('🎫 Tokens in hash:', {
        access_token: hashParams.get('access_token')?.substring(0, 20) + '...',
        refresh_token: hashParams.has('refresh_token'),
        type: hashParams.get('type')
      })
    }

    let safetyTimeout: NodeJS.Timeout
    let authListenerSet = false

    // Listen for auth changes FIRST (before getSession)
    console.log('👂 Setting up auth listener...')
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth state changed:', event, {
        session: !!session,
        user: session?.user?.email,
        listenerSet: authListenerSet
      })

      // Update state
      setSession(session)
      setUser(session?.user ?? null)

      if (session?.user) {
        console.log('👤 User session established:', session.user.email)

        // Fetch profile and employee data IN PARALLEL (with timeout protection)
        // Don't let one failure block the other
        try {
          if (session.user.email) {
            // Fetch both at the same time
            await Promise.allSettled([
              fetchProfile(session.user.id),
              fetchEmployee(session.user.email)
            ])
          } else {
            await fetchProfile(session.user.id)
          }
        } catch (err) {
          console.error('❌ Error fetching profile/employee:', err)
        }

        // Always set loading to false after fetch attempts
        console.log('✅ Auth and data fetch complete')
        if (safetyTimeout) clearTimeout(safetyTimeout)
        setLoading(false)
        setInitialized(true)
      } else {
        console.log('👋 No session - user logged out')
        setProfile(null)
        setEmployee(null)
        if (safetyTimeout) clearTimeout(safetyTimeout)
        setLoading(false)
        setInitialized(true)
      }

      if (event === 'SIGNED_IN') {
        console.log('✅ User signed in successfully via', event)
        // Clean up URL hash after successful sign in
        if (window.location.hash) {
          console.log('🧹 Cleaning up URL hash')
          window.history.replaceState(null, '', window.location.pathname)
        }
      }
    })

    authListenerSet = true
    console.log('✅ Auth listener set up')

    // Skip getSession - just rely on onAuthStateChange
    // This is more reliable and avoids the hanging issue
    console.log('✅ Auth initialized - waiting for state changes...')

    // Set a safety timeout to stop loading if no auth event comes
    safetyTimeout = setTimeout(() => {
      console.warn('⚠️ No auth state change after 3 seconds')
      if (!session) {
        setLoading(false)
        setInitialized(true)
      }
    }, 3000)

    return () => {
      console.log('🧹 Cleaning up auth subscription')
      subscription.unsubscribe()
    }
  }, [initialized])

  // Sign in with magic link
  const signInWithEmail = async (email: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`
      console.log('📧 Sending magic link to:', email)
      console.log('🔗 Redirect URL:', redirectUrl)

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectUrl,
          shouldCreateUser: true,
        },
      })

      if (error) throw error

      toast.success('Check your email for the magic link!')
    } catch (error: any) {
      console.error('❌ Error signing in:', error)
      toast.error(error.message || 'Failed to send magic link')
      throw error
    }
  }

  // Sign out
  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error

      setUser(null)
      setSession(null)
      setProfile(null)
      setEmployee(null)
      toast.success('Signed out successfully')
    } catch (error: any) {
      console.error('Error signing out:', error)
      toast.error(error.message || 'Failed to sign out')
      throw error
    }
  }

  const authUser: AuthUser | null = user
    ? {
        id: user.id,
        email: user.email!,
        profile,
        employee,
      }
    : null

  const value = {
    user,
    session,
    profile,
    employee,
    authUser,
    loading,
    signInWithEmail,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
