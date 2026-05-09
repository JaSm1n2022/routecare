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
      const profilePromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      const { data, error } = await withTimeout(
        profilePromise,
        5000,
        'Profile fetch timeout after 5 seconds'
      )

      if (error) throw error
      console.log('✅ Profile fetched:', data)
      setProfile(data)
      return data
    } catch (error) {
      console.error('❌ Error fetching profile:', error)
      return null
    }
  }

  // Fetch employee data (for clinicians)
  const fetchEmployee = async (email: string) => {
    try {
      console.log('👔 Fetching employee for email:', email)

      // First, let's see ALL employees to debug
      const { data: allEmployees, error: debugError } = await supabase
        .from('employees')
        .select('*')
        .limit(5)

      console.log('🔍 Debug - All employees (first 5):', allEmployees)
      console.log('🔍 Debug - Error:', debugError)

      // Now try to fetch this specific employee WITHOUT status filter
      const { data: employeesByEmail, error: emailError } = await supabase
        .from('employees')
        .select('*')
        .eq('email', email)

      console.log('🔍 Debug - Employees with this email:', employeesByEmail)
      console.log('🔍 Debug - Email query error:', emailError)

      // Now the actual query
      const employeePromise = supabase
        .from('employees')
        .select('*')
        .eq('email', email)
        .eq('status', 'Active')
        .single()

      const { data, error } = await withTimeout(
        employeePromise,
        5000,
        'Employee fetch timeout after 5 seconds'
      )

      if (error) {
        if (error.code === 'PGRST116') {
          // No employee record found
          console.log('ℹ️ No employee record found with status=Active')
          console.log('🔍 Try checking if status field has different value')

          // Try without status filter as fallback
          const { data: employeeNoStatus, error: noStatusError } = await supabase
            .from('employees')
            .select('*')
            .eq('email', email)
            .maybeSingle()

          if (employeeNoStatus) {
            console.log('✅ Found employee WITHOUT status filter:', employeeNoStatus)
            setEmployee(employeeNoStatus)
            return employeeNoStatus
          }

          return null
        }
        throw error
      }
      console.log('✅ Employee fetched:', data)
      setEmployee(data)
      return data
    } catch (error) {
      console.error('❌ Error fetching employee:', error)
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

        // Fetch profile and employee data (with timeout protection)
        try {
          const profileData = await fetchProfile(session.user.id)
          if (profileData?.role === 'clinician' && session.user.email) {
            await fetchEmployee(session.user.email)
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

    // Get initial session
    const initAuth = async () => {
      try {
        // If we have auth tokens in URL, manually set the session
        if (hasAuthTokens) {
          console.log('🔗 Auth tokens in URL - manually setting session...')

          const access_token = hashParams.get('access_token')
          const refresh_token = hashParams.get('refresh_token')

          if (access_token && refresh_token) {
            try {
              console.log('🔧 Calling setSession with tokens...')
              const { data, error } = await supabase.auth.setSession({
                access_token,
                refresh_token
              })

              if (error) {
                console.error('❌ Error setting session:', error)
                throw error
              }

              if (data.session) {
                console.log('✅ Session set manually:', data.session.user.email)
                console.log('⏳ Waiting for onAuthStateChange to process session...')

                // Set safety timeout in case listener doesn't complete
                safetyTimeout = setTimeout(() => {
                  console.warn('⚠️ onAuthStateChange timeout - forcing completion')
                  setLoading(false)
                  setInitialized(true)
                }, 10000) // 10 seconds for profile/employee fetch
              }
            } catch (err) {
              console.error('❌ Failed to process tokens:', err)
              setLoading(false)
              setInitialized(true)
            }
          } else {
            console.warn('⚠️ Tokens in URL but missing access_token or refresh_token')
            setLoading(false)
            setInitialized(true)
          }

          return
        }

        // No auth tokens - proceed with normal getSession
        console.log('📞 Calling getSession (no tokens in URL)...')

        safetyTimeout = setTimeout(() => {
          console.warn('⚠️ getSession timeout')
          setLoading(false)
          setInitialized(true)
        }, 5000)

        const startTime = Date.now()
        const { data: { session }, error } = await supabase.auth.getSession()

        const elapsed = Date.now() - startTime
        console.log(`📦 getSession completed in ${elapsed}ms`, {
          session: !!session,
          error: error?.message,
          user: session?.user?.email
        })

        clearTimeout(safetyTimeout)

        if (error) {
          console.error('❌ Error getting session:', error)
          setLoading(false)
          setInitialized(true)
        } else if (session) {
          console.log('✅ Session found:', session.user.email)
          setSession(session)
          setUser(session?.user ?? null)

          // Fetch profile and employee data
          try {
            const profileData = await fetchProfile(session.user.id)
            console.log('📋 Profile data:', profileData)
            if (profileData?.role === 'clinician' && session.user.email) {
              await fetchEmployee(session.user.email)
            }
          } catch (err) {
            console.error('Profile fetch error:', err)
          }

          setLoading(false)
          setInitialized(true)
        } else {
          console.log('✅ No session found')
          setLoading(false)
          setInitialized(true)
        }
      } catch (error) {
        if (safetyTimeout) clearTimeout(safetyTimeout)
        console.error('❌ Error initializing auth:', error)
        setLoading(false)
        setInitialized(true)
      }
    }

    initAuth()

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
