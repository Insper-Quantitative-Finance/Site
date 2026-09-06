'use client';

import { useState } from 'react';
import { criarClienteNavegador } from '@/lib/supabase/client';

/**
 * Sobe um arquivo direto do navegador para o Storage e devolve a referência
 * pelos campos escondidos, que a server action lê no submit.
 *
 * O upload vai direto para o Supabase — não passa pelo servidor Next — então
 * arquivos grandes não esbarram no limite de body das server actions.
 */
export default function CampoUpload({
  bucket,
  label = 'Arquivo',
  publico = false,
  valor,
  aoEnviar,
  prefixoCampos = '',
  aceita,
  ajuda,
}) {
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);

  const nomeCampo = (base) => (prefixoCampos ? `${prefixoCampos}_${base}` : base);

  async function subir(e) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;

    setEnviando(true);
    setErro(null);

    // Prefixo aleatório evita colisão entre arquivos de mesmo nome.
    const seguro = arquivo.name.replace(/[^\w.\-]+/g, '_');
    const caminho = `${crypto.randomUUID()}/${seguro}`;

    const supabase = criarClienteNavegador();
    const { error } = await supabase.storage.from(bucket).upload(caminho, arquivo, { upsert: false });

    if (error) {
      setEnviando(false);
      return setErro(`Falha no upload: ${error.message}`);
    }

    // Bucket público tem URL estável; o privado é servido por rota autenticada.
    const url = publico ? supabase.storage.from(bucket).getPublicUrl(caminho).data.publicUrl : null;

    setEnviando(false);
    aoEnviar({ path: caminho, nome: arquivo.name, bytes: arquivo.size, url });
  }

  return (
    <div className="campo">
      <label htmlFor={nomeCampo('arquivo')}>{label}</label>
      <input id={nomeCampo('arquivo')} type="file" accept={aceita} onChange={subir} disabled={enviando} />
      {enviando && <div className="ajuda">Enviando…</div>}
      {erro && <div className="aviso aviso--erro">{erro}</div>}
      {valor?.nome && !enviando && <div className="ajuda">Pronto: {valor.nome}</div>}
      {ajuda && <div className="ajuda">{ajuda}</div>}

      <input type="hidden" name={nomeCampo('path')} value={valor?.path ?? ''} />
      <input type="hidden" name={nomeCampo('nome')} value={valor?.nome ?? ''} />
      <input type="hidden" name={nomeCampo('bytes')} value={valor?.bytes ?? ''} />
      <input type="hidden" name={nomeCampo('url')} value={valor?.url ?? ''} />
    </div>
  );
}
