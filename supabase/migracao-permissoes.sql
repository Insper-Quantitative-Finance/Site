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
