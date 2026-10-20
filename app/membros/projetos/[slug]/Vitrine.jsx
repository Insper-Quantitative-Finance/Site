'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import CampoUpload from '@/components/membros/CampoUpload';
import { atualizarCampo } from '../acoes';
import { InlineSelect, InlineTexto } from './Inline';

// Logos que já estão em /public/assets; também aceita URL colada à mão.
const LOGOS = [
  { valor: '/assets/itau-asset.png', label: 'Itaú Asset' },
  { valor: '/assets/lev-asset.png', label: 'LEV Asset Management' },
  { valor: '/assets/vault-capital.png', label: 'Vault Capital' },
  { valor: '/assets/parceiro-giantsteps.png', label: 'Giant Steps Capital' },
  { valor: '/assets/parceiro-xp.png', label: 'XP Inc.' },
  { valor: '/assets/parceiro-b3.png', label: 'B3' },
];

// O banco guarda jsonb; o campo edita como texto, uma linha por item.
const paraTexto = (lista, a, b) =>
  (Array.isArray(lista) ? lista : []).map((o) => `${o[a]} | ${o[b] ?? ''}`).join('\n');

function Campo({ label, ajuda, children }) {
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div className="eyebrow" style={{ color: 'var(--texto-3)' }}>{label}</div>
      {children}
      {ajuda && <div className="ajuda">{ajuda}</div>}
    </div>
  );
}

/** Checkbox que grava direto, sem botão de salvar. */
function Marcar({ projeto, campo, children, confirmar }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();

  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, color: 'var(--texto-2)' }}>
      <input
        type="checkbox"
        checked={Boolean(projeto[campo])}
        disabled={pendente}
        onChange={(e) => {
          const valor = e.target.checked;
          if (valor && confirmar && !confirm(confirmar)) return;
          iniciar(async () => {
            const r = await atualizarCampo({
              tabela: 'projetos',
              id: projeto.id,
              projetoId: projeto.id,
              campo,
              valor,
            });
            if (!r?.ok) return alert(r?.erro ?? 'Não foi possível salvar.');
            router.refresh();
          });
        }}
      />
      {children}
    </label>
  );
}

/** Troca o PDF do paper no bucket público e grava a URL na mesma ação. */
function PaperPdf({ projeto }) {
  const router = useRouter();
  const [, iniciar] = useTransition();

  return (
    <CampoUpload
      bucket="papers"
      publico
      prefixoCampos="paper"
      label="Trocar o PDF do paper"
      aceita=".pdf,application/pdf"
      valor={projeto.paper_path ? { nome: projeto.paper_nome, path: projeto.paper_path } : null}
      aoEnviar={(a) => {
        iniciar(async () => {
          // Dois campos, duas chamadas: a URL é o que a landing usa e o nome
          // é o rótulo do link. Gravar só uma deixaria o par inconsistente.
          await atualizarCampo({ tabela: 'projetos', id: projeto.id, projetoId: projeto.id, campo: 'paper_url', valor: a.url });
          await atualizarCampo({ tabela: 'projetos', id: projeto.id, projetoId: projeto.id, campo: 'paper_nome', valor: a.nome });
          router.refresh();
        });
      }}
      ajuda="Bucket público: qualquer visitante da landing baixa."
    />
  );
}

/**
 * Vitrine: o que a landing mostra deste projeto.
 *
 * Esta aba existia como página separada (/membros/gestao/projetos). Juntar
 * aqui acabou com o vai e vem entre duas telas que editavam o mesmo projeto.
 */
