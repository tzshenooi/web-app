import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.REACT_APP_SUPABASE_URL || 'https://yvzylhestgcygwsjbaut.supabase.co';

const supabaseKey =
  process.env.REACT_APP_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2enlsaGVzdGdjeWd3c2piYXV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMjMxMDMsImV4cCI6MjA4MzU5OTEwM30.BAHSq367fKLk9gi0HHQ5vQcHezd9zDVhjrErBdADeoo';

export const supabase = createClient(supabaseUrl, supabaseKey);

const supabaseServiceRoleKey = (
  process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2enlsaGVzdGdjeWd3c2piYXV0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODAyMzEwMywiZXhwIjoyMDgzNTk5MTAzfQ.KrA1KdKab69BbPCb3C1WlNDhxuQehXp3HaxecT9UNYs'
).trim();

/** Service role is required for clinic/driver registration (Auth admin + inserts). */
export const isSupabaseAdminConfigured = Boolean(supabaseServiceRoleKey);

export const supabaseAdmin = isSupabaseAdminConfigured
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;
