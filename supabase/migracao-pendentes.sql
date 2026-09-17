-- =====================================================================
-- PENDENTES NESTE PROJETO — rode tudo de uma vez no SQL Editor.
--
-- Auditoria de 17/09/2026 contra o banco em produção: o schema.sql foi
-- aplicado, mas três migrações nunca rodaram. Os sintomas eram:
--
--   "Could not find the table 'public.handouts'"  ao salvar a liberação
--   "Could not find the table 'public.entregas'"  — e por isso a lista de
--                                                   entregas do trainee
--                                                   aparecia sempre vazia
--   função public.cargo_de ausente               — as travas RESTRICTIVE
--                                                   de perfil não existiam
--
-- É a concatenação, nesta ordem, de:
--   migracao-permissoes.sql
--   migracao-trainee.sql
--   migracao-handouts.sql
--
-- Esses três continuam sendo a fonte da verdade; este arquivo é só o
-- atalho para colar no editor. Tudo aqui é idempotente: create table if
-- not exists, create or replace function, drop policy if exists antes de
-- create policy. Rodar de novo não quebra nada.
--
-- Depende de public.is_gestao() e public.touch_updated_at(), que já
-- existem (vieram do schema.sql) — verificado na auditoria.
-- =====================================================================



-- #####################################################################
-- migracao-permissoes.sql
-- #####################################################################

-- =====================================================================
-- Regras de permissão sobre profiles, aplicadas no banco.
--
-- Substitui a tentativa anterior com políticas RESTRICTIVE. Motivo: as regras
-- aqui são por CAMPO ("só pode mudar o nome"), e RLS enxerga apenas a linha
-- NOVA no WITH CHECK. Um trigger BEFORE UPDATE vê OLD e NEW ao mesmo tempo,
-- que é exatamente o que a comparação campo a campo exige.
--
-- Modelo:
--   presidente / vice-presidente  → editam todos os campos, inclusive cargo
--   diretor (projetos/capacitações) → editam usuários, MENOS o cargo
--   membro / trainee              → apenas o próprio nome
--                                   (e-mail e senha mudam pelo fluxo do auth)
--   ninguém                       → altera o próprio cargo ou se desativa
--
-- Rode este arquivo inteiro no SQL Editor. É idempotente.
-- =====================================================================

-- Limpa a tentativa anterior, se ela chegou a ser aplicada.
drop policy if exists profiles_sem_auto_promocao on public.profiles;
drop policy if exists profiles_presidencia_protegida on public.profiles;

-- ------------------------------------------------------------ helper
-- Lê o cargo sem passar pelo RLS (evita recursão dentro das políticas).
create or replace function public.cargo_de(uid uuid)
returns cargo
language sql
stable
security definer
set search_path = public
as $$
  select cargo from public.profiles where id = uid;
$$;

-- ------------------------------------------------- trigger de campos
create or replace function public.proteger_campos_perfil()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ator       uuid := auth.uid();
  ator_cargo cargo;
  eh_gestao  boolean;
