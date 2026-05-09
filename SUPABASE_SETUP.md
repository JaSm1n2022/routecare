# Supabase Setup for Magic Link Authentication

## Important Configuration Steps

### 1. Configure Redirect URLs in Supabase Dashboard

Magic links need proper redirect URLs to work correctly.

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **URL Configuration**
3. Add these URLs to **Redirect URLs**:
   - `http://localhost:3000/` (for development)
   - Your production URL (e.g., `https://yourdomain.com/`)

### 2. Verify Email Templates (Optional)

By default, Supabase sends magic link emails. You can customize them:

1. Go to **Authentication** → **Email Templates**
2. Select **Magic Link** template
3. Verify the template looks good

### 3. Test the Flow

1. **Send magic link:**
   - Enter email on login page
   - Click "Send Magic Link"
   - Check console: Should see "📧 Sending magic link to: [email]"

2. **Click magic link in email:**
   - Console should show: "🔗 Magic link detected in URL - processing..."
   - Then: "🔄 Auth state changed: SIGNED_IN"
   - Finally: "✅ User signed in successfully"

3. **Redirect to dashboard:**
   - After successful auth, you should be redirected to `/dashboard`

### 4. Troubleshooting

**Problem: Keeps redirecting to login after clicking magic link**

Solution:
- Check browser console for auth logs
- Verify redirect URL in Supabase matches your app URL exactly
- Make sure cookies/localStorage are enabled
- Check if any browser extensions are blocking auth

**Problem: "Session fetch timeout"**

Solution:
- Check your internet connection
- Verify Supabase credentials in `.env` are correct
- Check Supabase service status

**Problem: No email received**

Solution:
- Check spam folder
- Verify email settings in Supabase dashboard
- Check Supabase email logs under Authentication → Logs

### 5. Console Debug Output

When working correctly, you should see this flow in console:

```
🔐 Initializing auth...
📞 Calling getSession...
📦 getSession completed {session: false, error: null}
✅ Session: None
✅ Auth initialized
```

After clicking magic link:

```
🔗 Magic link detected in URL - processing...
🔄 Auth state changed: SIGNED_IN {session: true}
👤 User session established: user@example.com
✅ User signed in successfully
```

### 6. Database Setup (Required for Role Checking)

Once you're ready to enable role-based access control, run this SQL in Supabase:

```sql
-- Enable the required database functions
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, role)
  VALUES (NEW.id, NEW.email, 'user');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

Then uncomment the role checking code in `src/App.tsx`.
