-- =====================================================================
-- Liga Insper Quantitative Finance — schema
-- Rode este arquivo inteiro no SQL Editor do Supabase (uma vez).
-- =====================================================================

-- ---------------------------------------------------------------- roles
do $$ begin
  create type cargo as enum (
    'presidente',
    'vice_presidente',
    'diretor_projetos',
    'diretor_capacitacoes',
    'membro',
    'trainee'
  );
exception when duplicate_object then null; end $$;

-- ------------------------------------------------------------- profiles
-- Uma linha por usuário do auth.users. A senha vive só no auth do Supabase;
-- nada aqui dá acesso a ela — é por isso que "editar usuário" nunca toca senha.
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  nome        text not null,
  cargo       cargo not null default 'membro',
  area        text,                 -- ex.: "Projetos", "Capacitações"
  turma       text,                 -- ex.: "2026.1"
  linkedin    text,
  foto_url    text,
  bio         text,
  ativo       boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Cargos que podem administrar usuários e conteúdo.
create or replace function public.is_gestao(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = uid
      and ativo
      and cargo in ('presidente','vice_presidente','diretor_projetos','diretor_capacitacoes')
  );
$$;

-- Presidência: único grupo que pode promover alguém à própria presidência.
create or replace function public.is_presidencia(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = uid and ativo and cargo in ('presidente','vice_presidente')
  );
$$;

-- ------------------------------------------------------------- projetos
create table if not exists public.projetos (
  id              uuid primary key default gen_random_uuid(),
  slug            text unique not null,
  titulo          text not null,
  subtitulo       text,                     -- linha técnica sob o título
  selo            text,                     -- "2º lugar", "Semifinalista"
  contexto        text,                     -- "Quantamental Challenge 2024"
  resumo          text not null,
  detalhes        jsonb not null default '[]'::jsonb,  -- [{rotulo, texto}]
  metricas        jsonb not null default '[]'::jsonb,  -- [{valor, rotulo}]
  parceiro_nome   text,
  parceiro_logo   text,                     -- caminho em /assets ou URL
  parceiro_prefixo text default 'Projeto mentorado por',
  ano             text,
  -- Paper do projeto: link externo (arXiv, Drive) ou PDF no bucket "papers".
  paper_url       text,
  paper_path      text,
  paper_nome      text,
  destaque        boolean not null default false,  -- aparece antes do "carregar mais"
  ordem           integer not null default 0,
  publicado       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists projetos_ordem_idx on public.projetos (destaque desc, ordem, created_at desc);

-- ------------------------------------------------------------ materiais
-- Biblioteca de estudo dos membros: links e arquivos no Storage.
create table if not exists public.materiais (
  id            uuid primary key default gen_random_uuid(),
  titulo        text not null,
  descricao     text,
  categoria     text not null default 'Geral',  -- Python, Estatística, Finanças, Papers...
  tipo          text not null default 'link' check (tipo in ('link','arquivo')),
  url           text,                            -- quando tipo = 'link'
  arquivo_path  text,                            -- quando tipo = 'arquivo' (bucket "materiais")
  arquivo_nome  text,
  arquivo_bytes bigint,
  autor_id      uuid references public.profiles(id) on delete set null,
  ordem         integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint materiais_destino check (
    (tipo = 'link'    and url is not null) or
    (tipo = 'arquivo' and arquivo_path is not null)
  )
);
create index if not exists materiais_cat_idx on public.materiais (categoria, ordem, created_at desc);

-- ------------------------------------------------- cache do Instagram
-- Guarda a última resposta boa da Graph API. Se o token expirar, a home
-- continua mostrando os posts antigos em vez de uma seção vazia.
create table if not exists public.instagram_cache (
  id          integer primary key default 1 check (id = 1),
  posts       jsonb not null default '[]'::jsonb,
  fetched_at  timestamptz not null default now(),
  erro        text
);
insert into public.instagram_cache (id) values (1) on conflict do nothing;

-- ------------------------------------------------------------ auditoria
create table if not exists public.auditoria (
  id         bigserial primary key,
  ator_id    uuid references public.profiles(id) on delete set null,
  acao       text not null,        -- criar_usuario, editar_usuario, ...
  entidade   text not null,        -- profiles, projetos, materiais
  entidade_id text,
  detalhes   jsonb,
  created_at timestamptz not null default now()
);
create index if not exists auditoria_data_idx on public.auditoria (created_at desc);

-- ---------------------------------------------------- updated_at trigger
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists t_profiles_touch on public.profiles;
create trigger t_profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
drop trigger if exists t_projetos_touch on public.projetos;
create trigger t_projetos_touch before update on public.projetos
  for each row execute function public.touch_updated_at();
drop trigger if exists t_materiais_touch on public.materiais;
create trigger t_materiais_touch before update on public.materiais
  for each row execute function public.touch_updated_at();

-- =====================================================================
-- RLS
-- =====================================================================
alter table public.profiles        enable row level security;
alter table public.projetos        enable row level security;
alter table public.materiais       enable row level security;
alter table public.instagram_cache enable row level security;
alter table public.auditoria       enable row level security;

-- profiles: todo membro logado vê o quadro; só gestão escreve.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated using (true);

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and cargo = (select cargo from public.profiles p where p.id = auth.uid()));

