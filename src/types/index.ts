export interface Profile {
  id: string
  username: string
  role: 'admin' | 'clinician' | 'user'
  company_id: string | null
  created_at: string
  updated_at: string
}

export interface Employee {
  id: string
  email: string
  company_id: string
  position: string
  status: 'active' | 'inactive'
  first_name: string | null
  last_name: string | null
  phone: string | null
  created_at: string
  updated_at: string
}

export interface AuthUser {
  id: string
  email: string
  profile: Profile | null
  employee: Employee | null
}

export type UserRole = 'admin' | 'clinician' | 'user'

export const CLINICIAN_POSITIONS = [
  'RN',
  'LVN',
  'CNA',
  'MSW',
  'Chaplain',
  'Volunteer Coordinator',
  'Bereavement Coordinator',
  'Medical Director',
  'Administrator',
  'Clinical Manager'
] as const

export type ClinicianPosition = typeof CLINICIAN_POSITIONS[number]
