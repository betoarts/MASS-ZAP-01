import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://aexlptrufyeyrhkvndzi.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFleGxwdHJ1ZnlleXJoa3ZuZHppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0MzI0OTUsImV4cCI6MjA3NzAwODQ5NX0.D5Z0PBSOOz5p4pnci6x2cc8a3UBlCck2KCX1Unartjc';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);