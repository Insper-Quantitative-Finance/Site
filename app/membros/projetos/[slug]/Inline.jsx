'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { atualizarCampo, criarItem, excluirItem } from '../acoes';

/**
 * Primitivas de edição inline.
 *
 * O padrão aqui é sempre o mesmo: o valor novo entra no estado local na hora
 * (otimista), a action roda em transition e o router.refresh() só vem depois.
 * Sem isso cada clique esperaria o round-trip inteiro antes de a tela mudar,
 * e o quadro pareceria travado.
 *
 * Quando a action falha, o estado local volta ao valor que veio do servidor —
 * é por isso que `valor` é sempre a fonte da verdade no useEffect abaixo.
 */

/**
 * Hook comum: salva um campo, com rollback e mensagem de erro.
 *
 * `persistido` guarda o último valor que sabemos estar no banco, e é contra
 * ele que decidimos se vale gravar. Comparar com o estado exibido não serve:
 * num campo de texto o estado já foi atualizado letra por letra enquanto se
 * digitava, então "mudou?" daria sempre não e nada seria salvo.
 */
function useSalvar({ tabela, id, projetoId, campo, valor, refrescar = true }) {
  const router = useRouter();
  const [local, setLocal] = useState(valor);
  const persistido = useRef(valor);
  const [erro, setErro] = useState(null);
  const [pendente, iniciar] = useTransition();

  // O servidor manda a verdade: toda revalidação sobrescreve o otimismo.
  useEffect(() => {
    setLocal(valor);
    persistido.current = valor;
  }, [valor]);

  const salvar = (novo) => {
    // Normaliza antes de comparar: '' e null são o mesmo "vazio" para o
    // banco, e sem isso abrir e fechar um campo vazio gravaria por nada.
    const limpo = typeof novo === 'string' ? novo.trim() || null : novo;
    if (limpo === (persistido.current ?? null)) return;

    const anterior = persistido.current;
    setLocal(limpo);
    persistido.current = limpo;
    setErro(null);

    iniciar(async () => {
      const r = await atualizarCampo({ tabela, id, projetoId, campo, valor: limpo });
      if (!r?.ok) {
        setLocal(anterior);
        persistido.current = anterior;
        setErro(r?.erro ?? 'Não foi possível salvar.');
        return;
      }
      // Refresh refaz a página toda no servidor. Vale para o que alimenta
      // número derivado (status muda a barra de progresso, data muda a cor
      // e o "em X dias", checkbox muda a contagem da aba). Para texto puro
      // o estado local já mostra o valor certo e o refresh só adicionaria
      // espera depois de cada palavra digitada.
      if (refrescar) router.refresh();
    });
  };

  return { local, setLocal, salvar, erro, pendente };
}

const estiloBase = {
  background: 'transparent',
  border: '1px solid transparent',
  color: 'inherit',
  font: 'inherit',
  padding: '4px 8px',
  margin: '-4px -8px',
  width: '100%',
  borderRadius: 2,
};

function Erro({ children }) {
  if (!children) return null;
  return <div style={{ fontSize: 11, color: '#E8A0A0', marginTop: 4 }}>{children}</div>;
}

/* ------------------------------------------------------------------ texto */

/**
 * Texto que vira input ao clicar. Enter salva, Esc desfaz, sair do campo salva.
 * `multilinha` troca por textarea (Enter faz parágrafo; Ctrl+Enter salva).
 */
export function InlineTexto({
  tabela,
  id,
  projetoId,
  campo,
  valor,
  podeEditar,
  placeholder = 'vazio',
  multilinha = false,
  estilo,
  rotulo,
}) {
  const { local, salvar, erro, pendente } = useSalvar({
    tabela,
    id,
    projetoId,
    campo,
    valor,
    refrescar: false,
  });
  const [editando, setEditando] = useState(false);
  // Rascunho é só do input aberto. Fica fora do estado exibido para que o
  // hook consiga comparar o que foi digitado com o que está no banco.
  const [rascunho, setRascunho] = useState('');
  const ref = useRef(null);

  const abrir = () => {
    setRascunho(local ?? '');
    setEditando(true);
  };

  useEffect(() => {
    if (editando && ref.current) {
      ref.current.focus();
      // Cursor no fim, não selecionando tudo: quem clica num texto longo
      // quase sempre quer ajustar uma palavra, não reescrever.
      const fim = ref.current.value.length;
      ref.current.setSelectionRange(fim, fim);
    }
  }, [editando]);

  if (!podeEditar) {
    return (
      <span style={{ whiteSpace: multilinha ? 'pre-wrap' : 'normal', ...estilo }}>
        {valor || <span style={{ color: 'var(--texto-3)' }}>—</span>}
      </span>
    );
  }

  if (!editando) {
    return (
      <div>
        <span
          role="button"
          tabIndex={0}
          aria-label={rotulo ? `Editar ${rotulo}` : 'Editar'}
          onClick={abrir}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              abrir();
            }
          }}
          className="inline-edit"
          style={{
            whiteSpace: multilinha ? 'pre-wrap' : 'normal',
            opacity: pendente ? 0.5 : 1,
            ...estilo,
          }}
        >
          {local || <span style={{ color: 'var(--texto-3)' }}>{placeholder}</span>}
        </span>
        <Erro>{erro}</Erro>
      </div>
    );
  }

  const Campo = multilinha ? 'textarea' : 'input';

  return (
    <div>
      <Campo
        ref={ref}
        value={rascunho}
        onChange={(e) => setRascunho(e.target.value)}
        onBlur={() => {
          setEditando(false);
          salvar(rascunho);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            // Fecha sem salvar: o rascunho é descartado e o blur que vem a
            // seguir não deve gravar, por isso o estado fecha antes.
            setRascunho(local ?? '');
            setEditando(false);
          } else if (e.key === 'Enter' && (!multilinha || e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            e.currentTarget.blur();
          }
        }}
        style={{
          ...estiloBase,
          borderColor: 'var(--azul)',
          background: 'var(--preto)',
          minHeight: multilinha ? 160 : undefined,
          lineHeight: multilinha ? 1.7 : undefined,
          resize: multilinha ? 'vertical' : undefined,
          ...estilo,
        }}
      />
      <Erro>{erro}</Erro>
    </div>
  );
}

