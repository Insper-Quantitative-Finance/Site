'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useFormState } from 'react-dom';
import CampoUpload from '@/components/membros/CampoUpload';
import { BotaoEnviar, Feedback } from '@/components/membros/Formulario';
import { excluirMaterial, salvarMaterial } from '@/app/membros/gestao/acoes';

// 'Trainee' é a categoria que alimenta os handouts em /membros/trainee.
const CATEGORIAS = ['Trainee', 'Python', 'Estatística', 'Finanças', 'Papers', 'Treinamentos', 'Ferramentas', 'Geral'];

function FormularioMaterial({ material, aoConcluir }) {
  const router = useRouter();
  const [estado, acao] = useFormState(salvarMaterial, null);
  const [tipo, setTipo] = useState(material?.tipo ?? 'link');
  const [arquivo, setArquivo] = useState(
    material?.arquivo_path
      ? { path: material.arquivo_path, nome: material.arquivo_nome, bytes: material.arquivo_bytes }
      : null,
  );

  // Recarrega a lista depois de salvar com sucesso.
  useEffect(() => {
    if (!estado?.ok) return;
    const t = setTimeout(() => {
      router.refresh();
      aoConcluir?.();
    }, 800);
    return () => clearTimeout(t);
  }, [estado, router, aoConcluir]);

  return (
    <form action={acao} style={{ display: 'grid', gap: 20 }}>
      <Feedback estado={estado} />
      {material?.id && <input type="hidden" name="id" value={material.id} />}

      <div className="campo">
        <label htmlFor="titulo">Título</label>
        <input id="titulo" name="titulo" required defaultValue={material?.titulo} />
      </div>

      <div className="campo">
        <label htmlFor="descricao">Descrição</label>
        <textarea id="descricao" name="descricao" defaultValue={material?.descricao ?? ''} />
      </div>

      <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <div className="campo">
          <label htmlFor="categoria">Categoria</label>
          <select id="categoria" name="categoria" defaultValue={material?.categoria ?? 'Geral'}>
            {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="campo">
          <label htmlFor="tipo">Tipo</label>
          <select id="tipo" name="tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="link">Link externo</option>
            <option value="arquivo">Arquivo (PDF, notebook…)</option>
          </select>
        </div>

        <div className="campo">
          <label htmlFor="ordem">Ordem</label>
          <input id="ordem" name="ordem" type="number" defaultValue={material?.ordem ?? 0} />
        </div>
      </div>

      {tipo === 'link' ? (
        <div className="campo">
          <label htmlFor="url">URL</label>
          <input id="url" name="url" type="url" defaultValue={material?.url ?? ''} placeholder="https://…" />
        </div>
      ) : (
        <CampoUpload
          bucket="materiais"
          prefixoCampos="arquivo"
          label="Arquivo"
          valor={arquivo}
          aoEnviar={setArquivo}
          ajuda="Fica no bucket privado: o download exige login."
        />
      )}

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <BotaoEnviar>{material?.id ? 'Salvar alterações' : 'Adicionar material'}</BotaoEnviar>
        {aoConcluir && (
          <button type="button" className="btn btn--vazado" onClick={aoConcluir}>Cancelar</button>
        )}
      </div>
    </form>
  );
}

function BotaoExcluir({ id, titulo }) {
  const router = useRouter();
  const [estado, acao] = useFormState(excluirMaterial, null);

  useEffect(() => {
    if (estado?.ok) router.refresh();
  }, [estado, router]);

  return (
    <form
      action={acao}
      onSubmit={(e) => {
        if (!confirm(`Excluir "${titulo}"? Isso apaga também o arquivo enviado.`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <BotaoEnviar variante="vazado" carregando="Excluindo…">Excluir</BotaoEnviar>
    </form>
  );
}

export default function GerenciarMateriais({ materiais }) {
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState(null);

  return (
    <section className="painel" style={{ display: 'grid', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: 22, marginBottom: 6 }}>Gerenciar materiais</h2>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--texto-3)' }}>
            Visível só para os cargos de gestão.
          </p>
        </div>
        <button
          className="btn btn--solido btn--pequeno"
          onClick={() => { setEditando(null); setAberto((a) => !a); }}
        >
          {aberto && !editando ? 'Fechar' : 'Novo material'}
        </button>
      </div>

      {(aberto || editando) && (
        <FormularioMaterial
          key={editando?.id ?? 'novo'}
          material={editando}
          aoConcluir={() => { setAberto(false); setEditando(null); }}
        />
      )}

      {materiais.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table className="tabela">
            <thead>
              <tr>
                <th>Título</th>
                <th>Categoria</th>
                <th>Tipo</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {materiais.map((m) => (
                <tr key={m.id}>
                  <td style={{ color: 'var(--osso)' }}>{m.titulo}</td>
                  <td>{m.categoria}</td>
                  <td><span className="selo">{m.tipo}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                      <button
                        className="btn btn--vazado btn--pequeno"
                        onClick={() => { setEditando(m); setAberto(false); }}
                      >
                        Editar
                      </button>
                      <BotaoExcluir id={m.id} titulo={m.titulo} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
