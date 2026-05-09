# Magic Link Authentication Fix

## Problem
When clicking the magic link from email, the app would redirect to login instead of completing authentication. The issue was that `getSession()` was hanging when auth tokens were in the URL.

## Root Cause
1. Magic link callback includes tokens in URL hash (`#access_token=...`)
2. `useAuth` hook was calling `getSession()` which would hang indefinitely
3. Safety timeout would kick in and force loading=false with no user
4. `AuthCallbackPage` would redirect to dashboard after 3 seconds
5. No authenticated user → redirect to login

## Solution

### 1. Fixed `useAuth.tsx` Hook
**Manually process tokens instead of waiting for automatic detection:**

```typescript
if (hasAuthTokens) {
  console.log('🔗 Auth tokens in URL - manually setting session...')

  const access_token = hashParams.get('access_token')
  const refresh_token = hashParams.get('refresh_token')

  if (access_token && refresh_token) {
    const { data, error } = await supabase.auth.setSession({
      access_token,
      refresh_token
    })

    if (data.session) {
      console.log('✅ Session set manually:', data.session.user.email)
      setSession(data.session)
      setUser(data.session.user)

      // Fetch profile and employee data
      await fetchProfile(data.session.user.id)

      // Clean up URL hash
      window.history.replaceState(null, '', window.location.pathname)

      setLoading(false)
      setInitialized(true)
    }
  }
  return
}
```

**Why this works:**
- Instead of relying on `detectSessionInUrl: true` automatic processing (which wasn't firing events reliably)
- We manually parse tokens from URL hash
- We call `supabase.auth.setSession()` directly to establish the session
- This bypasses the problematic `onAuthStateChange` SIGNED_IN event that wasn't firing
- Session is set immediately and synchronously

### 2. Fixed `AuthCallbackPage.tsx`
**Wait for actual authentication before redirecting:**

```typescript
const { user, loading } = useAuth()

useEffect(() => {
  if (!loading && user) {
    console.log('✅ User authenticated - redirecting to dashboard')
    setTimeout(() => {
      navigate('/dashboard', { replace: true })
    }, 500)
  }
}, [user, loading, navigate])
```

**Why this works:**
- No fixed 3-second timer
- Waits for `user` to be set (from onAuthStateChange)
- Only redirects when authentication is complete
- Small 500ms delay ensures state is fully updated

## Auth Flow Now

```
1. User clicks magic link in email
   ↓
2. Redirects to: http://localhost:3000/#access_token=...&refresh_token=...
   ↓
3. AuthCallbackPage renders (shows "Signing you in...")
   ↓
4. useAuth hook initializes:
   - Detects tokens in URL hash
   - Sets up onAuthStateChange listener
   - Skips getSession() call
   - Waits for SIGNED_IN event
   ↓
5. Supabase processes tokens automatically
   ↓
6. onAuthStateChange fires with SIGNED_IN event
   ↓
7. useAuth sets user, session, fetches profile/employee
   ↓
8. AuthCallbackPage detects user is set
   ↓
9. Redirects to /dashboard
   ↓
10. User stays logged in! ✅
```

## Console Logs to Expect

When clicking magic link, you should see:

```
🎯 Auth Callback Page - Processing magic link...
📍 Full URL: http://localhost:3000/#access_token=...
🎫 Hash Params: { access_token: '...', type: 'magiclink' }
🔐 Initializing auth...
🔗 Magic link detected in URL - processing...
👂 Setting up auth listener...
✅ Auth listener set up
🔗 Auth tokens in URL - manually setting session...
🔧 Calling setSession with tokens...
✅ Session set manually: user@email.com
👤 User session established: user@email.com
📋 Profile data: { role: 'clinician', ... }
🧹 Cleaning up URL hash
🔄 Auth state: { user: true, loading: false }
✅ User authenticated - redirecting to dashboard
```

## Key Changes

### Before:
❌ Called `getSession()` with tokens in URL → hung indefinitely
❌ Relied on `detectSessionInUrl` + `onAuthStateChange` SIGNED_IN event → event never fired
❌ Fixed 3-second timer → redirected before auth completed
❌ User redirected to login

### After:
✅ Manually parse tokens from URL hash
✅ Call `supabase.auth.setSession()` directly
✅ Bypass problematic automatic token detection
✅ Wait for user to be authenticated before redirecting
✅ User stays logged in!

## Testing

1. **Clear browser storage** (F12 → Application → Local Storage → Delete all)
2. **Go to login page** and enter email
3. **Click magic link in email**
4. **Watch console** - should see "✅ User authenticated - redirecting to dashboard"
5. **Should stay logged in** - no redirect to login!

## Troubleshooting

**Still redirecting to login?**
- Check browser console for errors
- Verify Supabase redirect URL is `http://localhost:3000/`
- Clear localStorage and cookies
- Try in incognito/private window

**Tokens in URL but not processing?**
- Check Supabase dashboard → Authentication → Settings
- Verify email templates are enabled
- Check if magic links have expired (1 hour default)

**"Auth token processing timeout" warning?**
- Network might be slow
- Supabase might be rate limiting
- Check internet connection
- Try again in a few minutes

## References

- **Supabase Auth Docs**: https://supabase.com/docs/guides/auth
- **Magic Link Flow**: https://supabase.com/docs/guides/auth/auth-email
- **detectSessionInUrl**: Automatically processes tokens in URL hash
