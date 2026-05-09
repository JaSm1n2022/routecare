# RouteCare Clinician Portal

A mobile-responsive clinician management system built with React, TypeScript, Vite, and Supabase. This project implements secure magic link authentication for clinicians with role-based access control.

## Features

- 🔐 **Magic Link Authentication** - Passwordless login via email
- 👥 **Role-Based Access Control** - Clinician-specific access
- 📱 **Mobile-First Design** - Fully responsive for all devices
- ⚡ **Fast Performance** - Built with Vite for lightning-fast development
- 🎨 **Modern UI** - Tailwind CSS with custom components
- 🔄 **PWA Support** - Installable as a Progressive Web App
- 🔒 **Secure** - Supabase authentication and RLS policies

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Authentication**: Supabase Auth (Magic Links)
- **Database**: Supabase (PostgreSQL)
- **Routing**: React Router v6
- **State Management**: React Context API
- **Icons**: Lucide React
- **Notifications**: React Hot Toast

## Prerequisites

- Node.js 18+ and npm/pnpm
- Supabase account and project

## Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd routecare
```

### 2. Install dependencies

```bash
npm install
# or
pnpm install
```

### 3. Set up Supabase

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Run the following SQL in your Supabase SQL editor:

```sql
-- Create profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  username TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'clinician', 'user')),
  company_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create employees table
CREATE TABLE employees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  company_id UUID NOT NULL,
  position TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive')) DEFAULT 'active',
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(email, company_id)
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Employees policies
CREATE POLICY "Employees can view own record"
  ON employees FOR SELECT
  USING (email = auth.jwt()->>'email');

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, role)
  VALUES (NEW.id, NEW.email, 'user');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 4. Configure environment variables

Copy `.env.example` to `.env` and fill in your Supabase credentials:

```bash
cp .env.example .env
```

Edit `.env`:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 5. Start the development server

```bash
npm run dev
# or
pnpm dev
```

The application will be available at `http://localhost:3000`

## Project Structure

```
routecare/
├── src/
│   ├── components/        # Reusable UI components
│   │   └── Layout.tsx    # Main layout wrapper
│   ├── hooks/            # Custom React hooks
│   │   └── useAuth.tsx   # Authentication hook & context
│   ├── lib/              # Third-party library configurations
│   │   └── supabase.ts   # Supabase client setup
│   ├── pages/            # Page components
│   │   ├── LoginPage.tsx        # Magic link login
│   │   ├── DashboardPage.tsx    # Clinician dashboard
│   │   └── UnauthorizedPage.tsx # Access denied page
│   ├── types/            # TypeScript type definitions
│   │   ├── database.ts   # Supabase database types
│   │   └── index.ts      # Application types
│   ├── App.tsx           # Main app component with routing
│   ├── main.tsx          # Application entry point
│   └── index.css         # Global styles & Tailwind
├── public/               # Static assets
├── index.html            # HTML template
├── vite.config.ts        # Vite configuration
├── tailwind.config.js    # Tailwind CSS configuration
└── package.json          # Dependencies and scripts
```

## Authentication Flow

1. **User enters email** on the login page
2. **Magic link sent** to user's email via Supabase Auth
3. **User clicks link** in email
4. **Session established** and user data fetched
5. **Role verification**: Check if user has `clinician` role
6. **Employee verification**: Check if clinician has active employee record
7. **Access granted** to dashboard or redirect to unauthorized page

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking

## Mobile Responsiveness

The application is fully responsive with:

- **Mobile-first design** approach
- **Responsive grid layouts** that adapt to screen size
- **Touch-friendly** buttons and interactive elements
- **Mobile navigation** menu
- **Optimized** for phones, tablets, and desktops

## Security Features

- **Magic Link Authentication** - No passwords to manage or leak
- **Row Level Security** - Supabase RLS policies protect data
- **Role-based access** - Only clinicians with employee records can access
- **Session management** - Automatic token refresh
- **Secure environment variables** - Sensitive data in .env files

## Database Schema

### profiles table
- `id` (UUID, PK) - User ID from auth.users
- `username` (TEXT) - User's email
- `role` (TEXT) - User role: 'admin', 'clinician', or 'user'
- `company_id` (UUID) - Associated company
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

### employees table
- `id` (UUID, PK)
- `email` (TEXT) - Employee email
- `company_id` (UUID) - Associated company
- `position` (TEXT) - Job position (RN, LVN, CNA, etc.)
- `status` (TEXT) - 'active' or 'inactive'
- `first_name` (TEXT)
- `last_name` (TEXT)
- `phone` (TEXT)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

## Adding a Clinician User

To add a new clinician:

1. Have the user sign up via the login page
2. Update their profile role in Supabase:
   ```sql
   UPDATE profiles
   SET role = 'clinician', company_id = 'your-company-id'
   WHERE username = 'user@example.com';
   ```
3. Create an employee record:
   ```sql
   INSERT INTO employees (email, company_id, position, status, first_name, last_name)
   VALUES ('user@example.com', 'your-company-id', 'RN', 'active', 'John', 'Doe');
   ```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is private and proprietary.

## Support

For support, contact your system administrator.
