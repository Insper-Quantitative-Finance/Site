-- =====================================================================
-- Convites pessoais (importados de planilha) e registro de envio.
--
-- Rode no SQL Editor do Supabase depois de migracao-convites.sql.
-- É idempotente.
--
-- Até aqui um convite era um link de turma: um token, N cadastros. Agora
-- ele também pode ser pessoal — um token por pessoa, amarrado ao e-mail
-- dela. É isso que permite enviar por e-mail e saber quem já entrou.
-- As duas formas convivem na mesma tabela: email nulo = link de turma.
-- =====================================================================

alter table public.convites
  -- Quando preenchido, SÓ este e-mail pode usar o token. Um link pessoal
  -- repassado no grupo não vira conta para outra pessoa.
  add column if not exists email       text,
  add column if not exists nome        text,
  add column if not exists lote        text,
  add column if not exists enviado_em  timestamptz,
  add column if not exists erro_envio  text;

-- Um convite pendente por pessoa: reimportar a mesma planilha não gera
-- links duplicados (e o segundo link invalidaria silenciosamente o primeiro
-- na cabeça de quem recebeu os dois).
create unique index if not exists convites_email_pendente_idx
  on public.convites (lower(email))
  where email is not null and not revogado;

create index if not exists convites_lote_idx on public.convites (lote, created_at desc);
