-- =====================================================================
-- Convite também para MEMBRO, não só trainee.
--
-- Rode no SQL Editor do Supabase depois de migracao-convites-lote.sql.
-- É idempotente.
--
-- Até aqui a coluna `cargo` da tabela convites tinha CHECK (cargo =
-- 'trainee'): o convite criava trainee e nada mais. Isso existia para que um
-- link vazado no grupo da turma, no pior caso, criasse um trainee a mais —
-- nunca um diretor. A trava continua, só passa a aceitar dois valores.
--
-- O ponto que NÃO muda: o cargo é fixado na linha do convite, no momento em
-- que a presidência cria o lote. Quem clica no link não escolhe nada — a
-- action pública nem lê cargo do formulário. Um convite de trainee nunca
-- vira conta de membro, e vice-versa.
--
-- Diretoria e presidência seguem de fora de propósito: esses cargos só por
-- promoção explícita em /membros/gestao/usuarios, onde há registro de quem
-- promoveu quem.
-- =====================================================================

alter table public.convites drop constraint if exists convites_cargo_check;

alter table public.convites
  add constraint convites_cargo_check check (cargo in ('trainee', 'membro'));

-- O default segue 'trainee': é o caso de volume (turma inteira), e um insert
-- que esqueça a coluna deve cair no cargo de menor privilégio, não no maior.
alter table public.convites alter column cargo set default 'trainee';

comment on column public.convites.cargo is
  'Cargo que ESTE convite cria. Travado por CHECK em trainee|membro. '
  'Definido por quem cria o lote; nunca por quem usa o link.';

-- Facilita a tela de convites, que agora separa os lotes por cargo.
create index if not exists convites_cargo_idx on public.convites (cargo, created_at desc);