begin
  -- Sincronização interna de e-mail (ver trigger mais abaixo): já foi validada
  -- pelo próprio Supabase Auth, não passa por estas regras.
  if coalesce(current_setting('app.sincronizando_email', true), '') = '1' then
    return new;
  end if;

  -- Sem sessão de usuário = chave secreta no servidor. As server actions têm
  -- as próprias checagens; estas regras existem para bloquear quem chama a
  -- API REST direto com um token de usuário.
  if ator is null then
    return new;
  end if;

  select cargo into ator_cargo from public.profiles where id = ator;
  eh_gestao := ator_cargo in
    ('presidente', 'vice_presidente', 'diretor_projetos', 'diretor_capacitacoes');

  -- 1. Cargo: exclusividade da presidência, e nunca o próprio.
  if new.cargo is distinct from old.cargo then
    if ator_cargo not in ('presidente', 'vice_presidente') then
      raise exception 'Apenas presidente e vice-presidente podem alterar cargos.'
        using errcode = 'check_violation';
    end if;
    if new.id = ator then
      raise exception 'Você não pode alterar o próprio cargo.'
        using errcode = 'check_violation';
    end if;
  end if;

  -- 2. Ninguém se desativa (evita trancar-se para fora por engano).
  if new.id = ator and old.ativo and not new.ativo then
    raise exception 'Você não pode desativar a própria conta.'
      using errcode = 'check_violation';
  end if;

  -- 3. Quem não é gestão: só o próprio perfil, e nele só o nome.
  if not eh_gestao then
    if new.id <> ator then
      raise exception 'Você só pode editar o seu próprio perfil.'
        using errcode = 'check_violation';
    end if;
    if new.email    is distinct from old.email
    or new.area     is distinct from old.area
    or new.turma    is distinct from old.turma
    or new.linkedin is distinct from old.linkedin
    or new.bio      is distinct from old.bio
    or new.foto_url is distinct from old.foto_url
    or new.ativo    is distinct from old.ativo then
      raise exception
        'Você pode alterar apenas o seu nome. E-mail e senha mudam em Minha conta; o restante é definido pela gestão.'
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists t_proteger_campos_perfil on public.profiles;
create trigger t_proteger_campos_perfil
  before update on public.profiles
  for each row execute function public.proteger_campos_perfil();

-- --------------------------------------------- sincronização de e-mail
-- Quando o usuário confirma a troca de e-mail, o Supabase atualiza
-- auth.users. Sem isto, profiles.email ficaria eternamente desatualizado.
create or replace function public.sincronizar_email_perfil()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is distinct from old.email then
    -- Sinaliza ao trigger de proteção que esta escrita é interna e legítima.
    perform set_config('app.sincronizando_email', '1', true);
    update public.profiles set email = new.email where id = new.id;
    perform set_config('app.sincronizando_email', '', true);
  end if;
  return new;
end;
$$;

drop trigger if exists t_sincronizar_email on auth.users;
create trigger t_sincronizar_email
  after update of email on auth.users
  for each row execute function public.sincronizar_email_perfil();


-- #####################################################################
-- migracao-trainee.sql
-- #####################################################################

-- =====================================================================
-- Entregas do programa de trainee.
--
-- Rode uma vez no SQL Editor do Supabase, depois do schema.sql.
-- É idempotente: rodar de novo não quebra nada.
--
-- Os handouts NÃO ganham tabela própria: são materiais com
-- categoria = 'Trainee', reaproveitando o upload, o download protegido
-- e a gestão que já existem.
-- =====================================================================

create table if not exists public.entregas (
  id          uuid primary key default gen_random_uuid(),
  titulo      text not null,
  descricao   text,
  -- date, não timestamptz: prazo é dia, não instante. Guardar fuso aqui
  -- faria uma entrega "23:59 de sexta" virar sábado para quem abrisse
  -- o site em outro fuso.
  data_limite date not null,
  -- Onde entregar (formulário, e-mail, repositório). Opcional.
  url         text,
  -- Semestre a que a entrega pertence: '2026.1'. Serve para arquivar o
  -- semestre anterior sem apagar o histórico.
  periodo     text not null default '',
  ordem       integer not null default 0,
  autor_id    uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists entregas_data_idx on public.entregas (data_limite, ordem);

alter table public.entregas enable row level security;

-- Mesma regra dos materiais: todo membro logado lê, só a gestão escreve.
drop policy if exists entregas_select on public.entregas;
create policy entregas_select on public.entregas
  for select to authenticated using (true);

drop policy if exists entregas_write_gestao on public.entregas;
create policy entregas_write_gestao on public.entregas
  for all to authenticated
  using (public.is_gestao(auth.uid())) with check (public.is_gestao(auth.uid()));

drop trigger if exists t_entregas_touch on public.entregas;
create trigger t_entregas_touch before update on public.entregas
  for each row execute function public.touch_updated_at();


-- #####################################################################
-- migracao-handouts.sql
-- #####################################################################

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
