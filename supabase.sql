-- =====================================================================
-- PLAY LAB — configuração do Supabase
-- Cole TUDO no SQL Editor do Supabase e clique em RUN.
-- ANTES: troque 'SEU_EMAIL_AQUI' (linha marcada) pelo e-mail do administrador.
-- =====================================================================

-- Tabelas -------------------------------------------------------------
create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  description text not null check (char_length(description) between 1 and 500),
  url text not null check (url ~* '^https?://'),
  cover_image text,
  category text not null check (char_length(category) between 1 and 30),
  tags text[] not null default '{}' check (coalesce(array_length(tags,1),0) <= 10),
  featured boolean not null default false,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.settings (
  id int primary key check (id = 1),
  platform_name text not null default 'Play Lab',
  description text not null default '',
  logo text, favicon text,
  accent_color text not null default '#A3FF60' check (accent_color ~ '^#[0-9a-fA-F]{6}$'),
  theme text not null default 'dark',
  github_url text default '', discord_url text default '', youtube_url text default '',
  admin_name text default 'Rian Molinari',
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_emails (email text primary key);

-- Administrador -------------------------------------------------------
insert into public.admin_emails(email) values (lower('SEU_EMAIL_AQUI')) on conflict do nothing;  -- <<< TROQUE AQUI

create or replace function public.is_admin() returns boolean
language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.admin_emails where lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;
grant execute on function public.is_admin() to anon, authenticated;

-- Triggers: updated_at e um único destaque -----------------------------
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists games_touch on public.games;
create trigger games_touch before update on public.games for each row execute function public.touch_updated_at();
drop trigger if exists settings_touch on public.settings;
create trigger settings_touch before update on public.settings for each row execute function public.touch_updated_at();

create or replace function public.single_featured() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.featured then update public.games set featured = false where id <> new.id and featured; end if;
  return new;
end $$;
drop trigger if exists games_single_featured on public.games;
create trigger games_single_featured before insert or update on public.games for each row execute function public.single_featured();

-- Segurança (RLS) -----------------------------------------------------
alter table public.games enable row level security;
alter table public.settings enable row level security;
alter table public.admin_emails enable row level security;   -- sem políticas = ninguém acessa pela API

drop policy if exists "games: publico le publicados" on public.games;
create policy "games: publico le publicados" on public.games for select to anon, authenticated using (published = true);
drop policy if exists "games: admin le tudo" on public.games;
create policy "games: admin le tudo" on public.games for select to authenticated using (public.is_admin());
drop policy if exists "games: admin insere" on public.games;
create policy "games: admin insere" on public.games for insert to authenticated with check (public.is_admin());
drop policy if exists "games: admin altera" on public.games;
create policy "games: admin altera" on public.games for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "games: admin exclui" on public.games;
create policy "games: admin exclui" on public.games for delete to authenticated using (public.is_admin());

drop policy if exists "settings: todos leem" on public.settings;
create policy "settings: todos leem" on public.settings for select to anon, authenticated using (true);
drop policy if exists "settings: admin altera" on public.settings;
create policy "settings: admin altera" on public.settings for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Armazenamento das capas (bucket público, 5 MB, só imagens) -----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('covers','covers',true,5242880,array['image/png','image/jpeg','image/webp','image/x-icon','image/vnd.microsoft.icon'])
on conflict (id) do update set public = true, file_size_limit = 5242880, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "covers: admin envia" on storage.objects;
create policy "covers: admin envia" on storage.objects for insert to authenticated with check (bucket_id = 'covers' and public.is_admin());
drop policy if exists "covers: admin le" on storage.objects;
create policy "covers: admin le" on storage.objects for select to authenticated using (bucket_id = 'covers' and public.is_admin());
drop policy if exists "covers: admin altera" on storage.objects;
create policy "covers: admin altera" on storage.objects for update to authenticated using (bucket_id = 'covers' and public.is_admin());
drop policy if exists "covers: admin exclui" on storage.objects;
create policy "covers: admin exclui" on storage.objects for delete to authenticated using (bucket_id = 'covers' and public.is_admin());

-- Dados iniciais (podem ser excluídos pelo painel) ----------------------
insert into public.settings (id, description) values (1, 'Sua central de jogos online. Descubra, jogue e se divirta com os melhores jogos do navegador, tudo em um só lugar.')
on conflict (id) do nothing;

insert into public.games (name, description, url, cover_image, category, tags, featured, published, created_at) values
  ('Sinal Oculto','Um sinal estranho aparece no rádio. Descubra de onde ele vem antes que seja tarde.','https://example.com/sinal-oculto','data:image/svg+xml;utf8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 640 360%22%3E%3Cdefs%3E%3ClinearGradient id=%22g%22 x1=%220%22 y1=%220%22 x2=%221%22 y2=%221%22%3E%3Cstop offset=%220%22 stop-color=%22%231b2a3a%22/%3E%3Cstop offset=%221%22 stop-color=%22%233b6ea5%22/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width=%22640%22 height=%22360%22 fill=%22url%28%23g%29%22/%3E%3Ctext x=%22320%22 y=%22196%22 text-anchor=%22middle%22 font-family=%22Arial,sans-serif%22 font-weight=%22800%22 font-size=%2256%22 fill=%22%23fff%22 fill-opacity=%22.92%22%3ESinal Oculto%3C/text%3E%3C/svg%3E','Suspense',array['Multiplayer'],true,true,now() - interval '4 hours'),
  ('Fish Isle','Pesque, colecione e relaxe em uma ilha tranquila.','https://example.com/fish-isle','data:image/svg+xml;utf8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 640 360%22%3E%3Cdefs%3E%3ClinearGradient id=%22g%22 x1=%220%22 y1=%220%22 x2=%221%22 y2=%221%22%3E%3Cstop offset=%220%22 stop-color=%22%230f3b3a%22/%3E%3Cstop offset=%221%22 stop-color=%22%232fa39a%22/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width=%22640%22 height=%22360%22 fill=%22url%28%23g%29%22/%3E%3Ctext x=%22320%22 y=%22196%22 text-anchor=%22middle%22 font-family=%22Arial,sans-serif%22 font-weight=%22800%22 font-size=%2256%22 fill=%22%23fff%22 fill-opacity=%22.92%22%3EFish Isle%3C/text%3E%3C/svg%3E','Casual',array['Pesca'],false,true,now() - interval '3 hours'),
  ('GRID','Corridas rápidas em pistas em grade contra outros jogadores.','https://example.com/grid','data:image/svg+xml;utf8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 640 360%22%3E%3Cdefs%3E%3ClinearGradient id=%22g%22 x1=%220%22 y1=%220%22 x2=%221%22 y2=%221%22%3E%3Cstop offset=%220%22 stop-color=%22%232a1b2e%22/%3E%3Cstop offset=%221%22 stop-color=%22%23a33fb5%22/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width=%22640%22 height=%22360%22 fill=%22url%28%23g%29%22/%3E%3Ctext x=%22320%22 y=%22196%22 text-anchor=%22middle%22 font-family=%22Arial,sans-serif%22 font-weight=%22800%22 font-size=%2256%22 fill=%22%23fff%22 fill-opacity=%22.92%22%3EGRID%3C/text%3E%3C/svg%3E','Corrida',array['Multiplayer'],false,true,now() - interval '2 hours'),
  ('Estudaí','Desafios de lógica para aprender brincando.','https://example.com/estudai','data:image/svg+xml;utf8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 640 360%22%3E%3Cdefs%3E%3ClinearGradient id=%22g%22 x1=%220%22 y1=%220%22 x2=%221%22 y2=%221%22%3E%3Cstop offset=%220%22 stop-color=%22%232e2a14%22/%3E%3Cstop offset=%221%22 stop-color=%22%23c9a227%22/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width=%22640%22 height=%22360%22 fill=%22url%28%23g%29%22/%3E%3Ctext x=%22320%22 y=%22196%22 text-anchor=%22middle%22 font-family=%22Arial,sans-serif%22 font-weight=%22800%22 font-size=%2256%22 fill=%22%23fff%22 fill-opacity=%22.92%22%3EEstuda%C3%AD%3C/text%3E%3C/svg%3E','Puzzle',array['Educativo'],false,true,now() - interval '1 hours');
