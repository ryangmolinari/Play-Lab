# Play Lab — versão GitHub Pages + Supabase (100% gratuita)

Site estático (GitHub Pages) que usa o Supabase como banco, login e armazenamento de capas.
Não existe servidor para manter e nada "dorme".

## Passo 1 — Criar o projeto no Supabase
1. Crie uma conta em supabase.com e clique em **New project** (guarde a senha do banco).
2. Quando o projeto ficar pronto, abra **SQL Editor → New query**.
3. Abra o arquivo `supabase.sql`, **troque `SEU_EMAIL_AQUI` pelo seu e-mail** (aparece em uma linha marcada com `<<< TROQUE AQUI`), cole tudo e clique em **Run**.
   Isso cria as tabelas, as regras de segurança (RLS), o bucket `covers` das imagens e os 4 jogos de exemplo.

## Passo 2 — Criar o administrador (muito importante)
1. **Authentication → Users → Add user → Create new user**: use o MESMO e-mail do passo 1, defina uma senha e marque **Auto Confirm User**.
2. **Authentication → Sign In / Providers** (ou *Providers → Email*): **desative "Allow new users to sign up"**.
   Assim ninguém consegue criar contas. Mesmo que criasse, só o e-mail cadastrado em `admin_emails` tem permissão de escrita.

## Passo 3 — Conectar o site ao Supabase
1. **Project Settings → API**: copie a **Project URL** e a chave **anon / public**.
2. Edite `js/config.js` e preencha `SUPABASE_URL` e `SUPABASE_ANON_KEY`.
   A anon key é pública por design. **Nunca** use a `service_role` no site.

## Passo 4 — Publicar no GitHub Pages
1. Crie um repositório no GitHub e envie TODOS os arquivos desta pasta (incluindo `.nojekyll`).
2. **Settings → Pages → Build and deployment**: *Source* = **Deploy from a branch**, branch **main**, pasta **/ (root)** → Save.
3. Em ~1 minuto o site fica em `https://SEUUSUARIO.github.io/NOMEDOREPO/`.
   O painel fica em `.../NOMEDOREPO/admin/`.

## Uso
Entre em `/admin/`, **+ Adicionar jogo**, preencha e clique em **Publicar jogo**. Ele aparece na home na hora.
Só um jogo fica em destaque por vez (garantido por trigger no banco). Jogos ocultos não são visíveis ao público (RLS).

## Observações
- O e-mail do administrador não é alterável pelo painel (só nome e senha). Para trocar, edite o usuário no Supabase e a tabela `admin_emails`.
- Backup: **Database → Backups** no Supabase, ou exporte as tabelas em CSV pelo Table Editor. As imagens ficam em **Storage → covers**.
- Planos gratuitos têm limites e regras que mudam (por exemplo, projetos sem uso por muito tempo podem ser pausados). Confira nos sites do Supabase e do GitHub.
- Segurança: toda escrita é bloqueada por RLS a menos que o usuário logado esteja em `admin_emails`. As imagens são limitadas a 5 MB e tipos PNG/JPG/WEBP/ICO pelo bucket.
