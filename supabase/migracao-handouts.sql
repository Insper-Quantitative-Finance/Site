-- =====================================================================
-- Migração: liberação programada dos handouts do trainee.
-- Rode se você JÁ tinha executado o schema.sql antes desta funcionalidade.
-- Em instalação nova, o schema.sql já contém tudo isto — não precisa rodar.
-- =====================================================================

-- O catálogo dos handouts (título, arquivo, ordem) vive em lib/handouts.js,
-- junto do código. O que a gestão precisa mudar sem deploy é só QUANDO cada um
-- abre para a turma — e é isso que esta tabela guarda, uma linha por slug.
--
-- Sem linha, ou com liberado_em nulo, o handout está liberado: é o
-- comportamento de antes desta migração, e evita que subir um handout novo o
-- deixe invisível sem ninguém entender por quê. Para segurar uma aula, a
-- gestão marca a data.
create table if not exists public.handouts (
  slug          text primary key,
  liberado_em   timestamptz,
  autor_id      uuid references public.profiles(id) on delete set null,
  atualizado_em timestamptz not null default now()
);

alter table public.handouts enable row level security;

-- Qualquer membro logado lê a tabela: são datas de liberação, não conteúdo.
-- A trava que importa é no servidor, que só entrega o HTML do handout já
-- liberado (ou para a gestão) — ver app/api/handouts/[slug]/route.js.
drop policy if exists handouts_read on public.handouts;
create policy handouts_read on public.handouts
  for select to authenticated using (true);

drop policy if exists handouts_write_gestao on public.handouts;
create policy handouts_write_gestao on public.handouts
  for all to authenticated
  using (public.is_gestao(auth.uid()))
  with check (public.is_gestao(auth.uid()));
