/**
 * Sobe o HTML de um handout para o bucket privado `materiais`, em `handouts/`.
 *
 *   node --env-file=.env.local scripts/subir-handout.mjs <slug> <arquivo.html>
 *
 * O slug tem que existir na lista de lib/handouts.js — é de lá que sai o nome
 * final do arquivo, então a página e o bucket nunca divergem. Rodar de novo
 * com o mesmo slug substitui a versão anterior (upsert), que é o fluxo normal
 * quando o handout é corrigido entre uma turma e outra.
 *
 * O arquivo local NÃO deve entrar no repositório: ele é público.
 *
 * O node avisa que lib/handouts.js "não parse como CommonJS" e o reinterpreta
 * como ESM. É só um aviso e a importação funciona. Não resolva pondo
 * "type": "module" no package.json: isso quebra next.config.js, que é CJS.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { BUCKET, HANDOUTS, caminhoStorage } from '../lib/handouts.js';

const [slug, arquivoLocal] = process.argv.slice(2);

function uso(erro) {
  console.error(erro);
  console.error('\nUso: node --env-file=.env.local scripts/subir-handout.mjs <slug> <arquivo.html>');
  console.error(`Slugs: ${HANDOUTS.map((h) => h.slug).join(' | ')}`);
  process.exit(1);
}

if (!slug || !arquivoLocal) uso('Faltam argumentos.');

const handout = HANDOUTS.find((h) => h.slug === slug);
if (!handout) uso(`Slug desconhecido: ${slug}\nAcrescente-o em lib/handouts.js antes de subir.`);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const chave = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !chave) {
  console.error('Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SECRET_KEY no .env.local.');
  process.exit(1);
}

let html;
try {
  html = await readFile(path.resolve(arquivoLocal), 'utf8');
} catch (e) {
  uso(`Não consegui ler ${arquivoLocal}: ${e.message}`);
}

if (!/<html|<!doctype/i.test(html)) {
  uso('Esse arquivo não parece uma página HTML. Salve o handout como "Página da Web, somente HTML".');
}

const destino = caminhoStorage(handout);
const admin = createClient(url, chave, { auth: { persistSession: false, autoRefreshToken: false } });

const { error } = await admin.storage.from(BUCKET).upload(destino, html, {
  contentType: 'text/html; charset=utf-8',
  upsert: true,
});

if (error) {
  console.error(`Falhou o upload de ${destino}: ${error.message}`);
  process.exit(1);
}

const kb = Math.round(Buffer.byteLength(html, 'utf8') / 1024);
console.log(`OK — ${destino} (${kb} KB) no bucket "${BUCKET}".`);
console.log(`Já aparece em /membros/trainee e abre em /membros/trainee/handout/${handout.slug}`);
