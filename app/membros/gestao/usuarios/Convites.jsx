'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useFormState } from 'react-dom';
import { BotaoEnviar, Feedback } from '@/components/membros/Formulario';
import { criarConvite, revogarConvite } from '@/app/membros/gestao/acoes';
import { linkConvite, situacaoConvite } from '@/lib/convites';

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
        Todo convite cria conta de <strong>trainee</strong>. O cargo não é escolhido aqui nem pelo link — para
        promover alguém a membro ou diretoria, edite o usuário depois de ele entrar.
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
          <label htmlFor="cv-rotulo">Nome do convite</label>
          <input id="cv-rotulo" name="rotulo" required placeholder="Trainees 2026.1" />
        </div>
        <div className="campo">
          <label htmlFor="cv-turma">Turma</label>
          <input id="cv-turma" name="turma" placeholder="2026.1" />
          <div className="ajuda">Preenchida automaticamente no perfil de quem aceitar.</div>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <div className="campo">
          <label htmlFor="cv-area">Frente de trabalho</label>
          <input id="cv-area" name="area" placeholder="Projetos, Capacitações…" />
        </div>
        <div className="campo">
          <label htmlFor="cv-usos">Limite de cadastros</label>
          <input id="cv-usos" name="usos_max" type="number" min={1} placeholder="ilimitado" />
          <div className="ajuda">Vazio = sem limite. Use o tamanho da turma para não sobrar vaga.</div>
        </div>
        <div className="campo">
          <label htmlFor="cv-validade">Validade (dias)</label>
          <input id="cv-validade" name="validade_dias" type="number" min={1} defaultValue={14} />
        </div>
      </div>

      <div className="campo">
        <label htmlFor="cv-dominio">Restringir ao domínio de e-mail</label>
        <input id="cv-dominio" name="dominio_email" placeholder="al.insper.edu.br" />
        <div className="ajuda">
          Vazio aceita qualquer e-mail. Com domínio preenchido, só e-mails desse domínio conseguem se cadastrar —
          é a melhor trava caso o link vaze.
        </div>
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
          <h2 style={{ fontSize: 24, margin: '0 0 6px' }}>Convites de trainee</h2>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--texto-3)', maxWidth: '62ch' }}>
            Gere um link, mande para a turma e cada trainee cria a própria conta com e-mail e senha. Ninguém
            precisa combinar senha por mensagem.
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
                <th>Cadastros</th>
                <th>Validade</th>
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
                        {[c.turma && `turma ${c.turma}`, c.dominio_email && `@${c.dominio_email}`]
                          .filter(Boolean)
                          .join(' · ') || 'sem restrição de domínio'}
                      </div>
                    </td>
                    <td>{c.usos}{c.usos_max != null ? ` / ${c.usos_max}` : ''}</td>
                    <td>
                      {c.expira_em ? new Date(c.expira_em).toLocaleDateString('pt-BR') : 'sem prazo'}
                    </td>
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
