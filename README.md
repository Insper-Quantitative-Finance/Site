# Site da Liga Insper Quantitative Finance

Next.js 14 (App Router) + Supabase, pronto para o Render. Inclui a landing pública
portada do design original, login, área de membros, administração de usuários,
biblioteca de materiais e a seção "Últimas da liga" puxando do Instagram.

```
app/
  app/                      rotas
    page.js                 landing pública
    login/                  autenticação
    membros/                área logada
      quadro/               diretório de membros
      materiais/            biblioteca de estudo
      conta/                perfil + troca da própria senha
      gestao/
        acoes.js            server actions (todas as regras de permissão)
        usuarios/           CRUD de usuários
        projetos/           conteúdo da seção de projetos da landing
    api/
      instagram/atualizar/  cron do cache do Instagram
      materiais/[id]/download/  URL assinada do Storage
  components/landing/       seções da home
  components/membros/       UI da área logada
  lib/cargos.js             cargos e permissões
  lib/instagram.js          Graph API + cache
  lib/supabase/             clients (navegador, servidor, admin)
  supabase/schema.sql       tabelas, RLS e bucket — rode primeiro
  supabase/seed.sql         os 4 projetos que já estavam no site
  public/assets/            logos e fotos extraídos do HTML original
```

---

## Cargos e permissões

| Cargo | Área de membros | Materiais | Cadastra/edita usuários | Projetos do site |
|---|---|---|---|---|
| Presidente | ✅ | ✅ edita | ✅ todos | ✅ |
| Vice-presidente | ✅ | ✅ edita | ✅ todos | ✅ |
| Diretor de Projetos | ✅ | ✅ edita | ✅ exceto presidência | ✅ |
| Diretor de Capacitações | ✅ | ✅ edita | ✅ exceto presidência | ✅ |
| Membro | ✅ | 👁 lê | — | — |
| Trainee | ✅ | 👁 lê | — | — |

**Senhas.** A gestão define uma senha inicial ao criar o usuário e nunca mais
consegue vê-la ou alterá-la — o formulário de edição não tem campo de senha, e a
action `editarUsuario` sequer lê esse campo do formulário. Quem esquecer a senha
recebe um link de redefinição por e-mail (botão na lista de usuários, ou
"Esqueci minha senha" no login) e define a nova sozinho.

As regras valem em dois lugares: nas server actions (`lib/cargos.js`) e no próprio
banco, via RLS e a função `is_gestao()`. Mesmo que alguém forje um request, o
Postgres barra.

---

## 1. Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. **SQL Editor** → cole e rode `supabase/schema.sql` inteiro.
   (Se você já tinha rodado o schema antes da funcionalidade de paper, rode
   também `supabase/migracao-papers.sql`.)
3. Rode `supabase/seed.sql` para trazer os quatro projetos que já estavam no site.
4. **Project Settings → API**, anote: `Project URL`, a chave `anon` e a `service_role`.
5. **Authentication → URL Configuration**: em *Site URL* ponha a URL do Render
   (ex.: `https://iqf-site.onrender.com`) e adicione
   `https://iqf-site.onrender.com/membros/conta/redefinir` em *Redirect URLs*.
   Sem isso o link de redefinição de senha não funciona.

> A `service_role` ignora todo o RLS. Ela só existe no servidor
> (`lib/supabase/server.js`) e nunca é importada por componente client.

## 2. Rodar local

```bash
cd app
cp .env.example .env.local     # preencha as chaves
npm install
npm run dev
```

Crie as contas da diretoria (Fernando como presidente, Jose como vice), que
depois cadastram todo mundo pelo painel:

```bash
node --env-file=.env.local scripts/criar-diretoria.mjs
```

Senha inicial dos dois: `IQF@2026`. Entrem em `/login` e troquem em
**Minha conta** — depois disso ninguém mais consegue vê-la. O script é
idempotente: rodar de novo atualiza o perfil em vez de falhar.

Para qualquer outra conta avulsa:

```bash
node --env-file=.env.local scripts/criar-presidente.mjs "Nome" email@insper.edu.br "senha"
```

## 3. Deploy no Render

1. Suba este diretório para um repositório no GitHub.
2. No Render: **New → Blueprint**, aponte para o repositório. O `render.yaml` já
   define build, start e `rootDir: app`.
