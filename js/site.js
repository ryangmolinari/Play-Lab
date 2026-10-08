(() => {
  const $ = s => document.querySelector(s);
  const el = (t, c, txt) => { const e = document.createElement(t); if (c) e.className = c; if (txt != null) e.textContent = txt; return e; };
  const get = async u => { const r = await fetch(u); if (!r.ok) throw new Error(); return r.json(); };

  function applySettings(s) {
    if (/^#[0-9a-f]{6}$/i.test(s.accentColor)) {
      const h = s.accentColor, r = document.documentElement.style;
      r.setProperty('--accent', h); r.setProperty('--accent-rgb', [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)).join(','));
    }
    const name = s.platformName || 'Play Lab', parts = name.split(' '), last = parts.pop();
    document.title = name;
    const mk = () => { const f = document.createDocumentFragment(); if (s.logo) { const i = el('img'); i.src = s.logo; i.alt = name; f.append(i); } else { if (parts.length) f.append(el('span', '', parts.join(' ') + '\u00a0')); f.append(el('b', '', last)); } return f; };
    const logo = $('#logo'); logo.replaceChildren(mk());
    const ht = $('#heroTitle'); ht.replaceChildren(el('span', '', parts.join(' ')), ' ', el('b', '', last)); if (!parts.length) ht.firstChild.remove();
    if (s.favicon) $('#favicon').href = s.favicon;
    $('#aboutText').textContent = s.description || '';
    const soc = $('#socials'); soc.replaceChildren();
    [['githubUrl', 'GitHub', 'GH'], ['discordUrl', 'Discord', 'DC'], ['youtubeUrl', 'YouTube', 'YT']].forEach(([k, label, ab]) => {
      if (!s[k]) return; const a = el('a', '', ab); a.href = s[k]; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.setAttribute('aria-label', label); a.title = label; soc.append(a);
    });
  }

  const cats = g => [g.category, ...g.tags.filter(t => t.toLowerCase() !== g.category.toLowerCase())].slice(0, 3).join(' · ');
  window.PlayLabCard = function (g, { link = true } = {}) {
    const card = el('article', 'card'), cover = el('div', 'cover');
    if (g.coverImage) { const i = el('img'); i.src = g.coverImage; i.alt = 'Capa de ' + g.name; i.loading = 'lazy'; cover.append(i); }
    else cover.append(el('div', 'ph', (g.name || '?').slice(0, 2).toUpperCase()));
    if (g.featured) cover.append(el('span', 'badge b-feat tag-feat', 'Destaque'));
    const b = el('div', 'card-b'); b.append(el('h3', '', g.name), el('p', 'cats', cats(g)));
    const btn = el(link ? 'a' : 'button', 'btn btn-primary btn-block', '▶ Jogar');
    if (link) { btn.href = g.url; btn.target = '_blank'; btn.rel = 'noopener noreferrer'; } else btn.type = 'button';
    b.append(btn); card.append(cover, b); return card;
  };
  if (!$('#grid')) return;

  Promise.all([PL.settings().then(applySettings).catch(() => {}), PL.publicGames().then(games => {
    const grid = $('#grid'); grid.replaceChildren();
    if (!games.length) grid.append(el('div', 'empty', 'Nenhum jogo publicado ainda. Volte em breve!'));
    games.forEach(g => grid.append(window.PlayLabCard(g)));
    const f = games.find(g => g.featured);
    if (f) { $('#featBtn').href = f.url; $('#featBtn').target = '_blank'; $('#featBtn').rel = 'noopener noreferrer'; $('#playNow').href = f.url; $('#playNow').target = '_blank'; $('#playNow').rel = 'noopener noreferrer'; }
  }).catch(() => { const g = $('#grid'); g.replaceChildren(el('div', 'empty', 'Não foi possível carregar os jogos agora. Tente novamente.')); })]);

  const links = [...document.querySelectorAll('[data-sec]')], secs = links.map(l => document.getElementById(l.dataset.sec));
  const onScroll = () => { let cur = 0; secs.forEach((s, i) => { if (s.getBoundingClientRect().top <= 120) cur = i; }); links.forEach((l, i) => l.classList.toggle('active', i === cur)); };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
})();
