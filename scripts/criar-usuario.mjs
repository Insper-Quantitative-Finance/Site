/**
 * Cria (ou atualiza) um usuário com qualquer cargo. Útil para contas avulsas
 * e para gerar um perfil de teste sem passar pelo painel.
 *
 *   node --env-file=.env.local scripts/criar-usuario.mjs <email> <senha> <cargo> "<Nome Completo>"
 *
 * Cargos: presidente | vice_presidente | diretor_projetos |
 *         diretor_capacitacoes | membro | trainee
 */
import { createClient } from '@supabase/supabase-js';

const CARGOS = [
  'presidente',
  'vice_presidente',
  'diretor_projetos',
  'diretor_capacitacoes',
  'membro',
  'trainee',
];

const [email, senha, cargo, nome] = process.argv.slice(2);

if (!email || !senha || !cargo || !nome) {
  console.error('Uso: node --env-file=.env.local scripts/criar-usuario.mjs <email> <senha> <cargo> "<Nome>"');
  console.error(`Cargos: ${CARGOS.join(' | ')}`);
  process.exit(1);
}
if (!CARGOS.includes(cargo)) {
  console.error(`Cargo inválido: ${cargo}\nUse um de: ${CARGOS.join(' | ')}`);
  process.exit(1);
}
if (senha.length < 8) {
  console.error('A senha precisa ter pelo menos 8 caracteres.');
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const chave = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !chave) {
  console.error('Faltam NEXT_PUBLIC_SUPABASE_URL e/ou SUPABASE_SECRET_KEY (ou SUPABASE_SERVICE_ROLE_KEY).');
  process.exit(1);
}

const admin = createClient(url, chave, { auth: { persistSession: false } });
const alvo = email.toLowerCase();

/** Procura o usuário pelo e-mail percorrendo as páginas do auth. */
async function acharPorEmail(valor) {
  for (let pagina = 1; pagina <= 20; pagina++) {
    const { data, error } = await admin.auth.admin.listUsers({ page: pagina, perPage: 200 });
    if (error) throw new Error(error.message);
    const achado = data.users.find((u) => u.email?.toLowerCase() === valor);
    if (achado) return achado;
    if (data.users.length < 200) return null;
  }
  return null;
}

let usuario = await acharPorEmail(alvo);

if (usuario) {
  // Já existe: só redefine a senha, para o script ser re-executável.
  const { error } = await admin.auth.admin.updateUserById(usuario.id, { password: senha });
  if (error) {
    console.error(`Não foi possível atualizar a senha: ${error.message}`);
    process.exit(1);
  }
  console.log(`Usuário já existia; senha redefinida.`);
} else {
  const { data, error } = await admin.auth.admin.createUser({
    email: alvo,
    password: senha,
    email_confirm: true, // cadastro interno, sem etapa de confirmação
    user_metadata: { nome },
  });
  if (error) {
    console.error(`Não foi possível criar o usuário: ${error.message}`);
    process.exit(1);
  }
  usuario = data.user;
  console.log('Usuário criado no auth.');
}

const { error: erroPerfil } = await admin
  .from('profiles')
  .upsert({ id: usuario.id, email: alvo, nome, cargo, ativo: true }, { onConflict: 'id' });

if (erroPerfil) {
  console.error(`Não foi possível gravar o perfil: ${erroPerfil.message}`);
  process.exit(1);
}

console.log(`\n  ${nome} <${alvo}>`);
console.log(`  cargo: ${cargo}`);
console.log(`  senha: ${senha}`);
