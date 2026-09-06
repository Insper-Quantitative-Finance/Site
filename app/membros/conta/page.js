import { rotuloCargo } from '@/lib/cargos';
import { exigirUsuario } from '@/lib/auth';
import FormularioEmail from './FormularioEmail';
import FormularioPerfil from './FormularioPerfil';
import FormularioSenha from './FormularioSenha';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Minha conta · IQF' };

export default async function MinhaConta() {
  const usuario = await exigirUsuario();

  return (
    <div style={{ display: 'grid', gap: 48, maxWidth: 720 }}>
      <div>
        <div className="eyebrow" style={{ marginBottom: 16 }}>Minha conta</div>
        <h1 style={{ fontSize: 38, lineHeight: 1.1, marginBottom: 12 }}>{usuario.nome}</h1>
        <p style={{ color: 'var(--texto-3)', margin: 0 }}>
          {usuario.email} · {rotuloCargo(usuario.cargo)}
        </p>
      </div>

      <section className="painel">
        <h2 style={{ fontSize: 22, marginBottom: 8 }}>Seu nome</h2>
        <p style={{ color: 'var(--texto-3)', fontSize: 14, margin: '0 0 24px' }}>
          Cargo, frente de trabalho, turma, LinkedIn e bio são definidos pela gestão. Nome, e-mail e senha são seus.
        </p>
        <FormularioPerfil usuario={usuario} />
      </section>

      <section className="painel">
        <h2 style={{ fontSize: 22, marginBottom: 8 }}>Trocar e-mail</h2>
        <p style={{ color: 'var(--texto-3)', fontSize: 14, margin: '0 0 24px' }}>
          É o endereço que você usa para entrar. A troca só vale depois que você confirmar pelo link enviado ao novo
          endereço.
        </p>
        <FormularioEmail emailAtual={usuario.authEmail || usuario.email} />
      </section>

      <section className="painel">
        <h2 style={{ fontSize: 22, marginBottom: 8 }}>Trocar senha</h2>
        <p style={{ color: 'var(--texto-3)', fontSize: 14, margin: '0 0 24px' }}>
          A senha é sua e de mais ninguém — nem a presidência consegue vê-la ou alterá-la. Se esquecer, peça um link de
          redefinição na tela de login.
        </p>
        <FormularioSenha />
      </section>
    </div>
  );
}
