/**
 * Cria as contas iniciais da diretoria.
 * Idempotente: se o e-mail já existe no auth, atualiza o perfil em vez de falhar.
 *
 *   node --env-file=.env.local scripts/criar-diretoria.mjs
 */
import { createClient } from '@supabase/supabase-js';

const SENHA_INICIAL = 'IQF@2026';

const DIRETORIA = [
  { nome: 'Fernando Nakatsubo', email: 'feranandocn@al.insper.edu.br', cargo: 'presidente' },
  { nome: 'Jose Salas', email: 'joselsm3@al.insper.edu.br', cargo: 'vice_presidente' },
];

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
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password: SENHA_INICIAL,
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
  } catch (e) {
    falhou = true;
    console.error(`• ${pessoa.nome}: FALHOU — ${e.message}`);
  }
}

console.log('');
console.log(`Senha inicial de ambos: ${SENHA_INICIAL}`);
console.log('Entrem em /login e troquem em "Minha conta" — depois disso ninguém mais consegue vê-la.');

process.exit(falhou ? 1 : 0);
