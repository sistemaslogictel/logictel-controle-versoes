-- =====================================================
-- FIX: RLS bloqueando cadastro de Status DC
-- =====================================================
-- O DROP TABLE + CREATE TABLE do script anterior apagou as policies
-- antigas da tabela status_dc, mas o RLS continuou ativo (sem nenhuma
-- policy liberando escrita). Isso causa o erro:
-- "new row violates row-level security policy for table status_dc"

-- Garante que RLS está ativo (idempotente, não dá erro se já estiver)
ALTER TABLE status_dc ENABLE ROW LEVEL SECURITY;

-- Remove policies antigas com o mesmo nome, caso existam, para não duplicar
DROP POLICY IF EXISTS "status_dc_select" ON status_dc;
DROP POLICY IF EXISTS "status_dc_insert" ON status_dc;
DROP POLICY IF EXISTS "status_dc_update" ON status_dc;
DROP POLICY IF EXISTS "status_dc_delete" ON status_dc;

-- Libera leitura, inserção, atualização e exclusão para a chave anônima
-- (mesmo nível de acesso que o restante do sistema já usa hoje)
CREATE POLICY "status_dc_select" ON status_dc
    FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "status_dc_insert" ON status_dc
    FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "status_dc_update" ON status_dc
    FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "status_dc_delete" ON status_dc
    FOR DELETE TO anon, authenticated USING (true);
