// =====================================================
// CONFIGURAÇÃO DO SUPABASE
// =====================================================
// ATENÇÃO: a chave abaixo é a "anon key" pública do Supabase.
// Ela é destinada a ser exposta no client (isso é normal e esperado).
// A segurança real do sistema deve vir de políticas de RLS no banco,
// não de esconder este arquivo. Separar em módulos aqui é só para
// organização do código — não é uma medida de segurança.
export const SUPABASE_URL = 'https://gqrktjlwiownfezkvtgh.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdxcmt0amx3aW93bmZlemt2dGdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0OTUxNDgsImV4cCI6MjEwMTA3MTE0OH0.ntyHDf5fgBKzlslvcK5n1JleuRnjGu8xG2ZzSm2CKH8';

export const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
