// =====================================================
// CONFIGURAÇÃO DO SUPABASE
// =====================================================
export const SUPABASE_URL = 'https://gqrktjlwiownfezkvtgh.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdxcmt0amx3aW93bmZlemt2dGdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0OTUxNDgsImV4cCI6MjEwMTA3MTE0OH0.ntyHDf5fgBKzlslvcK5n1JleuRnjGu8xG2ZzSm2CKH8';

// Cria o cliente Supabase e EXPÕE no window também
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// EXPÕE NO WINDOW PARA ACESSO GLOBAL
window.supabaseClient = supabaseClient;
window.supabase = supabaseClient; // Também para compatibilidade

export { supabaseClient };
