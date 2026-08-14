// =====================================================
// CONFIGURAÇÃO DO SUPABASE
// =====================================================
export const SUPABASE_URL = 'https://gqrktjlwiownfezkvtgh.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdxcmt0amx3aW93bmZlemt2dGdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0OTUxNDgsImV4cCI6MjEwMTA3MTE0OH0.ntyHDf5fgBKzlslvcK5n1JleuRnjGu8xG2ZzSm2CKH8';

export const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// =====================================================
// RATE LIMITING PARA LOGIN
// =====================================================
const LOGIN_ATTEMPTS_KEY = 'login_attempts';
const MAX_LOGIN_ATTEMPTS = 5;
const BLOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutos

export function getLoginAttempts() {
    try {
        const data = JSON.parse(localStorage.getItem(LOGIN_ATTEMPTS_KEY) || '{}');
        return data;
    } catch {
        return {};
    }
}

export function recordLoginAttempt() {
    const attempts = getLoginAttempts();
    const now = Date.now();
    const key = 'global'; // Usamos uma chave única para todos (simplificado)
    
    // Limpar tentativas antigas (mais de 1 hora)
    if (attempts[key] && (now - attempts[key].timestamp > 3600000)) {
        delete attempts[key];
    }
    
    if (!attempts[key]) {
        attempts[key] = { count: 0, timestamp: now };
    }
    
    attempts[key].count += 1;
    attempts[key].timestamp = now;
    
    localStorage.setItem(LOGIN_ATTEMPTS_KEY, JSON.stringify(attempts));
    return attempts[key].count;
}

export function resetLoginAttempts() {
    localStorage.removeItem(LOGIN_ATTEMPTS_KEY);
}

export function isLoginBlocked() {
    const attempts = getLoginAttempts();
    const key = 'global';
    const data = attempts[key];
    if (!data) return false;
    
    if (data.count >= MAX_LOGIN_ATTEMPTS) {
        const elapsed = Date.now() - data.timestamp;
        if (elapsed < BLOCK_DURATION_MS) {
            return true;
        }
        resetLoginAttempts();
        return false;
    }
    return false;
}

export function getBlockTimeRemaining() {
    const attempts = getLoginAttempts();
    const key = 'global';
    const data = attempts[key];
    if (!data || data.count < MAX_LOGIN_ATTEMPTS) return 0;
    
    const elapsed = Date.now() - data.timestamp;
    const remaining = BLOCK_DURATION_MS - elapsed;
    return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
}