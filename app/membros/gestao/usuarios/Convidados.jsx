'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFormState } from 'react-dom';
import { BotaoEnviar, Feedback } from '@/components/membros/Formulario';
import {
  criarConvidado,
  criarConvitesLote,
  enviarConvite,
  prepararConvidados,
  revogarConvite,
} from '@/app/membros/gestao/acoes';
import {
  CARGOS_CONVITE,
  DOMINIO_PERMITIDO,
  linkConvite,
  rotuloCargoConvite,
  situacaoConvite,
} from '@/lib/convites';

const CORES = {
  novo: 'var(--azul)',
  'tem-conta': 'var(--texto-3)',
  convidado: 'var(--texto-3)',
  erro: '#F2B8B8',
};

/** Copia para a área de transferência com fallback para navegador antigo. */
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

function BotaoCopiar({ link, rotulo = 'Copiar link' }) {
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
      {copiado ? 'Copiado' : rotulo}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Uma pessoa por vez: nome e e-mail, e nada mais                      */
/* ------------------------------------------------------------------ */

/**
 * Convida uma pessoa só.
 *
 * Dois campos e um botão. O link sai pronto na tela para copiar, e a caixa
 * "enviar o e-mail agora" cobre o outro caso — a pessoa não está na sua frente.
 * Nada de turma, frente de trabalho ou validade: o perfil se completa depois,
 * e o convite vale até alguém usar ou revogar.
 */
function Individual({ cargo, origem, aoFechar }) {
  const router = useRouter();
  const [estado, acao] = useFormState(criarConvidado, null);
  const formulario = useRef(null);

  useEffect(() => {
    if (estado?.ok) router.refresh();
  }, [estado, router]);

  const titulo = `Adicionar ${rotuloCargoConvite(cargo).toLowerCase()}`;

  // Convite criado: o que importa agora é o link e se o e-mail saiu.
  if (estado?.ok) {
    const link = linkConvite(origem, estado.token);
    return (
      <div className="painel" style={{ display: 'grid', gap: 16 }}>
        <h3 style={{ fontSize: 20, margin: 0 }}>{titulo}</h3>
        <div className="aviso aviso--ok" style={{ margin: 0 }}>{estado.mensagem}</div>

        {estado.envio && !estado.envio.ok && (
          <div className="aviso aviso--erro" style={{ margin: 0 }}>
            O convite existe, mas o e-mail não saiu: {estado.envio.erro} Copie o link abaixo e mande na mão.
          </div>
        )}

        <div className="campo">
          <label htmlFor="um-link">Link pessoal de {estado.nome}</label>
          <input id="um-link" readOnly value={link} onFocus={(e) => e.target.select()} />
          <div className="ajuda">
            Vale só para {estado.email} e só para um cadastro. Lá a pessoa põe o nome e escolhe a senha.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <BotaoCopiar link={link} />
          {/* Fechar remonta o formulário limpo na próxima abertura, que é o
              caminho para convidar a pessoa seguinte. */}
          <button type="button" className="btn btn--solido" onClick={aoFechar}>Concluir</button>
        </div>
      </div>
    );
  }

  return (
    <form ref={formulario} action={acao} className="painel" style={{ display: 'grid', gap: 20 }}>
      <div>
        <h3 style={{ fontSize: 20, margin: '0 0 6px' }}>{titulo}</h3>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--texto-3)' }}>
          Só nome e e-mail. Sai um link pessoal para copiar — ou já enviado por e-mail — e é lá que a pessoa
          escolhe a senha dela. Você não precisa combinar senha por mensagem.
        </p>
      </div>

      <Feedback estado={estado} />

      {/* Cargo e endereço do site não são escolha de quem preenche: vêm do
          botão que abriu este formulário e da URL. O servidor revalida o cargo. */}
      <input type="hidden" name="cargo" value={cargo} />
      <input type="hidden" name="origem" value={origem} />

      <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <div className="campo">
          <label htmlFor="um-nome">Nome completo</label>
          <input id="um-nome" name="nome" required autoComplete="off" />
        </div>
        <div className="campo">
          <label htmlFor="um-email">E-mail</label>
          <input
            id="um-email"
            name="email"
            type="email"
            required
            autoComplete="off"
            placeholder={`nome.sobrenome@${DOMINIO_PERMITIDO}`}
          />
          <div className="ajuda">Só e-mail @{DOMINIO_PERMITIDO}.</div>
        </div>
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, color: 'var(--texto-2)' }}>
        <input type="checkbox" name="enviar_email" defaultChecked />
        Enviar o e-mail com o link agora
      </label>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <BotaoEnviar carregando="Criando…">Gerar convite</BotaoEnviar>
        <button type="button" className="btn btn--vazado" onClick={aoFechar}>Fechar</button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Passo 1 e 2: importar a planilha e revisar antes de criar           */
