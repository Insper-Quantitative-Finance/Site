-- =====================================================================
-- Metas mensuráveis e reuniões do projeto.
--
-- Rode no SQL Editor depois de migracao-projetos-acompanhamento.sql.
-- É idempotente.
--
-- Meta ≠ marco, de propósito:
--   marco → "Backtest rodando ponta a ponta", tem DATA e acabou
--   meta  → "Sharpe 1,2 de 1,5", tem ALVO e um valor que anda
--
-- As duas colunas de valor são TEXT, não numeric. Meta de projeto quant
-- tanto é "1,2 / 1,5" quanto "3 anos / 5 anos de dados" ou "8 / 12 ativos";
-- forçar numeric obrigaria a inventar unidade e casa decimal para cada uma,
-- e a conta que importa (progresso real) quem faz é quem lê.
--
-- NÃO apago projeto_notas nem projeto_arquivos: as abas saíram da interface,
-- mas a tabela guardada vazia não custa nada e derrubar tabela é
-- irreversível. Para remover de vez, quando tiver certeza:
--   drop table public.projeto_notas, public.projeto_arquivos;
-- =====================================================================

-- ------------------------------------------------------------- metas
create table if not exists public.projeto_metas (
  id          uuid primary key default gen_random_uuid(),
  projeto_id  uuid not null references public.projetos(id) on delete cascade,
  titulo      text not null,
  atual       text,
  alvo        text,
  concluida   boolean not null default false,
  ordem       integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists projeto_metas_projeto_idx on public.projeto_metas (projeto_id, ordem);

-- ---------------------------------------------------------- reuniões
create table if not exists public.projeto_reunioes (
  id          uuid primary key default gen_random_uuid(),
  projeto_id  uuid not null references public.projetos(id) on delete cascade,
  titulo      text not null,

  -- timestamptz, diferente de deadline/prazo que são `date`: reunião é um
  -- INSTANTE. "Quinta às 15h" precisa de fuso para não virar outro horário
  -- para quem abre a página de outro lugar.
  quando      timestamptz,

  -- Meet, Zoom ou Teams: guardamos a URL, sem favorecer plataforma.
  link        text,

  criado_por  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- A tela mostra a próxima reunião primeiro; o índice segue essa ordem.
create index if not exists projeto_reunioes_projeto_idx
  on public.projeto_reunioes (projeto_id, quando desc nulls last);

-- ------------------------------------------------------ updated_at
drop trigger if exists t_proj_metas_touch on public.projeto_metas;
create trigger t_proj_metas_touch before update on public.projeto_metas
  for each row execute function public.touch_updated_at();
drop trigger if exists t_proj_reunioes_touch on public.projeto_reunioes;
create trigger t_proj_reunioes_touch before update on public.projeto_reunioes
  for each row execute function public.touch_updated_at();

-- =====================================================================
-- RLS: mesma regra das tarefas — todo efetivado lê, alocado e comando
-- escrevem. As funções já existem da migração anterior.
-- =====================================================================
alter table public.projeto_metas    enable row level security;
alter table public.projeto_reunioes enable row level security;

drop policy if exists projeto_metas_select on public.projeto_metas;
create policy projeto_metas_select on public.projeto_metas
  for select to authenticated using (public.pode_ver_projetos(auth.uid()));

drop policy if exists projeto_metas_write on public.projeto_metas;
create policy projeto_metas_write on public.projeto_metas
  for all to authenticated
  using (public.pode_editar_projeto(auth.uid(), projeto_id))
  with check (public.pode_editar_projeto(auth.uid(), projeto_id));

drop policy if exists projeto_reunioes_select on public.projeto_reunioes;
create policy projeto_reunioes_select on public.projeto_reunioes
  for select to authenticated using (public.pode_ver_projetos(auth.uid()));

drop policy if exists projeto_reunioes_write on public.projeto_reunioes;
create policy projeto_reunioes_write on public.projeto_reunioes
  for all to authenticated
  using (public.pode_editar_projeto(auth.uid(), projeto_id))
  with check (public.pode_editar_projeto(auth.uid(), projeto_id));
