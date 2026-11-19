/* 前台（民眾端） */
(function () {
  'use strict';
  const { S, TODAY, DISTRICTS, CATS, PROJECTS, WK } = Core;
  const { esc, $, $$, toast, openModal, closeModal, confirmBox, bar, badge, stBadge, opts, tbd, mark } = UI;
  const app = $('#app');
  const me = () => S.me ? Core.memberOf(S.me) : null;
  const qs = o => Object.entries(o).filter(([, v]) => v !== '' && v != null && v !== false).map(([k, v]) => k + '=' + encodeURIComponent(v)).join('&');
  const sched = c => '週' + c.wd.map(w => WK[w]).join('、') + ' ' + c.t0 + '–' + c.t1;
  const venueShort = c => c.venue;
  const pub = v => !['草稿', '已下架'].includes(v.st);
  let F = { kw: '', proj: '', dist: '', cat: '', kind: '', st: 'open', pref: false };
  let EF = null; let LG = { step: 1, id: '' }; let RG = { step: 1, data: null };

  /* ---------- 版面 ---------- */
  function layout(inner, active) {
    const m = me();
    return `<div class="topbar"><div class="wrap in"><span>新北市政府體育局　全民運動課程報名平台（Prototype 示範）</span><span><a href="#/" onclick="return false">我的新北市 APP</a>　|　<a href="#/" onclick="return false">新北運動聚點 FB</a>　|　示範日期 ${Core.fmtD(TODAY, true)}</span></div></div>
    <header class="site-h"><div class="wrap in"><a class="brand" href="#/">${mark}<span><b>全民運動課程報名</b><small>新北市政府體育局</small></span></a>
      <button class="btn menu-btn" data-act="menu" aria-label="選單">☰ 選單</button>
      <nav class="nav" id="nav"><a href="#/" class="${active === '' ? 'on' : ''}">首頁</a><a href="#/courses" class="${active === 'courses' || active === 'course' || active === 'enroll' ? 'on' : ''}">找課程</a><a href="#/news" class="${active === 'news' ? 'on' : ''}">最新消息</a>
      ${m ? `<a href="#/me" class="${active === 'me' ? 'on' : ''}">會員中心</a><a href="#/me/notices">通知</a><span class="nav-user" title="${esc(m.name)}">👤 ${esc(m.name)}</span><button type="button" class="btn sm" data-act="logout">登出</button>` : `<a href="#/login" class="${active === 'login' ? 'on' : ''}">登入</a><a class="btn primary sm" href="#/register">免費註冊</a>`}</nav></div></header>
    <main class="wrap" style="padding-top:24px">${inner}</main>
    <footer class="footer"><div class="wrap row between"><div>新北市政府體育局 全民運動科｜課程由各運動課程廠商規劃執行<br>本頁為 Prototype，所有課程、學員與數據皆為示範資料。</div><div class="row"><a href="admin.html">前往後台（廠商／體育局）</a><a href="index.html">原型說明</a><a href="#/" data-act="reset">重置示範資料</a></div></div></footer>`;
  }

  /* ---------- 路由 ---------- */
  function route() {
    const [p, qstr] = location.hash.slice(1).split('?'); const parts = (p || '/').split('/').filter(Boolean); const query = Object.fromEntries(new URLSearchParams(qstr || ''));
    const [a, b, c] = parts; let html = '';
    try {
      if (!a) html = home();
      else if (a === 'courses') html = courses(query);
      else if (a === 'course') html = courseDetail(b);
      else if (a === 'enroll') html = enrollPage(b);
      else if (a === 'news') html = newsPage(b);
      else if (a === 'forgot') html = forgotPage();
      else if (a === 'login') html = loginPage(query);
      else if (a === 'register') html = registerPage();
      else if (a === 'me') html = mePage(b || 'overview', c);
      else html = '<div class="empty">找不到頁面</div>';
    } catch (err) { console.error(err); html = '<div class="alert bad">頁面發生錯誤：' + esc(err.message) + '</div>'; }
    stopBanner(); app.innerHTML = layout(html, a || ''); window.scrollTo(0, 0); document.title = '全民運動課程報名｜前台（Prototype）';
    if (a === 'courses') bindCourses(); if (!a) startBanner();
  }
  window.addEventListener('hashchange', route);

  /* ---------- 共用片段 ---------- */
  function ccard(v) {
    const c = v.c;
    return `<a class="card cc" href="#/course/${c.id}"><div class="row between"><div class="tags">${badge(v.proj.short, 'brand')}${badge(c.cat)}${badge(c.kind)}</div>${stBadge(v.st)}</div>
      <h3>${esc(c.name)}</h3><div class="meta"><span>📍 ${esc(venueShort(c))}（${esc(c.io)}）</span><span>🕒 ${sched(c)}</span><span>📅 ${Core.fmtD(v.first)} 起・共 ${c.ns} 堂</span><span>📝 報名 ${Core.fmtD(c.ro)} – ${Core.fmtD(c.rc)}</span></div>
      <div><div class="row between small"><span class="muted">名額</span><b>${v.occ}/${c.cap}${v.wait ? '　候補 ' + v.wait : ''}</b></div>${bar(v.occ, c.cap, v.left === 0 ? 'bad' : v.left <= 3 ? 'warn' : 'ok')}</div></a>`;
  }

  /* ---------- 首頁 ---------- */
  let bannerTimer = null, bIdx = 0;
  function bannerHtml() {
    const L = Core.activeBanners(); if (!L.length) return '';
    return `<section class="banner" id="banner" aria-roledescription="carousel" aria-label="最新活動與消息"><div class="b-track" id="b-track">${L.map((b, i) => {
      const tag = b.link ? 'a' : 'div'; const href = b.link ? ` href="${esc(b.link)}"${/^https?:/.test(b.link) ? ' target="_blank" rel="noopener"' : ''}` : '';
      return `<${tag}${href} class="b-slide ${b.img ? (b.overlay ? 'ov' : '') : 'b-g' + (b.bg || 1)}" role="group" aria-roledescription="slide" aria-label="${i + 1} / ${L.length}" ${i ? 'aria-hidden="true" tabindex="-1"' : ''}>${b.img ? `<img src="${esc(b.img)}" alt="${esc(b.title)}">` : ''}${!b.img || b.overlay ? `<div class="tx"><h2>${esc(b.title)}</h2><p>${esc(b.sub)}</p>${b.link ? '<span class="more">了解更多 →</span>' : ''}</div>` : ''}</${tag}>`;
    }).join('')}</div>${L.length > 1 ? `<button class="b-btn b-prev" data-act="b-prev" aria-label="上一張">‹</button><button class="b-btn b-next" data-act="b-next" aria-label="下一張">›</button><div class="b-dots">${L.map((_, i) => `<button data-act="b-go" data-i="${i}" class="${i ? '' : 'on'}" aria-label="第 ${i + 1} 張"></button>`).join('')}</div>` : ''}</section>`;
  }
  function bGo(i) {
    const tr = $('#b-track'); if (!tr) return; const n = tr.children.length; bIdx = (i + n) % n; tr.style.transform = 'translateX(-' + bIdx * 100 + '%)';
    $$('.b-slide', tr).forEach((s, k) => { s.setAttribute('aria-hidden', k === bIdx ? 'false' : 'true'); s.tabIndex = k === bIdx ? 0 : -1; }); $$('.b-dots button').forEach((d, k) => d.classList.toggle('on', k === bIdx));
  }
  function stopBanner() { clearInterval(bannerTimer); bannerTimer = null; }
  function startBanner() {
    stopBanner(); bIdx = 0; const bn = $('#banner'); if (!bn || bn.querySelectorAll('.b-slide').length < 2) return;
    let x0 = null; bn.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true }); bn.addEventListener('touchend', e => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) bGo(bIdx + (dx < 0 ? 1 : -1)); x0 = null; });
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const run = () => { stopBanner(); bannerTimer = setInterval(() => bGo(bIdx + 1), 5000); }; run(); bn.addEventListener('mouseenter', stopBanner); bn.addEventListener('focusin', stopBanner); bn.addEventListener('mouseleave', run); bn.addEventListener('focusout', run);
  }
  const ntag = t => `<span class="ntag" style="background:${Core.NEWS_TAGS[t] || '#667085'}">${esc(t)}</span>`;
  const nrow = n => `<a class="nrow" href="#/news/${n.id}"><span class="d">${n.at.replace(/-/g, '/')}</span>${ntag(n.tag)}<span class="tt">${esc(n.title)}${(n.imgs && n.imgs.length) || (n.files && n.files.length) ? ' <small>📎</small>' : ''}</span></a>`;

  function home() {
    const V = Core.views().filter(pub); const open = V.filter(v => ['報名中', '額滿候補'].includes(v.st)).sort((a, b) => a.first.localeCompare(b.first));
    const soon = V.filter(v => v.st === '尚未開放'); const cnt = {}; V.filter(v => ['報名中', '額滿候補', '尚未開放', '進行中'].includes(v.st)).forEach(v => { cnt[v.c.dist] = (cnt[v.c.dist] || 0) + 1; });
    const news = Core.sortNews(S.news).slice(0, 5);
    return `${bannerHtml()}<section class="hero"><h1>動起來，從家附近開始</h1><p>全民皆可報名，不限新北市民。查看各行政區開出的運動課程，註冊會員後即可線上報名、掃 QR 簽到，並查看自己的體適能進步。</p>
      <form class="searchbar" data-form="hsearch"><input type="search" name="kw" placeholder="搜尋課程、場地或老師" aria-label="關鍵字"><select name="dist" aria-label="行政區">${opts(DISTRICTS.map(d => ({ v: d, t: d + '區' })), '', '全部行政區')}</select><select name="cat" aria-label="運動類型">${opts(CATS, '', '全部類型')}</select><button class="btn primary">找課程</button></form></section>
    <section class="sec"><h2>📢 最新消息</h2><div class="card" style="padding:6px 14px">${news.map(nrow).join('') || '<div class="empty">目前沒有消息</div>'}</div><div class="center mt"><a class="btn" href="#/news">查看更多</a></div></section>
    <section class="sec"><div class="row between"><h2>🔥 開放報名中</h2><a href="#/courses">看全部課程 →</a></div><div class="grid g3">${open.slice(0, 6).map(ccard).join('')}</div></section>
    <section class="sec"><h2>依行政區找課程</h2><div class="dist-grid">${DISTRICTS.map(d => `<a class="dist ${cnt[d] ? 'has' : ''}" href="#/courses?${qs({ dist: d, st: 'all' })}">${d}區<small>${cnt[d] ? cnt[d] + ' 個班' : '尚無課程'}</small></a>`).join('')}</div></section>
    <section class="sec"><div class="grid g2" style="align-items:start"><div class="card"><h3>報名小提醒</h3><ul class="small" style="padding-left:18px;margin:0;display:grid;gap:6px"><li>課程<b>免費</b>，全民皆可報名，不限戶籍。</li><li>註冊需<b>身分證字號</b>並完成 Email／簡訊驗證。</li><li>24 堂長期帶狀課程<b>每人每年最多報 2 班</b>；短期課程不限。</li><li>上課以手機<b>掃 QR Code</b> 簽到、簽退。</li><li>課程臨時異動，會以 Email／簡訊即時通知。</li></ul></div>
      ${soon.length ? `<div class="card"><h3>即將開放報名</h3>${soon.map(v => `<a href="#/course/${v.c.id}" class="row between small" style="padding:6px 0"><span>${esc(v.c.name)}</span><span class="muted">${Core.fmtD(v.c.ro)}</span></a>`).join('')}</div>` : ''}</div></section>`;
  }

  /* ---------- 最新消息 ---------- */
  let NP = { tag: '', page: 1 };
  function newsPage(id) {
    if (id) return newsDetail(id);
    const all = Core.sortNews(S.news).filter(n => !NP.tag || n.tag === NP.tag); const per = 10, pages = Math.max(1, Math.ceil(all.length / per)); NP.page = Math.min(NP.page, pages);
    return `<h1>最新消息</h1><p class="muted">公告重要事項、情報與活動。</p><div class="row mb">${['', ...Object.keys(Core.NEWS_TAGS)].map(t => `<a class="chip ${NP.tag === t ? 'on' : ''}" data-act="n-tag" data-v="${t}">${t || '全部'}</a>`).join('')}</div>
      <div class="card" style="padding:6px 14px">${all.slice((NP.page - 1) * per, NP.page * per).map(nrow).join('') || '<div class="empty">沒有符合的消息</div>'}</div>${pages > 1 ? `<div class="pager">${Array.from({ length: pages }, (_, i) => `<button class="${i + 1 === NP.page ? 'on' : ''}" data-act="n-page" data-p="${i + 1}" aria-label="第 ${i + 1} 頁">${i + 1}</button>`).join('')}</div>` : ''}`;
  }
  function newsDetail(id) {
    const L = Core.sortNews(S.news); const i = L.findIndex(n => n.id === id);
    if (i < 0) return '<div class="empty card">找不到這則消息<br><a class="btn mt" href="#/news">返回最新消息</a></div>'; const n = L[i];
    return `<p class="small"><a href="#/news">← 返回最新消息</a></p><article class="card" style="max-width:880px;margin:0 auto"><div class="row">${ntag(n.tag)}<span class="muted small">${n.at.replace(/-/g, '/')}</span></div><h1 style="margin-top:10px">${esc(n.title)}</h1><div class="nbody">${esc(n.body)}</div>
      ${n.imgs && n.imgs.length ? `<div class="ngal">${n.imgs.map((s, k) => `<img src="${esc(s)}" alt="${esc(n.title)} 附圖 ${k + 1}" data-act="n-img">`).join('')}</div>` : ''}
      ${n.files && n.files.length ? `<h3 class="mt">附加檔案</h3>${n.files.map((f, k) => `<div class="nfile"><span>📎</span><b style="flex:1;word-break:break-all">${esc(f.name)}</b><span class="muted small">${esc(f.size || '')}</span><button class="btn sm" data-act="n-file" data-n="${n.id}" data-k="${k}">下載</button></div>`).join('')}` : ''}
      <div class="divider"></div><div class="row between small">${L[i + 1] ? `<a href="#/news/${L[i + 1].id}">← ${esc(L[i + 1].title)}</a>` : '<span></span>'}${L[i - 1] ? `<a href="#/news/${L[i - 1].id}">${esc(L[i - 1].title)} →</a>` : ''}</div></article>`;
  }

  /* ---------- 課程列表 ---------- */
  const viewMode = () => { try { return localStorage.getItem('ntpc-proto-view') || 'card'; } catch (e) { return 'card'; } };
  const setView = v => { try { localStorage.setItem('ntpc-proto-view', v); } catch (e) { /* ignore */ } };
  function lrow(v) {
    const c = v.c;
    return `<a class="lrow" href="#/course/${c.id}"><div class="nm"><b>${esc(c.name)}</b><div class="tags" style="margin-top:4px">${badge(v.proj.short, 'brand')}${badge(c.cat)}${badge(c.kind)}</div></div><div class="sm">${esc(c.dist)}區<small>${esc(c.venue)}（${esc(c.io)}）</small></div><div class="sm">${sched(c)}<small>共 ${c.ns} 堂</small></div><div class="sm">${Core.fmtD(v.first)} 起<small>報名至 ${Core.fmtD(c.rc)}</small></div><div class="sm"><b>${v.occ}/${c.cap}</b>${v.wait ? '　候補 ' + v.wait : ''}${bar(v.occ, c.cap, v.left === 0 ? 'bad' : v.left <= 3 ? 'warn' : 'ok')}</div><div>${stBadge(v.st)}</div><div><span class="btn sm">查看</span></div></a>`;
  }
  function courses(query) {
    F = Object.assign({ kw: '', proj: '', dist: '', cat: '', kind: '', st: 'open', pref: false }, query, { pref: query.pref === '1' });
    const vm = viewMode();
    return `<h1>找課程</h1><div class="card" style="margin-bottom:18px"><form class="filters" id="ff" onsubmit="return false">
      <div class="field" style="margin:0"><label for="f-kw">關鍵字</label><input id="f-kw" type="search" name="kw" value="${esc(F.kw)}" placeholder="課程、場地、老師"></div>
      <div class="field" style="margin:0"><label for="f-dist">行政區</label><select id="f-dist" name="dist">${opts(DISTRICTS.map(d => ({ v: d, t: d + '區' })), F.dist, '全部')}</select></div>
      <div class="field" style="margin:0"><label for="f-cat">運動類型</label><select id="f-cat" name="cat">${opts(CATS, F.cat, '全部')}</select></div>
      <div class="field" style="margin:0"><label for="f-proj">計畫</label><select id="f-proj" name="proj">${opts(PROJECTS.map(p => ({ v: p.id, t: p.short })), F.proj, '全部')}</select></div>
      <div class="field" style="margin:0"><label for="f-st">狀態</label><select id="f-st" name="st">${opts([{ v: 'open', t: '可報名（含候補）' }, { v: 'all', t: '全部' }, { v: '尚未開放', t: '尚未開放' }, { v: '進行中', t: '進行中' }, { v: '已結束', t: '已結束' }], F.st)}</select></div>
      </form><div class="row mt" style="margin-top:12px"><label class="check"><input type="checkbox" id="f-kind" ${F.kind === '長期帶狀' ? 'checked' : ''}>只看長期帶狀課（24 堂）</label>
      ${me() ? `<label class="check"><input type="checkbox" id="f-pref" ${F.pref ? 'checked' : ''}>只看我偏好的類型</label>` : ''}<span class="muted small" id="f-count" style="margin-left:auto"></span>
      <div class="vtoggle" role="group" aria-label="切換顯示方式"><button type="button" data-act="vm" data-v="card" class="${vm === 'card' ? 'on' : ''}" aria-pressed="${vm === 'card'}">▦ 卡片</button><button type="button" data-act="vm" data-v="list" class="${vm === 'list' ? 'on' : ''}" aria-pressed="${vm === 'list'}">☰ 條列</button></div></div></div><div id="results"></div>`;
  }
  function filtered() {
    const m = me(); const kw = F.kw.trim().toLowerCase();
    return Core.views().filter(pub).filter(v => {
      const c = v.c;
      if (kw && !(c.name + c.venue + c.instr + c.cat + c.dist).toLowerCase().includes(kw)) return false;
      if (F.dist && c.dist !== F.dist) return false; if (F.cat && c.cat !== F.cat) return false; if (F.proj && c.proj !== F.proj) return false;
      if (F.kind && c.kind !== F.kind) return false; if (F.pref && m && m.prefs.length && !m.prefs.includes(c.cat)) return false;
      if (F.st === 'open') return ['報名中', '額滿候補'].includes(v.st); if (F.st !== 'all') return v.st === F.st; return true;
    }).sort((a, b) => a.first.localeCompare(b.first));
  }
  function renderResults() {
    const list = filtered(); const box = $('#results'); const lm = viewMode() === 'list';
    box.className = lm ? '' : 'grid g3';
    box.innerHTML = !list.length ? '<div class="empty card" style="grid-column:1/-1">沒有符合條件的課程，試試放寬條件。</div>' : lm ? `<div class="lrows"><div class="lh"><span>課程</span><span>行政區／地點</span><span>上課時間</span><span>開課／報名截止</span><span>名額</span><span>狀態</span><span></span></div>${list.map(lrow).join('')}</div>` : list.map(ccard).join('');
    $('#f-count').textContent = '共 ' + list.length + ' 個班級';
  }
  function bindCourses() {
    renderResults();
    const sync = () => { F.kw = $('#f-kw').value; F.dist = $('#f-dist').value; F.cat = $('#f-cat').value; F.proj = $('#f-proj').value; F.st = $('#f-st').value; F.kind = $('#f-kind').checked ? '長期帶狀' : ''; F.pref = $('#f-pref') ? $('#f-pref').checked : false; renderResults(); history.replaceState(null, '', '#/courses?' + qs({ kw: F.kw, dist: F.dist, cat: F.cat, proj: F.proj, st: F.st === 'open' ? '' : F.st, kind: F.kind, pref: F.pref ? 1 : '' })); };
    $$('#ff input,#ff select,#f-kind,#f-pref').forEach(el => el.addEventListener(el.type === 'search' ? 'input' : 'change', sync));
  }

  /* ---------- 課程詳情 ---------- */
  function courseDetail(id) {
    const c = Core.courseOf(id); if (!c) return '<div class="empty">找不到此課程</div>'; const v = Core.view(c); const m = me(); const chk = m ? Core.canEnroll(m.id, id) : null;
    const rules = [`全民皆可報名，不限新北市民或戶籍；課程免費。`, c.limit ? `<b>長期帶狀課程每人每年最多報名 2 班</b>（以班為單位），短期課程不受限。${m ? `您今年已報名 <b>${Core.longCount(m.id, c.start.slice(0, 4), id)}</b>／2 班。` : ''}` : '本班為短期／中期課程，不計入長期班「每年 2 班」限制。',
      c.prepost ? '本班含<b>體適能前測與後測</b>（前後測間隔至少 12 週）；建議課程出席達 <b>60%</b> 以上。' : '', '上課請以手機<b>掃描現場 QR Code</b> 簽到、簽退；無手機者由老師以紙本簽到表補登。', '課程如有改期、停課等異動，將以 Email／簡訊通知。', c.prio ? `本班保留 <b>${c.prio}</b> 個優先名額予低收入戶、新住民女性、原住民族女性（需審核）。` : '', c.review ? '本班報名採<b>人工審核</b>，審核結果將以 Email／簡訊通知。' : ''].filter(Boolean);
    let act; const needLogin = `<a class="btn primary lg block" href="#/login?${qs({ next: '/enroll/' + id })}">登入後報名</a><div class="small muted center" style="margin-top:8px">還不是會員？<a href="#/register">立即註冊</a></div>`;
    if (!m) act = ['報名中', '額滿候補'].includes(v.st) ? needLogin : `<button class="btn lg block" disabled>${v.st === '尚未開放' ? Core.fmtD(c.ro) + ' 開放報名' : v.st}</button>`;
    else if (chk.ok) act = `<a class="btn primary lg block" href="#/enroll/${id}">${chk.mode === 'wait' ? '加入候補' : chk.mode === 'review' ? '送出報名（需審核）' : '我要報名'}</a>`;
    else if (chk.code === 'dup') act = `<div class="alert ok">✔ ${esc(chk.msg)}</div><a class="btn block mt" href="#/me/courses">查看我的課表</a>`;
    else act = `<div class="alert ${chk.code === 'limit' || chk.code === 'gender' ? 'bad' : 'warn'}">${esc(chk.msg)}</div>`;
    return `<p class="small"><a href="#/courses">← 返回課程列表</a></p><div class="layout2"><div class="stack">
      <div class="card"><div class="row between"><div class="tags">${badge(v.proj.short, 'brand')}${badge(c.cat)}${badge(c.kind)}${badge(c.io)}</div>${stBadge(v.st)}</div><h1 style="margin-top:10px">${esc(c.name)}</h1><p class="muted">${esc(c.desc)}</p>
        <dl class="kv"><dt>行政區</dt><dd>${esc(c.dist)}區</dd><dt>地點</dt><dd>${esc(c.venue)}（${esc(c.io)}）</dd><dt>上課時間</dt><dd>${sched(c)}（每堂 ${((+c.t1.slice(0, 2) * 60 + +c.t1.slice(3)) - (+c.t0.slice(0, 2) * 60 + +c.t0.slice(3))) / 60} 小時）</dd><dt>課程期間</dt><dd>${Core.fmtD(v.first, true)} – ${Core.fmtD(v.last, true)}（共 ${c.ns} 堂）</dd><dt>報名期間</dt><dd>${Core.fmtD(c.ro, true)} – ${Core.fmtD(c.rc, true)}</dd><dt>授課老師</dt><dd>${esc(c.instr)}</dd><dt>執行單位</dt><dd>${esc(v.vendor.name)}（${esc(v.proj.name)}）</dd></dl></div>
      <div class="card"><h3>報名須知</h3><ul style="margin:0;padding-left:20px;display:grid;gap:8px">${rules.map(r => `<li>${r}</li>`).join('')}</ul></div>
      <div class="card"><h3>上課時間表（${v.ss.length} 堂）</h3><div style="max-height:420px;overflow:auto">${v.ss.map(s => `<div class="sess ${s.date < TODAY ? 'past' : s.date === TODAY ? 'today' : ''}"><span class="n">${s.n}</span><span>${Core.fmtD(s.date)} ${s.t0}–${s.t1}${s.cancelled ? ' ' + badge('停課', 'bad') : s.moved ? ' ' + badge('異動', 'warn') : ''}<div class="xs muted">${esc(s.venue)}${s.note ? '｜' + esc(s.note) : ''}</div></span><span class="xs muted">${s.date === TODAY ? '今天' : ''}</span></div>`).join('')}</div></div></div>
      <aside class="sticky stack"><div class="card"><div class="row between"><b>報名名額</b>${stBadge(v.st)}</div><div style="margin:10px 0 4px" class="row between small"><span class="muted">已報名／名額</span><b>${v.occ} / ${c.cap}</b></div>${bar(v.occ, c.cap, v.left === 0 ? 'bad' : v.left <= 3 ? 'warn' : 'ok')}<div class="small muted" style="margin:6px 0 16px">${v.left > 0 ? '尚餘 ' + v.left + ' 個名額' : '名額已滿，' + (v.st === '額滿候補' ? '可加入候補（目前候補 ' + v.wait + ' 人）' : '')}</div>${act}</div>
      <div class="card flat small"><b>報名流程</b><ol style="padding-left:18px;margin:8px 0 0;display:grid;gap:4px"><li>註冊／登入會員（身分證字號＋驗證）</li><li>確認資料與須知</li><li>完成報名，等待通知</li><li>上課掃 QR 簽到簽退</li></ol></div></aside></div>`;
  }

  /* ---------- 報名流程 ---------- */
  function enrollPage(id) {
    const m = me(); if (!m) { location.hash = '#/login?' + qs({ next: '/enroll/' + id }); return ''; }
    const c = Core.courseOf(id); if (!c) return '<div class="empty">找不到此課程</div>'; if (!EF || EF.cid !== id) EF = { cid: id, step: 1, prio: '一般', a1: false, a2: false, res: null };
    const v = Core.view(c); const chk = Core.canEnroll(m.id, id);
    if (!chk.ok && EF.step < 3) return `<p class="small"><a href="#/course/${id}">← 返回課程</a></p><div class="card"><h2>無法報名</h2><div class="alert bad">${esc(chk.msg)}</div><p class="mt"><a class="btn" href="#/courses">看其他課程</a></p></div>`;
    const head = `<p class="small"><a href="#/course/${id}">← 返回課程</a></p><div class="steps">${['確認資料', '同意須知', '完成報名'].map((t, i) => `<div class="${EF.step === i + 1 ? 'on' : EF.step > i + 1 ? 'done' : ''}">${i + 1}. ${t}</div>`).join('')}</div>`;
    const sum = `<div class="card flat" style="background:var(--brand-l);border-color:#f7c3aa"><b>${esc(c.name)}</b><div class="small muted">${esc(c.dist)}區｜${sched(c)}｜${Core.fmtD(v.first)} 開課，共 ${c.ns} 堂</div></div>`;
    if (EF.step === 1) return `<div style="max-width:720px;margin:0 auto">${head}${sum}<form class="card mt" data-form="enroll1"><h3>1. 確認報名資料</h3><div class="fgrid"><div class="field"><label>姓名</label><input type="text" value="${esc(m.name)}" disabled></div><div class="field"><label>身分證字號</label><input type="text" value="${Core.maskId(m.idno)}" disabled></div>
      <div class="field"><label for="e-phone">手機號碼 <span class="vf">✔ 已驗證</span></label><input id="e-phone" type="tel" value="${esc(m.phone)}" disabled><span class="hint">上課異動將以簡訊通知</span></div><div class="field"><label for="e-mail">Email <span class="vf">✔ 已驗證</span></label><input id="e-mail" type="email" value="${esc(m.email)}" disabled></div></div><div class="small muted" style="margin:-4px 0 12px">如需修改手機或 Email，請至「會員中心 → 個人資料」，修改後需重新驗證。</div>
      ${c.proj === 'P2' ? `<div class="field"><label for="e-prio">身分別（優先名額）</label><select id="e-prio" name="prio">${opts(['一般', '低收入戶', '新住民女性', '原住民族女性'], EF.prio)}</select><span class="hint">選擇優先身分需於審核時備查證明文件</span></div>` : ''}
      ${chk.mode === 'wait' ? '<div class="alert warn">目前名額已滿，送出後將加入<b>候補</b>；有人取消時依序遞補並通知您。</div>' : chk.mode === 'review' ? '<div class="alert info">本班採人工審核，送出後狀態為「待審核」。</div>' : ''}
      ${c.limit ? `<div class="alert info mt">本班為長期帶狀課程：您今年已報名 ${chk.used} 班，報名後為 ${chk.used + 1}／2 班。</div>` : ''}<div class="modal-foot"><a class="btn" href="#/course/${id}">取消</a><button class="btn primary">下一步</button></div></form></div>`;
    if (EF.step === 2) return `<div style="max-width:720px;margin:0 auto">${head}${sum}<form class="card mt" data-form="enroll2"><h3>2. 同意須知</h3><div class="stack"><label class="check"><input type="checkbox" name="a1" ${EF.a1 ? 'checked' : ''}><span>我已閱讀並同意「${PL('privacy')}」，本平台由<b>新北市政府體育局</b>建置，資料僅供課程管理與統計使用。</span></label>
      <label class="check"><input type="checkbox" name="a2" ${EF.a2 ? 'checked' : ''}><span>我了解本課程須<b>以手機掃 QR Code 簽到簽退</b>，建議出席達 60% 以上，並配合辦理體適能前後測。</span></label>${c.limit ? '<label class="check"><input type="checkbox" checked disabled><span>我了解長期帶狀課程每人每年最多報名 2 班。</span></label>' : ''}</div><div class="err" id="e-err"></div><div class="modal-foot"><button type="button" class="btn" data-act="estep" data-n="1">上一步</button><button class="btn primary">${chk.mode === 'wait' ? '送出候補' : '確認送出報名'}</button></div></form></div>`;
    const r = EF.res; const e = r.enr;
    return `<div style="max-width:640px;margin:0 auto">${head}<div class="card center"><div style="font-size:54px">${e.status === '已錄取' ? '🎉' : e.status === '候補' ? '⏳' : '📝'}</div><h2>${e.status === '已錄取' ? '報名成功！' : e.status === '候補' ? '已加入候補' : '報名已送出，等待審核'}</h2><p class="muted">${esc(c.name)}｜${stBadge(e.status)}</p>
      <div class="card flat small" style="text-align:left"><b>接下來：</b><ul style="margin:6px 0 0;padding-left:18px;display:grid;gap:4px"><li>確認信已寄至 ${esc(m.email)}，異動通知會以 Email／簡訊發送。</li><li>${Core.fmtD(v.first)} ${c.t0} 開課，請至「${esc(c.venue)}」。</li><li>上課時於「會員中心 → 簽到簽退」掃描現場 QR Code。</li>${c.prepost ? '<li>前測於第 1 堂課前後 7 日內完成，結果會顯示在「我的體適能」。</li>' : ''}</ul></div>
      <div class="row mt" style="justify-content:center"><a class="btn primary" href="#/me/courses">查看我的課表</a><a class="btn" href="#/courses">繼續找課程</a></div></div></div>`;
  }

  /* ---------- 登入 / 註冊 / 忘記密碼 ---------- */
  const PL = k => `<a class="plink" role="button" tabindex="0" data-act="policy" data-k="${k}">${k === 'privacy' ? '個人資料蒐集、處理及利用告知事項' : '平台使用條款'}</a>`;
  const pwField = (id, name, label, autocomplete) => `<div class="field"><label for="${id}" class="req">${label}</label><div class="pw-row"><input id="${id}" name="${name}" type="password" autocomplete="${autocomplete}"><button type="button" class="btn sm" data-act="pw-toggle" data-t="${id}">顯示</button></div></div>`;
  function policyModal(k) {
    const T = k === 'privacy'
      ? ['個人資料蒐集、處理及利用告知事項', ['一、蒐集機關：新北市政府體育局。', '二、蒐集目的：課程報名與審核、出缺席管理、體適能檢測資料比對、滿意度調查與統計分析、課程異動通知、獎勵（新北幣）發放名單製作。', '三、個人資料類別：姓名、身分證字號、性別、出生日期、聯絡電話、Email、居住行政區、報名與出缺席紀錄、體適能檢測結果、問卷填答。', '四、利用期間、地區、對象及方式：於上述目的存續期間，供體育局及受託執行課程之廠商於本計畫範圍內利用；統計資料以去識別化方式呈現。', '五、您得依個人資料保護法行使查詢、閱覽、複製、補充或更正、停止蒐集處理利用及刪除之權利。', '六、不提供之影響：未提供必要資料者，將無法完成會員註冊與課程報名。', '七、個人資料於資料庫中加密保存。']]
      : ['平台使用條款', ['一、本平台由新北市政府體育局建置，提供全民運動課程線上報名及相關服務。', '二、會員應提供正確資料，並妥善保管帳號與密碼；因保管不當所生之損害由會員自行負責。', '三、長期帶狀課程每人每年最多報名 2 班；請依課程規定出席並以 QR Code 簽到、簽退。', '四、因天候、場地等因素需異動課程時，主辦單位將以 Email 或簡訊通知。', '五、會員如有違反本條款或影響他人權益之情事，主辦單位得限制其使用本服務。']];
    openModal(`<h3>${T[0]}</h3><div class="note-box small mb">Prototype 示意內容，正式條文待體育局提供。</div><div class="small stack" style="max-height:50vh;overflow:auto">${T[1].map(p => `<p style="margin:0">${p}</p>`).join('')}</div><div class="modal-foot"><button class="btn primary" data-close>我知道了</button></div>`);
  }
  function loginPage(query) {
    if (me()) { location.hash = '#/me'; return ''; }
    return `<div style="max-width:440px;margin:20px auto"><div class="card"><h2>會員登入</h2><p class="muted small">請輸入帳號（身分證字號）與密碼。</p>
      <form data-form="login" data-next="${esc(query.next || '')}" novalidate><div class="field"><label for="l-id" class="req">帳號（身分證字號）</label><input id="l-id" name="id" type="text" maxlength="10" autocomplete="username" placeholder="例：A223456781" style="text-transform:uppercase"></div>
      <div class="field"><label for="l-pw" class="req">密碼</label><div class="pw-row"><input id="l-pw" name="pw" type="password" autocomplete="current-password"><button type="button" class="btn sm" data-act="pw-toggle" data-t="l-pw">顯示</button></div><div class="err" id="l-err" role="alert"></div></div>
      <div class="row between" style="margin:-4px 0 14px"><span class="xs muted">註冊時已完成驗證，登入不需驗證碼</span><a href="#/forgot">忘記密碼？</a></div><button class="btn primary block lg">登入</button></form>
      <div class="divider"></div><button class="btn block" data-act="demo-login" data-next="${esc(query.next || '')}">使用示範帳號登入（陳美玲）</button><p class="xs muted center mt">示範帳號密碼：<b>Demo1234</b></p><p class="small center mt">還不是會員？<a href="#/register">立即註冊</a></p></div></div>`;
  }
  let FP = { step: 1, id: '', via: '簡訊' };
  function forgotPage() {
    if (me()) { location.hash = '#/me'; return ''; }
    const m = S.members.find(x => x.idno === FP.id); const st = FP.step;
    const idx = st <= 2 ? 0 : 1; const hd = `<div class="steps">${['驗證身分', '設定新密碼', '完成'].map((t, i) => `<div class="${i === idx ? 'on' : i < idx ? 'done' : ''}">${i + 1}. ${t}</div>`).join('')}</div>`;
    let body = '';
    if (st === 1) body = `<h2>忘記密碼</h2><p class="muted small">輸入帳號後，系統會寄送驗證碼以確認是您本人。</p><form data-form="fp1" novalidate><div class="field"><label for="f-id" class="req">帳號（身分證字號）</label><input id="f-id" name="id" type="text" maxlength="10" value="${esc(FP.id)}" style="text-transform:uppercase" autocomplete="username"><div class="err" id="f-err" role="alert"></div></div><div class="field"><label class="lbl">驗證碼寄送方式</label><div class="opts"><label><input type="radio" name="via" value="簡訊" ${FP.via !== 'Email' ? 'checked' : ''}>簡訊</label><label><input type="radio" name="via" value="Email" ${FP.via === 'Email' ? 'checked' : ''}>Email</label></div></div><button class="btn primary block">寄送驗證碼</button><p class="small center mt"><a href="#/login">← 返回登入</a></p></form>`;
    else if (st === 2) body = `<h2>輸入驗證碼</h2><div class="alert info small">驗證碼已以${FP.via}寄送至 <b>${FP.via === '簡訊' ? Core.maskPhone(m.phone) : esc(m.email.replace(/^(.{2}).*(@.*)$/, '$1***$2'))}</b>。<br>（Prototype 示範驗證碼：<b>123456</b>）</div><form data-form="fp2" class="mt" novalidate><div class="field"><label for="f-code" class="req">6 位數驗證碼</label><input id="f-code" name="code" inputmode="numeric" maxlength="6" autocomplete="one-time-code"><div class="err" id="f-err" role="alert"></div></div><button class="btn primary block">驗證</button><button type="button" class="btn ghost block mt" data-act="fp-back">更換帳號</button></form>`;
    else if (st === 3) body = `<h2>設定新密碼</h2><form data-form="fp3" novalidate>${pwField('n-pw', 'pw', '新密碼', 'new-password')}${pwField('n-pw2', 'pw2', '確認新密碼', 'new-password')}<div class="pwrule" id="pwrule">至少 8 碼，需包含英文字母與數字。（Prototype 請勿使用真實密碼）</div><div class="err" id="f-err" role="alert"></div><button class="btn primary block mt">重設密碼</button></form>`;
    else body = `<div class="center"><div style="font-size:54px">✅</div><h2>密碼已重設</h2><p class="muted">請使用新密碼登入。</p><a class="btn primary lg block" href="#/login">前往登入</a></div>`;
    return `<div style="max-width:440px;margin:20px auto">${st < 4 ? hd : ''}<div class="card">${body}</div></div>`;
  }
  function registerPage() {
    if (me()) { location.hash = '#/me'; return ''; }
    if (RG.step === 2) return `<div style="max-width:520px;margin:20px auto"><div class="card"><h2>驗證帳號</h2><div class="alert info small">驗證碼已以${RG.data.via}寄送至 <b>${esc(RG.data.via === '簡訊' ? Core.maskPhone(RG.data.phone) : RG.data.email)}</b>（Prototype 示範驗證碼：<b>123456</b>）</div><form data-form="reg2" class="mt"><div class="field"><label for="r-code" class="req">6 位數驗證碼</label><input id="r-code" name="code" inputmode="numeric" maxlength="6" autocomplete="one-time-code"><div class="err" id="r-err" role="alert"></div></div><button class="btn primary block">完成註冊</button><button type="button" class="btn ghost block mt" data-act="reg-back">修改資料</button></form></div></div>`;
    const d = RG.data || {};
    return `<div style="max-width:640px;margin:20px auto"><div class="card"><h2>加入會員</h2><div class="alert info small" style="margin-bottom:16px">歡迎加入新北市全民運動課程報名網站，註冊後即可報名全市課程，並可以查看自己的體適能紀錄唷~</div>
      <form data-form="reg1" novalidate><div class="fgrid"><div class="field"><label for="r-name" class="req">姓名</label><input id="r-name" name="name" type="text" value="${esc(d.name || '')}"></div><div class="field"><label for="r-id" class="req">身分證字號（登入帳號）</label><input id="r-id" name="idno" type="text" maxlength="10" value="${esc(d.idno || '')}" style="text-transform:uppercase" autocomplete="off"><span class="hint">作為會員與體適能資料比對之 key，資料庫加密保存</span></div>
      <div class="field"><label class="req">性別</label><div class="opts"><label><input type="radio" name="gender" value="F" ${d.gender === 'F' ? 'checked' : ''}>女</label><label><input type="radio" name="gender" value="M" ${d.gender === 'M' ? 'checked' : ''}>男</label></div></div><div class="field"><label for="r-birth" class="req">出生日期</label><input id="r-birth" name="birth" type="date" value="${esc(d.birth || '')}" max="${TODAY}"></div>
      <div class="field"><label for="r-phone" class="req">手機號碼</label><input id="r-phone" name="phone" type="tel" maxlength="10" value="${esc(d.phone || '')}" placeholder="09xxxxxxxx"></div><div class="field"><label for="r-mail" class="req">Email</label><input id="r-mail" name="email" type="email" value="${esc(d.email || '')}"></div>
      ${pwField('r-pw', 'pw', '設定密碼', 'new-password')}${pwField('r-pw2', 'pw2', '確認密碼', 'new-password')}<div class="field full" style="grid-column:1/-1;margin-top:-6px"><span class="pwrule" id="pwrule">密碼至少 8 碼，需包含英文字母與數字。（Prototype 請勿使用真實密碼）</span></div>
      <div class="field"><label for="r-dist">居住行政區</label><select id="r-dist" name="district">${opts(DISTRICTS.map(x => ({ v: x, t: x + '區' })), d.district || '', '請選擇')}<option value="其他縣市">其他縣市</option></select></div><div class="field"><label class="lbl">驗證方式（註冊時驗證一次）</label><div class="opts"><label><input type="radio" name="via" value="簡訊" ${d.via !== 'Email' ? 'checked' : ''}>簡訊驗證</label><label><input type="radio" name="via" value="Email" ${d.via === 'Email' ? 'checked' : ''}>Email 驗證</label></div></div></div>
      <div class="field"><label class="lbl">偏好的課程類型（選填，登入後預設優先列出）</label><div class="opts">${CATS.map(x => `<label><input type="checkbox" name="prefs" value="${x}" ${(d.prefs || []).includes(x) ? 'checked' : ''}>${x}</label>`).join('')}</div></div>
      <div class="consent" id="consent"><label class="check"><input type="checkbox" name="agree" ${d.agree ? 'checked' : ''}><span>我已閱讀並同意「${PL('privacy')}」與「${PL('terms')}」。</span></label></div><div class="err" id="r-err" style="margin:8px 0" role="alert"></div><button class="btn primary block lg mt">下一步：驗證帳號</button></form></div></div>`;
  }

  /* ---------- 會員中心 ---------- */
  const TABS = [['overview', '總覽', '🏠'], ['courses', '我的課表', '📅'], ['checkin', '簽到簽退', '📲'], ['fitness', '我的體適能', '💪'], ['survey', '滿意度問卷', '📝'], ['notices', '通知', '🔔'], ['profile', '個人資料', '⚙️']];
  const surveyOpen = (c, v) => c.survey === 'any' ? true : c.survey === 'mid' ? Core.heldSessions(c).length >= c.ns / 2 : TODAY >= v.ss[v.ss.length - 1].date;
  function myCourses(m) { return S.enr.filter(e => e.memberId === m.id && Core.ACTIVE.includes(e.status)).map(e => ({ e, v: Core.view(Core.courseOf(e.courseId)) })); }
  function mePage(tab, arg) {
    const m = me(); if (!m) { location.hash = '#/login?' + qs({ next: '/me' + (tab ? '/' + tab : '') }); return ''; }
    const pendSurvey = myCourses(m).filter(x => x.e.status === '已錄取' && !Core.surveyDone(m.id, x.e.courseId) && surveyOpen(x.v.c, x.v)).length;
    const unread = Core.messagesFor(m.id).length;
    const side = TABS.map(([k, t, ic]) => `<a href="#/me/${k}" class="${tab === k ? 'on' : ''}"><span>${ic}</span>${t}${k === 'survey' && pendSurvey ? badge(pendSurvey, 'bad') : ''}${k === 'notices' ? badge(unread, 'info') : ''}</a>`).join('');
    const body = { overview: meOverview, courses: meCourses, checkin: meCheckin, fitness: meFitness, survey: meSurvey, notices: meNotices, profile: meProfile }[tab];
    return `<div class="me-wrap"><nav class="me-side card flat" style="padding:10px">${side}</nav><div>${body ? body(m, arg) : '<div class="empty">找不到頁面</div>'}</div></div>`;
  }

  function goals(m) {
    const cur = myCourses(m).filter(x => x.e.status === '已錄取' && x.v.st === '進行中').sort((a, b) => b.v.ss.length - a.v.ss.length)[0];
    const rr = cur ? Core.memberRate(cur.v.c.id, m.id) : null; const doneSv = S.surveys.some(s => s.memberId === m.id); const pair = Core.fitPair(m.id); const imp = Core.improve(pair);
    return [
      { ok: rr && rr.rate >= S.reward.attend, ic: '🎯', t: `出席率達 ${S.reward.attend}%`, d: rr ? `${esc(cur.v.c.name)}：已出席 ${rr.p}/${rr.total} 堂（${rr.rate}%）` : '開課後顯示', v: rr ? rr.rate : 0, max: 100 },
      { ok: !S.reward.survey || doneSv, ic: '📝', t: '填寫課程滿意度問卷', d: doneSv ? '已完成，感謝您的回饋' : '尚未填寫', v: doneSv ? 1 : 0, max: 1, link: doneSv ? '' : '#/me/survey' },
      { ok: imp != null && imp >= S.reward.improve, ic: '💪', t: `體適能進步 ${S.reward.improve}% 以上`, d: pair ? `最近一次前後測平均進步 ${imp}%（${pair.pre.date} → ${pair.post.date}）` : '完成前後測後顯示', v: Math.max(0, imp || 0), max: S.reward.improve }
    ];
  }
  function meOverview(m) {
    const my = myCourses(m); const g = goals(m); const next = [];
    my.filter(x => x.e.status === '已錄取').forEach(x => x.v.ss.forEach(s => { if (!s.cancelled && s.date >= TODAY) next.push({ s, c: x.v.c }); }));
    next.sort((a, b) => (a.s.date + a.s.t0).localeCompare(b.s.date + b.s.t0));
    const rates = my.filter(x => x.e.status === '已錄取').map(x => Core.memberRate(x.v.c.id, m.id)).filter(Boolean);
    const todo = []; const t = next.find(n => n.s.date === TODAY); if (t) todo.push(`<a href="#/me/checkin">📲 今天 ${t.s.t0} 有課：${esc(t.c.name)}，前往簽到</a>`);
    my.filter(x => x.e.status === '已錄取' && !Core.surveyDone(m.id, x.e.courseId) && surveyOpen(x.v.c, x.v)).forEach(x => todo.push(`<a href="#/me/survey/${x.v.c.id}">📝 填寫「${esc(x.v.c.name)}」滿意度問卷</a>`));
    if (my.some(x => x.v.c.prepost && x.v.st === '進行中') && !Core.fitOf(m.id).some(f => f.date >= '2027-01-01')) todo.push('<a href="#/me/fitness">💪 本期前測結果尚未匯入，完成檢測後會顯示於「我的體適能」</a>');
    return `<div class="card row top"><div class="avatar">${esc(m.name[0])}</div><div style="flex:1"><h2 style="margin:0">${esc(m.name)}，您好</h2><div class="muted small">身分證 ${Core.maskId(m.idno)}｜加入日期 ${m.regAt}｜居住 ${esc(m.district)}區</div><div class="tags mt0" style="margin-top:8px">${m.prefs.map(p => badge(p, 'brand')).join('') || '<span class="muted small">尚未設定偏好類型</span>'}</div></div></div>
      <div class="grid g3 mt"><div class="card kpi"><div class="t">我的課程</div><div class="n">${my.length}</div><div class="s">進行中 ${my.filter(x => x.v.st === '進行中').length}・待上課 ${my.filter(x => x.v.first > TODAY).length}</div></div><div class="card kpi"><div class="t">平均出席率</div><div class="n">${rates.length ? Core.avg(rates.map(r => r.rate)).toFixed(0) + '%' : '—'}</div><div class="s">建議達 60% 以上</div></div><div class="card kpi"><div class="t">待辦事項</div><div class="n">${todo.length}</div><div class="s">${todo.length ? '請見下方' : '目前沒有待辦'}</div></div></div>
      <div class="layout2 mt" style="grid-template-columns:1fr 1fr"><div class="card"><h3>🎁 獎勵與目標 ${tbd(10)}</h3><p class="small muted">達成條件者，由體育局彙整名單後發放新北幣（條件為示意，實際門檻待體育局訂定）。</p>${g.map(x => `<div class="goal ${x.ok ? 'ok' : ''}"><div class="ic">${x.ok ? '✓' : x.ic}</div><div><b>${x.t}</b><div class="small muted">${x.d}</div>${bar(x.v, x.max, x.ok ? 'ok' : '')}</div>${x.link ? `<a class="btn sm" href="${x.link}">去填寫</a>` : badge(x.ok ? '已達成' : '進行中', x.ok ? 'ok' : '')}</div>`).join('')}</div>
      <div class="stack"><div class="card"><h3>待辦事項</h3>${todo.length ? `<div class="stack small">${todo.join('')}</div>` : '<div class="muted small">太棒了，沒有待辦事項。</div>'}</div><div class="card"><h3>接下來的課</h3>${next.slice(0, 4).map(n => `<div class="row between small" style="padding:7px 0;border-bottom:1px dashed var(--line)"><span><b>${Core.fmtD(n.s.date)}</b> ${n.s.t0}　${esc(n.c.name)}</span><span class="muted">${esc(n.c.dist)}區</span></div>`).join('') || '<div class="muted small">目前沒有排定的課程。<a href="#/courses">去找課程</a></div>'}</div></div></div>`;
  }

  function meCourses(m) {
    const all = S.enr.filter(e => e.memberId === m.id).sort((a, b) => b.at.localeCompare(a.at));
    if (!all.length) return '<div class="card empty">還沒有報名紀錄。<br><a class="btn primary mt" href="#/courses">去找課程</a></div>';
    return `<h2>我的課表</h2><div class="stack">${all.map(e => { const c = Core.courseOf(e.courseId), v = Core.view(c), rr = e.status === '已錄取' ? Core.memberRate(c.id, m.id) : null;
      return `<div class="card"><div class="row between top"><div><div class="tags">${badge(v.proj.short, 'brand')}${badge(c.kind)}${stBadge(e.status)}${stBadge(v.st)}</div><h3 style="margin:8px 0 2px"><a href="#/course/${c.id}">${esc(c.name)}</a></h3><div class="small muted">${esc(c.dist)}區・${esc(c.venue)}｜${sched(c)}｜${Core.fmtD(v.first)} – ${Core.fmtD(v.last)}</div><div class="xs muted">報名時間 ${e.at}${e.prio !== '一般' ? '｜身分別：' + esc(e.prio) : ''}</div></div>
        <div class="row">${rr ? `<div class="center"><div style="font-size:22px;font-weight:800">${rr.rate}%</div><div class="xs muted">出席 ${rr.p}/${rr.total}</div></div>` : ''}${Core.ACTIVE.includes(e.status) && v.st !== '已結束' ? `<button class="btn sm danger" data-act="cancel" data-id="${e.id}">取消報名</button>` : ''}</div></div>
        ${rr ? `<div class="att-dots mt" style="margin-top:12px">${v.ss.map(s => { const a = Core.attRec(c.id, s.n, m.id); const k = s.cancelled ? 'X' : s.date < TODAY ? (a ? a.s : 'A') : ''; return `<i class="${k}" title="第${s.n}堂 ${Core.fmtD(s.date)}">${k === 'P' ? '✓' : k === 'A' ? '缺' : k === 'L' ? '假' : k === 'X' ? '停' : s.n}</i>`; }).join('')}</div>` : ''}</div>`; }).join('')}</div>`;
  }

  function meCheckin(m) {
    const todays = myCourses(m).filter(x => x.e.status === '已錄取').flatMap(x => x.v.ss.filter(s => s.date === TODAY && !s.cancelled).map(s => ({ c: x.v.c, s })));
    return `<h2>簽到簽退</h2><p class="muted">上課時，請掃描教室現場的 QR Code，登入後按「簽到」；下課前按「簽退」即可，不需再手寫簽名。無手機或收訊不佳者，由老師以紙本簽到表補登。</p>
      ${todays.length ? todays.map(({ c, s }) => { const a = Core.attRec(c.id, s.n, m.id) || {}; return `<div class="card mt"><div class="row between"><div><h3 style="margin:0">${esc(c.name)}</h3><div class="small muted">今天 ${s.t0}–${s.t1}｜${esc(s.venue)}｜第 ${s.n}／${c.ns} 堂</div></div>${a.s === 'P' ? (a.out ? badge('已簽到並簽退', 'ok') : badge('已簽到 ' + a.in, 'ok')) : badge('尚未簽到', 'warn')}</div>
        <div class="row mt">${a.s !== 'P' ? `<button class="btn primary lg" data-act="scan" data-c="${c.id}" data-n="${s.n}">📲 掃描 QR Code 簽到</button>` : !a.out ? `<button class="btn primary lg" data-act="checkout" data-c="${c.id}" data-n="${s.n}">簽退</button>` : '<span class="muted small">簽到 ' + a.in + '　簽退 ' + a.out + '（' + esc(a.via || 'QR') + '）</span>'}</div><div class="xs muted mt">示範：實際上線時需掃描現場 QR 才能簽到；此處以「模擬掃描」代替相機。</div></div>`; }).join('') : '<div class="card empty">今天沒有您的課程。</div>'}`;
  }

  function mkRow(mt, pre, post) {
    const d = post && pre ? post.v[mt.k] - pre.v[mt.k] : null; const cls = d == null || d === 0 || mt.d === 0 ? 'flat' : (d * mt.d > 0 ? 'up' : 'down');
    const mx = Math.max(pre ? pre.v[mt.k] : 0, post ? post.v[mt.k] : 0) * 1.12 || 1;
    return `<div><b>${mt.n}</b><div class="xs muted">${mt.u}</div></div><div class="vb"><span>${pre ? pre.v[mt.k] : '—'}</span>${bar(pre ? pre.v[mt.k] : 0, mx, 'info')}</div><div class="vb"><span>${post ? post.v[mt.k] : '—'} ${d != null ? `<span class="delta ${cls}">${d > 0 ? '▲' : d < 0 ? '▼' : '＝'} ${Math.abs(+d.toFixed(2))}</span>` : ''}</span>${bar(post ? post.v[mt.k] : 0, mx, 'ok')}</div>`;
  }
  function meFitness(m) {
    const list = Core.fitOf(m.id); const pair = Core.fitPair(m.id); const imp = Core.improve(pair);
    return `<h2>我的體適能</h2><p class="muted">顯示您歷次前測、後測結果。資料由課程廠商匯入體育局格式，並以身分證字號比對，無需自行填寫。</p>
      ${pair ? `<div class="card"><div class="row between"><h3 style="margin:0">前後測比較</h3><div>${badge('平均進步 ' + imp + '%', imp >= 0 ? 'ok' : 'warn')} ${tbd(10)}</div></div><div class="small muted mb">${pair.pre.date}（前測）→ ${pair.post.date}（後測）</div><div class="cmp"><div class="h">項目</div><div class="h">前測</div><div class="h">後測</div>${Core.METRICS[pair.pre.kind].map(mt => mkRow(mt, pair.pre, pair.post)).join('')}</div>
        <div class="xs muted mt">進步幅度＝仰臥捲腹、坐姿體前彎、體力指數的平均變化百分比（示意算法，待體育局訂定換算方式）。</div></div>` : '<div class="card empty">尚無完整的前後測資料。</div>'}
      <h3 class="mt">歷次檢測紀錄</h3><div class="stack">${list.map(f => `<div class="card"><div class="row between"><div><b>${f.date}　${f.phase}</b> ${badge(f.kind === '一般' ? '一般體適能' : '銀髮體適能')}</div><span class="xs muted">${esc(f.src)}</span></div>
        <div class="grid g4 mt" style="margin-top:12px;gap:10px">${Core.METRICS[f.kind].map(mt => `<div><div class="xs muted">${mt.n}</div><div style="font-size:18px;font-weight:800">${f.v[mt.k]}<span class="xs muted"> ${mt.u}</span></div>${f.g && f.g[mt.k] ? `<span class="badge ${f.g[mt.k] >= 4 ? 'ok' : f.g[mt.k] >= 3 ? 'info' : 'warn'}">評估 ${f.g[mt.k]} 級</span>` : ''}</div>`).join('')}</div></div>`).join('') || '<div class="card empty">尚無檢測紀錄。</div>'}</div>`;
  }

  function meSurvey(m, arg) {
    if (arg) return surveyForm(m, arg);
    const my = myCourses(m).filter(x => x.e.status === '已錄取');
    return `<h2>滿意度問卷</h2><p class="muted">問卷由體育局統一提供，內容與全市各班一致。${tbd(9)} 填答時機尚待確認，此處依各班設定示範。</p><div class="stack">${my.map(x => { const c = x.v.c, done = Core.surveyDone(m.id, c.id), open = surveyOpen(c, x.v);
      return `<div class="card row between"><div><b>${esc(c.name)}</b><div class="small muted">填答時機：${c.survey === 'any' ? '報名後即可填答' : c.survey === 'mid' ? '上課過半後' : '最後一堂課開放'}</div></div>${done ? badge('已填寫', 'ok') : open ? `<a class="btn primary" href="#/me/survey/${c.id}">填寫問卷</a>` : badge('尚未開放（' + Core.fmtD(x.v.last) + ' 起）', 'gray')}</div>`; }).join('') || '<div class="card empty">目前沒有需要填寫的課程。</div>'}</div>`;
  }
  function surveyForm(m, cid) {
    const c = Core.courseOf(cid); if (!c) return '<div class="empty">找不到課程</div>'; if (Core.surveyDone(m.id, cid)) return '<div class="card empty">您已填寫過此問卷，感謝！<br><a class="btn mt" href="#/me/survey">返回</a></div>';
    const radio = (n, arr) => `<div class="opts">${arr.map(x => `<label><input type="radio" name="${n}" value="${esc(x)}">${esc(x)}</label>`).join('')}</div>`; const chk = (n, arr) => `<div class="opts">${arr.map(x => `<label><input type="checkbox" name="${n}" value="${esc(x)}">${esc(x)}</label>`).join('')}</div>`;
    const age = Core.ageAt(m.birth, TODAY);
    return `<p class="small"><a href="#/me/survey">← 返回</a></p><form class="card" data-form="survey" data-cid="${cid}"><h2>116 年新北市（${esc(Core.projOf(c.proj).short)}）活動滿意度調查表</h2><p class="muted small">${esc(c.name)}｜感謝參與！本問卷僅限業務統計使用，嚴格遵守個資法規範。</p>
      <div class="sec-t">基本資料</div><div class="field"><label class="lbl">性別</label>${radio('gender', ['男', '女', '不願透漏']).replace(`value="${m.gender === 'F' ? '女' : '男'}"`, `value="${m.gender === 'F' ? '女' : '男'}" checked`)}</div>
      <div class="field"><label class="lbl">年齡</label>${radio('age', ['12歲以下', '13-22歲', '23-64歲', '65歲以上']).replace(`value="${age >= 65 ? '65歲以上' : age >= 23 ? '23-64歲' : '13-22歲'}"`, `value="${age >= 65 ? '65歲以上' : age >= 23 ? '23-64歲' : '13-22歲'}" checked`)}</div>
      <div class="field"><label class="lbl">您的身分（可複選）</label>${chk('ident', ['一般身分者', '原住民族籍', '新住民', '上班族', '家管/退休人員', '其他'])}</div><div class="field"><label class="lbl">第一次參加本活動嗎？</label>${radio('first', ['是', '不是'])}</div><div class="field"><label class="lbl">今年還有參加其他運動 i 台灣活動或課程嗎？</label>${radio('other', ['有', '沒有'])}</div>
      <div class="field"><label class="lbl">如何得知本活動（可複選）</label>${chk('channel', ['新北運動聚點FB', '新北體育局LINE', '運動i臺灣網頁', '主辦單位FB或官網', '親友介紹', '活動傳單、海報、電子看板', '其他'])}</div><div class="field"><label class="lbl">平時參與運動課程的頻率</label>${radio('freq', ['每週有固定參與', '偶爾有', '以前沒有運動習慣，因為本活動才開始嘗試'])}</div>
      <div class="field"><label class="lbl">活動地點是否便利（位於居住社區附近）</label>${radio('conv', ['便利', '不便利'])}</div><div class="field"><label class="lbl">透過本活動，是否增加您對居住社區或鄰里運動資源的認識？</label>${radio('aware', ['有', '沒有'])}</div><div class="field"><label class="lbl">參加此活動對增加運動意願或養成運動習慣是否有幫助？</label>${radio('will', ['有', '沒有'])}</div>
      <div class="sec-t">活動滿意度</div>${['活動宣傳', '活動時間', '活動內容', '活動師資', '活動場地'].map(k => `<div class="field"><label class="lbl req">${k}</label><div class="stars">${[[5, '非常滿意'], [4, '滿意'], [3, '尚可'], [2, '不滿意'], [1, '非常不滿意']].map(([v, t]) => `<label><input type="radio" name="r_${k}" value="${v}">${t}</label>`).join('')}</div></div>`).join('')}
      <div class="sec-t">對本活動的回饋與建議</div><div class="field"><textarea name="text" placeholder="歡迎提供意見（選填）"></textarea></div><div class="err" id="s-err"></div><div class="modal-foot"><a class="btn" href="#/me/survey">取消</a><button class="btn primary lg">送出問卷</button></div></form>`;
  }

  function meNotices(m) {
    const list = Core.messagesFor(m.id);
    return `<h2>通知</h2><p class="muted">課程改期、停課等異動會統一由系統以 Email／簡訊發布，並同步顯示在這裡。</p><div class="stack">${list.map(n => `<div class="card"><div class="row between"><b>${esc(n.title)}</b><span class="xs muted">${n.at}</span></div><p class="small" style="margin:8px 0">${esc(n.body)}</p><div class="tags">${n.channels.map(c => badge(c, 'info')).join('')}<span class="xs muted">發送：${esc(n.by)}</span></div></div>`).join('') || '<div class="card empty">目前沒有通知。</div>'}</div>`;
  }

  function meProfile(m) {
    return `<h2>個人資料</h2><form class="card" data-form="profile"><div class="fgrid"><div class="field"><label>姓名</label><input type="text" value="${esc(m.name)}" disabled></div><div class="field"><label>身分證字號</label><input type="text" value="${Core.maskId(m.idno)}" disabled></div><div class="field"><label for="p-phone">手機號碼 <span class="vf">✔ 已驗證</span></label><input id="p-phone" name="phone" type="tel" maxlength="10" value="${esc(m.phone)}"></div><div class="field"><label for="p-mail">Email <span class="vf">✔ 已驗證</span></label><input id="p-mail" name="email" type="email" value="${esc(m.email)}"></div>
      <div class="field"><label for="p-dist">居住行政區</label><select id="p-dist" name="district">${opts(DISTRICTS.map(x => ({ v: x, t: x + '區' })), m.district)}</select></div></div><div class="field"><label class="lbl">偏好的課程類型（登入後課程列表預設優先列出）</label><div class="opts">${CATS.map(x => `<label><input type="checkbox" name="prefs" value="${x}" ${m.prefs.includes(x) ? 'checked' : ''}>${x}</label>`).join('')}</div></div><div class="note-box small mb">修改<b>手機號碼</b>或 <b>Email</b> 後，需輸入驗證碼重新驗證才會生效；其他資料儲存後立即更新。</div><div class="err" id="p-err" role="alert" style="margin-bottom:8px"></div><div class="row"><button class="btn primary">儲存</button><button type="button" class="btn danger" data-act="logout">登出</button></div></form>`;
  }

  /* ---------- 事件 ---------- */
  function verifyChanges(m, changes, done) {
    let i = 0;
    const step = () => {
      if (i >= changes.length) { closeModal(); done(); return; }
      const c = changes[i], isP = c.k === 'phone'; const tgt = isP ? Core.maskPhone(c.v) : c.v.replace(/^(.{2}).*(@.*)$/, '$1***$2');
      const o = openModal(`<h3>驗證新的${isP ? '手機號碼' : 'Email'}（${i + 1}／${changes.length}）</h3><div class="alert info small">驗證碼已以${isP ? '簡訊' : 'Email'}寄送至 <b>${esc(tgt)}</b>。<br>示範驗證碼 <b>123456</b>，已為您預填，直接按「確認驗證」即可。</div><form id="vf-f" class="mt" novalidate><div class="field"><label for="vf-code" class="req">6 位數驗證碼</label><input id="vf-code" inputmode="numeric" maxlength="6" value="123456" autocomplete="one-time-code"><div class="err" id="vf-err" role="alert"></div></div><button type="button" class="btn sm ghost" id="vf-resend">重新寄送驗證碼</button><div class="modal-foot"><button type="button" class="btn" id="vf-cancel">取消修改</button><button class="btn primary">確認驗證</button></div></form>`, { focus: false });
      $('#vf-resend', o).onclick = () => toast('已重新寄送驗證碼（示範碼 123456）');
      $('#vf-cancel', o).onclick = () => { closeModal(); toast('已取消，手機／Email 未變更'); route(); };
      $('#vf-f', o).onsubmit = ev => { ev.preventDefault(); if ($('#vf-code', o).value.trim() !== '123456') { $('#vf-err', o).textContent = '驗證碼錯誤（示範碼 123456）'; return; } m[c.k] = c.v; Core.save(); toast('已驗證並更新' + (isP ? '手機號碼' : ' Email'), 'ok'); i++; step(); };
    };
    step();
  }

  document.addEventListener('click', e => {
    const a = e.target.closest('[data-act]'); if (!a) return; const act = a.dataset.act;
    if (act === 'menu') { $('#nav').classList.toggle('open'); }
    else if (act === 'reset') { e.preventDefault(); confirmBox('重置示範資料', '將清除您在原型中的所有操作（報名、簽到、問卷、後台異動），並還原為初始示範資料。', '確定重置', () => { Core.reset(); EF = null; FP = { step: 1, id: '', via: '簡訊' }; RG = { step: 1, data: null }; toast('已重置', 'ok'); location.hash = '#/'; route(); }, true); }
    else if (act === 'estep') { EF.step = +a.dataset.n; route(); }
    else if (act === 'logout') { S.me = null; EF = null; Core.save(); toast('已登出，期待再見！', 'ok'); if (location.hash === '' || location.hash === '#/') route(); else location.hash = '#/'; }
    else if (act === 'demo-login') { S.me = 'M001'; Core.save(); toast('已登入示範帳號', 'ok'); location.hash = '#' + (a.dataset.next || '/me'); }
    else if (act === 'fp-back') { FP = { step: 1, id: '', via: '簡訊' }; route(); }
    else if (act === 'reg-back') { RG.step = 1; route(); }
    else if (act === 'pw-toggle') { const i = $('#' + a.dataset.t); const show = i.type === 'password'; i.type = show ? 'text' : 'password'; a.textContent = show ? '隱藏' : '顯示'; }
    else if (act === 'policy') { e.preventDefault(); policyModal(a.dataset.k); }
    else if (act === 'b-prev') bGo(bIdx - 1); else if (act === 'b-next') bGo(bIdx + 1); else if (act === 'b-go') bGo(+a.dataset.i);
    else if (act === 'vm') { setView(a.dataset.v); $$('.vtoggle button').forEach(b => { const on = b.dataset.v === a.dataset.v; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); }); renderResults(); }
    else if (act === 'n-tag') { NP.tag = a.dataset.v; NP.page = 1; route(); } else if (act === 'n-page') { NP.page = +a.dataset.p; route(); }
    else if (act === 'n-img') openModal(`<img src="${esc(a.src)}" alt="" style="width:100%;border-radius:10px"><div class="modal-foot"><button class="btn" data-close>關閉</button></div>`, { wide: true, focus: false });
    else if (act === 'n-file') { const n = S.news.find(x => x.id === a.dataset.n), f = n.files[+a.dataset.k]; const l = document.createElement('a'); l.download = f.name; l.href = f.data || URL.createObjectURL(new Blob(['（Prototype 示範附件：' + f.name + '）'], { type: 'text/plain;charset=utf-8' })); document.body.appendChild(l); l.click(); setTimeout(() => l.remove(), 500); toast('已下載 ' + f.name); }
    else if (act === 'cancel') { const en = S.enr.find(x => x.id === a.dataset.id), c = Core.courseOf(en.courseId); confirmBox('取消報名', '確定要取消「' + esc(c.name) + '」的報名嗎？取消後名額將釋出，並依序遞補候補學員。', '確定取消', () => { Core.setEnr(en.id, '取消', '學員'); toast('已取消報名', 'ok'); route(); }, true); }
    else if (act === 'scan') { const c = Core.courseOf(a.dataset.c), n = +a.dataset.n; openModal(`<h3>掃描教室 QR Code</h3><div class="scan"><i></i>相機畫面（示意）</div><p class="small muted center mt">請將鏡頭對準現場 QR Code。<br>Prototype：按下方按鈕模擬掃描成功。</p><div class="modal-foot"><button class="btn" data-close>取消</button><button class="btn primary" id="scan-ok">模擬掃描成功</button></div>`); $('#scan-ok').onclick = () => { Core.setAtt(c.id, n, S.me, { s: 'P', in: Core.nowTime(), out: null, via: 'QR' }); closeModal(); toast('簽到成功 ' + Core.nowTime(), 'ok'); route(); }; }
    else if (act === 'checkout') { const r = Core.attRec(a.dataset.c, +a.dataset.n, S.me); r.out = Core.nowTime(); Core.setAtt(a.dataset.c, +a.dataset.n, S.me, r); toast('簽退成功 ' + r.out, 'ok'); route(); }
  });
  document.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('a.plink[role=button]')) { e.preventDefault(); e.target.click(); } });
  document.addEventListener('input', e => { if (!['n-pw', 'r-pw'].includes(e.target.id)) return; const r = $('#pwrule'); if (!r) return; if (!r.dataset.t) r.dataset.t = r.textContent; const ok = Core.validPw(e.target.value); r.classList.toggle('ok', ok); r.textContent = ok ? '✔ 密碼格式符合' : r.dataset.t; });

  document.addEventListener('submit', e => {
    const f = e.target.closest('[data-form]'); if (!f) return; e.preventDefault(); const kind = f.dataset.form; const fd = new FormData(f); const val = n => (fd.get(n) || '').toString().trim();
    if (kind === 'hsearch') location.hash = '#/courses?' + qs({ kw: val('kw'), dist: val('dist'), cat: val('cat') });
    else if (kind === 'enroll1') { EF.prio = val('prio') || '一般'; EF.step = 2; route(); }
    else if (kind === 'enroll2') { EF.a1 = !!fd.get('a1'); EF.a2 = !!fd.get('a2'); if (!EF.a1 || !EF.a2) { $('#e-err').textContent = '請勾選同意個資告知事項與簽到須知'; return; } const r = Core.enroll(S.me, EF.cid, { prio: EF.prio }); if (!r.ok) { toast(r.msg, 'bad'); return; } EF.res = r; EF.step = 3; route(); }
    else if (kind === 'login') { const id = val('id').toUpperCase(), pw = (fd.get('pw') || '').toString(); const err = $('#l-err'); if (!id || !pw) { err.textContent = '請輸入帳號與密碼'; return; } const m = S.members.find(x => x.idno === id);
      if (!m || m.pw !== pw) { err.innerHTML = '帳號或密碼錯誤。<a href="#/forgot">忘記密碼？</a>'; return; } S.me = m.id; Core.save(); toast('歡迎回來，' + m.name, 'ok'); location.hash = '#' + (f.dataset.next || '/me'); }
    else if (kind === 'fp1') { const id = val('id').toUpperCase(); const err = $('#f-err'); if (!Core.validId(id)) { err.textContent = '身分證字號格式不正確'; return; } if (!S.members.find(x => x.idno === id)) { err.innerHTML = '查無此帳號，請先 <a href="#/register">註冊</a>'; return; } FP = { step: 2, id, via: val('via') || '簡訊' }; route(); }
    else if (kind === 'fp2') { if (val('code') !== '123456') { $('#f-err').textContent = '驗證碼錯誤（示範碼 123456）'; return; } FP.step = 3; route(); }
    else if (kind === 'fp3') { const pw = (fd.get('pw') || '').toString(), pw2 = (fd.get('pw2') || '').toString(); const err = $('#f-err'); if (!Core.validPw(pw)) { err.textContent = '密碼至少 8 碼，需包含英文字母與數字'; return; } if (pw !== pw2) { err.textContent = '兩次輸入的密碼不一致'; return; } S.members.find(x => x.idno === FP.id).pw = pw; Core.save(); FP = { step: 4, id: '', via: '簡訊' }; toast('密碼已重設', 'ok'); route(); }
    else if (kind === 'reg1') { const d = { name: val('name'), idno: val('idno').toUpperCase(), gender: val('gender'), birth: val('birth'), phone: val('phone'), email: val('email'), district: val('district'), via: val('via') || '簡訊', prefs: fd.getAll('prefs'), agree: !!fd.get('agree'), pw: (fd.get('pw') || '').toString() }; const pw2 = (fd.get('pw2') || '').toString(); RG.data = d; const err = $('#r-err');
      const bad = !d.name ? '請輸入姓名' : !Core.validId(d.idno) ? '身分證字號格式不正確' : !d.gender ? '請選擇性別' : !d.birth ? '請選擇出生日期' : !/^09\d{8}$/.test(d.phone) ? '手機號碼需為 09 開頭的 10 碼' : !/^\S+@\S+\.\S+$/.test(d.email) ? 'Email 格式不正確' : S.members.some(x => x.idno === d.idno) ? '此身分證字號已註冊，請直接登入' : !Core.validPw(d.pw) ? '密碼至少 8 碼，需包含英文字母與數字' : d.pw !== pw2 ? '兩次輸入的密碼不一致' : !d.agree ? '請勾選同意「個人資料蒐集、處理及利用告知事項」與「平台使用條款」' : '';
      $('#consent').classList.toggle('err', !d.agree);
      if (bad) { err.textContent = bad; err.scrollIntoView({ block: 'center' }); return; } RG.step = 2; route(); }
    else if (kind === 'reg2') { if (val('code') !== '123456') { $('#r-err').textContent = '驗證碼錯誤（示範碼 123456）'; return; } const d = RG.data; const id = 'M' + String(S.members.length + 1).padStart(3, '0'); S.members.push({ id, name: d.name, gender: d.gender, birth: d.birth, idno: d.idno, phone: d.phone, email: d.email, district: d.district || '其他縣市', prefs: d.prefs, regAt: TODAY, pw: d.pw }); S.me = id; Core.save(); RG = { step: 1, data: null }; toast('註冊成功，歡迎加入！', 'ok'); location.hash = '#/courses'; }
    else if (kind === 'profile') { const m = me(); const phone = val('phone'), email = val('email'); const err = $('#p-err');
      if (!/^09\d{8}$/.test(phone)) { err.textContent = '手機號碼需為 09 開頭的 10 碼'; return; } if (!/^\S+@\S+\.\S+$/.test(email)) { err.textContent = 'Email 格式不正確'; return; } err.textContent = '';
      m.district = val('district'); m.prefs = fd.getAll('prefs'); Core.save();
      const ch = []; if (phone !== m.phone) ch.push({ k: 'phone', v: phone }); if (email !== m.email) ch.push({ k: 'email', v: email });
      if (ch.length) verifyChanges(m, ch, () => { toast('個人資料已更新', 'ok'); route(); }); else toast('已儲存', 'ok'); }
    else if (kind === 'survey') { const m = me(); const keys = ['活動宣傳', '活動時間', '活動內容', '活動師資', '活動場地']; if (keys.some(k => !fd.get('r_' + k))) { $('#s-err').textContent = '請完成「活動滿意度」五個項目'; return; }
      S.surveys.push({ id: 'S' + (S.sidSeq++), courseId: f.dataset.cid, memberId: m.id, at: TODAY, gender: val('gender'), age: val('age'), ident: fd.getAll('ident'), first: val('first'), other: val('other'), channel: fd.getAll('channel'), freq: val('freq'), conv: val('conv'), aware: val('aware'), will: val('will'), rate: Object.fromEntries(keys.map(k => [k, +fd.get('r_' + k)])), text: val('text') }); Core.save(); toast('已送出問卷，感謝您的回饋！', 'ok'); location.hash = '#/me/survey'; }
  });

  route();
})();