export default function Vitrine({ projeto }) {
  const comum = { tabela: 'projetos', id: projeto.id, projetoId: projeto.id, podeEditar: true };

  return (
    <div style={{ display: 'grid', gap: 32 }}>
      <div style={{ display: 'grid', gap: 16 }}>
        <Marcar projeto={projeto} campo="publicado" confirmar="Publicar põe este projeto na landing, visível para qualquer visitante. Continuar?">
          Publicado no site
        </Marcar>
        <Marcar projeto={projeto} campo="destaque">
          Destaque (aparece antes do “Carregar mais”)
        </Marcar>
      </div>

      <Campo label="Resumo público">
        <InlineTexto {...comum} campo="resumo" valor={projeto.resumo} multilinha
                     rotulo="resumo" estilo={{ fontSize: 15, color: 'var(--texto-2)', lineHeight: 1.7, display: 'block' }} />
      </Campo>

      <div style={{ display: 'grid', gap: 24, gridTemplateColumns: 'repeat(auto-fit, minmax(min(190px, 100%), 1fr))' }}>
        <Campo label="Selo">
          <InlineTexto {...comum} campo="selo" valor={projeto.selo} placeholder="2º lugar" rotulo="selo" />
        </Campo>
        <Campo label="Contexto">
          <InlineTexto {...comum} campo="contexto" valor={projeto.contexto}
                       placeholder="Quantamental Challenge 2024" rotulo="contexto" />
        </Campo>
        <Campo label="Ano">
          <InlineTexto {...comum} campo="ano" valor={projeto.ano} placeholder="2026.1" rotulo="ano" />
        </Campo>
        <Campo label="Ordem" ajuda="Menor aparece primeiro.">
          <InlineTexto {...comum} campo="ordem" valor={String(projeto.ordem ?? 0)} rotulo="ordem" />
        </Campo>
      </div>

      <Campo label="Detalhes técnicos" ajuda={<>Uma linha por item, no formato <code>Rótulo | explicação</code>.</>}>
        <InlineTexto
          {...comum}
          campo="detalhes"
          valor={paraTexto(projeto.detalhes, 'rotulo', 'texto')}
          placeholder="Filtro TMFG | Reduz as 1.225 ligações possíveis às 144 mais informativas."
          multilinha
          rotulo="detalhes"
          estilo={{ fontFamily: 'ui-monospace, monospace', fontSize: 13, display: 'block', lineHeight: 1.7 }}
        />
      </Campo>

      <Campo label="Métricas" ajuda={<>Uma linha por número, no formato <code>Valor | rótulo</code>.</>}>
        <InlineTexto
          {...comum}
          campo="metricas"
          valor={paraTexto(projeto.metricas, 'valor', 'rotulo')}
          placeholder="188,6% | retorno acumulado"
          multilinha
          rotulo="métricas"
          estilo={{ fontFamily: 'ui-monospace, monospace', fontSize: 13, display: 'block', lineHeight: 1.7 }}
        />
      </Campo>

      <fieldset style={{ border: '1px solid var(--linha-forte)', padding: '20px 22px', display: 'grid', gap: 24 }}>
        <legend className="eyebrow" style={{ padding: '0 8px' }}>Parceiro</legend>
        <div style={{ display: 'grid', gap: 24, gridTemplateColumns: 'repeat(auto-fit, minmax(min(190px, 100%), 1fr))' }}>
          <Campo label="Nome">
            <InlineTexto {...comum} campo="parceiro_nome" valor={projeto.parceiro_nome} rotulo="parceiro" />
          </Campo>
          <Campo label="Logo">
            <InlineSelect {...comum} campo="parceiro_logo" valor={projeto.parceiro_logo}
                          opcoes={LOGOS} vazio="Sem logo" estilo={{ fontSize: 14 }} />
          </Campo>
          <Campo label="Texto acima do logo">
            <InlineTexto {...comum} campo="parceiro_prefixo" valor={projeto.parceiro_prefixo}
                         placeholder="Projeto mentorado por" rotulo="prefixo" />
          </Campo>
        </div>
      </fieldset>

      <fieldset style={{ border: '1px solid var(--linha-forte)', padding: '20px 22px', display: 'grid', gap: 24 }}>
        <legend className="eyebrow" style={{ padding: '0 8px' }}>Paper</legend>
        <Campo label="URL do paper">
          <InlineTexto {...comum} campo="paper_url" valor={projeto.paper_url} placeholder="https://…" rotulo="URL do paper" />
        </Campo>
        <Campo label="Rótulo do link">
          <InlineTexto {...comum} campo="paper_nome" valor={projeto.paper_nome}
                       placeholder="Paper completo (PDF)" rotulo="rótulo do paper" />
        </Campo>
        <PaperPdf projeto={projeto} />
      </fieldset>
    </div>
  );
}
