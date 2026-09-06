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
