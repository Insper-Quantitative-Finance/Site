'use client';

import { createBrowserClient } from '@supabase/ssr';
import { exigirCredenciaisPublicas } from './config';

/** Client do navegador (chave publicavel + RLS). Login e upload de materiais. */
export function criarClienteNavegador() {
  const { url, chave } = exigirCredenciaisPublicas();
  return createBrowserClient(url, chave);
}