3. Em **Environment**, preencha as variáveis marcadas com `sync: false`:
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`, `INSTAGRAM_ACCESS_TOKEN`, `CRON_SECRET`
   (e `INSTAGRAM_USER_ID`, se usar o fluxo de Facebook Login).
4. Volte ao Supabase e ajuste *Site URL* / *Redirect URLs* para o domínio final.

O plano `starter` custa ~US$7/mês e fica sempre no ar. O plano `free` funciona,
mas hiberna após 15 minutos ociosos — a primeira visita depois disso demora ~30s.

## 4. Instagram

A seção "Últimas da liga" lê os posts de [@insperqf](https://www.instagram.com/insperqf/)
pela Graph API. Precisa de uma conta **Business** ou **Creator** (Instagram →
Configurações → Tipo de conta).

1. [developers.facebook.com](https://developers.facebook.com) → **Criar app** →
   tipo **Empresa**.
2. Adicione o produto **Instagram** → *API configurada com login do Instagram*.
3. Em *Configuração da API*, gere um **token de acesso** para o @insperqf com as
   permissões `instagram_business_basic`.
4. Copie o token para `INSTAGRAM_ACCESS_TOKEN` no Render. Deixe
   `INSTAGRAM_USER_ID` vazio neste fluxo.

O token vale **60 dias**. Para renovar sem pensar nisso, crie um **Cron Job** no
Render (mensal, `0 4 1 * *`):

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  "https://iqf-site.onrender.com/api/instagram/atualizar?renovar=1"
```

A resposta traz quantos dias o token ganhou. O valor renovado ainda precisa ser
colado à mão em `INSTAGRAM_ACCESS_TOKEN` — um processo não consegue reescrever a
própria variável de ambiente no Render.

**Se o token expirar, a home não quebra:** os posts ficam em cache na tabela
`instagram_cache` e continuam aparecendo. Só param de atualizar. Se nunca houve
cache, a seção inteira some em vez de virar um buraco na página.

## 5. Projetos e "carregar mais"

Em **Membros → Projetos do site**, cada projeto tem duas chaves:

- **Destaque** — aparece direto na landing.
- **Publicado** — se desmarcado, some do site sem apagar o registro.

Os não-destacados ficam atrás do botão *Carregar mais (n)*, que revela de 2 em 2.
Marque todos como destaque se quiser mostrar tudo de uma vez.

**Paper.** Cada projeto aceita um paper, por link externo (Drive, arXiv, SSRN) ou
upload de PDF. O PDF vai para o bucket **`papers`, que é público** — aparece na
landing para qualquer visitante. Material restrito de projeto mentorado não deve
ir aí; use a biblioteca de Materiais, que é privada. Trocar ou remover o paper
apaga o arquivo antigo do Storage automaticamente.

Detalhes técnicos e métricas são editados como texto, uma linha por item:

```
Filtro TMFG | Reduz as 2.500 ligações possíveis às 144 mais informativas.
```
```
188,6% | retorno acumulado
```

## 6. Materiais

Aceita link externo ou arquivo. Os arquivos vão para o bucket **privado**
`materiais` no Supabase Storage; o download passa por
`/api/materiais/[id]/download`, que confere a sessão e devolve uma URL assinada
válida por 60 segundos. Nenhum link de material é acessível sem login.

O tier gratuito do Supabase dá 1 GB de Storage — suficiente para PDFs e
notebooks. Vídeos longos é melhor deixar no Drive e cadastrar como link.

---

## Detalhes de implementação

- **Design.** Os tokens (`--preto`, `--osso`, `--azul`, tipografia Gelasio +
  Libre Franklin) vivem em `app/globals.css` e valem tanto para a landing quanto
  para a área logada. Os assets em `public/assets/` foram extraídos do bundle
  `Landing IQF (9).html` original.
- **Sessão.** `middleware.js` renova o token a cada request e barra `/membros`.
  O layout de `/membros` refaz a checagem no servidor, o que também cobre o caso
  do perfil desativado (`ativo = false`) com sessão ainda válida.
- **Auditoria.** Toda ação de gestão grava uma linha em `auditoria`. Falhar ali
  não desfaz a ação — é registro, não pré-requisito.
