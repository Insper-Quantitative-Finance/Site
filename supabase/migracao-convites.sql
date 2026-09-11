-- =====================================================================
-- Convites de trainee (magic link de cadastro).
--
-- Rode uma vez no SQL Editor do Supabase, depois do schema.sql.
-- É idempotente: rodar de novo não quebra nada.
--
-- A ideia: a gestão gera um link com token, manda para a turma de trainees,
-- e cada pessoa cria a própria conta (e-mail + senha) sem que ninguém da
-- gestão precise digitar senha por ela.
--
-- O cargo NÃO é um campo escolhido pelo link. É uma coluna travada em
-- 'trainee' por CHECK: mesmo que alguém adultere o formulário, o banco
-- recusa qualquer outro valor. Quem vira membro/diretoria é promovido
-- depois, pela presidência, na tela de usuários.
-- =====================================================================

create table if not exists public.convites (
  id            uuid primary key default gen_random_uuid(),

  -- Segredo que viaja na URL: /convite/<token>. 43 chars base64url (32 bytes).
  token         text unique not null,

  -- Só para a gestão se lembrar de quem é o link ("Trainees 2026.1").
  rotulo        text not null,

  -- Trava de segurança em duas camadas (esta e a validação no servidor).
  -- Não use esta tabela para convidar membro ou diretoria.
  cargo         cargo not null default 'trainee' check (cargo = 'trainee'),

  -- Preenchidos automaticamente no perfil de quem aceitar o convite.
  turma         text,
  area          text,

  -- Restringe o cadastro a um domínio de e-mail ('al.insper.edu.br').
  -- Null = qualquer e-mail.
  dominio_email text,

  -- Quantas contas este link ainda pode criar. Null = ilimitado.
  -- Um link por turma costuma ter usos_max null ou o tamanho da turma.
  usos_max      integer check (usos_max is null or usos_max > 0),
  usos          integer not null default 0,

  expira_em     timestamptz,
  revogado      boolean not null default false,

  criado_por    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists convites_token_idx on public.convites (token);

alter table public.convites enable row level security;

-- Nenhuma policy, de propósito: nem 'anon' nem 'authenticated' leem esta
-- tabela. O token é um segredo — se qualquer membro logado pudesse listar
-- convites, qualquer membro poderia fabricar contas. Só o service_role
-- (as server actions) toca aqui, e ele ignora RLS.

drop trigger if exists t_convites_touch on public.convites;
create trigger t_convites_touch before update on public.convites
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- Consome um uso do convite de forma atômica.
--
-- Dois trainees clicando no mesmo instante não podem furar o usos_max:
-- o UPDATE ... WHERE usos < usos_max resolve isso no próprio banco
-- (o segundo só enxerga a linha já travada pelo primeiro). Fazer
-- "select depois update" na aplicação abriria essa corrida.
--
-- Devolve a linha do convite se o uso foi consumido; nada, se o convite
-- está revogado, vencido ou esgotado.
-- ---------------------------------------------------------------------
create or replace function public.consumir_convite(p_token text)
returns public.convites
language sql
volatile
security definer
set search_path = public
as $$
  update public.convites
     set usos = usos + 1
   where token = p_token
     and not revogado
     and (expira_em is null or expira_em > now())
     and (usos_max is null or usos < usos_max)
  returning *;
$$;

revoke all on function public.consumir_convite(text) from public, anon, authenticated;

-- Devolve o uso quando a criação da conta falhou no meio do caminho.
create or replace function public.devolver_convite(p_token text)
returns void
language sql
volatile
security definer
set search_path = public
as $$
  update public.convites set usos = greatest(usos - 1, 0) where token = p_token;
$$;

revoke all on function public.devolver_convite(text) from public, anon, authenticated;