drop policy if exists profiles_update_gestao on public.profiles;
create policy profiles_update_gestao on public.profiles
  for update to authenticated
  using (public.is_gestao(auth.uid()))
  with check (public.is_gestao(auth.uid()));

-- ATENÇÃO: as políticas acima são PERMISSIVE — elas se somam com OR. Sozinhas,
-- a de gestão anularia a trava de cargo da de "self". As duas RESTRICTIVE
-- abaixo se somam com AND e valem por cima de todas.

-- Lê o cargo sem passar pelo RLS (evita recursão dentro da policy). STABLE:
-- num UPDATE enxerga o snapshot inicial, ou seja, o cargo ANTIGO.
create or replace function public.cargo_de(uid uuid)
returns cargo
language sql
stable
security definer
set search_path = public
as $$
  select cargo from public.profiles where id = uid;
$$;

-- Ninguém altera o próprio cargo nem se desativa: promoção é ato de outrem.
drop policy if exists profiles_sem_auto_promocao on public.profiles;
create policy profiles_sem_auto_promocao on public.profiles
  as restrictive
  for update to authenticated
  using (true)
  with check (
    id <> auth.uid()
    or (cargo = public.cargo_de(auth.uid()) and ativo)
  );

-- Só a presidência mexe na presidência, tanto para editar quem já está lá
-- (USING, linha antiga) quanto para promover alguém até lá (WITH CHECK, nova).
drop policy if exists profiles_presidencia_protegida on public.profiles;
create policy profiles_presidencia_protegida on public.profiles
  as restrictive
  for update to authenticated
  using (
    public.is_presidencia(auth.uid())
    or cargo not in ('presidente', 'vice_presidente')
  )
  with check (
    public.is_presidencia(auth.uid())
    or cargo not in ('presidente', 'vice_presidente')
  );

-- projetos: leitura pública do que está publicado (a landing é anônima).
drop policy if exists projetos_select_public on public.projetos;
create policy projetos_select_public on public.projetos
  for select to anon, authenticated using (publicado or public.is_gestao(auth.uid()));

drop policy if exists projetos_write_gestao on public.projetos;
create policy projetos_write_gestao on public.projetos
  for all to authenticated
  using (public.is_gestao(auth.uid())) with check (public.is_gestao(auth.uid()));

-- materiais: só para membros logados.
drop policy if exists materiais_select on public.materiais;
create policy materiais_select on public.materiais
  for select to authenticated using (true);

drop policy if exists materiais_write_gestao on public.materiais;
create policy materiais_write_gestao on public.materiais
  for all to authenticated
  using (public.is_gestao(auth.uid())) with check (public.is_gestao(auth.uid()));

-- instagram_cache: leitura pública, escrita só pelo servidor (service_role).
drop policy if exists insta_select on public.instagram_cache;
create policy insta_select on public.instagram_cache
  for select to anon, authenticated using (true);

-- auditoria: só gestão lê; escrita pelo servidor.
drop policy if exists auditoria_select on public.auditoria;
create policy auditoria_select on public.auditoria
  for select to authenticated using (public.is_gestao(auth.uid()));

-- =====================================================================
-- Storage
-- Dois buckets, com regras opostas de propósito:
--   materiais → PRIVADO, só membros logados (biblioteca de estudo)
--   papers    → PÚBLICO, aparece na landing junto do projeto
-- =====================================================================
insert into storage.buckets (id, name, public)
values ('materiais', 'materiais', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('papers', 'papers', true)
on conflict (id) do nothing;

drop policy if exists papers_read on storage.objects;
create policy papers_read on storage.objects
  for select to anon, authenticated using (bucket_id = 'papers');

drop policy if exists papers_write on storage.objects;
create policy papers_write on storage.objects
  for insert to authenticated
  with check (bucket_id = 'papers' and public.is_gestao(auth.uid()));

drop policy if exists papers_delete on storage.objects;
create policy papers_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'papers' and public.is_gestao(auth.uid()));

drop policy if exists materiais_read on storage.objects;
create policy materiais_read on storage.objects
  for select to authenticated using (bucket_id = 'materiais');

drop policy if exists materiais_write on storage.objects;
create policy materiais_write on storage.objects
  for insert to authenticated
  with check (bucket_id = 'materiais' and public.is_gestao(auth.uid()));

drop policy if exists materiais_delete on storage.objects;
create policy materiais_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'materiais' and public.is_gestao(auth.uid()));
