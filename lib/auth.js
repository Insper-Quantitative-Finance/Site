import { cache } from 'react';
import { redirect } from 'next/navigation';
import { criarClienteServidor } from '@/lib/supabase/server';
import { ERRO_CONEXAO, registrarErro } from '@/lib/erros';

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
      if (transitorio) return { estado: 'erro', erro: registrarErro('auth: getUser', error) };
      return { estado: 'anonimo' };
    }
    user = data?.user ?? null;
  } catch (e) {
    return { estado: 'erro', erro: registrarErro('auth: getUser', e) };
  }

  if (!user) return { estado: 'anonimo' };

  // maybeSingle(): "nenhuma linha" é um estado previsto, não um erro.
  const { data: perfil, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (error) return { estado: 'erro', erro: registrarErro('auth: ler perfil', error) };
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
      // Cai na fronteira de erro (app/error.jsx), não num TypeError opaco.
      //
      // `r.erro` já passou por registrarErro() lá em obterUsuario(): a causa
      // real está no log do servidor e o que sobra aqui é a frase para a tela.
      // Antes esta linha interpolava error.message cru, e era assim que
      // "NEXT_PUBLIC_SUPABASE_URL…" e o host do projeto acabavam no bloco
      // vermelho da página de erro.
      throw new Error(r.erro || ERRO_CONEXAO);
  }
}

/** Versão tolerante para rotas de API: devolve o usuário ou null. */
export async function usuarioOuNulo() {
  const r = await obterUsuario();
  return r.estado === 'ok' ? r.usuario : null;
}