/* ----------------------------------------------------------------- select */

/** Dropdown que salva no onChange — sem botão de confirmar. */
export function InlineSelect({ tabela, id, projetoId, campo, valor, opcoes, podeEditar, vazio, estilo }) {
  const { local, salvar, erro, pendente } = useSalvar({ tabela, id, projetoId, campo, valor });

  if (!podeEditar) {
    const atual = opcoes.find((o) => o.valor === valor);
    return <span style={estilo}>{atual?.label ?? vazio ?? '—'}</span>;
  }

  return (
    <div>
      <select
        value={local ?? ''}
        onChange={(e) => salvar(e.target.value || null)}
        className="inline-edit"
        style={{ ...estiloBase, cursor: 'pointer', opacity: pendente ? 0.5 : 1, ...estilo }}
      >
        {vazio && <option value="">{vazio}</option>}
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor}>{o.label}</option>
        ))}
      </select>
      <Erro>{erro}</Erro>
    </div>
  );
}

/* ------------------------------------------------------------------- data */

export function InlineData({ tabela, id, projetoId, campo, valor, podeEditar, estilo }) {
  const { local, salvar, erro, pendente } = useSalvar({ tabela, id, projetoId, campo, valor });

  if (!podeEditar) {
    return <span style={estilo}>{valor ?? '—'}</span>;
  }

  return (
    <div>
      <input
        type="date"
        value={local ?? ''}
        onChange={(e) => salvar(e.target.value || null)}
        className="inline-edit"
        style={{ ...estiloBase, cursor: 'pointer', opacity: pendente ? 0.5 : 1, ...estilo }}
      />
      <Erro>{erro}</Erro>
    </div>
  );
}

/* --------------------------------------------------------------- checkbox */

export function InlineCheck({ tabela, id, projetoId, campo, valor, podeEditar, titulo }) {
  const { local, salvar, pendente } = useSalvar({ tabela, id, projetoId, campo, valor });

  return (
    <input
      type="checkbox"
      checked={Boolean(local)}
      disabled={!podeEditar || pendente}
      title={titulo}
      onChange={(e) => salvar(e.target.checked)}
      style={{ cursor: podeEditar ? 'pointer' : 'default', width: 16, height: 16, flexShrink: 0 }}
    />
  );
}

/* -------------------------------------------------------------- quick add */

/**
 * Criar com uma linha só: digita o título e dá Enter.
 * O resto (responsável, prazo, detalhes) é editado inline depois — pedir
 * tudo de uma vez é o que fazia ninguém registrar tarefa.
 */
export function QuickAdd({ tabela, projetoId, extra, placeholder, aoCriar }) {
  const router = useRouter();
  const [texto, setTexto] = useState('');
  const [erro, setErro] = useState(null);
  const [pendente, iniciar] = useTransition();

  const enviar = () => {
    const titulo = texto.trim();
    if (!titulo) return;
    setTexto('');
    setErro(null);
    iniciar(async () => {
      const r = await criarItem({ tabela, projetoId, titulo, extra });
      if (!r?.ok) {
        setTexto(titulo);
        setErro(r?.erro ?? 'Não foi possível criar.');
        return;
      }
      aoCriar?.(r.id);
      router.refresh();
    });
  };

  return (
    <div>
      <input
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            enviar();
          }
        }}
        onBlur={enviar}
        disabled={pendente}
        placeholder={placeholder}
        style={{
          width: '100%',
          background: 'transparent',
          border: '1px dashed var(--linha-forte)',
          color: 'var(--osso)',
          font: 'inherit',
          fontSize: 13,
          padding: '10px 12px',
        }}
      />
      <Erro>{erro}</Erro>
    </div>
  );
}

/* --------------------------------------------------------------- excluir */

/** Excluir sem form: um clique, uma confirmação, otimismo via refresh. */
export function BotaoExcluir({ tabela, id, projetoId, oQue, children = '✕', estilo }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();

  return (
    <button
      title={`Excluir ${oQue}`}
      disabled={pendente}
      onClick={() => {
        if (!confirm(`Excluir ${oQue}?`)) return;
        iniciar(async () => {
          await excluirItem({ tabela, id, projetoId });
          router.refresh();
        });
      }}
      className="btn-icone"
      style={estilo}
    >
      {pendente ? '…' : children}
    </button>
  );
}
