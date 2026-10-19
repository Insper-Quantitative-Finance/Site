-- =====================================================================
-- Acompanhamento interno de projetos.
--
-- Rode uma vez no SQL Editor do Supabase, depois do schema.sql.
-- É idempotente: rodar de novo não quebra nada.
--
-- A ideia: `projetos` deixa de ser só a vitrine da landing e passa a ser
-- também o registro de trabalho. Um projeto NASCE interno (publicado=false),
-- ganha equipe, deadline, tarefas, marcos, atas e arquivos, e só quando
-- estiver pronto é publicado no site. Slug, paper e histórico continuam
-- sendo um só — nada de cadastrar o mesmo projeto duas vezes.
--
-- Três níveis de acesso, nesta ordem:
--   todo efetivado   → LÊ qualquer projeto (trainee não entra)
--   alocado          → edita tarefas, marcos, atas, anexos e acompanhamento
--   comando (abaixo) → abre projeto, aloca gente, edita a vitrine, arquiva
--
-- Comando de projetos = presidente, vice-presidente, diretor de projetos.
-- Note que é MENOR que is_gestao(): o diretor de capacitações é gestão mas
-- não manda em projetos.
-- =====================================================================

-- ---------------------------------------------------------------- enums
do $$ begin
  create type projeto_status as enum (
    'ideacao',      -- escopo em definição
    'em_andamento',
    'em_revisao',   -- entregue, em revisão da diretoria/parceiro
    'concluido',
    'pausado'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type tarefa_status as enum ('a_fazer', 'fazendo', 'revisao', 'feito');
exception when duplicate_object then null; end $$;

do $$ begin
  create type papel_projeto as enum ('lider', 'membro');
exception when duplicate_object then null; end $$;

-- -------------------------------------------- campos novos em `projetos`
-- Tudo nullable ou com default: as linhas que já existem continuam válidas.
alter table public.projetos
  add column if not exists status        projeto_status not null default 'em_andamento',
  -- date, não timestamptz: deadline é dia, não instante. Guardar fuso aqui
  -- faria "entrega na sexta" virar sábado para quem abrisse em outro fuso.
  add column if not exists deadline      date,
  add column if not exists inicio        date,
  -- Briefing interno: objetivo, escopo, hipótese. Não vai para a landing.
  add column if not exists briefing      text,
  -- Arquivado tira da área de membros sem apagar nem despublicar o site.
  add column if not exists arquivado     boolean not null default false,
  add column if not exists criado_por    uuid references public.profiles(id) on delete set null;

create index if not exists projetos_acompanhamento_idx
  on public.projetos (arquivado, status, deadline);

-- ------------------------------------------------------ equipe alocada
create table if not exists public.projeto_membros (
  projeto_id  uuid not null references public.projetos(id) on delete cascade,
  usuario_id  uuid not null references public.profiles(id) on delete cascade,
  papel       papel_projeto not null default 'membro',
  created_at  timestamptz not null default now(),
  primary key (projeto_id, usuario_id)
);

create index if not exists projeto_membros_usuario_idx on public.projeto_membros (usuario_id);

-- ------------------------------------------------------------ tarefas
create table if not exists public.projeto_tarefas (
  id             uuid primary key default gen_random_uuid(),
  projeto_id     uuid not null references public.projetos(id) on delete cascade,
  titulo         text not null,
  descricao      text,
  status         tarefa_status not null default 'a_fazer',
  -- on delete set null: desalocar alguém não apaga a tarefa dele.
  responsavel_id uuid references public.profiles(id) on delete set null,
  prazo          date,
  ordem          integer not null default 0,
  -- Preenchido pelo trigger quando o status vira 'feito'. Serve para saber
  -- se a tarefa foi entregue antes ou depois do prazo.
  concluida_em   timestamptz,
  autor_id       uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists projeto_tarefas_projeto_idx on public.projeto_tarefas (projeto_id, status, ordem);
create index if not exists projeto_tarefas_responsavel_idx on public.projeto_tarefas (responsavel_id, status);

-- concluida_em é consequência do status, não campo digitável: o trigger é o
-- que garante que os dois nunca se contradigam.
create or replace function public.marcar_conclusao_tarefa()
returns trigger language plpgsql as $$
begin
  if new.status = 'feito' and (old.status is distinct from 'feito') then
    new.concluida_em = now();
  elsif new.status <> 'feito' then
    new.concluida_em = null;
  end if;
  return new;
end $$;

drop trigger if exists t_tarefas_conclusao on public.projeto_tarefas;
create trigger t_tarefas_conclusao before insert or update on public.projeto_tarefas
  for each row execute function public.marcar_conclusao_tarefa();

-- ------------------------------------------------------------- marcos
create table if not exists public.projeto_marcos (
  id          uuid primary key default gen_random_uuid(),
  projeto_id  uuid not null references public.projetos(id) on delete cascade,
  titulo      text not null,
  descricao   text,
  data        date,
  concluido   boolean not null default false,
  ordem       integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists projeto_marcos_projeto_idx on public.projeto_marcos (projeto_id, data, ordem);

-- ------------------------------------------------------- notas / atas
create table if not exists public.projeto_notas (
  id          uuid primary key default gen_random_uuid(),
  projeto_id  uuid not null references public.projetos(id) on delete cascade,
  titulo      text not null,
  corpo       text,
  -- Data da reunião, que não é a data em que a ata foi digitada.
  data        date,
  autor_id    uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists projeto_notas_projeto_idx on public.projeto_notas (projeto_id, created_at desc);

-- ------------------------------------------------- arquivos e links
create table if not exists public.projeto_arquivos (
  id          uuid primary key default gen_random_uuid(),
  projeto_id  uuid not null references public.projetos(id) on delete cascade,
  nome        text not null,
  -- Link externo (Colab, GitHub, Drive) OU arquivo no bucket privado.
  url         text,
  path        text,
  bytes       bigint,
  autor_id    uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  -- Um dos dois tem de existir, senão a linha não aponta para nada.
  constraint projeto_arquivos_destino check (url is not null or path is not null)
);

create index if not exists projeto_arquivos_projeto_idx on public.projeto_arquivos (projeto_id, created_at desc);

-- ------------------------------------------------------ updated_at
drop trigger if exists t_proj_tarefas_touch on public.projeto_tarefas;
create trigger t_proj_tarefas_touch before update on public.projeto_tarefas
  for each row execute function public.touch_updated_at();
drop trigger if exists t_proj_marcos_touch on public.projeto_marcos;
create trigger t_proj_marcos_touch before update on public.projeto_marcos
  for each row execute function public.touch_updated_at();
drop trigger if exists t_proj_notas_touch on public.projeto_notas;
create trigger t_proj_notas_touch before update on public.projeto_notas
  for each row execute function public.touch_updated_at();

-- =====================================================================
-- Permissões
--
-- As três funções abaixo são SECURITY DEFINER de propósito: elas consultam
-- profiles e projeto_membros de dentro de policies que protegem essas mesmas
-- tabelas. Sem isso, a policy chamaria a si mesma e o Postgres estouraria
-- em recursão infinita.
-- =====================================================================

/* Comando de projetos: abre projeto, aloca gente, edita a vitrine, arquiva
   e exclui. MENOR que is_gestao() de propósito — o diretor de capacitações
   é gestão (usuários, materiais, trainee) mas não manda em projetos.
   Espelha ehComandoProjetos() em lib/cargos.js. */
create or replace function public.is_comando_projetos(uid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = uid
      and ativo
      and cargo in ('presidente', 'vice_presidente', 'diretor_projetos')
  );
$$;

-- Trainee não vê a área geral (espelha podeVerAreaGeral() em lib/cargos.js).
create or replace function public.pode_ver_projetos(uid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = uid and ativo and cargo <> 'trainee'
  );
$$;

create or replace function public.no_projeto(uid uuid, pid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.projeto_membros m
    join public.profiles p on p.id = m.usuario_id
    where m.projeto_id = pid and m.usuario_id = uid and p.ativo
  );
$$;

/* Quem pode mexer no acompanhamento: alocado no projeto OU comando.
   O comando entra aqui para não existir projeto órfão — se o último alocado
   sai da liga, ainda há quem feche o registro. */
create or replace function public.pode_editar_projeto(uid uuid, pid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.is_comando_projetos(uid) or public.no_projeto(uid, pid);
$$;

-- =====================================================================
-- RLS
--
-- Leitura é aberta a todo membro efetivado: acompanhamento de projeto é
-- informação de liga, não segredo de squad. Escrita é que é restrita.
-- =====================================================================
alter table public.projeto_membros  enable row level security;
alter table public.projeto_tarefas  enable row level security;
alter table public.projeto_marcos   enable row level security;
alter table public.projeto_notas    enable row level security;
alter table public.projeto_arquivos enable row level security;

-- equipe: todo efetivado lê; só o comando de projetos aloca e desaloca.
drop policy if exists projeto_membros_select on public.projeto_membros;
create policy projeto_membros_select on public.projeto_membros
  for select to authenticated using (public.pode_ver_projetos(auth.uid()));

drop policy if exists projeto_membros_write on public.projeto_membros;
create policy projeto_membros_write on public.projeto_membros
  for all to authenticated
  using (public.is_comando_projetos(auth.uid()))
  with check (public.is_comando_projetos(auth.uid()));

drop policy if exists projeto_tarefas_select on public.projeto_tarefas;
create policy projeto_tarefas_select on public.projeto_tarefas
  for select to authenticated using (public.pode_ver_projetos(auth.uid()));

drop policy if exists projeto_tarefas_write on public.projeto_tarefas;
create policy projeto_tarefas_write on public.projeto_tarefas
  for all to authenticated
  using (public.pode_editar_projeto(auth.uid(), projeto_id))
  with check (public.pode_editar_projeto(auth.uid(), projeto_id));

drop policy if exists projeto_marcos_select on public.projeto_marcos;
create policy projeto_marcos_select on public.projeto_marcos
  for select to authenticated using (public.pode_ver_projetos(auth.uid()));

drop policy if exists projeto_marcos_write on public.projeto_marcos;
create policy projeto_marcos_write on public.projeto_marcos
  for all to authenticated
  using (public.pode_editar_projeto(auth.uid(), projeto_id))
  with check (public.pode_editar_projeto(auth.uid(), projeto_id));

drop policy if exists projeto_notas_select on public.projeto_notas;
create policy projeto_notas_select on public.projeto_notas
  for select to authenticated using (public.pode_ver_projetos(auth.uid()));

drop policy if exists projeto_notas_write on public.projeto_notas;
create policy projeto_notas_write on public.projeto_notas
  for all to authenticated
  using (public.pode_editar_projeto(auth.uid(), projeto_id))
  with check (public.pode_editar_projeto(auth.uid(), projeto_id));

drop policy if exists projeto_arquivos_select on public.projeto_arquivos;
create policy projeto_arquivos_select on public.projeto_arquivos
  for select to authenticated using (public.pode_ver_projetos(auth.uid()));

drop policy if exists projeto_arquivos_write on public.projeto_arquivos;
create policy projeto_arquivos_write on public.projeto_arquivos
  for all to authenticated
  using (public.pode_editar_projeto(auth.uid(), projeto_id))
  with check (public.pode_editar_projeto(auth.uid(), projeto_id));

/* `projetos` em si: a policy antiga de SELECT só liberava publicado ou gestão,
   o que esconderia o projeto interno de quem está alocado nele. Esta
   substitui mantendo a landing anônima funcionando igual. */
drop policy if exists projetos_select_public on public.projetos;
create policy projetos_select_public on public.projetos
  for select to anon, authenticated
  using (publicado or public.pode_ver_projetos(auth.uid()));

/* A policy de escrita antiga era is_gestao(), que incluía o diretor de
   capacitações. Agora projeto é domínio do comando de projetos. */
drop policy if exists projetos_write_gestao on public.projetos;
create policy projetos_write_gestao on public.projetos
  for all to authenticated
  using (public.is_comando_projetos(auth.uid()))
  with check (public.is_comando_projetos(auth.uid()));

/* O acompanhamento (status, deadline, briefing) é dos alocados; a vitrine é
   do comando. Em RLS não se trava coluna, então esta policy libera o UPDATE
   da linha e a trava por coluna fica na lista CAMPOS de acoes.js, que separa
   os campos de `equipe` dos de `vitrine`. */
drop policy if exists projetos_update_equipe on public.projetos;
create policy projetos_update_equipe on public.projetos
  for update to authenticated
  using (public.no_projeto(auth.uid(), id))
  with check (public.no_projeto(auth.uid(), id));

-- =====================================================================
-- Storage: bucket privado dos arquivos de projeto.
-- Privado, diferente de `papers`: aqui entra rascunho, dado de parceiro e
-- planilha interna — nada disso pode ficar aberto na internet.
-- =====================================================================
insert into storage.buckets (id, name, public)
values ('projetos', 'projetos', false)
on conflict (id) do nothing;

drop policy if exists projetos_arquivo_read on storage.objects;
create policy projetos_arquivo_read on storage.objects
  for select to authenticated
  using (bucket_id = 'projetos' and public.pode_ver_projetos(auth.uid()));

drop policy if exists projetos_arquivo_write on storage.objects;
create policy projetos_arquivo_write on storage.objects
  for insert to authenticated
  with check (bucket_id = 'projetos' and public.pode_ver_projetos(auth.uid()));

-- Sobras da versão anterior desta migração, caso ela já tenha sido rodada.
drop function if exists public.lidera_projeto(uuid, uuid);

drop policy if exists projetos_arquivo_delete on storage.objects;
create policy projetos_arquivo_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'projetos' and public.pode_ver_projetos(auth.uid()));
