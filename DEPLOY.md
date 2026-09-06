# Deploy

O site é um Next.js 14 (App Router). Front e back são o mesmo processo: as
páginas, o `middleware.js` de sessão e as rotas em `app/api` sobem juntos.
Os dados e a autenticação ficam no Supabase.

A hospedagem é a **Vercel**, no plano Hobby (gratuito).

## Por que este repositório é público

O plano gratuito da Vercel não faz deploy de repositório **privado** que
pertence a uma organização do GitHub — a saída oficial é tornar o repositório
público ou assinar o plano Pro. Como o Render cobra pela instância que não
hiberna, a escolha foi deixar o código aberto.

Isso muda uma regra de trabalho: **nada de segredo neste repositório, nunca.**
O `.gitignore` já barra `.env` e `.env.local`, e é assim que tem que continuar.
O que está público aqui é o código, o `supabase/schema.sql` e as migrações —
estrutura de tabelas, nenhuma credencial. As chaves vivem só no painel da
Vercel e no do Supabase.

Vale reforçar: a chave `service_role` do Supabase ignora todo o RLS. Se ela
vazar para um commit, alguém com o link do repositório tem acesso irrestrito ao
banco. Se isso acontecer, não basta remover o commit: é preciso **rotacionar a
chave** no painel do Supabase.

## Passo a passo (Vercel)

1. **Importar.** Em <https://vercel.com/new>, entre com o GitHub e escolha este
   repositório. A Vercel pede autorização do GitHub App na organização; um
   owner da org aprova.

2. **Configuração do projeto.** Framework detectado automaticamente como
   Next.js. Build, output e install ficam nos padrões — não há nada para
   ajustar.

3. **Variáveis de ambiente.** Adicione as seis antes do primeiro deploy, em
   Settings → Environment Variables. Os valores são os mesmos do `.env.local`:

   | Variável | Onde obter |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | mesma tela, chave `sb_publishable_…` |
   | `SUPABASE_SECRET_KEY` | mesma tela, chave `sb_secret_…` |
   | `INSTAGRAM_ACCESS_TOKEN` | token de longa duração da Graph API (opcional) |
   | `INSTAGRAM_USER_ID` | só no fluxo de Facebook Login; senão, vazio |
   | `CRON_SECRET` | gere com `openssl rand -hex 32` |

   O Supabase renomeou as chaves: a antiga `anon` virou `publishable` e a
   `service_role` virou `secret`. O código aceita os dois nomes
   (`lib/supabase/config.js`), mas use os que o seu painel mostrar.

   As três primeiras precisam existir nos três ambientes (Production, Preview e
   Development); as outras, em Production basta.

   **Atenção com as `NEXT_PUBLIC_*`**: elas são inlinadas no build, não lidas em
   runtime. Defina antes do primeiro deploy — mudar o valor depois exige um
   novo build para ter efeito.

   As três do Instagram são opcionais: sem elas o site sobe normalmente e a
   seção de eventos fica sem posts.

4. **Deploy.** A partir daí, todo push na `main` publica sozinho, e todo pull
   request ganha uma URL de preview.

## Depois do primeiro deploy

**Ajustar as URLs no Supabase.** Em Authentication → URL Configuration, coloque
a URL de produção em *Site URL* e em *Redirect URLs*. Sem isso, o login e a
redefinição de senha continuam redirecionando para `localhost` e quebram para
todo mundo. É o erro mais comum nesse tipo de deploy.

**O cron do Instagram.** O `vercel.json` agenda `/api/instagram/atualizar` para
rodar diariamente às 9h UTC. A Vercel envia o header
`Authorization: Bearer $CRON_SECRET` automaticamente, que é o que a rota espera
— nada mais a configurar. No plano Hobby o limite é **uma execução por dia**;
se um dia precisar de mais frequência, use um agendador externo mandando o
mesmo header.

**Renovar o token do Instagram.** O token da Graph API expira em 60 dias.
Chamar a rota com `?renovar=1` devolve um token novo, que precisa ser colado
manualmente em `INSTAGRAM_ACCESS_TOKEN` nas variáveis da Vercel. Vale deixar um
lembrete no calendário da diretoria — quando ele expira, a seção de eventos
para de atualizar silenciosamente.

## Domínio próprio

Settings → Domains no projeto da Vercel, e os registros de DNS que ela indicar.
O certificado TLS é emitido automaticamente. Depois de apontar o domínio,
**volte no Supabase e atualize as URLs de autenticação** — senão o login quebra
de novo.

## Rodando localmente

```bash
npm install
cp .env.example .env.local   # e preencha os valores
npm run dev                  # desenvolvimento, em http://localhost:3000
```

Em `npm run dev` cada rota é compilada na primeira visita, o que faz a primeira
carga levar dezenas de segundos. Isso é do modo de desenvolvimento e não
acontece em produção. Para conferir o comportamento real:

```bash
npm run build && npm run start
```
