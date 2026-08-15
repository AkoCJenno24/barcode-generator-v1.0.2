import { supabase, isSupabaseConfigured } from './supabase';

export interface UserAccount {
  id: string;
  username: string;
  fullName?: string;
  role?: string;
  createdAt?: string;
}

export interface AuthResult {
  success: boolean;
  user: UserAccount | null;
  error: string | null;
}

const AUTH_STORAGE_KEY = 'barcode_studio_auth_user_v1';

/**
 * SQL Schema for Supabase User Table
 */
export const SUPABASE_USER_TABLE_SQL = `-- ============================================================
-- Supabase Users Table SQL Schema for Barcode Generator Studio
-- Execute this SQL in your Supabase SQL Editor to enable Cloud Auth
-- ============================================================

-- 1. Create the custom app_users table
CREATE TABLE IF NOT EXISTS public.app_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'admin',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies for Authentication
DROP POLICY IF EXISTS "Allow anonymous read for app_users login" ON public.app_users;
CREATE POLICY "Allow anonymous read for app_users login"
  ON public.app_users
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow public insert/update app_users" ON public.app_users;
CREATE POLICY "Allow public insert/update app_users"
  ON public.app_users
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 4. Insert Default Admin User
-- Credentials: Username = admin | Password = admin123
INSERT INTO public.app_users (username, password_hash, full_name, role)
VALUES ('admin', 'admin123', 'Administrator', 'admin')
ON CONFLICT (username) DO UPDATE
SET password_hash = EXCLUDED.password_hash;
`;

/**
 * Retrieves the currently saved session user from localStorage (disabled to force logout on page reload)
 */
export function getSavedAuthUser(): UserAccount | null {
  return null;
}

/**
 * Saves current authenticated user session (in-memory only; cleared on page reload)
 */
export function saveAuthUserSession(_user: UserAccount): void {
  // Session is maintained in React state only during active session
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch (e) {
    console.warn('Failed to clear auth session:', e);
  }
}

/**
 * Clears current user session (Logout)
 */
export function clearAuthUserSession(): void {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch (e) {
    console.warn('Failed to clear auth session:', e);
  }
}

/**
 * Authenticates user by username and password.
 * Checks Supabase `app_users` table first, with fallback to default admin credentials.
 * Password verification is strictly CASE-SENSITIVE.
 */
export async function authenticateUser(usernameInput: string, passwordInput: string): Promise<AuthResult> {
  const username = usernameInput.trim();
  const password = passwordInput; // Preserve case sensitivity!

  if (!username) {
    return { success: false, user: null, error: 'Please enter a username.' };
  }
  if (!password) {
    return { success: false, user: null, error: 'Please enter a password.' };
  }

  // 1. Try Supabase app_users table if Supabase is configured
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('app_users')
        .select('*')
        .ilike('username', username)
        .maybeSingle();

      if (!error && data) {
        // Strict case-sensitive check on password
        if (data.password_hash === password) {
          if (data.is_active === false) {
            return {
              success: false,
              user: null,
              error: 'Account is deactivated. Please contact administrator.',
            };
          }

          const userObj: UserAccount = {
            id: String(data.id || `user_${Date.now()}`),
            username: String(data.username),
            fullName: data.full_name ? String(data.full_name) : 'Administrator',
            role: data.role ? String(data.role) : 'admin',
            createdAt: data.created_at ? String(data.created_at) : undefined,
          };

          saveAuthUserSession(userObj);
          return { success: true, user: userObj, error: null };
        } else {
          return {
            success: false,
            user: null,
            error: 'Invalid username or password.',
          };
        }
      }
    } catch (err) {
      console.warn('Supabase auth query error, attempting default fallback auth:', err);
    }
  }

  // 2. Default Fallback Admin Authentication
  // Default Credentials: admin / admin123 (or updated fallback password)
  if (username.toLowerCase() === 'admin') {
    const fallbackPassword = localStorage.getItem('fallback_admin_password') || 'admin123';
    if (password === fallbackPassword) {
      const fallbackUser: UserAccount = {
        id: 'usr_default_admin',
        username: 'admin',
        fullName: 'System Administrator',
        role: 'admin',
      };
      saveAuthUserSession(fallbackUser);
      return { success: true, user: fallbackUser, error: null };
    } else {
      return {
        success: false,
        user: null,
        error: 'Invalid username or password.',
      };
    }
  }

  return {
    success: false,
    user: null,
    error: 'Invalid username or password.',
  };
}

/**
 * Changes password for an existing user in Supabase or local session
 */
export async function changeUserPassword(
  usernameInput: string,
  currentPasswordInput: string,
  newPasswordInput: string
): Promise<{ success: boolean; error: string | null }> {
  const username = usernameInput.trim();
  const currentPassword = currentPasswordInput;
  const newPassword = newPasswordInput;

  if (!currentPassword) {
    return { success: false, error: 'Please enter your current password.' };
  }
  if (!newPassword) {
    return { success: false, error: 'Please enter a new password.' };
  }
  if (newPassword.length < 4) {
    return { success: false, error: 'New password must be at least 4 characters long.' };
  }

  // 1. Try Supabase app_users table if Supabase is configured
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('app_users')
        .select('*')
        .ilike('username', username)
        .maybeSingle();

      if (!error && data) {
        if (data.password_hash !== currentPassword) {
          return { success: false, error: 'Current password is incorrect.' };
        }

        const { error: updateError } = await supabase
          .from('app_users')
          .update({
            password_hash: newPassword,
            updated_at: new Date().toISOString(),
          })
          .eq('id', data.id);

        if (updateError) {
          return { success: false, error: updateError.message || 'Failed to update password in database.' };
        }

        return { success: true, error: null };
      }
    } catch (err) {
      console.warn('Supabase change password error:', err);
    }
  }

  // 2. Default Fallback Admin Password Change
  if (username.toLowerCase() === 'admin') {
    const savedFallbackPass = localStorage.getItem('fallback_admin_password') || 'admin123';
    if (currentPassword !== savedFallbackPass) {
      return { success: false, error: 'Current password is incorrect.' };
    }
    localStorage.setItem('fallback_admin_password', newPassword);
    return { success: true, error: null };
  }

  return { success: false, error: 'User not found.' };
}
