'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useFormState } from 'react-dom';
import { BotaoEnviar, Feedback } from '@/components/membros/Formulario';
import { criarUsuario, editarUsuario, enviarRedefinicaoSenha } from '@/app/membros/gestao/acoes';
import { CARGOS_LISTA, cargosAtribuiveis, ehGestao, podeAlterarCargo, podeEditarUsuario, rotuloCargo } from '@/lib/cargos';

function FormularioNovo({ ator, aoFechar }) {
  const router = useRouter();
  const [estado, acao] = useFormState(criarUsuario, null);

  useEffect(() => {
    if (estado?.ok) router.refresh();
  }, [estado, router]);

  return (
    <form action={acao} className="painel" style={{ display: 'grid', gap: 20 }}>
      <h2 style={{ fontSize: 22, margin: 0 }}>Novo usuário</h2>
      <Feedback estado={estado} />

      <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <div className="campo">
          <label htmlFor="novo-nome">Nome completo</label>
          <input id="novo-nome" name="nome" required />
        </div>
        <div className="campo">
          <label htmlFor="novo-email">E-mail</label>
          <input id="novo-email" name="email" type="email" required />
        </div>
      </div>

      <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <div className="campo">
          <label htmlFor="novo-cargo">Cargo</label>
          <select id="novo-cargo" name="cargo" defaultValue="trainee">
            {cargosAtribuiveis(ator.cargo).map((c) => (
              <option key={c.valor} value={c.valor}>{c.label}</option>
            ))}
          </select>
        </div>
        <div className="campo">
          <label htmlFor="novo-area">Frente de trabalho</label>
          <input id="novo-area" name="area" placeholder="Projetos, Capacitações…" />
        </div>
        <div className="campo">
          <label htmlFor="novo-turma">Turma</label>
          <input id="novo-turma" name="turma" placeholder="2026.1" />
        </div>
      </div>

      <div className="campo">
        <label htmlFor="novo-linkedin">LinkedIn</label>
        <input id="novo-linkedin" name="linkedin" type="url" placeholder="https://www.linkedin.com/in/…" />
      </div>

      <div className="campo">
        <label htmlFor="novo-senha">Senha inicial</label>
        <input id="novo-senha" name="senha" type="text" minLength={8} required autoComplete="off" />
        <div className="ajuda">
          Mínimo de 8 caracteres. Passe essa senha para a pessoa e peça que troque em “Minha conta” no primeiro acesso —
          depois disso, nem você nem a presidência conseguem vê-la.
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <BotaoEnviar carregando="Criando…">Criar usuário</BotaoEnviar>
        <button type="button" className="btn btn--vazado" onClick={aoFechar}>Fechar</button>
      </div>
    </form>
  );
}

function FormularioEdicao({ usuario, ator, aoFechar }) {
  const router = useRouter();
  const [estado, acao] = useFormState(editarUsuario, null);

  useEffect(() => {
    if (estado?.ok) router.refresh();
  }, [estado, router]);

  const eusMesmo = ator.id === usuario.id;
  // Cargo é o único campo restrito à presidência; o resto a diretoria edita.
  const podeCargo = podeAlterarCargo(ator.cargo) && !eusMesmo;

  return (
    <form action={acao} className="painel" style={{ display: 'grid', gap: 20 }}>
      <h2 style={{ fontSize: 22, margin: 0 }}>Editar {usuario.nome}</h2>
      <p style={{ margin: 0, fontSize: 13, color: 'var(--texto-3)' }}>{usuario.email}</p>
      <Feedback estado={estado} />

      <input type="hidden" name="id" value={usuario.id} />

      <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <div className="campo">
          <label htmlFor="ed-nome">Nome completo</label>
          <input id="ed-nome" name="nome" required defaultValue={usuario.nome} />
        </div>
        <div className="campo">
          <label htmlFor="ed-cargo">Cargo</label>
          <select id="ed-cargo" name="cargo" defaultValue={usuario.cargo} disabled={!podeCargo}>
            {CARGOS_LISTA.map((c) => (
              <option key={c.valor} value={c.valor}>{c.label}</option>
            ))}
          </select>
          {!podeCargo && (
            <>
              {/* Campo desabilitado não é enviado: o hidden preserva o valor. */}
              <input type="hidden" name="cargo" value={usuario.cargo} />
              <div className="ajuda">
                {eusMesmo
                  ? 'Você não pode alterar o próprio cargo.'
                  : 'Apenas presidente e vice-presidente alteram cargos.'}
              </div>
            </>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <div className="campo">
          <label htmlFor="ed-area">Frente de trabalho</label>
          <input id="ed-area" name="area" defaultValue={usuario.area ?? ''} />
        </div>
        <div className="campo">
          <label htmlFor="ed-turma">Turma</label>
          <input id="ed-turma" name="turma" defaultValue={usuario.turma ?? ''} />
        </div>
      </div>

      <div className="campo">
        <label htmlFor="ed-linkedin">LinkedIn</label>
        <input id="ed-linkedin" name="linkedin" type="url" defaultValue={usuario.linkedin ?? ''} />
      </div>

      <div className="campo">
        <label htmlFor="ed-bio">Bio</label>
        <textarea id="ed-bio" name="bio" defaultValue={usuario.bio ?? ''} />
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, color: 'var(--texto-2)' }}>
        <input type="checkbox" name="ativo" defaultChecked={usuario.ativo} disabled={eusMesmo} />
        Membro ativo (desmarcado, perde o acesso à área de membros)
      </label>
      {eusMesmo && <input type="hidden" name="ativo" value="on" />}

      <div className="aviso" style={{ borderColor: 'var(--linha-forte)', color: 'var(--texto-3)' }}>
        A senha desta pessoa não aparece e não pode ser editada aqui — nem pela presidência. Se ela esqueceu, use o
        botão “Enviar link de senha” na lista.
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <BotaoEnviar>Salvar alterações</BotaoEnviar>
        <button type="button" className="btn btn--vazado" onClick={aoFechar}>Fechar</button>
      </div>
    </form>
  );
}

