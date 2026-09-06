import { cache } from 'react';
import { redirect } from 'next/navigation';
import { criarClienteServidor } from '@/lib/supabase/server';

/**
 * Estado da sessão do request atual.
 *
 * Distingue três coisas que antes viravam todas "null", cada uma exigindo
 * uma reação diferente:
 *   anonimo    → não há sessão. Mandar para o login.
 *   sem-perfil → há sessão, mas nenhuma linha em profiles (conta órfã).
 *   inativo    → perfil existe, mas foi desativado pela gestão.
 *   erro       → o Supabase não respondeu. NÃO deslogar: é transitório.
 *
 * cache() da React garante uma chamada só por request, mesmo com layout e
 * página consultando em paralelo.
 */
export const obterUsuario = cache(async () => {
  const supabase = criarClienteServidor();

  let user = null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      // Falha de rede é transitória; token inválido/ausente é "anônimo".
      const transitorio =
        error.name === 'AuthRetryableFetchError' || /fetch failed|network/i.test(error.message ?? '');
      if (transitorio) return { estado: 'erro', erro: error.message };
      return { estado: 'anonimo' };
    }
    user = data?.user ?? null;
  } catch (e) {
    return { estado: 'erro', erro: e?.message ?? String(e) };
  }

  if (!user) return { estado: 'anonimo' };

  // maybeSingle(): "nenhuma linha" é um estado previsto, não um erro.
  const { data: perfil, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (error) return { estado: 'erro', erro: error.message };
  if (!perfil) return { estado: 'sem-perfil' };
  if (!perfil.ativo) return { estado: 'inativo' };

  return { estado: 'ok', usuario: { ...perfil, authEmail: user.email } };
});

/**
 * Usuário logado e utilizável, ou desvia.
 *
 * Sessão quebrada vai para /sair, que limpa o cookie antes de mandar ao login.
 * Redirecionar direto para /login criaria laço: o middleware veria o cookie
 * ainda válido e devolveria para /membros.
 */
export async function exigirUsuario() {
  const r = await obterUsuario();

  switch (r.estado) {
    case 'ok':
      return r.usuario;
    case 'anonimo':
      redirect('/login');
    case 'sem-perfil':
      redirect('/sair?motivo=sem-perfil');
    case 'inativo':
      redirect('/sair?motivo=inativo');
    default:
      // Cai na fronteira de erro (app/error.jsx) com a causa à vista,
      // em vez de derrubar a página com um TypeError opaco.
      throw new Error(
        `Não foi possível carregar sua sessão: ${r.erro}. ` +
          'Se persistir, o Supabase pode estar fora do ar ou o projeto pausado.',
      );
  }
}

/** Versão tolerante para rotas de API: devolve o usuário ou null. */
export async function usuarioOuNulo() {
  const r = await obterUsuario();
  return r.estado === 'ok' ? r.usuario : null;
}
