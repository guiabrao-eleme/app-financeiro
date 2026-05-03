-- ============================================================
-- PASSO A PASSO: Execute este SQL no Supabase SQL Editor
-- ============================================================

-- 1. Tabela de lançamentos
CREATE TABLE IF NOT EXISTS lancamentos (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data_registro   DATE NOT NULL,
  data_vencimento DATE NOT NULL,
  descricao       TEXT NOT NULL,
  tipo            TEXT NOT NULL CHECK (tipo IN ('Entrada', 'Saída')),
  categoria       TEXT NOT NULL CHECK (categoria IN ('Casa', 'Carro', 'Faculdade', 'Saídas', 'Outros')),
  valor           NUMERIC(12, 2) NOT NULL CHECK (valor > 0),
  parcela_atual   INTEGER NOT NULL DEFAULT 1,
  total_parcelas  INTEGER NOT NULL DEFAULT 1,
  valor_total     NUMERIC(12, 2) NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Índices para performance
CREATE INDEX IF NOT EXISTS idx_lancamentos_user_id       ON lancamentos(user_id);
CREATE INDEX IF NOT EXISTS idx_lancamentos_data_venc     ON lancamentos(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_lancamentos_user_data     ON lancamentos(user_id, data_vencimento);

-- 3. Habilitar Row Level Security (RLS) — cada usuário vê APENAS seus dados
ALTER TABLE lancamentos ENABLE ROW LEVEL SECURITY;

-- 4. Política: usuário só acessa os próprios registros
CREATE POLICY "usuarios_lancamentos_proprios"
  ON lancamentos
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
