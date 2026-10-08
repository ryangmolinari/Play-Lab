(() => {
  const app = document.getElementById('app'), toasts = document.getElementById('toasts');
  const CATS = ['Aventura', 'Casual', 'Corrida', 'Educativo', 'Puzzle', 'Pesca', 'Suspense', 'Multiplayer', 'Outros'];
  const P = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
  const ICONS = {
    dash: P('<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>'),
    games: P('<rect x="2" y="7" width="20" height="11" rx="4"/><path d="M7 10v5M4.5 12.5h5M15.5 11h.01M18 14h.01"/>'),
    cog: P('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
    out: P('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>'),
    search: P('<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>'),
    check: P('<path d="M20 6L9 17l-5-5"/>'),
    star: P('<path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>'),
    eye: P('<path d="M17.9 17.9A10.9 10.9 0 0 1 12 20c-7 0-11-8-11-8a18.5 18.5 0 0 1 5.1-5.9M9.9 4.2A9.1 9.1 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.2 3.2M1 1l22 22"/>'),
    menu: P('<path d="M3 6h18M3 12h18M3 18h18"/>'),
  };
  const icon = n => { const s = document.createElement('span'); s.className = 'ico'; s.innerHTML = ICONS[n]; return s; };
  function h(tag, props, ...kids) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else if (['value', 'checked', 'disabled', 'selected'].includes(k)) e[k] = v;
      else e.setAttribute(k, v === true ? '' : v);
    }
    (function add(list) { for (const c of list) { if (c == null || c === false) continue; if (Array.isArray(c)) add(c); else e.append(c instanceof Node ? c : document.createTextNode(String(c))); } })(kids);
    return e;
  }
  const fmt = iso => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).replace('.', '');
  const catsOf = g => [g.category, ...g.tags.filter(t => t.toLowerCase() !== g.category.toLowerCase())].slice(0, 3).join(' · ');
  function toast(msg, type) { const t = h('div', { class: 'toast' + (type === 'error' ? ' error' : '') }, msg); toasts.append(t); setTimeout(() => t.remove(), 3800); }

  let me = null, settings = null;
  function applySettings(s) {
    settings = s;
    if (/^#[0-9a-f]{6}$/i.test(s.accentColor)) {
      const r = document.documentElement.style; r.setProperty('--accent', s.accentColor);
      r.setProperty('--accent-rgb', [1, 3, 5].map(i => parseInt(s.accentColor.slice(i, i + 2), 16)).join(','));
    }
    if (s.favicon) document.getElementById('favicon').href = s.favicon;
  }
  const logoEl = () => h('span', { class: 'logo' }, h('span', {}, 'Play'), h('b', {}, 'Lab'));
  const cover = g => h('div', { class: 'thumb' }, g.coverImage ? h('img', { src: g.coverImage, alt: 'Capa de ' + g.name }) : (g.name || '?').slice(0, 2).toUpperCase());
  const badge = (cls, t) => h('span', { class: 'badge ' + cls }, t);

  // ----- modal -----
  function modal(title, body, build) {
    return new Promise(resolve => {
      const done = v => { ov.remove(); document.removeEventListener('keydown', esc); resolve(v); };
      const esc = e => { if (e.key === 'Escape') done(null); };
      const content = build(done);
      const ov = h('div', { class: 'overlay', role: 'dialog', 'aria-modal': 'true', 'aria-label': title, onclick: e => { if (e.target === ov) done(null); } },
        h('div', { class: 'modal' }, h('h3', {}, title), body ? h('p', {}, body) : null, content));
      document.body.append(ov); document.addEventListener('keydown', esc);
      (ov.querySelector('input,button.btn-ghost') || ov).focus();
    });
  }
  const confirmBox = (title, text, label) => modal(title, text, done => h('div', { class: 'form-actions' },
    h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => done(false) }, 'Cancelar'),
    h('button', { class: 'btn btn-danger solid', type: 'button', onclick: () => done(true) }, label)));

  // ----- campo com erro -----
  function field(label, input, id, extra) {
    input.id = id; const err = h('div', { class: 'errmsg', role: 'alert', hidden: true });
    const w = h('div', { class: 'field' }, h('label', { for: id }, label), input, extra, err);
    w.setErr = m => { err.hidden = !m; err.textContent = m || ''; input.classList.toggle('err', !!m); input.setAttribute('aria-invalid', m ? 'true' : 'false'); };
    return w;
  }
  const showErrors = (map, fields) => { Object.values(map).forEach(f => f.setErr('')); Object.entries(fields || {}).forEach(([k, v]) => map[k]?.setErr(v)); };

  // ----- login -----
  function loginView() {
    const errs = {}, email = h('input', { class: 'input', type: 'email', autocomplete: 'username', placeholder: 'voce@exemplo.com', required: true }), pw = h('input', { class: 'input', type: 'password', autocomplete: 'current-password', placeholder: '••••••••', required: true });
    const f1 = field('E-mail', email, 'lg-email'), f2 = field('Senha', pw, 'lg-pw'), btn = h('button', { class: 'btn btn-primary btn-block', type: 'submit' }, 'Entrar');
    const msg = h('div', { class: 'errmsg', role: 'alert', hidden: true, style: 'margin:-6px 0 14px' });
    const form = h('form', { novalidate: true, onsubmit: async e => {
      e.preventDefault(); msg.hidden = true; btn.disabled = true; btn.textContent = 'Entrando…';
      try { await PL.login(email.value, pw.value); me = await PL.me(); location.hash = '#/dashboard'; route(); }
      catch (er) { msg.textContent = er.message; msg.hidden = false; btn.disabled = false; btn.textContent = 'Entrar'; }
    } }, f1, f2, msg, btn);
    app.replaceChildren(h('div', { class: 'login' }, h('div', { class: 'panel' }, h('div', { class: 'logo' }, h('span', {}, 'Play'), h('b', {}, 'Lab')), h('p', { class: 'sub' }, 'Entre para acessar o painel administrativo.'), form)));
    email.focus();
  }

  // ----- shell -----
  function shell(active) {
    const nav = (key, label, ic, href) => h('button', { class: 'nav-i' + (active === key ? ' on' : ''), type: 'button', 'aria-current': active === key ? 'page' : null, onclick: () => { location.hash = href; closeSide(); } }, icon(ic), label);
    const initials = me.name.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
    const side = h('aside', { class: 'side' }, h('div', { class: 'top' }, logoEl()),
      h('nav', { 'aria-label': 'Administração' }, nav('dashboard', 'Dashboard', 'dash', '#/dashboard'), nav('games', 'Jogos', 'games', '#/games'), nav('settings', 'Configurações', 'cog', '#/settings')),
      h('div', { class: 'user' }, h('div', { class: 'avatar' }, initials), h('div', { class: 'who' }, h('b', {}, me.name), h('span', {}, 'Administrador')),
        h('button', { class: 'icon-btn', type: 'button', title: 'Sair', 'aria-label': 'Sair', onclick: async () => { try { await PL.logout(); } catch {} me = null; location.hash = ''; route(); } }, icon('out'))));
    const back = h('div', { class: 'backdrop', onclick: () => closeSide() });
    function closeSide() { side.classList.remove('open'); back.classList.remove('show'); }
    const mob = h('div', { class: 'mobbar' }, h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Abrir menu', onclick: () => { side.classList.add('open'); back.classList.add('show'); } }, icon('menu')), logoEl());
    const main = h('main', { class: 'main' }, h('div', { class: 'loading' }, 'Carregando…'));
    app.replaceChildren(h('div', { class: 'shell' }, side, back, h('div', { style: 'flex:1;min-width:0' }, mob, main)));
    return main;
  }
  const pageHead = (title, accentWord, sub, action) => h('div', { class: 'page-h' }, h('div', {}, h('h1', {}, title ? (title.endsWith('~') ? title.slice(0, -1) : title + ' ') : '', h('b', {}, accentWord)), h('p', {}, sub)), action);
  const fail = (main, er) => main.replaceChildren(h('div', { class: 'panel' }, h('p', { class: 'errmsg' }, er.message)));

  // ----- dashboard -----
  async function dashboardView() {
    const main = shell('dashboard');
    try {
      const d = await PL.dashboard();
      const stat = (ic, label, n) => h('div', { class: 'panel stat' }, h('div', { class: 'ico-b', html: null }, icon(ic)), h('div', {}, h('span', {}, label), h('b', {}, String(n))));
      const recent = h('div', { class: 'panel' }, h('div', { class: 'ph-head' }, h('h2', {}, 'Jogos recentes'), h('a', { class: 'link-all', href: '#/games' }, 'Ver todos →')),
        d.recent.length ? d.recent.map(g => h('div', { class: 'row' }, cover(g), h('div', { class: 'info' }, h('b', {}, g.name), h('span', {}, catsOf(g))), h('div', { class: 'meta' }, h('span', { class: 'date' }, fmt(g.createdAt)), g.published ? badge('b-pub', 'Publicado') : badge('b-off', 'Não publicado'),
          h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: () => location.hash = '#/games/' + g.id }, 'Editar')))) : h('p', { class: 'sub' }, 'Nenhum jogo cadastrado ainda.'));
      const fg = d.featuredGame;
      const feat = h('div', { class: 'panel feat-card' }, h('h2', {}, 'Jogo em destaque'), h('p', { class: 'sub' }, 'Exibido como destaque no site.'),
        fg ? [h('div', { class: 'cover' }, fg.coverImage ? h('img', { src: fg.coverImage, alt: 'Capa de ' + fg.name }) : h('div', { class: 'ph' }, fg.name.slice(0, 2).toUpperCase())), h('h3', {}, fg.name), h('p', { class: 'cats' }, catsOf(fg)), h('p', { class: 'cats' }, fmt(fg.createdAt)),
          h('button', { class: 'btn btn-ghost btn-block', type: 'button', onclick: () => location.hash = '#/games/' + fg.id }, 'Editar jogo')]
          : h('div', { class: 'empty', style: 'padding:28px' }, 'Nenhum jogo em destaque. Marque um jogo como destaque ao editá-lo.'));
      main.replaceChildren(pageHead('', 'Dashboard', 'Visão geral do Play Lab.'),
        h('div', { class: 'stats' }, stat('games', 'Total de jogos', d.total), stat('check', 'Publicados', d.published), stat('star', 'Em destaque', d.featured), stat('eye', 'Ocultos', d.hidden)),
        h('div', { class: 'panel quick' }, h('div', {}, h('h2', {}, 'Ações rápidas'), h('p', { class: 'sub' }, 'Acesso rápido às principais ações do painel.')),
          h('div', { class: 'btns' }, h('button', { class: 'btn btn-primary', type: 'button', onclick: () => location.hash = '#/games/new' }, '+ Adicionar jogo'), h('a', { class: 'btn btn-ghost', href: '../', target: '_blank', rel: 'noopener' }, 'Ver site'))),
        h('div', { class: 'cols' }, recent, feat));
    } catch (e) { fail(main, e); }
  }

  // ----- lista de jogos -----
  async function gamesView() {
    const main = shell('games'), count = h('span', { class: 'count' }, ''), list = h('div', {}, h('div', { class: 'loading' }, 'Carregando…'));
    const q = h('input', { class: 'input', type: 'search', placeholder: 'Buscar jogos...', 'aria-label': 'Buscar jogos' });
    const st = h('select', { class: 'input', 'aria-label': 'Filtrar por status' }, [['all', 'Todos os status'], ['published', 'Publicado'], ['hidden', 'Oculto'], ['featured', 'Destaque']].map(([v, l]) => h('option', { value: v }, l)));
    async function load() {
      try {
        const games = await PL.adminGames(q.value, st.value);
        count.textContent = `${games.length} ${games.length === 1 ? 'jogo' : 'jogos'}`;
        list.replaceChildren(...(games.length ? games.map(g => h('div', { class: 'row' }, cover(g), h('div', { class: 'info' }, h('b', {}, g.name), h('span', {}, catsOf(g))),
          h('div', { class: 'meta' }, h('span', { class: 'date' }, fmt(g.createdAt)), g.published ? badge('b-pub', 'Publicado') : badge('b-off', 'Oculto'), g.featured ? badge('b-feat', 'Destaque') : null,
            h('div', { class: 'acts' }, h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: () => location.hash = '#/games/' + g.id }, 'Editar'),
              h('button', { class: 'btn btn-danger btn-sm', type: 'button', onclick: async () => { if (await confirmBox('Excluir jogo', `Tem certeza que deseja excluir este jogo? "${g.name}" será removido definitivamente.`, 'Excluir')) { try { await PL.deleteGame(g); toast('Jogo excluído.'); load(); } catch (e) { toast(e.message, 'error'); } } } }, 'Excluir'))))) : [h('div', { class: 'empty' }, 'Nenhum jogo encontrado.')]));
      } catch (e) { list.replaceChildren(h('p', { class: 'errmsg' }, e.message)); }
    }
    let t; q.addEventListener('input', () => { clearTimeout(t); t = setTimeout(load, 250); }); st.addEventListener('change', load);
    main.replaceChildren(pageHead('Painel', 'ADM', 'Gerencie os jogos do Play Lab.', h('button', { class: 'btn btn-primary', type: 'button', onclick: () => location.hash = '#/games/new' }, '+ Adicionar jogo')),
      h('div', { class: 'panel' }, h('div', { class: 'toolbar' }, h('h2', { style: 'margin:0' }, 'Jogos cadastrados'), count, h('div', { class: 'search' }, icon('search'), q), st), list));
    load();
  }

  // ----- formulário de jogo -----
  async function gameFormView(id) {
    const main = shell('games'); let g = null;
    if (id) { try { g = await PL.adminGame(id); } catch (e) { return fail(main, e); } }
    const s = { tags: [...(g?.tags || [])], file: null, preview: g?.coverImage || null }, errs = {};
    const name = h('input', { class: 'input', placeholder: 'Ex.: Fish Isle', maxlength: 80, value: g?.name || '' });
    const desc = h('textarea', { class: 'input', placeholder: 'Descreva o jogo em poucas linhas…', maxlength: 500, value: g?.description || '' });
    const counter = h('span', {}, '0/500');
    const cat = h('select', { class: 'input' }, h('option', { value: '' }, 'Selecione uma categoria'), (g && !CATS.includes(g.category) ? [g.category, ...CATS] : CATS).map(c => h('option', { value: c, selected: g?.category === c }, c)));
    const url = h('input', { class: 'input', type: 'url', placeholder: 'https://meujogo.com', value: g?.url || '' });
    const fileIn = h('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp', hidden: true, id: 'cover-file' });
    const dropImg = h('span', {}), dropLbl = h('label', { class: 'drop', for: 'cover-file', style: 'margin:0', tabindex: '0' });
    const tagIn = h('input', { class: 'input', placeholder: 'Digite uma tag e pressione Enter' }), chips = h('div', { class: 'chips' });
    const feat = h('input', { type: 'checkbox', checked: !!g?.featured, id: 'sw-feat' }), pub = h('input', { type: 'checkbox', checked: g ? g.published : true, id: 'sw-pub' });
    const pvBox = h('div', {});
    function renderPreview() {
      const d = { name: name.value.trim() || 'Nome do jogo', category: cat.value || 'Categoria', tags: s.tags, coverImage: s.preview, featured: feat.checked };
      const card = h('article', { class: 'card' }, h('div', { class: 'cover' }, d.coverImage ? h('img', { src: d.coverImage, alt: 'Prévia da capa' }) : h('div', { class: 'ph' }, 'CAPA'), d.featured ? h('span', { class: 'badge b-feat tag-feat' }, 'Destaque') : null),
        h('div', { class: 'card-b' }, h('h3', {}, d.name), h('p', { class: 'cats' }, catsOf(d)), h('button', { class: 'btn btn-primary btn-block', type: 'button', tabindex: '-1' }, '▶ Jogar')));
      pvBox.replaceChildren(card);
      counter.textContent = `${desc.value.length}/500`;
      dropLbl.replaceChildren(s.preview ? h('img', { src: s.preview, alt: '' }) : h('span', { class: 'ico', style: 'width:28px;height:28px;color:var(--muted)', html: null }), h('div', { class: 't' }, h('b', {}, s.file ? s.file.name : (s.preview ? 'Trocar imagem' : 'Escolher imagem')), 'PNG, JPG ou WEBP · até 5 MB'));
    }
    function renderChips() { chips.replaceChildren(...s.tags.map((t, i) => h('span', { class: 'chip' }, t, h('button', { type: 'button', 'aria-label': 'Remover tag ' + t, onclick: () => { s.tags.splice(i, 1); renderChips(); renderPreview(); } }, '×')))); }
    function addTag() { const v = tagIn.value.trim().replace(/,$/, '').slice(0, 24); if (!v) return; if (s.tags.length >= 10) return toast('Use no máximo 10 tags.', 'error'); if (!s.tags.some(t => t.toLowerCase() === v.toLowerCase())) s.tags.push(v); tagIn.value = ''; renderChips(); renderPreview(); }
    tagIn.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(); } });
    dropLbl.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileIn.click(); } });
    fileIn.addEventListener('change', () => {
      const f = fileIn.files[0]; if (!f) return;
      if (!/^image\/(png|jpeg|webp)$/.test(f.type)) { fileIn.value = ''; return toast('Use uma imagem PNG, JPG ou WEBP.', 'error'); }
      if (f.size > 5 * 1024 * 1024) { fileIn.value = ''; return toast('A imagem deve ter no máximo 5 MB.', 'error'); }
      s.file = f; s.preview = URL.createObjectURL(f); renderPreview();
    });
    [name, desc, cat, url].forEach(i => i.addEventListener('input', renderPreview)); feat.addEventListener('change', renderPreview);
    const F = errs.name = field('Nome do jogo *', name, 'g-name'); errs.description = field('Descrição *', desc, 'g-desc', h('div', { class: 'hint' }, h('span', {}, 'Máximo de 500 caracteres.'), counter));
    errs.category = field('Categoria *', cat, 'g-cat'); errs.url = field('Link do jogo (URL) *', url, 'g-url');
    const coverF = h('div', { class: 'field' }, h('label', { for: 'cover-file' }, 'Imagem de capa'), fileIn, dropLbl);
    const tagsF = errs.tags = field('Tags', tagIn, 'g-tags', h('div', { class: 'hint' }, h('span', {}, 'Até 10 tags. Pressione Enter para adicionar.'))); tagsF.append(chips);
    const sw = (inp, t, d) => h('div', { class: 'switch-row' }, h('div', {}, h('b', {}, t), h('span', {}, d)), h('label', { class: 'switch', style: 'margin:0' }, inp, h('i', {}), h('span', { class: 'sr', style: 'position:absolute;left:-9999px' }, t)));
    const submit = h('button', { class: 'btn btn-primary', type: 'submit' }, id ? 'Salvar alterações' : 'Publicar jogo');
    const form = h('form', { novalidate: true, onsubmit: async e => {
      e.preventDefault(); showErrors(errs, {}); submit.disabled = true; const label = submit.textContent; submit.textContent = 'Salvando…';
      try { await PL.saveGame(id, g, { name: name.value, description: desc.value, category: cat.value, url: url.value, tags: s.tags, featured: feat.checked, published: pub.checked }, s.file); toast(id ? 'Alterações salvas.' : 'Jogo publicado com sucesso.'); location.hash = '#/games'; }
      catch (er) { showErrors(errs, er.fields); toast(er.message, 'error'); submit.disabled = false; submit.textContent = label; const first = Object.keys(er.fields || {})[0]; if (first) errs[first]?.querySelector('input,select,textarea')?.focus(); }
    } }, F, errs.description, errs.category, errs.url, coverF, tagsF, sw(feat, 'Jogo em destaque', 'Exibe este jogo como destaque (apenas um por vez).'), sw(pub, 'Publicado', 'Visível para os visitantes do site.'),
      h('div', { class: 'form-actions' }, h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => location.hash = '#/games' }, 'Cancelar'), submit));
    main.replaceChildren(pageHead(id ? 'Editar' : 'Adicionar', 'jogo', id ? 'Atualize as informações do jogo.' : 'Cadastre um novo jogo no catálogo.'),
      h('div', { class: 'form-cols' }, h('div', { class: 'panel' }, form), h('div', { class: 'panel preview' }, h('h2', {}, 'Pré-visualização'), h('p', { class: 'sub' }, 'Veja como o jogo será exibido no catálogo.'), pvBox)));
    renderChips(); renderPreview();
  }

  // ----- configurações -----
  async function settingsView() {
    const main = shell('settings'); let s;
    try { s = await PL.settings(); } catch (e) { return fail(main, e); }
    const errs = {}, inp = (v, ph, extra) => h('input', { class: 'input', value: v || '', placeholder: ph || '', ...extra });
    const pName = field('Nome da plataforma', inp(s.platformName, '', { maxlength: 40 }), 's-name'), pDesc = field('Descrição', h('textarea', { class: 'input', maxlength: 300, value: s.description || '' }), 's-desc');
    errs.platformName = pName;
    const mkFile = (id, current, label, accept) => {
      const fi = h('input', { type: 'file', accept, id, hidden: true }), box = h('div', { class: 'box' }), btn = h('label', { class: 'btn btn-ghost btn-sm', for: id, tabindex: '0' }, 'Trocar');
      const show = u => box.replaceChildren(u ? h('img', { src: u, alt: label }) : (label === 'Logo' ? 'PL' : '★'));
      show(current); fi.addEventListener('change', () => { const f = fi.files[0]; if (!f) return; if (f.size > 5 * 1024 * 1024) { fi.value = ''; return toast('A imagem deve ter no máximo 5 MB.', 'error'); } show(URL.createObjectURL(f)); });
      btn.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fi.click(); } });
      return { fi, node: h('div', { class: 'field' }, h('label', {}, label === 'Logo' ? 'Logo da plataforma' : 'Favicon'), h('div', { class: 'lg' }, box, btn, fi)) };
    };
    const logo = mkFile('s-logo', s.logo, 'Logo', 'image/png,image/jpeg,image/webp'), fav = mkFile('s-fav', s.favicon, 'Favicon', 'image/png,image/jpeg,image/webp,image/x-icon,image/vnd.microsoft.icon');
    const color = h('input', { type: 'color', value: s.accentColor, 'aria-label': 'Selecionar cor' }), hex = inp(s.accentColor, '#A3FF60', { maxlength: 7, 'aria-label': 'Cor em HEX' });
    color.addEventListener('input', () => { hex.value = color.value.toUpperCase(); live(); }); hex.addEventListener('input', () => { if (/^#[0-9a-f]{6}$/i.test(hex.value)) { color.value = hex.value; live(); } });
    const live = () => applySettings({ ...settings, accentColor: hex.value });
    const colorF = h('div', { class: 'field' }, h('label', { for: 'hexc' }, 'Cor de destaque'), h('div', { class: 'color-row' }, color, hex), h('div', { class: 'errmsg', hidden: true, role: 'alert' })); hex.id = 'hexc';
    errs.accentColor = { setErr: m => { const e = colorF.querySelector('.errmsg'); e.hidden = !m; e.textContent = m || ''; } };
    const theme = h('select', { class: 'input', disabled: true }, h('option', {}, 'Escuro'));
    const aName = field('Nome', inp(me.name, '', { maxlength: 60 }), 's-aname'), aMail = field('E-mail', inp(me.email, '', { type: 'email', disabled: true }), 's-amail');
    errs.adminName = aName; 
    const soc = (k, label, ph) => (errs[k] = field(label, inp(s[k], ph, { type: 'url' }), 's-' + k));
    const gh = soc('githubUrl', 'GitHub', 'https://github.com/usuario'), dc = soc('discordUrl', 'Discord', 'https://discord.gg/convite'), yt = soc('youtubeUrl', 'YouTube', 'https://youtube.com/@canal');
    const val = f => f.querySelector('input,textarea').value;
    const pwBtn = h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => modal('Alterar senha', 'Informe sua senha atual e escolha uma nova (mín. 8 caracteres).', done => {
      const pe = {}, cur = h('input', { class: 'input', type: 'password', autocomplete: 'current-password' }), nx = h('input', { class: 'input', type: 'password', autocomplete: 'new-password' }), cf = h('input', { class: 'input', type: 'password', autocomplete: 'new-password' });
      pe.current = field('Senha atual', cur, 'p-cur'); pe.next = field('Nova senha', nx, 'p-new'); pe.confirm = field('Confirmar nova senha', cf, 'p-cf');
      const ok = h('button', { class: 'btn btn-primary', type: 'submit' }, 'Alterar senha');
      return h('form', { novalidate: true, onsubmit: async e => { e.preventDefault(); showErrors(pe, {}); ok.disabled = true;
        try { await PL.changePassword(cur.value, nx.value, cf.value); toast('Senha alterada.'); done(true); }
        catch (er) { showErrors(pe, er.fields); if (!Object.keys(er.fields || {}).length) toast(er.message, 'error'); ok.disabled = false; } } },
        pe.current, pe.next, pe.confirm, h('div', { class: 'form-actions' }, h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => done(false) }, 'Cancelar'), ok));
    }) }, 'Alterar senha');
    const save = h('button', { class: 'btn btn-primary', type: 'submit' }, 'Salvar alterações');
    const form = h('form', { novalidate: true, onsubmit: async e => {
      e.preventDefault(); showErrors(errs, {}); save.disabled = true; save.textContent = 'Salvando…';
      try { await PL.saveSettings({ platformName: val(pName), description: val(pDesc), accentColor: hex.value.trim(), adminName: val(aName), githubUrl: val(gh), discordUrl: val(dc), youtubeUrl: val(yt) }, { logo: logo.fi.files[0], favicon: fav.fi.files[0] }); toast('Alterações salvas.'); applySettings(await PL.settings()); me = await PL.me(); settingsView(); }
      catch (er) { showErrors(errs, er.fields); toast(er.message, 'error'); save.disabled = false; save.textContent = 'Salvar alterações'; }
    } },
      h('div', { class: 'panel', style: 'margin-bottom:16px' }, h('h2', {}, 'Informações da plataforma'), h('p', { class: 'sub' }, 'Dados exibidos no site público.'), pName, pDesc, h('div', { class: 'two' }, logo.node, fav.node)),
      h('div', { class: 'panel', style: 'margin-bottom:16px' }, h('h2', {}, 'Aparência'), h('p', { class: 'sub' }, 'Personalize as cores do Play Lab.'), h('div', { class: 'two' }, colorF, h('div', { class: 'field' }, h('label', {}, 'Tema'), theme))),
      h('div', { class: 'panel', style: 'margin-bottom:16px' }, h('h2', {}, 'Conta do administrador'), h('p', { class: 'sub' }, 'Dados de acesso ao painel.'), h('div', { class: 'two' }, aName, aMail), pwBtn),
      h('div', { class: 'panel' }, h('h2', {}, 'Links sociais'), h('p', { class: 'sub' }, 'Campos vazios não aparecem no site.'), gh, dc, yt),
      h('div', { class: 'form-actions' }, h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => { applySettings(s); settingsView(); } }, 'Cancelar'), save));
    main.replaceChildren(pageHead('Configura~', 'ções', 'Ajuste as informações e a aparência do Play Lab.'), form);
  }

  // ----- rotas -----
  async function route() {
    if (!me) return loginView();
    const [view, arg] = location.hash.replace(/^#\/?/, '').split('/');
    if (view === 'games' && arg === 'new') return gameFormView(null);
    if (view === 'games' && /^[0-9a-f-]{36}$/i.test(arg || '')) return gameFormView(arg);
    if (view === 'games') return gamesView();
    if (view === 'settings') return settingsView();
    return dashboardView();
  }
  addEventListener('hashchange', route);
  (async () => {
    if (!PL.configured) { app.replaceChildren(h('div', { class: 'login' }, h('div', { class: 'panel' }, h('h2', {}, 'Configuração pendente'), h('p', { class: 'sub' }, 'Preencha js/config.js com a URL e a anon key do seu projeto Supabase.')))); return; }
    try { applySettings(await PL.settings()); } catch {}
    try { me = await PL.me(); } catch {}
    route();
  })();
})();
