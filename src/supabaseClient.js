import { createClient } from '@supabase/supabase-js'

// 👇 Replace these with your actual Supabase keys
const supabaseUrl = 'https://yvzylhestgcygwsjbaut.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2enlsaGVzdGdjeWd3c2piYXV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMjMxMDMsImV4cCI6MjA4MzU5OTEwM30.BAHSq367fKLk9gi0HHQ5vQcHezd9zDVhjrErBdADeoo'

export const supabase = createClient(supabaseUrl, supabaseKey)