-- =====================================================================
-- Seed: os 4 projetos que já estavam na landing.
-- Rode depois do schema.sql. É idempotente (on conflict do nothing).
-- =====================================================================

insert into public.projetos
  (slug, titulo, subtitulo, selo, contexto, resumo, detalhes, metricas,
   parceiro_nome, parceiro_logo, parceiro_prefixo, ano, destaque, ordem)
values
(
  'nexus',
  'Nexus (Desafio Quant AI - Itaú)',
  'Alocação de portfólio por grafos dinâmicos',
  'Semifinalista',
  'Desafio Quant AI 2025',
  'Parte da premissa de que o mercado é complexo demais para ser tratado como uma rede estática: as relações entre ações mudam de intensidade ao longo do tempo. O Nexus modela essa estrutura como um grafo que se reconstrói a cada trimestre e deixa uma rede neural aprender, a partir dele, quanto peso dar a cada ativo — com uma camada de risco que reduz exposição em quedas.',
  '[
    {"rotulo":"Distance correlation","texto":"Mede a dependência entre as 50 ações mais líquidas com dois anos de retornos diários, capturando relações não lineares que a correlação de Pearson não enxerga."},
    {"rotulo":"Filtro TMFG","texto":"Reduz as 2.500 ligações possíveis às 144 mais informativas, preservando a topologia relevante e descartando ruído."},
    {"rotulo":"Graph Attention Network","texto":"Aprende os pesos do portfólio sobre o grafo filtrado, treinada em walk-forward com função de perda em log do Sharpe e sem look-ahead."},
    {"rotulo":"Controle de risco","texto":"Fora do rebalance trimestral, ajusta o caixa diariamente conforme o drawdown de uma janela de 21 dias."}
  ]'::jsonb,
  '[
    {"valor":"144","rotulo":"conexões filtradas"},
    {"valor":"27%","rotulo":"caixa médio"},
    {"valor":"até 90%","rotulo":"caixa em crise"}
  ]'::jsonb,
  'Itaú Asset', '/assets/itau-asset.png', 'Competição promovida por', '2025', true, 10
),
(
  'solaris',
  'Solaris (Quantamental Challenge - Itaú)',
  'Enhanced index tracking via deep learning',
  '2º lugar',
  'Quantamental Challenge 2024',
  'Um fundo que replica um índice tende a entregar exatamente o índice, menos custos. O Solaris busca o meio do caminho: acompanhar o Ibovespa de perto e, ao mesmo tempo, extrair retorno excedente onde o modelo identifica assimetria — mantendo o desvio em relação ao índice sob controle.',
  '[
    {"rotulo":"Rede multi-bloco","texto":"Blocos separados para sinais de regime, score de ativos e memória de séries, combinados na decisão final de peso."},
    {"rotulo":"Regimes via HMM","texto":"Um Hidden Markov Model classifica o mercado entre bull e bear e altera o comportamento da alocação."},
    {"rotulo":"Avaliação","texto":"Backtest com retorno, Sharpe, drawdown, alpha e beta contra o próprio índice de referência."}
  ]'::jsonb,
  '[
    {"valor":"188,6%","rotulo":"retorno acumulado"},
    {"valor":"52,7%","rotulo":"Ibovespa no período"},
    {"valor":"0,14","rotulo":"alpha"},
    {"valor":"0,92","rotulo":"beta"}
  ]'::jsonb,
  'Itaú Asset', '/assets/itau-asset.png', 'Competição promovida por', '2024', true, 20
),
(
  'atlas',
  'Atlas (Lev Asset Management)',
  'Alocação tática entre classes de ativos',
  null,
  'Projeto mentorado · 2025.2',
  'Em vez de escolher ações, o Atlas decide em que classe de ativo estar. O sistema lê indicadores de múltiplos mercados globais, classifica o momento macroeconômico e posiciona a carteira de acordo com o regime identificado, com trading sistemático long/short.',
  '[
    {"rotulo":"Regimes macro","texto":"Goldilocks, reflação, estagflação e desinflação, identificados por clusterização K-Means sobre indicadores globais."},
    {"rotulo":"Intensidade do sinal","texto":"A distância ao centro do cluster define se o sinal é forte, moderado ou fraco, e com isso o tamanho da posição."},
    {"rotulo":"Universo","texto":"Ações, juros, commodities e câmbio, com controle de turnover e exposição dinâmica para conter custos."}
  ]'::jsonb,
  '[
    {"valor":"4","rotulo":"regimes macro"},
    {"valor":"Long/short","rotulo":"multi-asset"},
    {"valor":"K-Means","rotulo":"classificação"}
  ]'::jsonb,
  'LEV Asset Management', '/assets/lev-asset.png', 'Projeto mentorado por', '2025.2', true, 30
),
(
  'black-litterman-cripto',
  'Black-Litterman para criptoativos (Vault Capital)',
  'Carteira de cripto com views quantitativas',
  null,
  'Projeto mentorado · 2026.1',
  'Otimizações clássicas de carteira reagem mal a estimativas ruins de retorno — problema que cripto amplifica. O modelo de Black-Litterman inverte a lógica: começa do equilíbrio implícito no mercado e só se afasta dele na medida da confiança depositada em cada view. Aqui, essas views não vêm de opinião, mas de um modelo.',
  '[
    {"rotulo":"Equilíbrio de mercado","texto":"Retornos implícitos a partir da capitalização, ajustados por views através da fórmula master do modelo."},
    {"rotulo":"Views por VAR","texto":"Um vetor autorregressivo gera as views quantitativas automaticamente, sem input discricionário."},
    {"rotulo":"Confiança de Idzorek","texto":"Um controle de 0 a 100% define a incerteza atribuída a cada view e, portanto, o quanto ela move a carteira."},
    {"rotulo":"Validação","texto":"Backtest walk-forward com custos reais, comparado a um benchmark neutro."}
  ]'::jsonb,
  '[
    {"valor":"VAR","rotulo":"geração de views"},
    {"valor":"0–100%","rotulo":"confiança por view"},
    {"valor":"Walk-forward","rotulo":"validação"}
  ]'::jsonb,
  'Vault Capital', '/assets/vault-capital.png', 'Projeto mentorado por', '2026.1', true, 40
)
on conflict (slug) do nothing;