function BotaoRedefinir({ email }) {
  const [estado, acao] = useFormState(enviarRedefinicaoSenha, null);
  // Lido depois da montagem para o HTML do servidor e o do cliente baterem.
  const [origem, setOrigem] = useState('');
  useEffect(() => setOrigem(window.location.origin), []);

  return (
    <form action={acao} style={{ display: 'grid', gap: 8, justifyItems: 'end' }}>
      <input type="hidden" name="email" value={email} />
      {/* A action precisa do domínio público para montar o link do e-mail. */}
      <input type="hidden" name="origem" value={origem} />
      <BotaoEnviar variante="vazado" carregando="Enviando…">Enviar link de senha</BotaoEnviar>
      {estado?.ok && <span style={{ fontSize: 12, color: 'var(--azul)' }}>Enviado</span>}
      {estado?.erro && <span style={{ fontSize: 12, color: '#F2B8B8' }}>{estado.erro}</span>}
    </form>
  );
}

export default function GerenciarUsuarios({ usuarios, ator }) {
  const [criando, setCriando] = useState(false);
  const [editando, setEditando] = useState(null);

  return (
    <div style={{ display: 'grid', gap: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          className="btn btn--solido"
          onClick={() => { setEditando(null); setCriando((c) => !c); }}
        >
          {criando ? 'Fechar' : 'Novo usuário'}
        </button>
      </div>

      {criando && <FormularioNovo ator={ator} aoFechar={() => setCriando(false)} />}
      {editando && (
        <FormularioEdicao
          key={editando.id}
          usuario={editando}
          ator={ator}
          aoFechar={() => setEditando(null)}
        />
      )}

      <div style={{ overflowX: 'auto' }}>
        <table className="tabela">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Cargo</th>
              <th>Frente</th>
              <th>Situação</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => {
              const editavel = podeEditarUsuario(ator.cargo, u.cargo);
              return (
                <tr key={u.id} style={{ opacity: u.ativo ? 1 : 0.55 }}>
                  <td style={{ color: 'var(--osso)' }}>
                    {u.nome}
                    <div style={{ fontSize: 12, color: 'var(--texto-3)' }}>{u.email}</div>
                  </td>
                  <td>
                    <span className={`selo ${ehGestao(u.cargo) ? 'selo--gestao' : ''}`}>{rotuloCargo(u.cargo)}</span>
                  </td>
                  <td>{u.area || '—'}</td>
                  <td>
                    <span className={`selo ${u.ativo ? '' : 'selo--inativo'}`}>{u.ativo ? 'Ativo' : 'Inativo'}</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                      <button
                        className="btn btn--vazado btn--pequeno"
                        disabled={!editavel}
                        title={editavel ? undefined : 'Só a presidência edita perfis da presidência.'}
                        onClick={() => { setCriando(false); setEditando(u); }}
                      >
                        Editar
                      </button>
                      {editavel && <BotaoRedefinir email={u.email} />}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
