import Image from 'next/image';

/* ============================================================ A liga */
export function Sobre() {
  const blocos = [
    {
      titulo: 'Missão',
      texto:
        'Formar quants por meio de projetos próprios, competições e conexão direta com o mercado, unindo rigor técnico e aplicação prática.',
    },
    {
      titulo: 'Visão',
      texto:
        'Ser a referência em finanças quantitativas entre as entidades estudantis brasileiras e o caminho natural do aluno do Insper para o mercado sistemático.',
    },
    { titulo: 'Valores', valores: ['Rigor técnico', 'Colaboração', 'Meritocracia', 'Excelência'] },
  ];

  return (
    <section id="sobre" className="secao">
      <div className="container">
        <div className="grade-hairline grade-3">
          {blocos.map((b) => (
            <div key={b.titulo} style={{ padding: '40px 34px 44px' }}>
              <div className="eyebrow" style={{ marginBottom: 20 }}>{b.titulo}</div>
              {b.texto ? (
                <p style={{ margin: 0, fontSize: 16, lineHeight: 1.7, color: 'var(--texto-2)' }}>{b.texto}</p>
              ) : (
                <div style={{ display: 'grid', gap: 10, fontSize: 16, color: 'var(--texto-2)' }}>
                  {b.valores.map((v) => <div key={v}>{v}</div>)}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ================================================ O que são finanças quant */
export function OQueE() {
  const etapas = [
    ['01 · Hipótese', 'Uma ideia verificável sobre o mercado. Por exemplo: empresas mais lucrativas e menos endividadas tendem a se sustentar melhor em períodos ruins.'],
    ['02 · Regra', 'A hipótese vira filtro objetivo: entre as ações mais negociadas da bolsa, selecionar as 20% melhores nesses critérios e revisar a cada trimestre.'],
    ['03 · Teste histórico', 'A regra é simulada sobre dados reais do passado — o backtest — com custos de operação incluídos, para revelar retorno, risco e onde a estratégia quebra.'],
    ['04 · Crítica', 'O resultado é discutido por escrito: o que funcionou, o que foi coincidência e o que precisa mudar. É aqui que a maior parte do aprendizado acontece.'],
  ];

  const pilares = [
    ['Finanças', 'Entender o que move preços, o que é risco e por que uma estratégia deveria funcionar.'],
    ['Estatística', 'Separar padrão de ruído e medir se um resultado se sustenta fora da amostra em que foi encontrado.'],
    ['Programação', 'Transformar a regra em código que trata dados, simula o passado e executa decisões sem intervenção manual.'],
  ];

  return (
    <section
      id="o-que-e"
      className="secao"
      style={{
        backgroundColor: 'var(--carvao)',
        backgroundImage: 'radial-gradient(52% 64% at 88% 8%, rgba(20,70,150,0.10) 0%, rgba(20,70,150,0) 72%)',
      }}
    >
      <div className="container">
        <div className="eyebrow" style={{ marginBottom: 16 }}>O que são finanças quantitativas</div>

        <div className="duas-colunas" style={{ alignItems: 'start' }}>
          <div>
            <p className="p-corpo" style={{ margin: '0 0 20px', maxWidth: '56ch' }}>
              A forma tradicional de investir depende de julgamento: um analista estuda uma empresa, forma uma tese e
              decide comprar ou vender. Finanças quantitativas trocam esse julgamento por regras explícitas — critérios
              objetivos, escritos em código, aplicados da mesma maneira a centenas de ativos ao mesmo tempo.
            </p>
            <p className="p-corpo" style={{ margin: '0 0 20px', maxWidth: '56ch' }}>
              A vantagem não é adivinhar melhor o futuro. É poder testar: uma regra pode ser aplicada aos últimos vinte
              anos de mercado para ver como teria se comportado, quanto teria rendido, quanto teria perdido nas piores
              quedas e se o resultado é consistente ou apenas sorte. Onde a intuição só se confirma com o tempo, a regra
              se mede antes de valer dinheiro.
            </p>
            <p className="p-corpo" style={{ margin: 0, maxWidth: '56ch' }}>
              É por isso que a área mistura três coisas que raramente andam juntas: finanças, estatística e programação.
              Quem trabalha nela — o quant — traduz uma ideia sobre o mercado em um modelo, e o modelo em código que roda
              todo dia.
            </p>
          </div>

          <div className="grade-hairline">
            {etapas.map(([titulo, texto]) => (
              <div key={titulo} style={{ padding: '30px 30px 32px' }}>
                <div className="eyebrow" style={{ marginBottom: 14 }}>{titulo}</div>
                <p style={{ margin: 0, fontSize: 15, lineHeight: 1.7, color: 'var(--texto-2)' }}>{texto}</p>
              </div>
            ))}
          </div>
        </div>

        <div
          className="duas-colunas"
          style={{ marginTop: 72, paddingTop: 44, borderTop: '1px solid var(--linha-forte)', alignItems: 'start' }}
        >
          <div>
            <p style={{ fontSize: 16, lineHeight: 1.75, color: 'var(--texto-2)', margin: 0, maxWidth: '54ch' }}>
              Ninguém precisa chegar sabendo programar. Todo membro percorre esse mesmo ciclo no processo de trainee:
              aulas de fundamentos, uma estratégia autoral construída em grupo, o backtest escrito em Python e um paper
              com a análise dos resultados. Terminado o ciclo, o membro passa a projetos mais ambiciosos — adaptação de
              papers acadêmicos internacionais, competições nacionais e projetos mentorados por gestoras.
            </p>
          </div>
          <div style={{ display: 'grid', gap: 20 }}>
            {pilares.map(([rotulo, texto]) => (
              <div key={rotulo} className="linha-rotulo">
                <div className="eyebrow" style={{ color: 'rgba(169,194,209,0.9)' }}>{rotulo}</div>
                <div style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--texto-2)' }}>{texto}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ==================================================== Quant Connect */
export function QuantConnect() {
  const fatos = [
    ['Organização', 'Ligas quant de Insper, Poli-USP, FEA-USP e FGV'],
    ['Formato', 'Dois dias de palestras, painéis e workshops'],
    ['Local', 'Auditórios do Insper e da Poli-USP'],
    ['Próxima edição', 'Datas a confirmar'],
  ];

  return (
    <section id="quant-connect" className="secao">
      <div className="container">
        <div className="duas-colunas" style={{ alignItems: 'center' }}>
          <div className="photo" style={{ aspectRatio: '4 / 3' }}>
            <Image src="/assets/foto-quant-connect.jpg" alt="Quant Connect" fill sizes="(max-width: 900px) 100vw, 50vw" />
          </div>
          <div>
            <h2 className="h-secao" style={{ fontSize: 46, lineHeight: 1.1, margin: '0 0 24px' }}>Quant Connect</h2>
            <p className="p-corpo" style={{ margin: '0 0 20px', maxWidth: '56ch' }}>
              O Quant Connect aproxima estudantes do mercado quantitativo brasileiro. É organizado em conjunto pelas
              ligas quant do Insper, da Poli-USP, da FEA-USP e da FGV, com dias de conteúdo nos auditórios das próprias
              escolas.
            </p>
            <p style={{ fontSize: 16, lineHeight: 1.7, color: 'var(--texto-2)', margin: '0 0 32px', maxWidth: '56ch' }}>
              A programação combina palestras de gestoras e mesas proprietárias, painéis com quants em atividade,
              workshops técnicos e espaço de recrutamento. A segunda edição ocorreu em maio, nos auditórios do Insper e
              da Poli-USP.
            </p>
            <a
              className="btn btn--vazado"
              href="https://www.linkedin.com/company/quantconnectevento/"
              target="_blank"
              rel="noopener"
            >
              LinkedIn do evento
            </a>
          </div>
        </div>

        <div className="grade-hairline grade-4" style={{ marginTop: 64 }}>
          {fatos.map(([rotulo, valor], i) => (
            <div key={rotulo} style={{ padding: '28px 26px' }}>
              <div className="eyebrow" style={{ marginBottom: 12 }}>{rotulo}</div>
              <div
                style={{
                  fontFamily: 'var(--serif)',
                  fontSize: 18,
                  lineHeight: 1.4,
                  color: i === 3 ? 'rgba(169,194,209,0.85)' : undefined,
                }}
              >
                {valor}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ========================================================== Eventos */
const EVENTOS = [
  {
    tag: '2026 · Vault Capital',
    titulo: 'Kick off do Challenge Vault Quant',
    paragrafos: [
      'A Vault Capital recebeu em seu escritório as ligas IQF, FEA.dev e FGV Quant para a abertura do challenge. O encontro começou com a apresentação institucional da consultoria, da fundação à operação atual.',
      'Em seguida, Bruno Drezza, head de quant da casa, apresentou o formato do desafio e os critérios de avaliação das estratégias, detalhando o que uma mesa considera relevante na construção e na validação de um modelo. O encerramento foi uma conversa aberta com o time sobre a rotina de pesquisa e execução.',
    ],
    fotos: [
      { src: '/assets/foto-vault-iqf.jpg', alt: 'Membros do IQF no escritório da Vault Capital' },
      { src: '/assets/foto-vault-ligas.jpg', alt: 'As três ligas na mesa da Vault Capital' },
    ],
    proporcao: '16 / 9',
    textoPrimeiro: true,
  },
  {
    tag: '2026 · Insper e Poli-USP',
    titulo: 'Quant Connect · 2ª edição',
    paragrafos: [
      'Maior encontro de finanças quantitativas entre estudantes no país, co-organizado pelo IQF com FEA.dev, Poli Quant e FGV Quant. Dois dias de palestras de gestoras e mesas proprietárias, painéis com quants em atividade e apresentações das próprias ligas.',
    ],
    fotos: [{ src: '/assets/foto-qc-auditorio.jpg', alt: 'Quant Connect no auditório do Insper' }],
    proporcao: '3 / 2',
    textoPrimeiro: false,
  },
  {
    tag: '2025 e 2026 · Itaú Asset',
    titulo: 'Desafio Quant AI',
    paragrafos: [
      'Competição nacional em que equipes constroem estratégias de investimento com uso intensivo de IA. A liga foi semifinalista na edição de 2025 com o Nexus, e a edição 2026 foi lançada no palco do Quant Connect.',
    ],
    fotos: [{ src: '/assets/foto-quant-ai.jpg', alt: 'Abertura do Desafio Quant AI' }],
    proporcao: '3 / 2',
    textoPrimeiro: true,
  },
  {
    tag: '2026 · Giant Steps Capital',
    titulo: 'Painéis dentro das gestoras',
    paragrafos: [
      'Parte da programação acontece na mesa das casas parceiras: conversa aberta com gestores sobre pesquisa, execução e carreira, com espaço para recrutamento ao final.',
    ],
    fotos: [{ src: '/assets/foto-giant-steps.jpg', alt: 'Painel na Giant Steps Capital' }],
    proporcao: '3 / 2',
    textoPrimeiro: false,
  },
  {
    tag: 'Todo semestre · Insper',
    titulo: 'Treinamentos internos',
    paragrafos: [
      'Os próprios membros ensinam: fundamentos de factor investing, índices e ETFs, e as ferramentas que a liga desenvolve — como o dashboard de análise de carteira usado nos projetos.',
    ],
    fotos: [{ src: '/assets/foto-treinamento.jpg', alt: 'Treinamento interno da liga' }],
    proporcao: '3 / 2',
    textoPrimeiro: true,
  },
];

const fmtData = (iso) => {
  try {
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(iso));
  } catch {
    return '';
  }
};

/**
 * Quebra a legenda em título + corpo. Post do Instagram não tem campo de
 * título: a convenção aqui é que a primeira frase serve de manchete.
 * Devolve titulo: null quando não há legenda, para o card usar outro arranjo.
 */
/** Linha formada só por hashtags e menções — comum no fim das legendas. */
const soTags = (linha) => linha.split(/\s+/).every((t) => /^[#@]/.test(t));

/** Corta no último espaço antes do limite, para não partir palavra ao meio. */
function cortar(texto, max) {
  if (texto.length <= max) return texto;
  const fatia = texto.slice(0, max);
  const espaco = fatia.lastIndexOf(' ');
  return (espaco > max * 0.6 ? fatia.slice(0, espaco) : fatia).trimEnd();
}

function lerLegenda(post) {
  const linhas = (post.legenda || '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !soTags(l));

  if (!linhas.length) return { titulo: null, corpo: null };

  const bruto = linhas[0];
  const corte = bruto.search(/[.!?—]/);
  const titulo = corte > 12 && corte < 80 ? bruto.slice(0, corte) : cortar(bruto, 80);

  const resto = [bruto.slice(titulo.length).replace(/^[.!?—\s]+/, ''), ...linhas.slice(1)]
    .filter(Boolean)
    .join(' ')
    // Tira hashtags soltas no meio do corpo: viram ruído fora do Instagram.
    .replace(/(^|\s)[#@][\w.]+/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  const corpo = resto.length > 180 ? `${cortar(resto, 177)}…` : resto;
  return { titulo, corpo: corpo || null };
}

function CartaoPost({ post }) {
  const { titulo, corpo } = lerLegenda(post);
  const data = fmtData(post.data);

  return (
    <a href={post.permalink} target="_blank" rel="noopener" className="cartao-post">
      <div className="photo" style={{ aspectRatio: '1 / 1', border: 'none' }}>
        {/* Sem otimização: a URL do CDN da Meta expira e o cache do Next
            acabaria servindo um link morto. */}
        <Image src={post.imagem} alt={titulo || `Publicação da liga em ${data}`} fill
               sizes="(max-width: 900px) 100vw, 33vw" unoptimized />
      </div>

      <div className="cartao-post__corpo">
        <div className="eyebrow" style={{ letterSpacing: '0.18em' }}>
          {[data, post.tipo === 'VIDEO' ? 'Vídeo' : null].filter(Boolean).join(' · ')}
        </div>

        {/* Sem legenda, a data sobe para manchete em vez de deixar um buraco. */}
        {titulo ? (
          <>
            <h3 style={{ fontSize: 21, lineHeight: 1.3 }}>{titulo}</h3>
            {corpo && <p className="cartao-post__texto">{corpo}</p>}
          </>
        ) : (
          <h3 style={{ fontSize: 21, lineHeight: 1.3 }}>
            {post.tipo === 'VIDEO' ? 'Vídeo da liga' : 'Registro da liga'}
          </h3>
        )}

        <span className="cartao-post__link eyebrow" style={{ letterSpacing: '0.18em' }}>
          Ver no Instagram →
        </span>
      </div>
    </a>
  );
}

export function Eventos({ posts = [] }) {
  const doInstagram = posts.length > 0;

  return (
    <section id="eventos" className="secao secao--carvao">
      <div className="container">
        <div className="eyebrow" style={{ marginBottom: 16 }}>Últimos eventos</div>
        <div className="cabecalho-ultimas">
          <h2 className="h-secao" style={{ margin: 0 }}>A liga em atividade</h2>
          {doInstagram && (
            <a className="btn btn--vazado" href="https://www.instagram.com/insperqf/" target="_blank" rel="noopener">
              Seguir @insperqf
            </a>
          )}
        </div>

        {doInstagram ? (
          <div className="grade-posts">
            {posts.slice(0, 3).map((post) => <CartaoPost key={post.id} post={post} />)}
          </div>
        ) : (
          // Instagram indisponível (sem token, token expirado e cache vazio):
          // os eventos escritos à mão seguram a seção.
          EVENTOS.map((ev, i) => {
            const texto = (
              <div>
                <div className="eyebrow" style={{ color: 'rgba(169,194,209,0.9)', marginBottom: 14 }}>{ev.tag}</div>
                <h3 style={{ fontSize: 32, lineHeight: 1.2, margin: '0 0 18px' }}>{ev.titulo}</h3>
                {ev.paragrafos.map((p, j) => (
                  <p
                    key={j}
                    style={{
                      margin: j === ev.paragrafos.length - 1 ? 0 : '0 0 16px',
                      fontSize: 16,
                      lineHeight: 1.7,
                      color: j === 0 ? 'var(--texto-2)' : 'var(--texto-3)',
                      maxWidth: '52ch',
                    }}
                  >
                    {p}
                  </p>
                ))}
              </div>
            );

            const midia = (
              <div style={{ display: 'grid', gap: 14 }}>
                {ev.fotos.map((f) => (
                  <div key={f.src} className="photo" style={{ aspectRatio: ev.proporcao }}>
                    <Image src={f.src} alt={f.alt} fill sizes="(max-width: 900px) 100vw, 50vw" />
                  </div>
                ))}
              </div>
            );

            return (
              <div
                key={ev.titulo}
                className="duas-colunas"
                style={{ alignItems: 'center', marginBottom: i === EVENTOS.length - 1 ? 0 : 72 }}
              >
                {ev.textoPrimeiro ? texto : midia}
                {ev.textoPrimeiro ? midia : texto}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

/* ============================================== Processo seletivo */
export function ProcessoSeletivo() {
  const faq = [
    ['Precisa saber programar?', 'Não. O trainee começa pelos fundamentos e a parte técnica é construída ao longo do processo, com mentoria dos membros mais experientes.'],
    ['De quais cursos vocês aceitam?', 'De todos. Buscamos interesse por mercado e disposição para estudo técnico, não um curso específico.'],
    ['Quanto tempo exige por semana?', 'Reuniões da frente de trabalho, mais o estudo individual e o desenvolvimento do projeto do semestre.'],
    ['Como funciona a seleção?', 'Inscrição pelo formulário, seguida das etapas de avaliação e entrevista divulgadas a cada edição.'],
  ];

  return (
    <section
      id="ps"
      className="secao"
      style={{
        backgroundImage:
          'radial-gradient(58% 78% at 92% 44%, rgba(214,26,26,0.16) 0%, rgba(214,26,26,0) 68%),' +
          'radial-gradient(40% 60% at 78% 96%, rgba(156,14,46,0.12) 0%, rgba(122,10,26,0) 72%)',
      }}
    >
      <div className="container duas-colunas" style={{ alignItems: 'center' }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 16 }}>Processo seletivo</div>
          <h2 className="h-secao" style={{ margin: '0 0 22px' }}>Faça parte da liga</h2>
          <p className="p-corpo" style={{ maxWidth: '52ch', margin: '0 0 32px' }}>
            Convidamos alunos do Insper de todos os cursos a se inscreverem. Buscamos interesse genuíno por mercado,
            disposição para estudo técnico e vontade de construir projetos com o time — não exigimos experiência prévia
            em programação.
          </p>
          <a
            className="btn btn--solido"
            href="https://docs.google.com/forms/d/e/1FAIpQLScrwUvYpostcTPRLIXiZNyGCVsqQY2O-bPJwliCM5sOzQUtuA/viewform"
            target="_blank"
            rel="noopener"
          >
            Quero me inscrever
          </a>
        </div>

        <div style={{ display: 'grid', borderTop: '1px solid var(--linha-forte)' }}>
          {faq.map(([pergunta, resposta]) => (
            <div key={pergunta} style={{ padding: '22px 0', borderBottom: '1px solid var(--linha-forte)' }}>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 19, lineHeight: 1.35, marginBottom: 10 }}>{pergunta}</div>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: 'var(--texto-3)' }}>{resposta}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ======================================================== Empresas */
export function Empresas() {
  const caminhos = [
    ['01', 'Mentoria de projetos', 'A empresa propõe a tese e acompanha o desenvolvimento ao longo do semestre.'],
    ['02', 'Recrutamento', 'Acesso a alunos com experiência prática em modelagem, backtest e pesquisa aplicada.'],
    ['03', 'Palestras e workshops', 'Profissionais do mercado apresentam para os membros e, nos eventos abertos, para o público de várias escolas.'],
    ['04', 'Visitas ao escritório', 'Recebemos um grupo de membros para conhecer a operação de perto, conversar com o time e ver o dia a dia da mesa.'],
    ['05', 'Patrocínio do Quant Connect', 'Presença de marca no evento que reúne as ligas quantitativas de Insper, Poli-USP, FEA-USP e FGV.'],
  ];

  return (
    <section
      id="empresas"
      className="secao secao--carvao"
      style={{ backgroundImage: 'radial-gradient(50% 70% at 4% 92%, rgba(22,42,118,0.12) 0%, rgba(22,42,118,0) 72%)' }}
    >
      <div className="container">
        <div className="eyebrow" style={{ marginBottom: 16 }}>Para empresas</div>
        <h2 className="h-secao" style={{ margin: '0 0 20px', maxWidth: '24ch' }}>Como trabalhamos com o mercado</h2>
        <p className="p-corpo" style={{ maxWidth: '60ch', margin: '0 0 56px' }}>
          Gestoras, mesas proprietárias e empresas de tecnologia financeira se aproximam da liga por cinco caminhos.
        </p>

        <div className="grade-hairline grade-5">
          {caminhos.map(([n, titulo, texto]) => (
            <div key={n}>
              <div className="eyebrow" style={{ letterSpacing: '0.2em', marginBottom: 16 }}>{n}</div>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 21, lineHeight: 1.3, marginBottom: 12 }}>{titulo}</div>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: 'var(--texto-3)' }}>{texto}</p>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 44 }}>
          <a className="btn btn--vazado" href="#contato">Falar com a diretoria</a>
        </div>
      </div>
    </section>
  );
}

/* ======================================================== Parceiros */
const PARCEIROS = [
  ['/assets/parceiro-xp.png', 'XP Inc.'],
  ['/assets/parceiro-jpmorgan.png', 'J.P. Morgan'],
  ['/assets/parceiro-goldman.png', 'Goldman Sachs'],
  ['/assets/parceiro-b3.png', 'B3'],
  ['/assets/parceiro-giantsteps.png', 'Giant Steps Capital'],
  ['/assets/parceiro-schonfeld.png', 'Schonfeld'],
  ['/assets/parceiro-bayes.png', 'Bayes Capital'],
  ['/assets/parceiro-avantgarde.png', 'Avantgarde Wealth Management'],
  ['/assets/parceiro-lev.png', 'Lev'],
  ['/assets/parceiro-extra.png', 'Parceiro'],
  ['/assets/parceiro-tradingview.png', 'TradingView'],
];

export function Parceiros() {
  const fila = (ocultar) => (
    <div className="marquee-row" aria-hidden={ocultar || undefined}>
      {PARCEIROS.map(([src, alt]) => (
        <div key={src} className="parceiro-card">
          <Image src={src} alt={alt} width={180} height={80} style={{ width: '100%', maxWidth: 180, height: 'auto' }} />
        </div>
      ))}
    </div>
  );

  return (
    <section id="parceiros" className="secao secao--carvao" style={{ padding: '100px 0' }}>
      <div className="container" style={{ margin: '0 auto 44px', padding: '0 var(--gutter)' }}>
        <div className="eyebrow">Parceiros e patrocinadores de eventos passados</div>
      </div>
      <div className="marquee">
        {fila(false)}
        {fila(true)}
      </div>
    </section>
  );
}

/* ========================================================= Contato */
export function Contato() {
  const canais = [
    ['E-mail', 'insperqfc@gmail.com', 'mailto:insperqfc@gmail.com'],
    ['LinkedIn', 'Insper Quantitative Finance Club', 'https://www.linkedin.com/company/insper-quantitative-finance-club/'],
    ['Instagram', '@insperqf', 'https://www.instagram.com/insperqf/'],
  ];

  return (
    <section
      id="contato"
      className="secao"
      style={{
        padding: '110px var(--gutter) 80px',
        borderBottom: 'none',
        backgroundImage:
          'radial-gradient(60% 80% at 6% 30%, rgba(20,70,150,0.14) 0%, rgba(20,70,150,0) 70%),' +
          'radial-gradient(50% 70% at 30% 100%, rgba(22,42,118,0.12) 0%, rgba(22,42,118,0) 74%)',
      }}
    >
      <div className="container duas-colunas duas-colunas--estreita" style={{ alignItems: 'start' }}>
        <div>
          <h2 className="h-secao" style={{ fontSize: 48, lineHeight: 1.08, margin: '0 0 24px' }}>Vamos conversar.</h2>
          <p className="p-corpo" style={{ maxWidth: '52ch', margin: 0 }}>
            Alunos interessados no processo seletivo, empresas que querem recrutar ou patrocinar e profissionais
            dispostos a palestrar: fale com a liga.
          </p>
        </div>
        <div className="grade-hairline">
          {canais.map(([rotulo, texto, href]) => (
            <div key={rotulo} style={{ padding: '24px 28px' }}>
              <div className="eyebrow" style={{ marginBottom: 10 }}>{rotulo}</div>
              <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noopener"
                 style={{ fontFamily: 'var(--serif)', fontSize: 19 }}>
                {texto}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ========================================================== Rodapé */
export function Rodape() {
  return (
    <footer style={{ padding: 'var(--gutter)', borderTop: '1px solid var(--linha)', background: 'var(--carvao)' }}>
      <div className="container rodape-grade">
        <Image src="/assets/logo-iqf.png" alt="Liga Insper Quantitative Finance" width={230} height={107}
               style={{ width: '100%', maxWidth: 230, height: 'auto' }} />
        <div>
          <div className="eyebrow" style={{ marginBottom: 12 }}>Endereço</div>
          <div style={{ fontSize: 15, lineHeight: 1.75, color: 'var(--texto-2)' }}>
            Rua Quatá, 300 — Vila Olímpia<br />São Paulo, SP
          </div>
        </div>
        <div>
          <div className="eyebrow" style={{ marginBottom: 12 }}>Contato</div>
          <div style={{ fontSize: 15, lineHeight: 1.9, color: 'var(--texto-2)', display: 'grid', justifyItems: 'start' }}>
            <a href="mailto:insperqfc@gmail.com">insperqfc@gmail.com</a>
            <a href="https://www.instagram.com/insperqf/" target="_blank" rel="noopener">Instagram</a>
            <a href="https://www.linkedin.com/company/insper-quantitative-finance-club/" target="_blank" rel="noopener">LinkedIn</a>
          </div>
        </div>
      </div>
      <div
        className="container"
        style={{
          paddingTop: 36,
          marginTop: 44,
          borderTop: '1px solid var(--linha)',
          fontSize: 11,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--texto-3)',
        }}
      >
        © {new Date().getFullYear()} Liga Insper Quantitative Finance
      </div>
    </footer>
  );
}
