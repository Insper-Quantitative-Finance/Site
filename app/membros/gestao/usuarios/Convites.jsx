'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useFormState } from 'react-dom';
import { BotaoEnviar, Feedback } from '@/components/membros/Formulario';
import { criarConvite, revogarConvite } from '@/app/membros/gestao/acoes';
import {
  CARGOS_CONVITE,
  DOMINIO_PERMITIDO,
  linkConvite,
  rotuloCargoConvite,
  situacaoConvite,
} from '@/lib/convites';

/** Copia para a área de transferência com um fallback para http/navegador antigo. */
async function copiar(texto) {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    const campo = document.createElement('textarea');
    campo.value = texto;
    campo.style.position = 'fixed';
    campo.style.opacity = '0';
    document.body.appendChild(campo);
    campo.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(campo);
    return ok;
  }
}

function BotaoCopiar({ link }) {
  const [copiado, setCopiado] = useState(false);

  return (
    <button
      type="button"
      className="btn btn--vazado btn--pequeno"
      onClick={async () => {
        if (await copiar(link)) {
          setCopiado(true);
          setTimeout(() => setCopiado(false), 2000);
        }
      }}
    >
      {copiado ? 'Copiado' : 'Copiar link'}
    </button>
  );
}

function FormularioNovoConvite({ origem, aoFechar }) {
  const router = useRouter();
  const [estado, acao] = useFormState(criarConvite, null);

  useEffect(() => {
    if (estado?.ok) router.refresh();
  }, [estado, router]);

  return (
    <form action={acao} className="painel" style={{ display: 'grid', gap: 20 }}>
      <h3 style={{ fontSize: 20, margin: 0 }}>Novo link de convite</h3>
      <p style={{ margin: 0, fontSize: 13, color: 'var(--texto-3)' }}>
        O cargo é fixado aqui, na criação do link, e quem clica não escolhe nada. Só trainee e membro: para
        diretoria ou presidência, promova o usuário depois de ele entrar.
      </p>
      <Feedback estado={estado} />

      {estado?.ok && estado.token && (
        <div style={{ display: 'grid', gap: 10 }}>
          <input readOnly value={linkConvite(origem, estado.token)} onFocus={(e) => e.target.select()} />
          <div><BotaoCopiar link={linkConvite(origem, estado.token)} /></div>
        </div>
      )}

      <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className="campo">
          <label htmlFor="cv-link-cargo">Cria conta de</label>
          <select id="cv-link-cargo" name="cargo" defaultValue="trainee">
            {CARGOS_CONVITE.map((c) => (
              <option key={c.valor} value={c.valor}>{c.label}</option>
            ))}
          </select>
        </div>
        <div className="campo">
          <label htmlFor="cv-rotulo">Nome do convite</label>
          <input id="cv-rotulo" name="rotulo" placeholder="Trainees 2026.1" />
          <div className="ajuda">Opcional — só para você reconhecer o link na tabela.</div>
        </div>
        <div className="campo">
          <label htmlFor="cv-usos">Limite de cadastros</label>
          <input id="cv-usos" name="usos_max" type="number" min={1} placeholder="ilimitado" />
          <div className="ajuda">Vazio = sem limite. Use o tamanho da turma para não sobrar vaga.</div>
        </div>
      </div>

      <div className="aviso" style={{ borderColor: 'var(--linha-forte)', color: 'var(--texto-3)', margin: 0 }}>
        Só e-mails @{DOMINIO_PERMITIDO} conseguem se cadastrar — é a trava que vale se o link vazar. O convite não
        tem prazo: use <strong>Revogar</strong> quando quiser desligá-lo.
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <BotaoEnviar carregando="Gerando…">Gerar link</BotaoEnviar>
        <button type="button" className="btn btn--vazado" onClick={aoFechar}>Fechar</button>
      </div>
    </form>
  );
}

function BotaoRevogar({ id }) {
  const router = useRouter();
  const [estado, acao] = useFormState(revogarConvite, null);

  useEffect(() => {
    if (estado?.ok) router.refresh();
  }, [estado, router]);

  return (
    <form action={acao} style={{ display: 'inline' }}>
      <input type="hidden" name="id" value={id} />
      <BotaoEnviar variante="vazado" carregando="Revogando…">Revogar</BotaoEnviar>
    </form>
  );
}

export default function Convites({ convites }) {
  const [criando, setCriando] = useState(false);
  // Lido depois da montagem para o HTML do servidor e o do cliente baterem.
  const [origem, setOrigem] = useState('');
  useEffect(() => setOrigem(window.location.origin), []);

  return (
    <section style={{ display: 'grid', gap: 24 }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: 24, margin: '0 0 6px' }}>Links de convite para turma</h2>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--texto-3)', maxWidth: '62ch' }}>
            Um link, vários cadastros: mande no grupo e cada pessoa cria a própria conta com e-mail e senha. Para
            convidar gente nominalmente (e saber quem já entrou), use a seção acima.
          </p>
        </div>
        <button className="btn btn--solido" onClick={() => setCriando((c) => !c)}>
          {criando ? 'Fechar' : 'Novo convite'}
        </button>
      </div>

      {criando && <FormularioNovoConvite origem={origem} aoFechar={() => setCriando(false)} />}

      {convites.length === 0 ? (
        <p style={{ margin: 0, fontSize: 14, color: 'var(--texto-3)' }}>Nenhum convite criado ainda.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="tabela">
            <thead>
              <tr>
                <th>Convite</th>
                <th>Cargo</th>
                <th>Cadastros</th>
                <th>Situação</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {convites.map((c) => {
                const situacao = situacaoConvite(c);
                const ativo = situacao.valor === 'ativo';
                return (
                  <tr key={c.id} style={{ opacity: ativo ? 1 : 0.55 }}>
                    <td style={{ color: 'var(--osso)' }}>
                      {c.rotulo}
                      <div style={{ fontSize: 12, color: 'var(--texto-3)' }}>
                        @{c.dominio_email ?? DOMINIO_PERMITIDO}
                      </div>
                    </td>
                    <td><span className="selo">{rotuloCargoConvite(c.cargo)}</span></td>
                    <td>{c.usos}{c.usos_max != null ? ` / ${c.usos_max}` : ''}</td>
                    <td>
                      <span className={`selo ${ativo ? '' : 'selo--inativo'}`}>{situacao.label}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        {ativo && <BotaoCopiar link={linkConvite(origem, c.token)} />}
                        {!c.revogado && <BotaoRevogar id={c.id} />}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