/* ------------------------------------------------------------------ */

function Importador({ cargo, aoTrocarCargo, aoFechar }) {
  const router = useRouter();
  const [previa, acaoPrevia] = useFormState(prepararConvidados, null);
  const [criacao, acaoCriacao] = useFormState(criarConvitesLote, null);

  // Quem entra no lote. Por padrão só as linhas novas vêm marcadas —
  // quem já tem conta fica visível, mas desmarcado.
  const [selecionados, setSelecionados] = useState(() => new Set());
  const [texto, setTexto] = useState('');

  useEffect(() => {
    if (previa?.ok) {
      setSelecionados(new Set(previa.linhas.filter((l) => l.situacao === 'novo').map((l) => l.email)));
    }
  }, [previa]);

  useEffect(() => {
    if (criacao?.ok) router.refresh();
  }, [criacao, router]);

  const marcaveis = useMemo(
    () => (previa?.linhas ?? []).filter((l) => l.situacao !== 'erro'),
    [previa],
  );

  const linhasSelecionadas = marcaveis
    .filter((l) => selecionados.has(l.email))
    .map((l) => ({ nome: l.nome, email: l.email }));

  function alternar(email) {
    setSelecionados((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(email)) proximo.delete(email);
      else proximo.add(email);
      return proximo;
    });
  }

  /** Lê o CSV escolhido e joga no textarea — a revisão continua sendo em texto. */
  function carregarArquivo(e) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    const leitor = new FileReader();
    leitor.onload = () => setTexto(String(leitor.result ?? ''));
    leitor.readAsText(arquivo, 'utf-8');
  }

  if (criacao?.ok) {
    return (
      <div className="painel" style={{ display: 'grid', gap: 16 }}>
        <Feedback estado={criacao} />
        <p style={{ margin: 0, fontSize: 14, color: 'var(--texto-3)' }}>
          Os convites aparecem na tabela abaixo como “não enviado”. Use <strong>Enviar todos</strong> para disparar
          os e-mails, ou envie um a um.
        </p>
        <div>
          <button type="button" className="btn btn--vazado" onClick={aoFechar}>Fechar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="painel" style={{ display: 'grid', gap: 24 }}>
      <div>
        <h3 style={{ fontSize: 20, margin: '0 0 6px' }}>Importar planilha</h3>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--texto-3)' }}>
          Cole as colunas direto do Excel/Sheets ou escolha um CSV. Nome e e-mail em qualquer ordem, com ou sem
          cabeçalho — o e-mail é reconhecido pelo formato. Nada é criado ou enviado neste passo.
        </p>
      </div>

      {/* Passo 1 — leitura */}
      <form action={acaoPrevia} style={{ display: 'grid', gap: 16 }}>
        <div className="campo">
          <label htmlFor="imp-planilha">Nomes e e-mails</label>
          <textarea
            id="imp-planilha"
            name="planilha"
            rows={8}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={'João Silva\tjoao.silva@al.insper.edu.br\nMaria Souza\tmaria.souza@al.insper.edu.br'}
            style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 13 }}
          />
        </div>

        <div className="campo">
          <label htmlFor="imp-arquivo">Ou envie um arquivo CSV</label>
          <input id="imp-arquivo" type="file" accept=".csv,.tsv,.txt,text/csv" onChange={carregarArquivo} />
          <div className="ajuda">
            No Excel: Arquivo → Salvar como → CSV. Arquivos .xlsx não são lidos. Linhas com e-mail fora de
            @{DOMINIO_PERMITIDO} aparecem como erro.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <BotaoEnviar carregando="Lendo…" variante="vazado">Ler planilha</BotaoEnviar>
          <button type="button" className="btn btn--vazado" onClick={aoFechar}>Fechar</button>
        </div>
      </form>

      {previa?.erro && <div className="aviso aviso--erro">{previa.erro}</div>}

      {/* Passo 2 — revisão e criação */}
      {previa?.ok && (
        <form action={acaoCriacao} style={{ display: 'grid', gap: 20, borderTop: '1px solid var(--linha)', paddingTop: 24 }}>
          <div>
            <h4 style={{ fontSize: 17, margin: '0 0 6px' }}>Confira antes de criar</h4>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--texto-3)' }}>
              {previa.resumo.novos} nova(s) · {previa.resumo.temConta} já com conta ·{' '}
              {previa.resumo.convidados} já convidada(s) · {previa.resumo.erros} com problema. Todas entram como{' '}
              <strong>{rotuloCargoConvite(cargo).toLowerCase()}</strong>.
            </p>
          </div>

          <Feedback estado={criacao} />

          <div style={{ overflowX: 'auto', maxHeight: 340, overflowY: 'auto' }}>
            <table className="tabela">
              <thead>
                <tr>
                  <th style={{ width: 36 }} />
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>Situação</th>
                </tr>
              </thead>
              <tbody>
                {previa.linhas.map((l, i) => (
                  <tr key={`${l.email ?? 'erro'}-${i}`} style={{ opacity: l.situacao === 'erro' ? 0.6 : 1 }}>
                    <td>
                      <input
                        type="checkbox"
                        disabled={l.situacao === 'erro'}
                        checked={selecionados.has(l.email)}
                        onChange={() => alternar(l.email)}
                      />
                    </td>
                    <td style={{ color: 'var(--osso)' }}>{l.nome ?? <em>{l.original}</em>}</td>
                    <td>{l.email ?? '—'}</td>
                    <td style={{ color: CORES[l.situacao], fontSize: 13 }}>
                      {l.erro ?? l.aviso ?? 'Pronta para convidar'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            <div className="campo">
              <label htmlFor="imp-cargo">Entram como</label>
              <select
                id="imp-cargo"
                name="cargo"
                value={cargo}
                onChange={(e) => aoTrocarCargo(e.target.value)}
              >
                {CARGOS_CONVITE.map((c) => (
                  <option key={c.valor} value={c.valor}>{c.label}</option>
                ))}
              </select>
              <div className="ajuda">Vale para o lote inteiro.</div>
            </div>
            <div className="campo">
              <label htmlFor="imp-rotulo">Nome do lote</label>
              <input id="imp-rotulo" name="rotulo" placeholder={`${rotuloCargoConvite(cargo)}s 2026.1`} />
              <div className="ajuda">Opcional — serve para você achar este lote na tabela depois.</div>
            </div>
          </div>

          {/* A seleção viaja como JSON: o servidor a usa como escolha de quem
              convidar, e recheca no banco quem já tem conta antes de inserir. */}
          <input type="hidden" name="linhas" value={JSON.stringify(linhasSelecionadas)} />

          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <BotaoEnviar carregando="Criando…" disabled={linhasSelecionadas.length === 0}>
              Criar {linhasSelecionadas.length} convite(s)
            </BotaoEnviar>
            <span style={{ fontSize: 13, color: 'var(--texto-3)' }}>Os e-mails só saem no próximo passo.</span>
          </div>
        </form>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tabela dos convites pessoais já criados                             */
/* ------------------------------------------------------------------ */

function estadoEnvio(convite) {
  if (convite.usos > 0) return { label: 'Conta criada', cor: 'var(--azul)' };
  if (convite.erro_envio) return { label: 'Falhou', cor: '#F2B8B8' };
  if (convite.enviado_em) return { label: `Enviado ${new Date(convite.enviado_em).toLocaleDateString('pt-BR')}`, cor: 'var(--texto-2)' };
  return { label: 'Não enviado', cor: 'var(--texto-3)' };
}

function BotaoRevogar({ id, aoConcluir }) {
  const [estado, acao] = useFormState(revogarConvite, null);
  useEffect(() => { if (estado?.ok) aoConcluir(); }, [estado, aoConcluir]);
  return (
    <form action={acao} style={{ display: 'inline' }}>
      <input type="hidden" name="id" value={id} />
      <BotaoEnviar variante="vazado" carregando="…">Revogar</BotaoEnviar>
    </form>
  );
}

export default function Convidados({ convidados }) {
  const router = useRouter();
  // O que está aberto: { tipo: 'um' | 'planilha', cargo }. Cada botão abre o
  // formulário já com o cargo decidido — um clique em "Adicionar trainee" não
  // deve exigir um segundo clique num seletor para dizer a mesma coisa.
  const [aberto, setAberto] = useState(null);
  const [origem, setOrigem] = useState('');
  // Resultado do último disparo, por id — some ao recarregar, e não deve
  // sobrepor o que está gravado no banco (enviado_em / erro_envio).
  const [envios, setEnvios] = useState({});
  const [disparando, setDisparando] = useState(null);
  const cancelar = useRef(false);

  useEffect(() => setOrigem(window.location.origin), []);

  const pendentes = convidados.filter(
    (c) => !c.revogado && c.usos === 0 && !c.enviado_em && situacaoConvite(c).valor === 'ativo',
  );

  /** Dispara um convite. Mesma função para o botão da linha e para o lote. */
  async function enviarUm(id) {
    const fd = new FormData();
    fd.set('id', id);
    fd.set('origem', window.location.origin);
    const r = await enviarConvite(null, fd);
    setEnvios((atual) => ({ ...atual, [id]: r }));
    return r;
  }

  async function enviarTodos() {
    cancelar.current = false;
    const fila = pendentes.map((c) => c.id);

    for (let i = 0; i < fila.length; i++) {
      if (cancelar.current) break;
      setDisparando({ feitos: i, total: fila.length });
      await enviarUm(fila[i]);
      // O Resend limita a 2 requisições por segundo; sem esta pausa o lote
      // recebe 429 no meio e metade da turma fica sem convite.
      await new Promise((r) => setTimeout(r, 600));
    }

    setDisparando(null);
    router.refresh();
  }

  return (
    <section style={{ display: 'grid', gap: 24 }}>
      <div>
        <h2 style={{ fontSize: 24, margin: '0 0 6px' }}>Adicionar pessoas</h2>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--texto-3)', maxWidth: '62ch' }}>
          Uma pessoa ou uma turma inteira, pedindo só nome e e-mail @{DOMINIO_PERMITIDO}. Cada uma recebe um link
          pessoal, que vale só para o e-mail dela e só para um cadastro — e é lá que ela escolhe a própria senha.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {CARGOS_CONVITE.map((c) => {
          const ativo = aberto?.tipo === 'um' && aberto.cargo === c.valor;
          return (
            <button
              key={c.valor}
              className={ativo ? 'btn btn--vazado' : 'btn btn--solido'}
              onClick={() => setAberto(ativo ? null : { tipo: 'um', cargo: c.valor })}
            >
              {ativo ? 'Fechar' : `Adicionar ${c.label.toLowerCase()}`}
            </button>
          );
        })}
        <button
          className="btn btn--vazado"
          onClick={() =>
            setAberto((v) => (v?.tipo === 'planilha' ? null : { tipo: 'planilha', cargo: 'trainee' }))
          }
        >
          {aberto?.tipo === 'planilha' ? 'Fechar' : 'Importar planilha'}
        </button>
      </div>

      {/* key no cargo: reabrir para outro cargo precisa de um formulário limpo,
          sem o link e o feedback do convite anterior na tela. */}
      {aberto?.tipo === 'um' && (
        <Individual
          key={aberto.cargo}
          cargo={aberto.cargo}
          origem={origem}
          aoFechar={() => setAberto(null)}
        />
      )}
      {aberto?.tipo === 'planilha' && (
        <Importador
          cargo={aberto.cargo}
          aoTrocarCargo={(cargo) => setAberto({ tipo: 'planilha', cargo })}
          aoFechar={() => setAberto(null)}
        />
      )}

      {convidados.length > 0 && (
        <>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              className="btn btn--solido"
              onClick={enviarTodos}
              disabled={pendentes.length === 0 || disparando !== null}
            >
              {disparando
                ? `Enviando ${disparando.feitos + 1} de ${disparando.total}…`
                : `Enviar todos (${pendentes.length} não enviados)`}
            </button>
            {disparando && (
              <button className="btn btn--vazado" onClick={() => { cancelar.current = true; }}>
                Parar
              </button>
            )}
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="tabela">
              <thead>
                <tr>
                  <th>Convidado</th>
                  <th>Cargo</th>
                  <th>Lote</th>
                  <th>Envio</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {convidados.map((c) => {
                  const situacao = situacaoConvite(c);
                  const envio = estadoEnvio(c);
                  const resultado = envios[c.id];
                  const criouConta = c.usos > 0;

                  return (
                    <tr key={c.id} style={{ opacity: situacao.valor === 'ativo' || criouConta ? 1 : 0.55 }}>
                      <td style={{ color: 'var(--osso)' }}>
                        {c.nome}
                        <div style={{ fontSize: 12, color: 'var(--texto-3)' }}>{c.email}</div>
                      </td>
                      <td>
                        <span className="selo">{rotuloCargoConvite(c.cargo)}</span>
                      </td>
                      <td style={{ fontSize: 13 }}>
                        {c.rotulo}
                        <div style={{ fontSize: 12, color: 'var(--texto-3)' }}>
                          {situacao.valor === 'ativo' ? '' : situacao.label}
                        </div>
                      </td>
                      <td style={{ fontSize: 13, color: envio.cor }}>
                        {envio.label}
                        {(c.erro_envio || resultado?.erro) && (
                          <div style={{ fontSize: 11, color: '#F2B8B8', maxWidth: 260 }}>
                            {resultado?.erro ?? c.erro_envio}
                          </div>
                        )}
                        {resultado?.ok && (
                          <div style={{ fontSize: 11, color: 'var(--azul)' }}>{resultado.mensagem}</div>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                          {!criouConta && situacao.valor === 'ativo' && (
                            <>
                              <button
                                className="btn btn--vazado btn--pequeno"
                                disabled={disparando !== null}
                                onClick={() => enviarUm(c.id)}
                              >
                                {c.enviado_em ? 'Reenviar' : 'Enviar'}
                              </button>
                              <BotaoCopiar link={linkConvite(origem, c.token)} />
                              <BotaoRevogar id={c.id} aoConcluir={() => router.refresh()} />
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
