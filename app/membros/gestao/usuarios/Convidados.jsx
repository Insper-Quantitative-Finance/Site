'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFormState } from 'react-dom';
import { BotaoEnviar, Feedback } from '@/components/membros/Formulario';
import { criarConvitesLote, enviarConvite, prepararConvidados, revogarConvite } from '@/app/membros/gestao/acoes';
import { linkConvite, situacaoConvite } from '@/lib/convites';

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
/* Passo 1 e 2: importar a planilha e revisar antes de criar           */
/* ------------------------------------------------------------------ */

function Importador({ aoFechar }) {
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

        <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <div className="campo">
            <label htmlFor="imp-arquivo">Ou envie um arquivo CSV</label>
            <input id="imp-arquivo" type="file" accept=".csv,.tsv,.txt,text/csv" onChange={carregarArquivo} />
            <div className="ajuda">No Excel: Arquivo → Salvar como → CSV. Arquivos .xlsx não são lidos.</div>
          </div>
          <div className="campo">
            <label htmlFor="imp-dominio">Exigir domínio de e-mail</label>
            <input id="imp-dominio" name="dominio_email" placeholder="al.insper.edu.br" />
            <div className="ajuda">Vazio aceita qualquer e-mail. Preenchido, linhas fora do domínio viram erro.</div>
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
              {previa.resumo.convidados} já convidada(s) · {previa.resumo.erros} com problema.
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

          <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
            <div className="campo">
              <label htmlFor="imp-rotulo">Nome do lote</label>
              <input id="imp-rotulo" name="rotulo" required placeholder="Trainees 2026.1" />
            </div>
            <div className="campo">
              <label htmlFor="imp-turma">Turma</label>
              <input id="imp-turma" name="turma" placeholder="2026.1" />
            </div>
            <div className="campo">
              <label htmlFor="imp-area">Frente de trabalho</label>
              <input id="imp-area" name="area" placeholder="Projetos, Capacitações…" />
            </div>
            <div className="campo">
              <label htmlFor="imp-validade">Validade (dias)</label>
              <input id="imp-validade" name="validade_dias" type="number" min={1} defaultValue={14} />
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
  const [importando, setImportando] = useState(false);
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
      <div style={{ display: 'flex', gap: 16, alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: 24, margin: '0 0 6px' }}>Convidados por planilha</h2>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--texto-3)', maxWidth: '62ch' }}>
            Importe a lista da turma, confira na tela e dispare os e-mails. Cada pessoa recebe um link pessoal, que
            só funciona com o e-mail dela e só uma vez.
          </p>
        </div>
        <button className="btn btn--solido" onClick={() => setImportando((v) => !v)}>
          {importando ? 'Fechar' : 'Importar planilha'}
        </button>
      </div>

      {importando && <Importador aoFechar={() => setImportando(false)} />}

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
