import { criarClienteAdmin } from '@/lib/supabase/server';

const VALIDADE_CACHE_MS = 1000 * 60 * 60; // 1h — a home não precisa ser mais fresca que isso
const CAMPOS = 'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp';

/**
 * Monta a URL da Graph API.
 * Dois caminhos suportados pela Meta hoje:
 *  - Instagram API com Instagram Login  → graph.instagram.com/me/media
 *  - Instagram API com Facebook Login   → graph.facebook.com/{IG_USER_ID}/media
 * Definir INSTAGRAM_USER_ID escolhe o segundo.
 */
function urlMedia(limite) {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  const igId = process.env.INSTAGRAM_USER_ID;
  const base = igId
    ? `https://graph.facebook.com/v21.0/${igId}/media`
    : 'https://graph.instagram.com/me/media';
  return `${base}?fields=${CAMPOS}&limit=${limite}&access_token=${token}`;
}

function normalizar(item) {
  // Vídeos e reels não têm imagem em media_url utilizável como capa; use thumbnail_url.
  const imagem = item.media_type === 'VIDEO' ? item.thumbnail_url || item.media_url : item.media_url;
  const legenda = (item.caption || '').trim();
  return {
    id: item.id,
    permalink: item.permalink,
    imagem,
    tipo: item.media_type,
    legenda,
    // A landing mostra só a primeira frase; a legenda inteira fica no Instagram.
    resumo: legenda.length > 160 ? `${legenda.slice(0, 157).trimEnd()}…` : legenda,
    data: item.timestamp,
  };
}

async function lerCache(supabase) {
  const { data } = await supabase.from('instagram_cache').select('posts, fetched_at').eq('id', 1).single();
  return data;
}

/**
 * Posts do Instagram para a seção "Últimas da liga".
 * Sempre devolve algo utilizável: cache fresco → API → cache velho → lista vazia.
 * Nunca lança: uma falha da Meta não pode derrubar a home.
 */
export async function buscarPostsInstagram({ limite = 6, forcar = false } = {}) {
  if (!process.env.INSTAGRAM_ACCESS_TOKEN) {
    return { posts: [], origem: 'sem-token', erro: 'INSTAGRAM_ACCESS_TOKEN não configurado' };
  }

  let supabase = null;
  let cache = null;
  try {
    supabase = criarClienteAdmin();
    cache = await lerCache(supabase);
  } catch {
    // Sem service_role o cache fica indisponível; seguimos direto para a API.
  }

  const frescor = cache?.fetched_at ? Date.now() - new Date(cache.fetched_at).getTime() : Infinity;
  if (!forcar && cache?.posts?.length && frescor < VALIDADE_CACHE_MS) {
    return { posts: cache.posts.slice(0, limite), origem: 'cache' };
  }

  try {
    // Timeout obrigatório: sem ele, uma Meta lenta pendura a geração estática
    // da home até o build do Next estourar por conta própria.
    const resposta = await fetch(urlMedia(Math.max(limite, 12)), {
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    const corpo = await resposta.json();

    if (!resposta.ok || corpo.error) {
      throw new Error(corpo.error?.message || `Graph API respondeu ${resposta.status}`);
    }

    const posts = (corpo.data || []).map(normalizar).filter((p) => p.imagem);

    if (supabase) {
      await supabase
        .from('instagram_cache')
        .update({ posts, fetched_at: new Date().toISOString(), erro: null })
        .eq('id', 1);
    }

    return { posts: posts.slice(0, limite), origem: 'api' };
  } catch (e) {
    const erro = e.message || String(e);
    if (supabase) {
      await supabase.from('instagram_cache').update({ erro }).eq('id', 1);
    }
    // Token expirado ou Meta fora do ar: mostra o último conteúdo bom que temos.
    if (cache?.posts?.length) {
      return { posts: cache.posts.slice(0, limite), origem: 'cache-antigo', erro };
    }
    return { posts: [], origem: 'erro', erro };
  }
}

/**
 * Renova o token de longa duração (válido 60 dias).
 * Só funciona no fluxo de Instagram Login; no fluxo de Facebook Login o token
 * da Página não expira e esta chamada é desnecessária.
 */
export async function renovarTokenInstagram() {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) throw new Error('INSTAGRAM_ACCESS_TOKEN não configurado');

  const url = `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${token}`;
  const resposta = await fetch(url, { cache: 'no-store' });
  const corpo = await resposta.json();
  if (!resposta.ok || corpo.error) {
    throw new Error(corpo.error?.message || `refresh respondeu ${resposta.status}`);
  }
  // O token novo precisa ser gravado à mão na env do Render — o processo não
  // consegue reescrever a própria variável de ambiente.
  return { token: corpo.access_token, expira_em_segundos: corpo.expires_in };
}
