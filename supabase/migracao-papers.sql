-- =====================================================================
-- Migração: anexar paper aos projetos.
-- Rode se você JÁ tinha executado o schema.sql antes desta funcionalidade.
-- Em instalação nova, o schema.sql já contém tudo isto — não precisa rodar.
-- =====================================================================

alter table public.projetos
  add column if not exists paper_url   text,  -- link final para abrir o paper
  add column if not exists paper_path  text,  -- caminho no bucket, se foi upload
  add column if not exists paper_nome  text;  -- nome do arquivo, para o rótulo

-- Bucket PÚBLICO: os papers ficam na landing, visível a qualquer visitante.
-- Material sigiloso de projeto mentorado não deve ser anexado aqui — use o
-- bucket privado "materiais", na área de membros.
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
