/**
 * Cria as contas iniciais da diretoria.
 * Idempotente: se o e-mail já existe no auth, atualiza o perfil em vez de falhar.
 *
 *   node --env-file=.env.local scripts/criar-diretoria.mjs
 *
 * Sem senha. Cada conta nasce sem senha utilizável e o script dispara o e-mail
 * de definição de senha — o mesmo fluxo do "esqueci minha senha".
 *
 * Antes havia uma constante `SENHA_INICIAL` com um valor fixo aqui, e este era
 * o pior lugar possível para uma senha: o repositório é PÚBLICO (exigência do
 * plano Hobby da Vercel, ver DEPLOY.md). A senha das duas contas de maior
 * privilégio do sistema ficava legível para qualquer pessoa na internet.
 *
 * Apagar a linha não resolve sozinho: ela continua no histórico do git. Se o
 * script chegou a ser rodado com aquele valor, as senhas das duas contas
 * precisam ser trocadas de fato.
 */
import { createClient } from '@supabase/supabase-js';

const DIRETORIA = [
  { nome: 'Fernando Nakatsubo', email: 'fernandocn@al.insper.edu.br', cargo: 'presidente' },
  { nome: 'Jose Salas', email: 'joselsm3@al.insper.edu.br', cargo: 'vice_presidente' },
];

// Para onde o link do e-mail aponta. Em produção, defina NEXT_PUBLIC_SITE_URL.
const ORIGEM = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const chave = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !chave) {
  console.error('Faltam NEXT_PUBLIC_SUPABASE_URL e/ou SUPABASE_SECRET_KEY (ou SUPABASE_SERVICE_ROLE_KEY).');
  process.exit(1);
}

const admin = createClient(url, chave, { auth: { persistSession: false } });

/** Procura o usuário pelo e-mail percorrendo as páginas do auth. */
async function acharPorEmail(email) {
  for (let pagina = 1; pagina <= 20; pagina++) {
    const { data, error } = await admin.auth.admin.listUsers({ page: pagina, perPage: 200 });
    if (error) throw new Error(error.message);
    const achado = data.users.find((u) => u.email?.toLowerCase() === email);
    if (achado) return achado;
    if (data.users.length < 200) return null;
  }
  return null;
}

let falhou = false;

for (const pessoa of DIRETORIA) {
  const email = pessoa.email.toLowerCase();

  try {
    let usuario = await acharPorEmail(email);

    if (usuario) {
      console.log(`• ${pessoa.nome}: já existia no auth, reaproveitando.`);
    } else {
      // Sem `password`: até a pessoa abrir o link do e-mail, não existe senha
      // que sirva para entrar nesta conta.
      const { data, error } = await admin.auth.admin.createUser({
        email,
        email_confirm: true, // cadastro interno; não faz sentido exigir confirmação
        user_metadata: { nome: pessoa.nome },
      });
      if (error) throw new Error(error.message);
      usuario = data.user;
      console.log(`• ${pessoa.nome}: usuário criado.`);
    }

    // upsert: cobre tanto a conta nova quanto o perfil que já existia.
    const { error: erroPerfil } = await admin.from('profiles').upsert(
      { id: usuario.id, email, nome: pessoa.nome, cargo: pessoa.cargo, ativo: true },
      { onConflict: 'id' },
    );
    if (erroPerfil) throw new Error(erroPerfil.message);

    console.log(`  perfil OK — ${pessoa.cargo}`);

    // O link para a pessoa definir a própria senha.
    const { error: erroLink } = await admin.auth.resetPasswordForEmail(email, {
      redirectTo: `${ORIGEM}/membros/conta/redefinir`,
    });
    if (erroLink) {
      console.warn(`  aviso: o e-mail de definição de senha não saiu (${erroLink.message}).`);
      console.warn('  Use "Esqueci minha senha" no /login para receber o link.');
    } else {
      console.log(`  e-mail de definição de senha enviado para ${email}`);
    }
  } catch (e) {
    falhou = true;
    console.error(`• ${pessoa.nome}: FALHOU — ${e.message}`);
  }
}

console.log('');
console.log('Cada um recebe por e-mail um link para definir a própria senha.');
console.log('Se o link não chegar, use "Esqueci minha senha" em /login.');

process.exit(falhou ? 1 : 0);
