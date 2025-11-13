import { createClient } from '@supabase/supabase-js';

// Verificar se as variáveis de ambiente estão definidas corretamente
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validação adicional para garantir que a URL é válida
if (!supabaseUrl || !supabaseUrl.startsWith('http')) {
  console.error('VITE_SUPABASE_URL não está definida corretamente no .env');
  console.error('Valor encontrado:', supabaseUrl);
}

if (!supabaseAnonKey) {
  console.error('VITE_SUPABASE_ANON_KEY não está definida no .env');
}

export const supabase = createClient(
  supabaseUrl || 'https://aexlptrufyeyrhkvndzi.supabase.co',
  supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFleGxwdHJ1ZnlleXJoa3ZuZHppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0MzI0OTUsImV4cCI6MjA3NzAwODQ5NX0.D5Z0PBSOOz5p4pnci6x2cc8a3UBlCck2KCX1Unartjc'
);