import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://yvzylhestgcygwsjbaut.supabase.co'

// 1. Existing Public Client (Use for everything else)
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2enlsaGVzdGdjeWd3c2piYXV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMjMxMDMsImV4cCI6MjA4MzU5OTEwM30.BAHSq367fKLk9gi0HHQ5vQcHezd9zDVhjrErBdADeoo'
export const supabase = createClient(supabaseUrl, supabaseKey)

// 2. 🟢 Admin Client (Use ONLY for handleVerify "Reject" deletion)
// 👇 Replace this string with your "service_role" secret from Supabase Dashboard -> Settings -> API
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2enlsaGVzdGdjeWd3c2piYXV0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODAyMzEwMywiZXhwIjoyMDgzNTk5MTAzfQ.KrA1KdKab69BbPCb3C1WlNDhxuQehXp3HaxecT9UNYs' 
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})