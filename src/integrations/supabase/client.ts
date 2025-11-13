import { createClient } from '@supabase/supabase-js';

// Valores fixos para garantir que sempre funcionem
const SUPABASE_URL = 'https://aexlptrufyeyrhkvndzi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFleGxwdHJ1ZnlleXJoa3ZuZHppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0MzI0OTUsImV4cCI6MjA3NzAwODQ5NX0.D5Z0PBSOOz5p4pnci6x2cc8a3UBlCck2KCX1Unartjc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);