import Redefinir from './Redefinir';

export const metadata = { title: 'Redefinir senha · IQF' };

// Destino do link enviado por e-mail. O Supabase troca o token da URL por uma
// sessão temporária, e com ela o usuário define a senha nova.
export default function PaginaRedefinir() {
  return (
    <div style={{ maxWidth: 480 }}>
      <div className="eyebrow" style={{ marginBottom: 16 }}>Redefinição</div>
      <h1 style={{ fontSize: 34, lineHeight: 1.15, marginBottom: 12 }}>Defina sua nova senha</h1>
      <p style={{ color: 'var(--texto-3)', margin: '0 0 32px' }}>
        Você chegou aqui pelo link enviado por e-mail. Escolha uma senha nova para concluir.
      </p>
      <Redefinir />
    </div>
  );
}
