/* Camada de dados do Play Lab (Supabase). Converte snake_case do banco para camelCase usado na interface. */
(() => {
  const cfg = window.PL_CONFIG || {};
  const configured = !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && window.supabase);
  const sb = configured ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true } }) : null;
  const BUCKET = 'covers';
  const need = () => { if (!sb) throw new Error('Supabase não configurado. Preencha js/config.js.'); };
  const fail = (error, msg) => { if (error) { console.error(error); throw Object.assign(new Error(msg || 'Não foi possível concluir a ação. Tente novamente.'), { fields: {} }); } };
  const game = r => ({ id: r.id, name: r.name, description: r.description, url: r.url, coverImage: r.cover_image, category: r.category, tags: r.tags || [], featured: !!r.featured, published: !!r.published, createdAt: r.created_at, updatedAt: r.updated_at });
  const sett = r => ({ platformName: r.platform_name, description: r.description, logo: r.logo, favicon: r.favicon, accentColor: r.accent_color, theme: r.theme, githubUrl: r.github_url || '', discordUrl: r.discord_url || '', youtubeUrl: r.youtube_url || '', adminName: r.admin_name || 'Administrador' });
  const by = (a, b) => (b.featured - a.featured) || (new Date(b.createdAt) - new Date(a.createdAt));
  const validUrl = u => { try { return ['http:', 'https:'].includes(new URL(u).protocol) ? new URL(u).href : null; } catch { return null; } };
  const clean = (s, n) => String(s ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, n);
  const IMG_OK = /^image\/(png|jpeg|webp|x-icon|vnd\.microsoft\.icon)$/;

  async function upload(file) {
    if (!IMG_OK.test(file.type)) throw new Error('Formato de imagem inválido. Use PNG, JPG ou WEBP.');
    if (file.size > 5 * 1024 * 1024) throw new Error('A imagem deve ter no máximo 5 MB.');
    const ext = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }[file.type] || 'ico';
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await sb.storage.from(BUCKET).upload(path, file, { contentType: file.type, cacheControl: '31536000' });
    fail(error, 'Falha ao enviar a imagem.');
    return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  }
  async function dropImage(url) {
    const m = url && url.match(/\/covers\/([^/?]+)$/); if (!m) return;
    try { await sb.storage.from(BUCKET).remove([m[1]]); } catch {}
  }

  const PL = {
    configured,
    async settings() { need(); const { data, error } = await sb.from('settings').select('*').eq('id', 1).single(); fail(error); return sett(data); },
    async publicGames() { need(); const { data, error } = await sb.from('games').select('*').eq('published', true); fail(error); return data.map(game).sort(by); },
    async me() {
      need(); const { data } = await sb.auth.getSession(); const u = data?.session?.user; if (!u) return null;
      const { data: ok } = await sb.rpc('is_admin'); if (!ok) { await sb.auth.signOut(); return null; }
      let name = 'Administrador'; try { name = (await PL.settings()).adminName; } catch {}
      return { id: u.id, email: u.email, name };
    },
    async login(email, password) {
      need(); const { error } = await sb.auth.signInWithPassword({ email: clean(email, 200), password: String(password || '') });
      if (error) throw new Error('E-mail ou senha incorretos.');
      if (!(await PL.me())) throw new Error('Esta conta não tem permissão de administrador.');
    },
    async logout() { need(); await sb.auth.signOut(); },
    async adminGames(q = '', status = 'all') {
      need(); const { data, error } = await sb.from('games').select('*'); fail(error);
      let l = data.map(game).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); q = q.trim().toLowerCase();
      if (status === 'published') l = l.filter(g => g.published); else if (status === 'hidden') l = l.filter(g => !g.published); else if (status === 'featured') l = l.filter(g => g.featured);
      if (q) l = l.filter(g => (g.name + ' ' + g.category + ' ' + g.tags.join(' ')).toLowerCase().includes(q));
      return l;
    },
    async adminGame(id) { need(); const { data, error } = await sb.from('games').select('*').eq('id', id).single(); fail(error, 'Jogo não encontrado.'); return game(data); },
    async dashboard() {
      const all = await PL.adminGames();
      return { total: all.length, published: all.filter(g => g.published).length, featured: all.filter(g => g.featured).length, hidden: all.filter(g => !g.published).length,
        recent: [...all].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 3), featuredGame: all.find(g => g.featured) || null };
    },
    async saveGame(id, old, f, file) {
      need(); const fields = {}, name = clean(f.name, 80), description = clean(f.description, 500), category = clean(f.category, 30);
      const tags = [...new Set((f.tags || []).map(t => clean(t, 24)).filter(Boolean))], url = validUrl(clean(f.url, 2000));
      if (!name) fields.name = 'Informe o nome do jogo.'; if (!description) fields.description = 'Informe a descrição.'; if (!category) fields.category = 'Escolha uma categoria.';
      if (tags.length > 10) fields.tags = 'Use no máximo 10 tags.'; if (!url) fields.url = 'Informe uma URL válida (começando com http:// ou https://).';
      if (Object.keys(fields).length) throw Object.assign(new Error('Verifique os campos destacados.'), { fields });
      let cover = old?.coverImage || null; if (file) cover = await upload(file);
      const row = { name, description, url, category, tags, featured: !!f.featured, published: !!f.published, cover_image: cover };
      const q = id ? sb.from('games').update(row).eq('id', id) : sb.from('games').insert(row);
      const { error } = await q; fail(error, 'Não foi possível salvar o jogo.');
      if (file && old?.coverImage) dropImage(old.coverImage);
    },
    async deleteGame(g) { need(); const { error } = await sb.from('games').delete().eq('id', g.id); fail(error, 'Não foi possível excluir o jogo.'); dropImage(g.coverImage); },
    async saveSettings(f, files) {
      need(); const fields = {}, old = await PL.settings();
      const platformName = clean(f.platformName, 40), accent = clean(f.accentColor, 7), adminName = clean(f.adminName, 60);
      if (!platformName) fields.platformName = 'Informe o nome da plataforma.'; if (!/^#[0-9a-fA-F]{6}$/.test(accent)) fields.accentColor = 'Use uma cor HEX válida, como #A3FF60.'; if (!adminName) fields.adminName = 'Informe o nome.';
      const links = {}; for (const k of ['githubUrl', 'discordUrl', 'youtubeUrl']) { const v = clean(f[k], 500); if (v && !validUrl(v)) fields[k] = 'URL inválida.'; links[k] = v ? validUrl(v) : ''; }
      if (Object.keys(fields).length) throw Object.assign(new Error('Verifique os campos destacados.'), { fields });
      const logo = files.logo ? await upload(files.logo) : old.logo, favicon = files.favicon ? await upload(files.favicon) : old.favicon;
      const { error } = await sb.from('settings').update({ platform_name: platformName, description: clean(f.description, 300), logo, favicon, accent_color: accent, theme: 'dark', github_url: links.githubUrl, discord_url: links.discordUrl, youtube_url: links.youtubeUrl, admin_name: adminName }).eq('id', 1);
      fail(error, 'Não foi possível salvar as configurações.');
      if (files.logo) dropImage(old.logo); if (files.favicon) dropImage(old.favicon);
    },
    async changePassword(current, next, confirm) {
      need(); const fields = {}, u = (await sb.auth.getSession()).data?.session?.user;
      if (String(next || '').length < 8) fields.next = 'A nova senha deve ter ao menos 8 caracteres.'; if (next !== confirm) fields.confirm = 'As senhas não coincidem.';
      if (!fields.next && u) { const { error } = await sb.auth.signInWithPassword({ email: u.email, password: String(current || '') }); if (error) fields.current = 'Senha atual incorreta.'; }
      if (Object.keys(fields).length) throw Object.assign(new Error('Verifique os campos.'), { fields });
      const { error } = await sb.auth.updateUser({ password: String(next) }); fail(error, 'Não foi possível alterar a senha.');
    }
  };
  window.PL = PL;
})();
