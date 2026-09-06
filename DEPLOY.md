# Deploy

O site é um Next.js 14 (App Router). Front e back são o mesmo processo: as
páginas, o `middleware.js` de sessão e as rotas em `app/api` sobem juntos.
Os dados e a autenticação ficam no Supabase.

## Onde hospedar

O repositório é **privado e pertence a uma organização**. Isso elimina o plano
gratuito da Vercel, que não deploya repositório privado de organização — a saída
oficial deles é tornar o repo público ou assinar o Pro. Por isso o alvo é o
**Render**, e o `render.yaml` na raiz já descreve o serviço inteiro.

## Passo a passo (Render)

1. **Conectar a conta.** Em <https://dashboard.render.com>, entre com o GitHub e
   autorize o acesso à organização. O GitHub pede aprovação de um owner da org.

2. **Criar pelo blueprint.** New → **Blueprint** → selecione este repositório.
   O Render lê o `render.yaml` e já configura Node 22, o build, o start, o
   health check em `/` e o auto-deploy a cada push na `main`.

3. **Preencher as variáveis de ambiente.** O blueprint declara as chaves com
   `sync: false`: elas existem no serviço, mas o valor é digitado no painel e
   nunca vai para o git. Os valores são os mesmos do seu `.env.local`:

   | Variável | Onde obter |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | mesma tela, chave `anon` |
   | `SUPABASE_SERVICE_ROLE_KEY` | mesma tela, chave `service_role` |
   | `INSTAGRAM_ACCESS_TOKEN` | token de longa duração da Graph API |
   | `INSTAGRAM_USER_ID` | só no fluxo de Facebook Login; senão, vazio |
   | `CRON_SECRET` | gere com `openssl rand -hex 32` |

4. **Deploy.** O primeiro build leva alguns minutos. O serviço sobe em
   `iqf-site.onrender.com`.

## Depois do primeiro deploy

**Ajustar as URLs no Supabase.** Em Authentication → URL Configuration, coloque
a URL de produção em *Site URL* e em *Redirect URLs*. Sem isso, o login e a
redefinição de senha continuam redirecionando para `localhost` e quebram para
todo mundo. É o erro mais comum nesse tipo de deploy.

**Escolher o plano.** O `render.yaml` pede `starter` (US$ 7/mês). No plano
`free` o serviço hiberna após 15 minutos ociosos, e a primeira visita depois
disso leva cerca de 30 segundos — ruim para um site institucional, que costuma
receber visitas esparsas.

**Agendar a atualização do Instagram.** A rota `POST /api/instagram/atualizar`
renova o cache de posts e é protegida pelo `CRON_SECRET`. Cron no Render é um
serviço pago à parte; um agendador externo gratuito batendo na rota com o
segredo no header resolve igual.

## Domínio próprio

Settings → Custom Domains no serviço do Render, e um registro CNAME apontando
para o host `.onrender.com` no DNS do domínio. O certificado TLS é emitido
automaticamente. Depois de trocar o domínio, **volte no Supabase e atualize as
URLs de autenticação** — senão o login quebra de novo.

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
