/* 後台（體育局／廠商） */
(function () {
  'use strict';
  const { S, TODAY, DISTRICTS, CATS, PROJECTS, VENDORS, WK } = Core;
  const { esc, $, $$, toast, openModal, closeModal, confirmBox, csv, qr, bar, badge, stBadge, opts, tbd, mark } = UI;
  const app = $('#app');
  const isAdmin = () => !S.admin || ['ADMIN', 'SUPER', 'BUREAU'].includes(S.admin);
  const roleName = () => isAdmin() ? (S.admin === 'SUPER' ? '最高管理員' : '體育局') : Core.vendorOf(S.admin).name;
  const scoped = () => Core.views().filter(v => isAdmin() || v.c.vendor === S.admin);
  const hrs = c => ((+c.t1.slice(0, 2) * 60 + +c.t1.slice(3)) - (+c.t0.slice(0, 2) * 60 + +c.t0.slice(3))) / 60;
  const sched = c => '週' + c.wd.map(w => WK[w]).join('、') + ' ' + c.t0 + '–' + c.t1;
  const band = m => { const a = Core.ageAt(m.birth, TODAY); return a >= 65 ? '65歲以上' : a >= 23 ? '23-64歲' : '22歲以下'; };
  const pick = arg => { const L = scoped(); return L.find(v => v.c.id === arg) || L.find(v => v.st === '進行中') || L[0]; };
  const cSel = (cid, page, label) => `<div class="field"><label>${label || '班級'}</label><select data-act="csel" data-page="${page}" style="min-width:300px">${scoped().map(v => `<option value="${v.c.id}" ${v.c.id === cid ? 'selected' : ''}>${v.c.id}｜${esc(v.c.name)}（${esc(v.c.dist)}）— ${v.st}</option>`).join('')}</select></div>`;
  const chartRows = (rows, max, fmt) => `<div class="chart">${rows.map(r => `<div class="r"><span title="${esc(r.l)}" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(r.l)}</span>${bar(r.v, max, r.cls)}<span>${fmt ? fmt(r.v) : r.v}</span></div>`).join('')}</div>`;
  const mem = id => Core.memberOf(id);
  const pendingCount = () => scoped().reduce((a, v) => a + v.pend, 0);

  const NAV = [['總覽', [['dashboard', '儀表板', '📊']]], ['課程與場次管理', [['courses', '班級管理', '🗂️'], ['sessions', '場次與簽到', '📲']]], ['學員與報名', [['roster', '報名名單與審核', '👥'], ['import', '體適能匯入', '📥']]], ['統計報表與滿意度', [['reports', '成果統計報表', '📈'], ['survey', '滿意度統計', '📝'], ['rewards', '新北幣名單', '🎁']]], ['前台內容管理', [['banners', '首頁 Banner', '🖼️'], ['news', '最新消息', '📰']]], ['溝通', [['notices', '通知與公告', '📣']]]];
  const TITLES = { banners: '首頁 Banner 管理', news: '最新消息管理', dashboard: '儀表板', courses: '班級管理', course: '班級設定', sessions: '場次與簽到', roster: '報名名單與審核', import: '體適能匯入', reports: '成果統計報表', survey: '滿意度統計', rewards: '新北幣名單', notices: '通知與公告' };

  function shell(key, inner) {
    const pc = pendingCount(); const act = key === 'course' ? 'courses' : key;
    return `<div class="adm"><aside class="side"><a class="brand" href="#/dashboard">${mark}<span><b style="font-size:15px">課程報名管理後台</b><small>新北市政府體育局</small></span></a>
      ${NAV.filter(([g]) => isAdmin() || g !== '前台內容管理').map(([g, items]) => `<h6>${g}</h6>${items.map(([k, t, ic]) => `<a href="#/${k}" class="${act === k ? 'on' : ''}"><span>${ic}</span>${t}${k === 'roster' && pc ? badge(pc, 'warn') : ''}</a>`).join('')}`).join('')}
      <h6>其他</h6><a href="front.html" target="_blank">🌐 前往前台</a><a href="index.html">📘 原型說明</a><a href="#/dashboard" data-act="reset">♻️ 重置示範資料</a></aside>
      <div class="main"><header class="adm-h"><h1>${TITLES[key] || ''}</h1><div class="sp"><span class="muted xs">示範日期 ${Core.fmtD(TODAY, true)}</span><label class="xs muted" for="role">登入身分</label><select id="role" data-act="role"><option value="SUPER" ${S.admin === 'SUPER' ? 'selected' : ''}>最高管理員（全部功能）</option><option value="BUREAU" ${isAdmin() && S.admin !== 'SUPER' ? 'selected' : ''}>局端帳號（體育局承辦）</option>${VENDORS.map(v => `<option value="${v.id}" ${S.admin === v.id ? 'selected' : ''}>廠商：${v.name}</option>`).join('')}</select></div></header><div class="page">${inner}</div></div></div>`;
  }

  /* ---------- 路由 ---------- */
  function route() {
    const [p, qstr] = location.hash.slice(1).split('?'); const [a, b] = (p || '/dashboard').split('/').filter(Boolean); const query = Object.fromEntries(new URLSearchParams(qstr || ''));
    const page = a || 'dashboard'; let html = '';
    try {
      html = ({ dashboard, courses, course: courseForm, sessions, roster, import: importPage, reports, survey: surveyPage, rewards, notices, banners: bannersPage, news: newsAdmin }[page] || (() => '<div class="empty">找不到頁面</div>'))(b, query);
    } catch (err) { console.error(err); html = '<div class="alert bad">頁面發生錯誤：' + esc(err.message) + '</div>'; }
    const st = window.scrollY; app.innerHTML = shell(page, html); window.scrollTo(0, location.hash === prevHash ? st : 0); prevHash = location.hash; document.title = (TITLES[page] || '') + '｜後台（Prototype）';
    if (page === 'course') bindCourseForm();
  }
  let prevHash = ''; window.addEventListener('hashchange', route);

  /* ---------- 儀表板 ---------- */
  function dashboard() {
    const L = scoped().filter(v => !['草稿', '已下架'].includes(v.st)); const ids = L.map(v => v.c.id);
    const adm = L.reduce((a, v) => a + v.adm, 0), wait = L.reduce((a, v) => a + v.wait, 0), pend = L.reduce((a, v) => a + v.pend, 0);
    const rates = L.map(v => ({ v, r: Core.courseRate(v.c.id) })).filter(x => x.r);
    const svN = S.surveys.filter(s => ids.includes(s.courseId)).length; const svBase = L.filter(v => S.surveys.some(s => s.courseId === v.c.id)).reduce((a, v) => a + v.adm, 0);
    const today = L.flatMap(v => v.ss.filter(s => s.date === TODAY).map(s => ({ v, s })));
    const noPre = L.filter(v => v.st === '進行中' && v.c.prepost && !Core.enrOf(v.c.id, ['已錄取']).some(e => Core.fitOf(e.memberId).some(f => f.date >= '2027-01-01')));
    const byProj = PROJECTS.map(p => ({ p, vs: L.filter(v => v.c.proj === p.id) })).filter(x => x.vs.length);
    return `<div class="grid g4"><div class="card kpi"><div class="t">上架班級</div><div class="n">${L.length}</div><div class="s">報名中 ${L.filter(v => v.st === '報名中').length}・進行中 ${L.filter(v => v.st === '進行中').length}・已結束 ${L.filter(v => v.st === '已結束').length}</div></div>
      <div class="card kpi"><div class="t">錄取人次</div><div class="n">${adm}</div><div class="s">待審核 ${pend}・候補 ${wait}</div></div><div class="card kpi"><div class="t">平均出席率（進行中班級）</div><div class="n">${rates.length ? Core.avg(rates.map(x => x.r.avg)).toFixed(1) + '%' : '—'}</div><div class="s">門檻 60%</div></div><div class="card kpi"><div class="t">問卷回收（已回收／應回收）</div><div class="n">${svN} / ${svBase}</div><div class="s">回收率 ${svBase ? Core.pct(svN, svBase) : 0}%・尚缺 ${Math.max(0, svBase - svN)} 份；距 70% 目標還差 ${Math.max(0, Math.ceil(svBase * 0.7) - svN)} 份</div></div></div>
      <div class="grid g2 mt"><div class="card"><h3>各計畫報名狀況</h3>${byProj.map(({ p, vs }) => { const o = vs.reduce((a, v) => a + v.occ, 0), cp = vs.reduce((a, v) => a + v.c.cap, 0); return `<div style="margin-bottom:14px"><div class="row between small"><b>${esc(p.name)}</b><span>${vs.length} 班｜${o}/${cp}（${Core.pct(o, cp)}%）</span></div>${bar(o, cp, 'info lg')}</div>`; }).join('') || '<div class="empty">無資料</div>'}${isAdmin() ? '<div class="note-box small">已整合 3 個計畫、' + VENDORS.length + ' 家廠商於同一個後台；新增廠商或計畫不需另建系統。</div>' : ''}</div>
      <div class="card"><h3>進行中班級出席率 <span class="xs muted">（紅＝低於 60%）</span></h3>${rates.length ? chartRows(rates.map(x => ({ l: x.v.c.name + '・' + x.v.c.dist, v: x.r.avg, cls: x.r.avg < 60 ? 'bad' : 'ok' })), 100, v => v + '%') : '<div class="empty">目前沒有進行中的班級</div>'}</div></div>
      <div class="grid g2 mt"><div class="card"><h3>待辦事項</h3><div class="stack small">${pend ? `<a href="#/roster">👥 有 <b>${pend}</b> 筆報名待審核 →</a>` : ''}${today.map(({ v, s }) => `<a href="#/sessions/${v.c.id}">📲 今日第 ${s.n} 堂：${esc(v.c.name)}（${s.t0}）→ 簽到／補登</a>`).join('')}${noPre.map(v => `<a href="#/import/${v.c.id}">📥「${esc(v.c.name)}」尚未匯入本期前測資料 →</a>`).join('')}${L.filter(v => v.st === '額滿候補' || (v.st === '進行中' && v.wait)).map(v => `<a href="#/roster/${v.c.id}">⏳「${esc(v.c.name)}」額滿，候補 ${v.wait} 人 →</a>`).join('')}${!pend && !today.length && !noPre.length ? '<span class="muted">目前沒有待辦事項。</span>' : ''}</div></div>
      <div class="card"><h3>簡訊額度與最近通知</h3><div class="row between"><span>簡訊餘額</span><b style="font-size:22px">${S.smsBalance.toLocaleString()} 則</b></div><div class="small muted mb">簡訊採預先儲值、發送時扣抵 ${tbd(5)}</div>${S.messages.slice(0, 3).map(m => `<div class="small" style="padding:7px 0;border-top:1px dashed var(--line)"><b>${esc(m.title)}</b><div class="xs muted">${m.at}｜${m.channels.join('、')}｜${esc(m.by)}</div></div>`).join('')}<a class="btn sm mt" href="#/notices">通知與公告</a></div></div>`;
  }

  /* ---------- 班級管理 ---------- */
  let CF = { kw: '', proj: '', dist: '', st: '' };
  function courses() {
    let L = scoped().filter(v => (!CF.proj || v.c.proj === CF.proj) && (!CF.dist || v.c.dist === CF.dist) && (!CF.st || v.st === CF.st) && (!CF.kw || (v.c.name + v.c.venue + v.c.instr + v.vendor.name).includes(CF.kw)));
    return `<div class="toolbar"><div class="field grow"><label>搜尋</label><input type="search" id="cf-kw" value="${esc(CF.kw)}" placeholder="班級、場地、老師、廠商"></div><div class="field"><label>計畫</label><select id="cf-proj" data-act="cf">${opts(PROJECTS.map(p => ({ v: p.id, t: p.short })), CF.proj, '全部')}</select></div><div class="field"><label>行政區</label><select id="cf-dist" data-act="cf">${opts(DISTRICTS.map(d => ({ v: d, t: d + '區' })), CF.dist, '全部')}</select></div><div class="field"><label>狀態</label><select id="cf-st" data-act="cf">${opts(['報名中', '額滿候補', '尚未開放', '報名截止', '進行中', '已結束', '草稿', '已下架'], CF.st, '全部')}</select></div><a class="btn primary" href="#/course/new">＋ 新增班級</a></div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>班級</th><th>計畫／廠商</th><th>行政區</th><th>類型</th><th>上課時間</th><th>報名期間</th><th>錄取／名額</th><th>狀態</th><th>上架</th><th></th></tr></thead><tbody>${L.map(v => { const c = v.c; return `<tr><td><b>${esc(c.name)}</b><div class="xs muted">${c.id}｜${esc(c.venue)}</div></td><td>${badge(v.proj.short, 'brand')}<div class="xs muted">${esc(v.vendor.name)}</div></td><td>${esc(c.dist)}</td><td class="nowrap">${esc(c.kind)}${c.limit ? '<div class="xs muted">限報 2 班/年</div>' : ''}</td><td class="small">${sched(c)}<div class="xs muted">${Core.fmtD(v.first)} 起，${c.ns} 堂</div></td><td class="small nowrap">${Core.fmtD(c.ro)}<br>– ${Core.fmtD(c.rc)}</td><td style="min-width:110px"><b>${v.adm}</b>${v.pend ? '+' + v.pend : ''} / ${c.cap}${v.wait ? '<div class="xs muted">候補 ' + v.wait + '</div>' : ''}${bar(v.occ, c.cap, v.left === 0 ? 'bad' : '')}</td><td>${stBadge(v.st)}</td><td><label class="sw"><input type="checkbox" data-act="pub" data-id="${c.id}" ${c.pub === 'on' ? 'checked' : ''} aria-label="上架"><span></span></label></td><td class="nowrap"><a class="btn sm" href="#/course/${c.id}">編輯</a> <a class="btn sm" href="#/sessions/${c.id}">場次</a> <a class="btn sm" href="#/roster/${c.id}">名單</a></td></tr>`; }).join('') || '<tr><td colspan="10" class="empty">沒有符合條件的班級</td></tr>'}</tbody></table></div><p class="xs muted mt">廠商可自行建立、編輯、上下架所屬班級；體育局可檢視所有計畫與廠商。長期帶狀課以「班」為單位，每人每年限報 2 班。</p>`;
  }

  function courseForm(id) {
    const isNew = id === 'new'; const c0 = isNew ? { id: '', proj: 'P1', vendor: isAdmin() ? 'V1' : S.admin, name: '', cat: CATS[0], dist: '板橋', venue: '', io: '室內', wd: [2, 4], t0: '19:00', t1: '20:30', start: '2027-06-01', ns: 24, kind: '長期帶狀', limit: true, cap: 25, wcap: 10, ro: '2027-05-01', rc: '2027-05-25', review: false, prio: 0, prepost: true, pub: 'draft', instr: '', survey: 'last', desc: '' } : Core.courseOf(id);
    if (!c0) return '<div class="empty">找不到班級</div>'; const sel = (n, arr, v) => `<select name="${n}" id="cf_${n}">${arr}</select>`;
    return `<p class="small"><a href="#/courses">← 返回班級管理</a></p><form class="card" id="cform" data-form="course" data-id="${isNew ? '' : c0.id}"><div class="sec-t">基本資料${isNew ? '' : '　<span class="muted xs">' + c0.id + '</span>'}</div><div class="fgrid">
      <div class="field"><label class="req" for="cf_proj">所屬計畫</label>${sel('proj', opts(PROJECTS.map(p => ({ v: p.id, t: p.name })), c0.proj))}</div><div class="field"><label class="req" for="cf_vendor">執行廠商</label><select name="vendor" id="cf_vendor" ${isAdmin() ? '' : 'disabled'}>${opts(VENDORS.map(v => ({ v: v.id, t: v.name })), c0.vendor)}</select></div>
      <div class="field full"><label class="req" for="cf_name">班級名稱</label><input type="text" name="name" id="cf_name" value="${esc(c0.name)}" placeholder="例：肌力有氧班"></div><div class="field"><label for="cf_cat">運動類型</label>${sel('cat', opts(CATS, c0.cat))}</div><div class="field"><label for="cf_instr">授課老師</label><input type="text" name="instr" id="cf_instr" value="${esc(c0.instr)}"></div>
      <div class="field"><label for="cf_dist">行政區</label>${sel('dist', opts(DISTRICTS.map(d => ({ v: d, t: d + '區' })), c0.dist))}</div><div class="field"><label for="cf_io">場地型態</label>${sel('io', opts(['室內', '室外', '半室內'], c0.io))}</div><div class="field full"><label class="req" for="cf_venue">上課地點</label><input type="text" name="venue" id="cf_venue" value="${esc(c0.venue)}" placeholder="里辦公處、活動中心、學校…"></div></div>
      <div class="sec-t">課程類型與時間</div><div class="fgrid3"><div class="field"><label for="cf_kind">課程類型</label>${sel('kind', opts(['長期帶狀', '中期', '短期'], c0.kind))}</div><div class="field"><label class="req" for="cf_ns">總堂數</label><input type="number" name="ns" id="cf_ns" min="1" max="60" value="${c0.ns}"><span class="hint">長期帶狀課：12 週、每週 2 堂＝24 堂</span></div><div class="field"><label>每人每年限報 2 班</label><label class="check" style="margin-top:6px"><input type="checkbox" name="limit" ${c0.limit ? 'checked' : ''}>計入「長期班」限制（以班為單位）</label></div></div>
      <div class="field"><label class="lbl req">上課星期</label><div class="opts">${[1, 2, 3, 4, 5, 6, 0].map(d => `<label><input type="checkbox" name="wd" value="${d}" ${c0.wd.includes(d) ? 'checked' : ''}>週${WK[d]}</label>`).join('')}</div></div>
      <div class="fgrid3"><div class="field"><label class="req" for="cf_t0">開始時間</label><input type="time" name="t0" id="cf_t0" value="${c0.t0}"></div><div class="field"><label class="req" for="cf_t1">結束時間</label><input type="time" name="t1" id="cf_t1" value="${c0.t1}"></div><div class="field"><label class="req" for="cf_start">首堂日期（起算）</label><input type="date" name="start" id="cf_start" value="${c0.start}"></div></div><div class="note-box small" id="cf-prev"></div>
      <div class="sec-t">報名設定</div><div class="fgrid3"><div class="field"><label class="req" for="cf_ro">報名開始</label><input type="date" name="ro" id="cf_ro" value="${c0.ro}"></div><div class="field"><label class="req" for="cf_rc">報名截止</label><input type="date" name="rc" id="cf_rc" value="${c0.rc}"></div><div class="field"><label class="req" for="cf_cap">名額</label><input type="number" name="cap" id="cf_cap" min="1" value="${c0.cap}"><span class="hint">一般班 ≥25 人；偏鄉區可 ≥10 人</span></div>
      <div class="field"><label for="cf_review">報名方式</label>${sel('review', opts([{ v: '0', t: '自動錄取（額滿轉候補）' }, { v: '1', t: '人工審核' }], c0.review ? '1' : '0'))}</div><div class="field"><label for="cf_prio">優先保障名額</label><input type="number" name="prio" id="cf_prio" min="0" value="${c0.prio}"><span class="hint">低收入戶、新住民女性、原住民族女性</span></div><div class="field"><label for="cf_pub">上架狀態</label>${sel('pub', opts([{ v: 'draft', t: '草稿（不公開）' }, { v: 'on', t: '上架' }, { v: 'off', t: '下架' }], c0.pub))}</div></div>
      <div class="sec-t">體適能與問卷</div><div class="fgrid"><div class="field"><label class="check"><input type="checkbox" name="prepost" ${c0.prepost ? 'checked' : ''}><span>本班辦理體適能前後測（間隔至少 12 週／78 天）</span></label></div><div class="field"><label for="cf_survey">滿意度問卷開放時機 ${tbd(9)}</label>${sel('survey', opts([{ v: 'any', t: '報名後即可填答' }, { v: 'mid', t: '上課過半後' }, { v: 'last', t: '最後一堂課開放' }], c0.survey))}</div></div>
      <div class="field"><label for="cf_desc">課程簡介</label><textarea name="desc" id="cf_desc">${esc(c0.desc)}</textarea></div><div class="err" id="cf-err"></div><div class="modal-foot"><a class="btn" href="#/courses">取消</a><button class="btn primary lg">${isNew ? '建立班級' : '儲存變更'}</button></div></form>`;
  }
  function readCourse(f) {
    const fd = new FormData(f); const v = n => (fd.get(n) || '').toString().trim();
    return { proj: v('proj'), vendor: isAdmin() ? v('vendor') : S.admin, name: v('name'), cat: v('cat'), instr: v('instr'), dist: v('dist'), io: v('io'), venue: v('venue'), kind: v('kind'), ns: +v('ns') || 0, limit: !!fd.get('limit'), wd: fd.getAll('wd').map(Number), t0: v('t0'), t1: v('t1'), start: v('start'), ro: v('ro'), rc: v('rc'), cap: +v('cap') || 0, review: v('review') === '1', prio: +v('prio') || 0, pub: v('pub'), prepost: !!fd.get('prepost'), survey: v('survey'), desc: v('desc') };
  }
  function bindCourseForm() {
    const f = $('#cform'); const upd = () => { const d = readCourse(f); const p = $('#cf-prev'); if (!d.wd.length || !d.ns || !d.start) { p.textContent = '請設定上課星期、堂數與首堂日期以預覽時間表'; return; } const ss = Core.sessionsOf(Object.assign({ over: {} }, d)); p.innerHTML = `預覽：共 <b>${ss.length}</b> 堂，${Core.fmtD(ss[0].date, true)} – ${Core.fmtD(ss[ss.length - 1].date, true)}，每堂 ${hrs(d)} 小時，合計 <b>${ss.length * hrs(d)}</b> 小時。`; };
    f.addEventListener('input', upd); f.addEventListener('change', e => { if (e.target.name === 'kind') { const k = e.target.value; f.ns.value = k === '長期帶狀' ? 24 : k === '中期' ? 12 : 1; f.limit.checked = k === '長期帶狀'; upd(); } }); upd();
  }

  /* ---------- 場次與簽到 ---------- */
  function sessions(arg) {
    const v = pick(arg); if (!v) return '<div class="empty card">尚無班級</div>'; const c = v.c; const adm = Core.enrOf(c.id, ['已錄取']);
    return `<div class="toolbar">${cSel(c.id, 'sessions')}<a class="btn" href="#/roster/${c.id}">報名名單</a><a class="btn" href="#/course/${c.id}">班級設定</a></div>
      <div class="card flat mb"><div class="row between"><div><b>${esc(c.name)}</b>　${stBadge(v.st)}<div class="small muted">${esc(v.proj.name)}｜${esc(v.vendor.name)}｜${esc(c.dist)}區・${esc(c.venue)}｜${sched(c)}</div></div><div class="small">錄取 <b>${v.adm}</b> 人${v.wait ? '・候補 ' + v.wait : ''}</div></div></div>
      <div class="note-box small mb">📌 變更活動內容、場地、師資及時間，應於活動前 2 週函送機關審查同意（颱風、停班停課等不可抗力除外）。改期／停課後可一併以 Email／簡訊通知學員。</div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>堂次</th><th>日期</th><th>時間</th><th>地點</th><th>狀態</th><th>出席</th><th></th></tr></thead><tbody>${v.ss.map(s => { const held = s.date < TODAY, isT = s.date === TODAY; const p = adm.filter(e => (Core.attRec(c.id, s.n, e.memberId) || {}).s === 'P').length; const rec = adm.filter(e => Core.attRec(c.id, s.n, e.memberId)).length;
        return `<tr ${isT ? 'style="background:var(--brand-l)"' : ''}><td><b>${s.n}</b></td><td>${Core.fmtD(s.date)}${s.moved && s.date !== s.base ? '<div class="xs muted">原 ' + Core.fmtD(s.base) + '</div>' : ''}</td><td>${s.t0}–${s.t1}</td><td class="small">${esc(s.venue)}${s.note ? '<div class="xs muted">' + esc(s.note) + '</div>' : ''}</td><td>${s.cancelled ? badge('停課', 'bad') : isT ? badge('今日上課', 'brand') : held ? badge('已上課', 'ok') : badge('待上課', 'gray')}${s.moved && !s.cancelled ? ' ' + badge('已異動', 'warn') : ''}</td><td style="min-width:130px">${s.cancelled || (!held && !isT) ? '<span class="muted xs">—</span>' : `<b>${p}</b>/${adm.length}${rec < adm.length ? '<span class="xs muted">（未登 ' + (adm.length - rec) + '）</span>' : ''}${bar(p, adm.length, p / (adm.length || 1) < 0.6 ? 'bad' : 'ok')}`}</td>
        <td class="nowrap">${!s.cancelled && (held || isT) ? `<button class="btn sm primary" data-act="att" data-c="${c.id}" data-n="${s.n}">出缺席登載</button>` : ''} ${!s.cancelled && !held ? `<button class="btn sm" data-act="qr" data-c="${c.id}" data-n="${s.n}">QR 簽到</button>` : ''} ${!held ? `<button class="btn sm" data-act="resched" data-c="${c.id}" data-n="${s.n}">改期／停課</button>` : ''}</td></tr>`; }).join('')}</tbody></table></div>`;
  }

  function attModal(cid, n) {
    const c = Core.courseOf(cid), s = Core.sessionsOf(c)[n - 1]; const adm = Core.enrOf(cid, ['已錄取']).map(e => mem(e.memberId));
    const o = openModal(`<h3>出缺席登載｜第 ${n} 堂 ${Core.fmtD(s.date)}</h3><p class="small muted">${esc(c.name)}。學員以 QR 簽到者自動帶入；無手機或收訊不佳者，請依紙本簽到表於此補登。</p><div class="row mb"><button class="btn sm" data-act="all-p">全部設為出席</button><button class="btn sm" data-act="all-clear">全部清除</button><span class="xs muted">共 ${adm.length} 人</span></div>
      <div class="tbl-wrap" style="max-height:52vh;overflow:auto"><table class="tbl"><thead><tr><th>姓名</th><th>身分證</th><th>簽到方式</th><th>出缺席</th></tr></thead><tbody>${adm.map(m => { const r = Core.attRec(cid, n, m.id) || {}; return `<tr data-mid="${m.id}"><td><b>${esc(m.name)}</b></td><td class="small">${Core.maskId(m.idno)}</td><td class="small">${r.s === 'P' ? esc(r.via || 'QR') + (r.in ? '｜' + r.in + (r.out ? '–' + r.out : '') : '') : '<span class="muted">—</span>'}</td><td><div class="seg">${[['P', '出席'], ['A', '缺席'], ['L', '請假']].map(([k, t]) => `<label class="${k}"><input type="radio" name="a_${m.id}" value="${k}" ${r.s === k ? 'checked' : ''}><span>${t}</span></label>`).join('')}</div></td></tr>`; }).join('')}</tbody></table></div>
      <div class="modal-foot"><button class="btn" data-close>取消</button><button class="btn" data-act="print-sheet" data-c="${cid}" data-n="${n}">列印紙本簽到表</button><button class="btn primary" id="att-save">儲存</button></div>`, { wide: true });
    $('#att-save', o).onclick = () => { adm.forEach(m => { const v = (o.querySelector(`input[name="a_${m.id}"]:checked`) || {}).value; const old = Core.attRec(cid, n, m.id); if (!v) Core.setAtt(cid, n, m.id, null); else if (v === 'P') Core.setAtt(cid, n, m.id, old && old.s === 'P' ? old : { s: 'P', in: s.t0, out: s.t1, via: '紙本補登' }); else Core.setAtt(cid, n, m.id, { s: v, via: '紙本補登' }); }); closeModal(); toast('已儲存出缺席', 'ok'); route(); };
  }
  function sheetModal(cid, n) {
    const c = Core.courseOf(cid), s = Core.sessionsOf(c)[n - 1]; const adm = Core.enrOf(cid, ['已錄取']).map(e => mem(e.memberId));
    openModal(`<div class="print-sheet"><h3 style="text-align:center">${esc(c.name)} 簽到表</h3><p class="small" style="text-align:center">${Core.fmtD(s.date, true)} ${s.t0}–${s.t1}｜${esc(s.venue)}｜第 ${n} 堂｜授課老師：${esc(c.instr)}</p><table><thead><tr><th style="width:44px">序</th><th>姓名</th><th style="width:130px">簽到</th><th style="width:130px">簽退</th><th>備註</th></tr></thead><tbody>${adm.map((m, i) => `<tr><td>${i + 1}</td><td>${esc(m.name)}</td><td></td><td></td><td></td></tr>`).join('')}</tbody></table></div><div class="modal-foot"><button class="btn" data-close>關閉</button><button class="btn primary" onclick="window.print()">列印</button></div>`, { wide: true });
  }
  function qrModal(cid, n) {
    const c = Core.courseOf(cid), s = Core.sessionsOf(c)[n - 1]; const adm = Core.enrOf(cid, ['已錄取']); const cnt = () => adm.filter(e => (Core.attRec(cid, n, e.memberId) || {}).s === 'P').length;
    const o = openModal(`<h3>現場簽到 QR Code</h3><div class="qr-box"><div>${qr(cid + '-' + n + '-' + s.date, 220)}</div><div style="flex:1;min-width:200px"><b>${esc(c.name)}</b><div class="small muted">第 ${n} 堂｜${Core.fmtD(s.date, true)} ${s.t0}–${s.t1}</div><p class="small mt">請列印或投影此 QR Code 於教室入口。學員以手機掃描並登入後，按「簽到」「簽退」即完成，不需再手寫簽名。</p><div class="card flat"><div class="small muted">目前已簽到</div><div style="font-size:30px;font-weight:800"><span id="qr-n">${cnt()}</span> / ${adm.length}</div></div></div></div><div class="note-box small mt">示意 QR（非真實可掃描）。實際系統會產生含場次與時效的動態 QR；紙本簽到表保留作為備援。</div><div class="modal-foot"><button class="btn" data-act="print-sheet" data-c="${cid}" data-n="${n}">紙本簽到表</button><button class="btn" id="qr-refresh">重新整理人數</button><button class="btn primary" data-close>關閉</button></div>`);
    $('#qr-refresh', o).onclick = () => { $('#qr-n').textContent = cnt(); };
  }
  const FM = ['天候不佳（颱風／豪雨）', '停班停課', '場地因素', '師資因素', '其他'];
  function reschedModal(cid, n) {
    const c = Core.courseOf(cid), s = Core.sessionsOf(c)[n - 1]; const days = Core.diffDays(TODAY, s.date); const rcp = Core.audienceIds({ type: 'course', courseId: cid }).length;
    const o = openModal(`<h3>改期／停課｜第 ${n} 堂（${Core.fmtD(s.date)} ${s.t0}）</h3><form id="rs-f"><div class="field"><label class="lbl">異動類型</label><div class="opts"><label><input type="radio" name="type" value="move" checked>改期／改時間</label><label><input type="radio" name="type" value="venue">更換地點</label><label><input type="radio" name="type" value="cancel">停課</label></div></div>
      <div class="fgrid3" id="rs-when"><div class="field"><label for="rs-date">新日期</label><input id="rs-date" type="date" name="date" value="${s.date}" min="${TODAY}"></div><div class="field"><label>開始</label><input type="time" name="t0" value="${s.t0}"></div><div class="field"><label>結束</label><input type="time" name="t1" value="${s.t1}"></div></div><div class="field" id="rs-venue"><label>地點</label><input type="text" name="venue" value="${esc(s.venue)}"></div>
      <div class="field"><label for="rs-reason">異動原因</label><select id="rs-reason" name="reason">${opts(FM, FM[0])}</select></div>${days < 14 ? `<div class="alert warn" id="rs-warn">距上課僅 ${days} 天，未滿 2 週。非不可抗力者，需先取得機關同意。<label class="check" style="margin-top:6px"><input type="checkbox" name="ok14"><span>已取得機關同意（文號：<input type="text" name="docno" style="width:140px;min-height:28px;padding:2px 8px" placeholder="選填">）</span></label></div>` : '<div class="alert info small">距上課 ' + days + ' 天，符合「活動前 2 週函送機關審查」規定；請於變更前完成函文。</div>'}
      <div class="sec-t">通知學員（${rcp} 人）</div><div class="row"><label class="check"><input type="checkbox" name="em" checked>Email</label><label class="check"><input type="checkbox" name="sm" checked>簡訊</label></div><div class="field mt"><textarea name="msg" id="rs-msg" style="min-height:96px"></textarea></div><div class="small muted" id="rs-sms"></div><div class="err" id="rs-err"></div>
      <div class="modal-foot">${s.moved ? '<button type="button" class="btn danger" id="rs-undo">還原為原定</button>' : ''}<button type="button" class="btn" data-close>取消</button><button class="btn primary">確認異動並通知</button></div></form>`, { wide: true });
    const f = $('#rs-f', o); let dirty = false;
    const gen = () => { const fd = new FormData(f); const t = fd.get('type'); const base = '【課程異動】' + c.name + ' 第' + n + '堂（原 ' + Core.fmtD(s.base) + ' ' + c.t0 + '）'; const why = '原因：' + fd.get('reason') + '。造成不便，敬請見諒。';
      const text = t === 'cancel' ? base + '停課，補課時間另行通知。' + why : t === 'venue' ? base + '改至「' + fd.get('venue') + '」上課，時間不變。' + why : base + '改為 ' + Core.fmtD(fd.get('date')) + ' ' + fd.get('t0') + '–' + fd.get('t1') + '，地點：' + c.venue + '。' + why; if (!dirty) f.msg.value = text; const per = Math.ceil(f.msg.value.length / 70); $('#rs-sms').textContent = f.sm.checked ? '簡訊 ' + f.msg.value.length + ' 字，每人 ' + per + ' 則，預估發送 ' + rcp * per + ' 則（餘額 ' + S.smsBalance + ' 則）' : '僅發送 Email'; $('#rs-when').style.opacity = t === 'move' ? 1 : .35; $('#rs-venue').style.opacity = t === 'venue' ? 1 : .35; };
    f.addEventListener('input', e => { if (e.target.name === 'msg') dirty = true; gen(); }); f.addEventListener('change', gen); gen();
    if ($('#rs-undo', o)) $('#rs-undo', o).onclick = () => { delete c.over[n]; Core.save(); closeModal(); toast('已還原為原定場次', 'ok'); route(); };
    f.onsubmit = e => { e.preventDefault(); const fd = new FormData(f); const t = fd.get('type'); const reason = fd.get('reason'); const major = reason === FM[0] || reason === FM[1];
      if (days < 14 && !major && !fd.get('ok14')) { $('#rs-err').textContent = '距上課未滿 2 週且非不可抗力，請確認已取得機關同意'; return; }
      if (t === 'move' && (!fd.get('date') || fd.get('t0') >= fd.get('t1'))) { $('#rs-err').textContent = '請確認新日期與時間'; return; }
      const note = reason + (fd.get('docno') ? '（機關文號 ' + fd.get('docno') + '）' : ''); c.over = c.over || {};
      c.over[n] = t === 'cancel' ? { cancelled: true, note } : t === 'venue' ? { venue: fd.get('venue'), note } : { date: fd.get('date'), t0: fd.get('t0'), t1: fd.get('t1'), note };
      const ch = [fd.get('em') ? 'Email' : null, fd.get('sm') ? '簡訊' : null].filter(Boolean); let sms = 0; if (fd.get('sm')) { sms = rcp * Math.ceil(f.msg.value.length / 70); S.smsBalance = Math.max(0, S.smsBalance - sms); }
      if (ch.length) Core.addMessage({ title: '【課程異動】' + c.name + (t === 'cancel' ? ' 停課' : t === 'venue' ? ' 更換地點' : ' 改期'), body: f.msg.value, channels: ch, audience: { type: 'course', courseId: cid }, by: roleName(), sms }); Core.save(); closeModal(); toast('已更新場次' + (ch.length ? '，並通知 ' + rcp + ' 位學員' : ''), 'ok'); route(); };
  }

  /* ---------- 報名名單與審核 ---------- */
  let RF = { st: '', kw: '', full: false };
  function roster(arg) {
    const v = pick(arg); if (!v) return '<div class="empty card">尚無班級</div>'; const c = v.c;
    const all = S.enr.filter(e => e.courseId === c.id).sort((a, b) => a.at.localeCompare(b.at)); const cnt = k => all.filter(e => e.status === k).length;
    const L = all.filter(e => (!RF.st || e.status === RF.st) && (!RF.kw || (mem(e.memberId).name + mem(e.memberId).idno).includes(RF.kw.toUpperCase())));
    return `<div class="toolbar">${cSel(c.id, 'roster')}<div class="field"><label>搜尋姓名／身分證</label><input type="search" id="rf-kw" value="${esc(RF.kw)}"></div><div class="field"><label>&nbsp;</label><label class="check" style="min-height:40px;align-items:center"><input type="checkbox" id="rf-full" ${RF.full ? 'checked' : ''}>顯示完整身分證</label></div><button class="btn" data-act="exp-roster" data-c="${c.id}">⬇ 匯出名單 CSV</button><button class="btn" data-act="sheet-pick" data-c="${c.id}">🖨 紙本簽到表</button><a class="btn" href="#/import/${c.id}">📥 匯入體適能</a></div>
      <div class="card flat mb"><div class="row between"><div><b>${esc(c.name)}</b> ${stBadge(v.st)} ${badge(c.review ? '人工審核' : '自動錄取', c.review ? 'warn' : 'gray')}<div class="small muted">${esc(v.proj.name)}｜${esc(v.vendor.name)}｜名額 ${c.cap}${c.prio ? '（優先保障 ' + c.prio + '）' : ''}｜報名 ${Core.fmtD(c.ro)} – ${Core.fmtD(c.rc)}</div></div><div style="min-width:180px"><div class="row between small"><span>錄取＋待審</span><b>${v.occ}/${c.cap}</b></div>${bar(v.occ, c.cap, v.left === 0 ? 'bad' : 'ok')}</div></div></div>
      <div class="row mb"><a class="chip ${RF.st === '' ? 'on' : ''}" data-act="rf-st" data-v="">全部 ${all.length}</a>${['已錄取', '待審核', '候補', '取消'].map(k => `<a class="chip ${RF.st === k ? 'on' : ''}" data-act="rf-st" data-v="${k}">${k} ${cnt(k)}</a>`).join('')}<span style="margin-left:auto" class="row"><span class="xs muted">已選 <b id="sel-n">0</b> 筆</span><button class="btn sm" data-act="bulk" data-s="已錄取">核准／錄取</button><button class="btn sm" data-act="bulk" data-s="候補">轉候補</button><button class="btn sm danger" data-act="bulk" data-s="取消">取消資格</button></span></div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th><input type="checkbox" id="ck-all" aria-label="全選"></th><th>姓名</th><th>性別／年齡</th><th>身分證字號</th><th>手機</th><th>身分別</th><th>報名時間</th><th>出席率</th><th>狀態</th><th>備註（僅後台可見）</th></tr></thead><tbody>${L.map(e => { const m = mem(e.memberId); const r = e.status === '已錄取' ? Core.memberRate(c.id, m.id) : null; return `<tr><td><input type="checkbox" class="rs-ck" value="${e.id}" aria-label="選取 ${esc(m.name)}"></td><td><b>${esc(m.name)}</b></td><td>${m.gender === 'F' ? '女' : '男'}／${Core.ageAt(m.birth, TODAY)} 歲</td><td class="small">${RF.full ? m.idno : Core.maskId(m.idno)}</td><td class="small">${RF.full ? m.phone : Core.maskPhone(m.phone)}</td><td class="small">${e.prio === '一般' ? '一般' : badge(e.prio, 'brand')}</td><td class="small nowrap">${e.at}</td><td style="min-width:90px">${r ? `<b class="${r.rate < 60 ? 'delta down' : ''}">${r.rate}%</b> <span class="xs muted">${r.p}/${r.total}</span>` : '<span class="muted xs">—</span>'}</td><td><select data-act="enr-st" data-id="${e.id}" style="width:auto;min-height:32px;padding:3px 8px">${opts(['已錄取', '待審核', '候補', '取消'], e.status)}</select></td><td style="min-width:210px"><input type="text" data-act="remark" data-id="${e.id}" value="${esc(e.remark || '')}" maxlength="200" placeholder="選填（民眾看不到）" aria-label="備註：${esc(m.name)}" style="min-height:32px;padding:3px 8px"></td></tr>`; }).join('') || '<tr><td colspan="10" class="empty">沒有資料</td></tr>'}</tbody></table></div>
      <p class="xs muted mt">取消或轉候補釋出名額時，系統自動依報名時間遞補第一位候補，並以 Email／簡訊通知。身分證與聯絡資料於資料庫加密保存；完整顯示與匯出於正式系統會留存稽核紀錄。</p>`;
  }
  function changeEnr(id, st) {
    const e = S.enr.find(x => x.id === id), c = Core.courseOf(e.courseId), apply = () => { const r = Core.setEnr(id, st, roleName()); toast(mem(e.memberId).name + '：' + st + (r && r.promoted ? '；已遞補 ' + mem(r.promoted.memberId).name : ''), 'ok'); route(); };
    if (st === '已錄取' && Core.view(c).occ >= c.cap && e.status !== '待審核') confirmBox('超出名額', '「' + esc(c.name) + '」名額已滿（' + c.cap + ' 人），仍要錄取嗎？', '仍要錄取', apply); else apply();
  }

  /* ---------- 體適能匯入 ---------- */
  let IM = { cid: '', kind: '一般', phase: '前測', date: '2027-04-17', file: '', rows: null, done: null };
  const HEAD = { '一般': ['流水號', '身分證字號', '性別', '出生年', '年齡', '費用類別', '身高', '體重', 'BMI', '評估', '第一次腰圍', '第二次腰圍', '第一次臀圍', '第二次臀圍', '腰臀圍比', '評估', '仰臥捲腹', '評估', '第一次坐姿體前彎', '第二次坐姿體前彎', '最佳成績', '評估', '運動時間', '運動後心跳(1分至1分30秒)', '運動後心跳(2分至2分30秒)', '運動後心跳(3分至3分30秒)', '體力指數', '評估', '居住縣市', '郵遞區號', '教育程度', '職業類別', '月收入', '婚姻狀況', '是否獨居'], '銀髮': ['編號/流水號', '身份證字號', '性別', '出生年', '年齡', '費用類別', '身高', '體重', 'BMI', '評估', '第一次腰圍', '第二次腰圍', '第一次臀圍', '第二次臀圍', '腰臀圍比', '評估', '開眼單足立第一次', '開眼單足立第二次', '最佳成績', '評估', '椅子坐立(下肢肌力)', '評估', '肱二頭肌屈舉(上肢肌力)', '評估', '原地站立抬膝(2分鐘)', '評估', '椅子坐姿體前彎(第一次)', '椅子坐姿體前彎(第二次)', '評估', '抓背測驗(第一次)', '抓背測驗(第二次)', '評估', '椅子坐立繞物(第一次)', '椅子坐立繞物(第二次)', '評估', '居住縣市', '郵遞區號', '教育程度', '職業類別'] };
  function genVals(m, kind, phase) {
    const r = Core.rng(+m.id.slice(1) * 97 + (phase === '後測' ? 5 : 1)); const up = phase === '後測' ? 1 : 0;
    if (m.id === 'M001') return phase === '前測' ? { height: 158, weight: 60.8, bmi: 24.4, whr: 0.83, situp: 18, sitreach: 30, stepIdx: 51 } : { height: 158, weight: 59.1, bmi: 23.7, whr: 0.81, situp: 24, sitreach: 35, stepIdx: 57.4 };
    if (kind === '銀髮') return { chairStand: 13 + (r() * 10 | 0) + up * 3, armCurl: 13 + (r() * 10 | 0) + up * 3, stepInPlace: 70 + (r() * 40 | 0) + up * 8, chairReach: +(6 + r() * 12 + up * 1.5).toFixed(1) };
    const h = 150 + (r() * 24 | 0), w = +(46 + r() * 30).toFixed(1); return { height: h, weight: w, bmi: +(w / ((h / 100) ** 2)).toFixed(1), whr: +(0.74 + r() * 0.14).toFixed(2), situp: 12 + (r() * 16 | 0) + up * 4, sitreach: 18 + (r() * 24 | 0) + up * 4, stepIdx: +(42 + r() * 24 + up * 5).toFixed(1) };
  }
  function buildRows(c) {
    const ms = Core.enrOf(c.id, ['已錄取']).map(e => mem(e.memberId)).filter(m => (Core.ageAt(m.birth, TODAY) >= 65) === (IM.kind === '銀髮')).sort((a, b) => (a.id === 'M001' ? -1 : b.id === 'M001' ? 1 : 0)).slice(0, 8);
    const rows = ms.map(m => ({ idno: m.idno, m, v: genVals(m, IM.kind, IM.phase) }));
    rows.push({ idno: 'A12345678X', m: null, v: genVals({ id: 'M900' }, IM.kind, IM.phase), bad: 'id' });
    rows.push({ idno: Core.makeId('B', 'F', '9990001'), m: null, v: genVals({ id: 'M901' }, IM.kind, IM.phase), unreg: true });
    if (ms[1]) rows.push({ idno: ms[1].idno, m: ms[1], v: genVals(ms[1], IM.kind, IM.phase), dup: true });
    return rows;
  }
  function importPage(arg) {
    const v = pick(arg || IM.cid); if (!v) return '<div class="empty card">尚無班級</div>'; const c = v.c; if (IM.cid !== c.id) { IM = Object.assign(IM, { cid: c.id, file: '', rows: null, done: null }); }
    const rows = IM.rows; const seen = new Set(); let ok = 0, bad = 0, unreg = 0;
    const eva = rows && rows.map(r => { const st = r.bad ? { t: '身分證字號格式錯誤', k: 'bad' } : r.dup || seen.has(r.idno) ? { t: '重複列（略過）', k: 'warn' } : r.unreg ? { t: '未註冊，建立待認領', k: 'info' } : { t: '可匯入', k: 'ok' }; seen.add(r.idno); if (st.k === 'ok') ok++; else if (st.k === 'info') unreg++; else bad++; return Object.assign({ st }, r); });
    const cols = IM.kind === '一般' ? [['height', '身高'], ['weight', '體重'], ['bmi', 'BMI'], ['whr', '腰臀圍比'], ['situp', '仰臥捲腹'], ['sitreach', '坐姿體前彎'], ['stepIdx', '體力指數']] : [['chairStand', '椅子坐立'], ['armCurl', '肱二頭屈舉'], ['stepInPlace', '原地抬膝'], ['chairReach', '椅子坐姿前彎']];
    return `<div class="toolbar">${cSel(c.id, 'import')}</div><div class="alert info mb">體適能資料格式以體育局提供者為準；廠商只需登載一次，系統以<b>身分證字號</b>比對會員，會員即可在前台「我的體適能」查看。 ${tbd(10)} 進步幅度換算方式待體育局訂定。</div>
      <div class="grid" style="grid-template-columns:minmax(300px,400px) minmax(0,1fr);align-items:start"><div class="card"><div class="sec-t">① 設定檢測資訊</div><div><div class="field"><label>檢測類別</label><select id="im-kind">${opts([{ v: '一般', t: '一般體適能（23–64 歲）' }, { v: '銀髮', t: '銀髮族體適能（65 歲以上）' }], IM.kind)}</select></div><div class="field"><label>檢測階段</label><select id="im-phase">${opts(['前測', '後測'], IM.phase)}</select></div><div class="field"><label>檢測日期</label><input type="date" id="im-date" value="${IM.date}"><span class="hint">檔內為民國年月日 7 碼：${Core.tw(IM.date)}</span></div></div>
        <div class="note-box small">前測：第 1 堂前後 7 日內完成；後測：最後一堂前後 7 日內完成；前後測需間隔 ≥ 12 週（78 天）；檢測後 3 週內需上傳至體育雲。</div><div class="sec-t">② 上傳檔案</div><div class="drop" data-act="pick-file"><div style="font-size:30px">📄</div><b>${IM.file ? esc(IM.file) : '點此選擇 Excel 檔（.xls／.xlsx）'}</b><div class="small muted">${IM.file ? '已讀取，請查看右側驗證結果' : '或使用下方範例檔體驗流程'}</div></div><input type="file" id="im-file" accept=".xls,.xlsx,.csv" class="hide">
        <div class="row mt"><button class="btn primary" data-act="im-sample">使用範例檔（板橋-${IM.phase === '前測' ? '前' : '後'}.xls）</button><button class="btn" data-act="im-tpl">⬇ 下載空白範本 CSV</button></div><p class="xs muted mt">原型僅示意：以所選班級的學員產生範例解析結果，並刻意夾帶 3 筆有問題的資料；不會真正解析上傳檔案內容。</p></div>
      <div class="card"><div class="sec-t">③ 驗證與匯入</div>${IM.done ? `<div class="alert ok">✔ 已匯入 <b>${IM.done.n}</b> 筆${IM.done.u ? '（另有 ' + IM.done.u + ' 筆未註冊，已建立待認領，會員註冊後自動關聯）' : ''}。學員可於前台「我的體適能」查看。</div><div class="row mt"><a class="btn" href="front.html#/me/fitness" target="_blank">前往前台查看（示範學員 陳美玲）</a><button class="btn" data-act="im-reset">再匯入一份</button></div>` : eva ? `<div class="row mb">${badge('可匯入 ' + ok, 'ok')}${badge('待認領 ' + unreg, 'info')}${badge('需修正／略過 ' + bad, 'bad')}</div><div class="tbl-wrap" style="max-height:340px;overflow:auto"><table class="tbl"><thead><tr><th>#</th><th>身分證</th><th>比對會員</th>${cols.map(x => `<th>${x[1]}</th>`).join('')}<th>驗證</th></tr></thead><tbody>${eva.map((r, i) => `<tr><td>${i + 1}</td><td class="small">${r.bad ? esc(r.idno) : Core.maskId(r.idno)}</td><td>${r.m ? esc(r.m.name) : '<span class="muted">—</span>'}</td>${cols.map(x => `<td>${r.v[x[0]]}</td>`).join('')}<td>${badge(r.st.t, r.st.k)}</td></tr>`).join('')}</tbody></table></div><div class="modal-foot"><button class="btn" data-act="im-reset">重新選擇</button><button class="btn primary" data-act="im-go" ${ok + unreg ? '' : 'disabled'}>確認匯入 ${ok + unreg} 筆</button></div>` : '<div class="empty">請先於左側上傳檔案或使用範例檔</div>'}</div></div>`;
  }
  function doImport() {
    const c = Core.courseOf(IM.cid), seen = new Set(); let n = 0, u = 0;
    IM.rows.forEach(r => { if (r.bad || r.dup || seen.has(r.idno)) return; seen.add(r.idno); const rec = { id: 'F' + (S.fidSeq++), memberId: r.m ? r.m.id : null, idno: r.m ? null : r.idno, courseId: c.id, date: IM.date, phase: IM.phase, kind: IM.kind, src: '廠商匯入（' + Core.vendorOf(c.vendor).name + '）', v: r.v, g: {} };
      S.fit = S.fit.filter(f => !(f.memberId === rec.memberId && f.idno === rec.idno && f.date === rec.date && f.phase === rec.phase && f.kind === rec.kind)); S.fit.push(rec); if (r.m) n++; else u++; });
    Core.save(); IM.done = { n, u }; toast('匯入完成', 'ok'); route();
  }

  /* ---------- 成果統計報表 ---------- */
  let RP = { tab: 'stats', proj: '', cid: '' };
  function attRows(c) {
    const hs = Core.heldSessions(c); const adm = Core.enrOf(c.id, ['已錄取']).map(e => mem(e.memberId)); const tot = { '23-64歲': { M: 0, F: 0 }, '65歲以上': { M: 0, F: 0 } };
    adm.forEach(m => { const b = band(m); if (!tot[b]) return; hs.forEach(s => { if ((Core.attRec(c.id, s.n, m.id) || {}).s === 'P') tot[b][m.gender]++; }); });
    const per = hs.map(s => ({ s, n: adm.filter(m => (Core.attRec(c.id, s.n, m.id) || {}).s === 'P').length }));
    return { tot, per, held: hs.length, sum: per.reduce((a, x) => a + x.n, 0) };
  }
  function reports(arg) {
    RP.tab = arg || RP.tab; const L = scoped().filter(v => (!RP.proj || v.c.proj === RP.proj)); const started = L.filter(v => ['進行中', '已結束'].includes(v.st) && Core.heldSessions(v.c).length);
    const tabs = [['stats', '總體統計表'], ['rate', '出席率總表'], ['prepost', '體適能前後測']].map(([k, t]) => `<a href="#/reports/${k}" class="${RP.tab === k ? 'on' : ''}">${t}</a>`).join('');
    const sel = `<div class="toolbar"><div class="field"><label>計畫</label><select data-act="rp-proj">${opts(PROJECTS.map(p => ({ v: p.id, t: p.name })), RP.proj, '全部計畫')}</select></div>${RP.tab === 'stats' ? `<div class="field"><label>班級</label><select data-act="rp-cid"><option value="">全部已開課班級（${started.length}）</option>${started.map(v => `<option value="${v.c.id}" ${RP.cid === v.c.id ? 'selected' : ''}>${v.c.name}（${v.c.dist}）</option>`).join('')}</select></div>` : ''}<button class="btn" data-act="rp-export">⬇ 匯出 CSV</button></div>`;
    let body = '';
    if (RP.tab === 'stats') {
      const T = started.filter(v => !RP.cid || v.c.id === RP.cid);
      body = `<div class="note-box small mb">依體育局「成果報告呈現格式－總體統計表」產出：①各班級年齡統計表（男／女為出席人次）②各班級各場次人數統計表。結案時可一次匯出各廠商資料。</div>` + (T.map(v => { const c = v.c; const r = attRows(c); const g = (b, k) => r.tot[b][k]; const row = b => `<tr><td>${b}</td><td>${g(b, 'M')}</td><td>${g(b, 'F')}</td><td>${r.held}</td><td>${g(b, 'M') + g(b, 'F')}</td></tr>`;
        return `<div class="card mb"><h3>${esc(c.dist)}行政區｜${esc(c.name)}　<span class="xs muted">${esc(v.vendor.name)}</span></h3><div class="grid g2" style="align-items:start"><div><div class="lbl mb">1. 各班級年齡統計表（依年齡）</div><table class="tbl stat"><thead><tr><th rowspan="2">${esc(c.dist)}行政區<br><span class="xs">活動參與人次（不含工作人員）</span></th><th>年齡層</th><th>男性</th><th>女性</th><th>課堂數</th><th>總人次</th></tr></thead><tbody><tr><td rowspan="3" class="l xs">${esc(c.name)}</td>${['23-64歲'].map(row).join('').replace('<tr>', '').replace('</tr>', '')}</tr><tr>${row('65歲以上').replace('<tr>', '').replace('</tr>', '')}</tr><tr><td>合計</td><td>${g('23-64歲', 'M') + g('65歲以上', 'M')}</td><td>${g('23-64歲', 'F') + g('65歲以上', 'F')}</td><td>${r.held}</td><td>${r.sum}</td></tr></tbody></table></div>
        <div><div class="lbl mb">2. 各班級各場次人數統計表</div><div style="max-height:260px;overflow:auto"><table class="tbl stat"><thead><tr><th>編號</th><th>日期</th><th>時間</th><th>時數</th><th>人數</th><th>室內/室外</th></tr></thead><tbody>${r.per.map((x, i) => `<tr><td>${i + 1}</td><td>${x.s.date.slice(5).replace('-', '月') + '日'}</td><td>${x.s.t0.replace(':', '')}-${x.s.t1.replace(':', '')}</td><td>${hrs(c)}</td><td>${x.n}</td><td>${esc(c.io)}</td></tr>`).join('')}<tr><td colspan="4">合計人次</td><td>${r.sum}</td><td></td></tr></tbody></table></div><div class="xs muted mt">${esc(c.dist)}行政區課程總計參加人次為 ${r.sum} 人次，平均每堂課參加人數為 ${r.held ? Math.round(r.sum / r.held) : 0} 人。</div></div></div></div>`; }).join('') || '<div class="card empty">尚無已開課班級</div>');
    } else if (RP.tab === 'rate') {
      const rows = L.filter(v => Core.courseRate(v.c.id)).map(v => { const r = Core.courseRate(v.c.id); return { v, r }; });
      body = `<div class="card"><p class="small muted">出席率對廠商相當重要；低於 60% 的學員可能影響課程達標與獎勵資格。</p><div class="tbl-wrap"><table class="tbl"><thead><tr><th>班級</th><th>廠商</th><th>錄取</th><th>已上堂數</th><th>平均出席率</th><th>出席達 60% 人數</th><th>低於 60%</th></tr></thead><tbody>${rows.map(({ v, r }) => `<tr><td><b>${esc(v.c.name)}</b><div class="xs muted">${esc(v.c.dist)}區</div></td><td class="small">${esc(v.vendor.name)}</td><td>${r.adm}</td><td>${r.held}</td><td style="min-width:150px"><b>${r.avg}%</b>${bar(r.avg, 100, r.avg < 60 ? 'bad' : 'ok')}</td><td>${r.reach60}（${Core.pct(r.reach60, r.adm)}%）</td><td>${r.adm - r.reach60 ? badge(r.adm - r.reach60 + ' 人', 'warn') : '—'}</td></tr>`).join('') || '<tr><td colspan="7" class="empty">尚無資料</td></tr>'}</tbody></table></div></div>`;
    } else {
      const rows = L.filter(v => v.c.prepost && v.adm).map(v => { const ms = Core.enrOf(v.c.id, ['已錄取']).map(e => e.memberId); const pairs = ms.map(Core.fitPair).filter(Boolean); const pre = ms.filter(id => Core.fitOf(id).some(f => f.phase === '前測')).length; const post = ms.filter(id => Core.fitOf(id).some(f => f.phase === '後測')).length; const imps = pairs.map(Core.improve); return { v, n: ms.length, pre, post, pair: pairs.length, avg: imps.length ? Core.avg(imps) : null, gap: pairs.length ? Math.min(...pairs.map(p => Core.diffDays(p.pre.date, p.post.date))) : null }; });
      body = `<div class="card"><p class="small muted">前後測成效簡要分析。進步幅度＝仰臥捲腹、坐姿體前彎、體力指數（銀髮為四項肌力／心肺／柔軟度）平均變化百分比 ${tbd(10)}。含歷史匯入資料。</p><div class="tbl-wrap"><table class="tbl"><thead><tr><th>班級</th><th>錄取</th><th>有前測</th><th>有後測</th><th>完成前後測</th><th>平均進步</th><th>前後測最短間隔</th></tr></thead><tbody>${rows.map(r => `<tr><td><b>${esc(r.v.c.name)}</b><div class="xs muted">${esc(r.v.c.dist)}區・${r.v.st}</div></td><td>${r.n}</td><td>${r.pre}（${Core.pct(r.pre, r.n)}%）</td><td>${r.post}</td><td>${r.pair}</td><td>${r.avg == null ? '—' : '<b class="' + (r.avg >= 0 ? 'delta up' : 'delta down') + '">' + (r.avg >= 0 ? '+' : '') + r.avg.toFixed(1) + '%</b>'}</td><td>${r.gap == null ? '—' : r.gap + ' 天 ' + (r.gap >= 78 ? badge('達 78 天', 'ok') : badge('不足', 'bad'))}</td></tr>`).join('') || '<tr><td colspan="7" class="empty">尚無資料</td></tr>'}</tbody></table></div></div>`;
    }
    return `<div class="tabs">${tabs}</div>${sel}${body}`;
  }
  function exportReport() {
    const L = scoped().filter(v => (!RP.proj || v.c.proj === RP.proj)); const rows = [];
    if (RP.tab === 'stats') { rows.push(['行政區', '班級', '廠商', '年齡層', '男性人次', '女性人次', '課堂數', '總人次']); L.filter(v => ['進行中', '已結束'].includes(v.st) && (!RP.cid || v.c.id === RP.cid)).forEach(v => { const r = attRows(v.c); ['23-64歲', '65歲以上'].forEach(b => rows.push([v.c.dist + '區', v.c.name, v.vendor.name, b, r.tot[b].M, r.tot[b].F, r.held, r.tot[b].M + r.tot[b].F])); r.per.forEach((x, i) => rows.push(['場次', v.c.name, i + 1, x.s.date, x.s.t0 + '-' + x.s.t1, hrs(v.c), x.n, v.c.io])); }); }
    else if (RP.tab === 'rate') { rows.push(['班級', '廠商', '錄取', '已上堂數', '平均出席率%', '達60%人數']); L.forEach(v => { const r = Core.courseRate(v.c.id); if (r) rows.push([v.c.name, v.vendor.name, r.adm, r.held, r.avg, r.reach60]); }); }
    else { rows.push(['班級', '學員', '前測日期', '後測日期', '平均進步%']); L.forEach(v => Core.enrOf(v.c.id, ['已錄取']).forEach(e => { const p = Core.fitPair(e.memberId); if (p) rows.push([v.c.name, mem(e.memberId).name, p.pre.date, p.post.date, Core.improve(p)]); })); }
    csv('成果統計_' + RP.tab + '.csv', rows); toast('已匯出 CSV', 'ok');
  }

  /* ---------- 滿意度統計 ---------- */
  let SV = { proj: '', cid: '' };
  function surveyPage() {
    const L = scoped().filter(v => S.surveys.some(s => s.courseId === v.c.id) && (!SV.proj || v.c.proj === SV.proj)); const ids = (SV.cid ? [SV.cid] : L.map(v => v.c.id));
    const D = S.surveys.filter(s => ids.includes(s.courseId)); const n = D.length; const base = L.filter(v => ids.includes(v.c.id)).reduce((a, v) => a + v.adm, 0);
    const cnt = (f, opts2) => opts2.map(o => ({ o, n: D.filter(s => Array.isArray(s[f]) ? s[f].includes(o) : s[f] === o).length }));
    const blk = (t, f, o2) => `<div class="card flat"><b>${t}</b><div class="mt0 chart" style="margin-top:8px">${cnt(f, o2).map(x => `<div class="r" style="grid-template-columns:150px 1fr 90px"><span class="small">${esc(x.o)}</span>${bar(x.n, n)}<span>${x.n} 人 <span class="xs muted">${Core.pct(x.n, n)}%</span></span></div>`).join('')}</div></div>`;
    const items = ['活動宣傳', '活動時間', '活動內容', '活動師資', '活動場地']; const lv = [[5, '非常滿意'], [4, '滿意'], [3, '尚可'], [2, '不滿意'], [1, '非常不滿意']];
    const rate = Core.pct(n, base);
    return `<div class="toolbar"><div class="field"><label>計畫</label><select data-act="sv-proj">${opts(PROJECTS.map(p => ({ v: p.id, t: p.name })), SV.proj, '全部計畫')}</select></div><div class="field"><label>班級</label><select data-act="sv-cid"><option value="">全部班級（${L.length}）</option>${L.map(v => `<option value="${v.c.id}" ${SV.cid === v.c.id ? 'selected' : ''}>${v.c.name}（${v.c.dist}）</option>`).join('')}</select></div><button class="btn" data-act="sv-export">⬇ 匯出統計結果 CSV</button></div>
      <div class="note-box small mb">問卷內容與統計格式依體育局「附件 3 滿意度問卷」「附件 4 統計結果」；問卷由體育局統一提供，不開放廠商自行設計；全市各班一致。</div>
      <div class="grid g3 mb"><div class="card kpi"><div class="t">回收份數（已回收／應回收）</div><div class="n">${n} / ${base}</div><div class="s">涵蓋 ${ids.length} 個班級・尚缺 ${Math.max(0, base - n)} 份</div></div><div class="card kpi"><div class="t">回收率</div><div class="n ${rate < 70 ? 'delta down' : 'delta up'}">${rate}%</div><div class="s">以錄取人數 ${base} 為基數；目標 ≥ 70%</div></div><div class="card kpi"><div class="t">整體滿意度（滿意＋非常滿意）</div><div class="n">${n ? Core.pct(D.reduce((a, s) => a + items.filter(k => s.rate[k] >= 4).length, 0), n * 5) : 0}%</div><div class="s">五大項平均</div></div></div>
      <div class="sec-t">壹、基本資料</div><div class="grid g2">${blk('一、性別', 'gender', ['男', '女', '不願透漏'])}${blk('二、年齡', 'age', ['12歲以下', '13-22歲', '23-64歲', '65歲以上'])}${blk('三、活動參與對象（可複選）', 'ident', ['一般身分者', '原住民族籍', '新住民', '上班族', '家管/退休人員', '其他'])}${blk('四、第一次參加本活動嗎？', 'first', ['是', '不是'])}${blk('五、今年還有參加其他運動 i 台灣活動或課程嗎？', 'other', ['有', '沒有'])}${blk('六、得知本活動管道（可複選）', 'channel', ['新北運動聚點FB', '新北體育局LINE', '運動i臺灣網頁', '主辦單位FB或官網', '親友介紹', '活動傳單、海報、電子看板', '其他'])}${blk('七、平時參與運動課程的頻率', 'freq', ['每週有固定參與', '偶爾有', '以前沒有運動習慣，因為本活動才開始嘗試'])}${blk('八、活動地點是否便利', 'conv', ['便利', '不便利'])}${blk('九、是否增加對居住社區或鄰里運動資源的認識', 'aware', ['有', '沒有'])}${blk('十、對增加運動意願或養成運動習慣是否有幫助', 'will', ['有', '沒有'])}</div>
      <div class="sec-t mt">貳、活動滿意度</div><div class="tbl-wrap"><table class="tbl stat"><thead><tr><th class="l">項目</th>${lv.map(x => `<th>${x[1]}</th>`).join('')}<th>平均（5 分）</th><th>滿意度</th></tr></thead><tbody>${items.map(k => { const c5 = lv.map(([v]) => D.filter(s => s.rate[k] === v).length); const mean = n ? D.reduce((a, s) => a + s.rate[k], 0) / n : 0; return `<tr><td class="l"><b>${k}</b></td>${c5.map(x => `<td>${x} 人</td>`).join('')}<td><b>${mean.toFixed(2)}</b></td><td>${Core.pct(c5[0] + c5[1], n)}%</td></tr>`; }).join('')}</tbody></table></div>
      <div class="sec-t mt">參、回饋與建議</div><div class="card flat">${D.filter(s => s.text).map(s => `<div class="small" style="padding:6px 0;border-bottom:1px dashed var(--line)">「${esc(s.text)}」<span class="xs muted">　— ${esc(Core.courseOf(s.courseId).name)}</span></div>`).join('') || '<span class="muted small">尚無文字回饋</span>'}</div>`;
  }
  function exportSurvey() {
    const L = scoped().filter(v => S.surveys.some(s => s.courseId === v.c.id) && (!SV.proj || v.c.proj === SV.proj)); const ids = SV.cid ? [SV.cid] : L.map(v => v.c.id); const D = S.surveys.filter(s => ids.includes(s.courseId)); const rows = [['116年新北市活動滿意度調查表-統計結果'], ['回收份數', D.length]];
    const add = (t, f, o) => { rows.push([t]); o.forEach(x => rows.push([x + ':', D.filter(s => Array.isArray(s[f]) ? s[f].includes(x) : s[f] === x).length + ' 人'])); };
    add('一、性別', 'gender', ['男', '女', '不願透漏']); add('二、年齡', 'age', ['12歲以下', '13-22歲', '23-64歲', '65歲以上']); add('四、第一次參加', 'first', ['是', '不是']); add('五、其他活動', 'other', ['有', '沒有']); add('八、地點便利', 'conv', ['便利', '不便利']);
    rows.push(['貳、活動滿意度', '非常滿意', '滿意', '尚可', '不滿意', '非常不滿意']); ['活動宣傳', '活動時間', '活動內容', '活動師資', '活動場地'].forEach(k => rows.push([k, ...[5, 4, 3, 2, 1].map(v => D.filter(s => s.rate[k] === v).length)])); csv('滿意度統計結果.csv', rows); toast('已匯出 CSV', 'ok');
  }

  /* ---------- 新北幣名單 ---------- */
  let RW = { proj: '', cid: '', dist: '' };
  function rewardRows() {
    const R = S.reward; const out = [];
    scoped().filter(v => ['進行中', '已結束'].includes(v.st) && (!RW.proj || v.c.proj === RW.proj) && (!RW.cid || v.c.id === RW.cid) && (!RW.dist || v.c.dist === RW.dist)).forEach(v => Core.enrOf(v.c.id, ['已錄取']).forEach(e => { const m = mem(e.memberId); const mr = Core.memberRate(v.c.id, m.id); if (!mr) return; const sv = Core.surveyDone(m.id, v.c.id); const pair = Core.fitPair(m.id); const imp = Core.improve(pair);
      const okA = mr.rate >= R.attend, okS = !R.survey || sv, okI = !R.useImprove || (imp != null && imp >= R.improve); out.push({ v, m, mr, sv, imp, ok: okA && okS && okI, okA, okS, okI }); }));
    return out;
  }
  function rewards() {
    const R = S.reward; const rows = rewardRows(); const elig = rows.filter(r => r.ok);
    return `<div class="alert info mb">新北幣<b>不做系統介接</b>：由本系統依條件篩選並匯出符合名單，交由資訊中心發放。 ${tbd(7)}</div>
      <div class="grid g2" style="align-items:start"><div class="card"><div class="sec-t">發放條件（示意） ${tbd(10)}</div><div class="fgrid"><div class="field"><label>出席率門檻（%）</label><input type="number" id="rw-att" min="0" max="100" value="${R.attend}"></div><div class="field"><label>進步幅度門檻（%）</label><input type="number" id="rw-imp" min="0" value="${R.improve}"></div></div><div class="stack"><label class="check"><input type="checkbox" id="rw-sv" ${R.survey ? 'checked' : ''}>須完成滿意度問卷</label><label class="check"><input type="checkbox" id="rw-useimp" ${R.useImprove ? 'checked' : ''}><span>納入「體適能進步幅度」條件（換算方式待體育局訂定；若第一次測得較差，後續較易進步，需審慎設計）</span></label></div></div>
      <div class="card"><div class="sec-t">篩選範圍</div><div class="fgrid3"><div class="field"><label>計畫</label><select data-act="rw-f" id="rw-proj">${opts(PROJECTS.map(p => ({ v: p.id, t: p.short })), RW.proj, '全部')}</select></div><div class="field"><label>班級</label><select data-act="rw-f" id="rw-cid"><option value="">全部</option>${scoped().filter(v => ['進行中', '已結束'].includes(v.st)).map(v => `<option value="${v.c.id}" ${RW.cid === v.c.id ? 'selected' : ''}>${v.c.name}</option>`).join('')}</select></div><div class="field"><label>行政區</label><select data-act="rw-f" id="rw-dist">${opts(DISTRICTS.map(d => ({ v: d, t: d + '區' })), RW.dist, '全部')}</select></div></div><div class="row"><b>符合 ${elig.length}</b> / ${rows.length} 人次</div><div class="row mt"><button class="btn primary" data-act="rw-export" ${elig.length ? '' : 'disabled'}>⬇ 匯出符合名單（交資訊中心）</button></div></div></div>
      <div class="tbl-wrap mt"><table class="tbl"><thead><tr><th>學員</th><th>班級</th><th>出席率 ≥ ${R.attend}%</th><th>問卷</th><th>體適能進步</th><th>結果</th></tr></thead><tbody>${rows.sort((a, b) => b.ok - a.ok).slice(0, 80).map(r => `<tr><td><b>${esc(r.m.name)}</b><div class="xs muted">${Core.maskId(r.m.idno)}</div></td><td class="small">${esc(r.v.c.name)}<div class="xs muted">${esc(r.v.c.dist)}區</div></td><td>${r.mr.rate}% ${r.okA ? '✓' : '✗'}</td><td>${r.sv ? '已填 ✓' : '未填'}</td><td>${r.imp == null ? '<span class="muted">無前後測</span>' : r.imp + '%'} ${R.useImprove ? (r.okI ? '✓' : '✗') : '<span class="xs muted">（未納入）</span>'}</td><td>${r.ok ? badge('符合', 'ok') : badge('未符合', 'gray')}</td></tr>`).join('') || '<tr><td colspan="6" class="empty">沒有資料</td></tr>'}</tbody></table></div>
      ${S.exports.length ? `<div class="card mt"><h3>匯出紀錄</h3>${S.exports.slice().reverse().map(x => `<div class="small row between" style="padding:6px 0;border-top:1px dashed var(--line)"><span>${x.at}｜${esc(x.by)}</span><span>${x.count} 人｜${esc(x.rule)}</span></div>`).join('')}</div>` : ''}`;
  }

  /* ---------- 通知與公告 ---------- */
  let NT = { type: 'course', cid: '', pid: 'P1', tpl: '', title: '', body: '', em: true, sm: false };
  const TPL = { '': ['', ''], 'resched': ['【課程異動】○○班 ○/○ 改期通知', '○○班第 ○ 堂原訂 ○/○（○）改為 ○/○（○），時間與地點不變。造成不便，敬請見諒。'], 'weather': ['【天候通知】今日課程是否照常', '因天候因素，今日課程改為室內上課／停課，補課時間另行通知。'], 'general': ['【公告】', ''], 'survey': ['【提醒】請填寫課程滿意度問卷', '感謝您參加本課程！請至「會員中心 → 滿意度問卷」填寫問卷，協助我們優化活動。'], 'test': ['【提醒】體適能後測時間', '後測將於最後一堂課前後 7 日內辦理，請準時出席並穿著運動服裝。'] };
  function notices(arg) {
    if (!isAdmin()) NT.type = 'course'; if (!scoped().some(v => v.c.id === NT.cid)) NT.cid = pick('').c.id;
    const aud = NT.type === 'course' ? { type: 'course', courseId: NT.cid } : NT.type === 'project' ? { type: 'project', projectId: NT.pid } : { type: 'all' }; const rcp = Core.audienceIds(aud).length; const per = Math.max(1, Math.ceil((NT.body.length + NT.title.length) / 70)); const mine = S.messages.filter(m => isAdmin() || m.by === roleName());
    return `<div class="grid g2" style="grid-template-columns:1.2fr 1fr;align-items:start"><div class="stack"><form class="card" id="nt-f"><div class="sec-t">發送通知（Email／簡訊）</div><div class="fgrid"><div class="field"><label>發送對象</label><select name="type" id="nt-type">${opts([{ v: 'course', t: '單一班級學員' }, ...(isAdmin() ? [{ v: 'project', t: '某計畫所有班級學員' }, { v: 'all', t: '全體會員' }] : [])], NT.type)}</select></div><div class="field">${NT.type === 'course' ? `<label>班級</label><select name="cid" id="nt-cid">${scoped().map(v => `<option value="${v.c.id}" ${NT.cid === v.c.id ? 'selected' : ''}>${v.c.name}（${v.c.dist}）</option>`).join('')}</select>` : NT.type === 'project' ? `<label>計畫</label><select name="pid" id="nt-pid">${opts(PROJECTS.map(p => ({ v: p.id, t: p.name })), NT.pid)}</select>` : '<label>&nbsp;</label><div class="muted small" style="padding:9px 0">全體已註冊會員</div>'}</div></div>
      <div class="field"><label>範本</label><select id="nt-tpl">${opts([{ v: '', t: '（空白）' }, { v: 'resched', t: '課程改期' }, { v: 'weather', t: '天候異動' }, { v: 'survey', t: '問卷提醒' }, { v: 'test', t: '體適能檢測提醒' }, { v: 'general', t: '一般公告' }], NT.tpl)}</select></div><div class="field"><label class="req">標題</label><input type="text" name="title" id="nt-title" value="${esc(NT.title)}"></div><div class="field"><label class="req">內容</label><textarea name="body" id="nt-body" style="min-height:120px">${esc(NT.body)}</textarea></div>
      <div class="row"><label class="check"><input type="checkbox" name="em" ${NT.em ? 'checked' : ''}>Email（基本）</label><label class="check"><input type="checkbox" name="sm" ${NT.sm ? 'checked' : ''}>簡訊</label></div><div class="small muted mt" id="nt-info">收件人 <b>${rcp}</b> 位${NT.sm ? '；簡訊每人 ' + per + ' 則，預估 <b>' + rcp * per + '</b> 則（餘額 ' + S.smsBalance + '）' : ''}</div><div class="err" id="nt-err"></div><div class="modal-foot"><button class="btn primary">發送通知</button></div></form>
      <div class="card"><div class="sec-t">發送紀錄</div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>時間</th><th>標題</th><th>對象</th><th>管道</th><th>簡訊</th><th>發送者</th></tr></thead><tbody>${mine.slice(0, 12).map(m => `<tr><td class="small nowrap">${m.at}</td><td class="small">${esc(m.title)}</td><td class="small">${m.audience.type === 'all' ? '全體會員' : m.audience.type === 'project' ? esc(Core.projOf(m.audience.projectId).short) : m.audience.type === 'course' ? esc((Core.courseOf(m.audience.courseId) || {}).name) : '個別學員'}</td><td class="small">${m.channels.join('、')}</td><td>${m.sms || '—'}</td><td class="small">${esc(m.by)}</td></tr>`).join('') || '<tr><td colspan="6" class="empty">尚無紀錄</td></tr>'}</tbody></table></div></div></div>
      <div class="stack"><div class="card"><div class="sec-t">簡訊額度 ${tbd(5)}</div><div class="row between"><span class="muted">目前餘額</span><b style="font-size:30px">${S.smsBalance.toLocaleString()}</b></div><div class="small muted">則（預先儲值、發送時扣抵；體育局若已有簡訊平台，可改以 API 介接）</div></div>
      ${isAdmin() ? '<div class="card small"><b>前台最新消息</b><p class="muted" style="margin:6px 0 10px">最新消息與首頁 Banner 已移至「前台內容管理」，可附圖片與檔案。</p><a class="btn sm" href="#/news">前往最新消息管理</a></div>' : '<div class="card small muted">最新消息由體育局發布；廠商可發送所屬班級通知。</div>'}</div></div>`;
  }

  /* ---------- 前台內容管理（Banner／最新消息）：僅最高管理員與局端帳號 ---------- */
  const denied = () => '<div class="card empty">🔒 此頁僅限<b>體育局（最高管理員／局端帳號）</b>使用。<br>課程廠商無法上架首頁 Banner 與最新消息，如需露出請洽體育局。</div>';
  const readImg = (file, maxW) => new Promise(res => { const url = URL.createObjectURL(file); const im = new Image(); im.onload = () => { const s = Math.min(1, maxW / im.width); const c = document.createElement('canvas'); c.width = Math.round(im.width * s); c.height = Math.round(im.height * s); const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', 0.85)); }; im.onerror = () => { URL.revokeObjectURL(url); res(null); }; im.src = url; });
  const readFile = file => new Promise(res => { if (file.size > 300 * 1024) { res(null); return; } const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => res(null); r.readAsDataURL(file); });
  const fsize = n => n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';
  const bthumb = b => `<div class="bthumb ${b.img ? '' : 'b-g' + (b.bg || 1)}">${b.img ? `<img src="${esc(b.img)}" alt="">` : esc(b.title.slice(0, 14))}</div>`;
  const ntagA = t => `<span class="ntag" style="background:${Core.NEWS_TAGS[t] || '#667085'}">${esc(t)}</span>`;

  function bannersPage() {
    if (!isAdmin()) return denied();
    const L = S.banners.slice().sort((a, b) => a.order - b.order); const live = Core.activeBanners().map(b => b.id);
    return `<div class="alert info mb">首頁最上方的輪播 Banner，僅<b>最高管理員</b>與<b>局端帳號</b>可上架、排序與下架；課程廠商無法操作。前台每 5 秒自動切換，也可左右切換。</div>
      <div class="toolbar"><button class="btn primary" data-act="bn-new">＋ 新增 Banner</button><a class="btn" href="front.html" target="_blank">🌐 前台預覽</a></div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>排序</th><th>預覽</th><th>標題／副標</th><th>連結</th><th>上架期間</th><th>目前狀態</th><th>啟用</th><th></th></tr></thead><tbody>${L.map((b, i) => `<tr><td class="nowrap"><button class="btn sm" data-act="bn-up" data-id="${b.id}" ${i === 0 ? 'disabled' : ''} aria-label="上移">▲</button> <button class="btn sm" data-act="bn-down" data-id="${b.id}" ${i === L.length - 1 ? 'disabled' : ''} aria-label="下移">▼</button></td><td>${bthumb(b)}</td><td><b>${esc(b.title)}</b><div class="xs muted">${esc(b.sub)}</div></td><td class="small">${esc(b.link || '—')}</td><td class="small nowrap">${b.start || '不限'} ～ ${b.end || '不限'}</td><td>${live.includes(b.id) ? badge('前台顯示中', 'ok') : badge(b.on ? '未在期間內' : '已停用', 'gray')}</td><td><label class="sw"><input type="checkbox" data-act="bn-on" data-id="${b.id}" ${b.on ? 'checked' : ''} aria-label="啟用"><span></span></label></td><td class="nowrap"><button class="btn sm" data-act="bn-edit" data-id="${b.id}">編輯</button> <button class="btn sm danger" data-act="bn-del" data-id="${b.id}">刪除</button></td></tr>`).join('') || '<tr><td colspan="8" class="empty">尚無 Banner</td></tr>'}</tbody></table></div>
      <p class="xs muted mt">圖片建議尺寸 1600×560；未上傳圖片時，前台以所選背景色加標題文字呈現。</p>`;
  }
  function bannerModal(id) {
    const b = id ? S.banners.find(x => x.id === id) : { title: '', sub: '', img: '', bg: 1, link: '', on: true, start: '', end: '', overlay: true }; let img = b.img || '';
    const links = ['#/courses', '#/news'].concat(S.news.map(n => '#/news/' + n.id), S.courses.map(c => '#/course/' + c.id));
    const o = openModal(`<h3>${id ? '編輯' : '新增'} Banner</h3><form id="bn-f" novalidate><div class="field"><label class="req" for="bn-t">標題</label><input id="bn-t" type="text" value="${esc(b.title)}" maxlength="40"></div><div class="field"><label for="bn-s">副標題</label><input id="bn-s" type="text" value="${esc(b.sub)}" maxlength="60"></div>
      <div class="field"><label class="lbl">背景色（未上傳圖片時使用）</label><div class="opts">${[1, 2, 3, 4, 5].map(i => `<label><input type="radio" name="bg" value="${i}" ${(b.bg || 1) === i ? 'checked' : ''}><span class="bthumb b-g${i}" style="width:64px;height:28px"></span></label>`).join('')}</div></div>
      <div class="field"><label class="lbl">圖片（建議 1600×560，JPG／PNG）</label><div class="row"><button type="button" class="btn sm" id="bn-pick">選擇圖片</button><button type="button" class="btn sm ghost" id="bn-rm">移除圖片</button><input type="file" id="bn-file" accept="image/*" class="hide"></div><div id="bn-prev" class="mt"></div><label class="check mt"><input type="checkbox" id="bn-ov" ${b.overlay ? 'checked' : ''}>在圖片上顯示標題文字</label></div>
      <div class="field"><label for="bn-l">點擊後連結</label><input id="bn-l" type="text" list="bn-links" value="${esc(b.link)}" placeholder="例：#/courses 或 https://…（可留空）"><datalist id="bn-links">${links.map(l => `<option value="${esc(l)}">`).join('')}</datalist></div>
      <div class="fgrid"><div class="field"><label for="bn-a">上架開始日（空白＝不限）</label><input id="bn-a" type="date" value="${b.start || ''}"></div><div class="field"><label for="bn-e">上架結束日</label><input id="bn-e" type="date" value="${b.end || ''}"></div></div><label class="check"><input type="checkbox" id="bn-on" ${b.on ? 'checked' : ''}>啟用</label><div class="err" id="bn-err" role="alert"></div><div class="modal-foot"><button type="button" class="btn" data-close>取消</button><button class="btn primary">儲存</button></div></form>`, { wide: true });
    const prev = () => { $('#bn-prev', o).innerHTML = img ? `<img src="${esc(img)}" alt="預覽" style="max-width:100%;max-height:180px;border-radius:10px;border:1px solid var(--line)">` : '<span class="xs muted">未上傳圖片，前台將使用背景色加文字</span>'; }; prev();
    $('#bn-pick', o).onclick = () => $('#bn-file', o).click(); $('#bn-rm', o).onclick = () => { img = ''; prev(); };
    $('#bn-file', o).onchange = async ev => { const f = ev.target.files[0]; if (!f) return; const d = await readImg(f, 1600); if (!d) { toast('無法讀取圖片', 'bad'); return; } img = d; prev(); };
    $('#bn-f', o).onsubmit = ev => { ev.preventDefault(); const t = $('#bn-t', o).value.trim(); const a = $('#bn-a', o).value, e2 = $('#bn-e', o).value; const err = $('#bn-err', o);
      if (!t) { err.textContent = '請輸入標題'; return; } if (a && e2 && e2 < a) { err.textContent = '結束日不可早於開始日'; return; }
      const rec = { title: t, sub: $('#bn-s', o).value.trim(), img, bg: +(o.querySelector('input[name=bg]:checked') || { value: 1 }).value, overlay: $('#bn-ov', o).checked, link: $('#bn-l', o).value.trim(), start: a, end: e2, on: $('#bn-on', o).checked };
      if (id) Object.assign(b, rec); else S.banners.push(Object.assign({ id: 'B' + Date.now(), order: Math.max(0, ...S.banners.map(x => x.order)) + 1 }, rec));
      Core.save(); closeModal(); toast(id ? '已儲存 Banner' : '已新增 Banner，前台首頁立即生效', 'ok'); route(); };
  }

  let NQ = '';
  function newsAdmin() {
    if (!isAdmin()) return denied();
    const L = Core.sortNews(S.news).filter(n => !NQ || n.title.includes(NQ) || n.tag === NQ);
    return `<div class="alert info mb">前台「最新消息」分頁與首頁最新 5 則的來源，僅<b>最高管理員</b>與<b>局端帳號</b>可發布；可附圖片與檔案。標籤為「置頂」者固定排在最前面。</div>
      <div class="toolbar"><div class="field grow"><label>搜尋標題或標籤</label><input type="search" id="nq" value="${esc(NQ)}" placeholder="標題、活動、須知…"></div><button class="btn primary" data-act="nw-new">＋ 發布消息</button><a class="btn" href="front.html#/news" target="_blank">🌐 前台預覽</a></div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>日期</th><th>標籤</th><th>標題</th><th>圖片</th><th>附件</th><th></th></tr></thead><tbody>${L.map(n => `<tr><td class="nowrap small">${n.at}</td><td>${ntagA(n.tag)}</td><td><b>${esc(n.title)}</b><div class="xs muted">${esc((n.body || '').replace(/\s+/g, ' ').slice(0, 50))}…</div></td><td class="small">${(n.imgs || []).length || '—'}</td><td class="small">${(n.files || []).length || '—'}</td><td class="nowrap"><button class="btn sm" data-act="nw-edit" data-id="${n.id}">編輯</button> <button class="btn sm danger" data-act="nw-del" data-id="${n.id}">刪除</button></td></tr>`).join('') || '<tr><td colspan="6" class="empty">沒有消息</td></tr>'}</tbody></table></div>`;
  }
  function newsModal(id) {
    const n0 = id ? S.news.find(x => x.id === id) : { at: TODAY, tag: '公告', title: '', body: '', imgs: [], files: [] }; let imgs = (n0.imgs || []).slice(), files = (n0.files || []).map(f => Object.assign({}, f));
    const o = openModal(`<h3>${id ? '編輯' : '發布'}最新消息</h3><form id="nw-f2" novalidate><div class="fgrid"><div class="field"><label for="nw-tag">標籤</label><select id="nw-tag">${opts(Object.keys(Core.NEWS_TAGS), n0.tag)}</select></div><div class="field"><label for="nw-at">日期</label><input id="nw-at" type="date" value="${n0.at}"></div></div>
      <div class="field"><label class="req" for="nw-t">標題</label><input id="nw-t" type="text" value="${esc(n0.title)}" maxlength="80"></div><div class="field"><label for="nw-b">內容（換行會保留）</label><textarea id="nw-b" style="min-height:160px">${esc(n0.body)}</textarea></div>
      <div class="field"><label class="lbl">圖片（可多張）</label><div class="row"><button type="button" class="btn sm" id="nw-ipick">選擇圖片</button><input type="file" id="nw-ifile" accept="image/*" multiple class="hide"><span class="xs muted">會自動縮圖壓縮</span></div><div class="row mt" id="nw-ithumbs"></div></div>
      <div class="field"><label class="lbl">附加檔案（PDF、Word、Excel…）</label><div class="row"><button type="button" class="btn sm" id="nw-fpick">選擇檔案</button><input type="file" id="nw-ffile" multiple class="hide"><span class="xs muted">原型僅保存 300 KB 以下檔案內容；較大檔案只保留檔名</span></div><div id="nw-flist" class="mt"></div></div><div class="err" id="nw-err" role="alert"></div><div class="modal-foot"><button type="button" class="btn" data-close>取消</button><button class="btn primary">${id ? '儲存' : '發布'}</button></div></form>`, { wide: true });
    const ri = () => { $('#nw-ithumbs', o).innerHTML = imgs.map((s, i) => `<div style="position:relative"><img src="${esc(s)}" alt="附圖 ${i + 1}" style="width:96px;height:64px;object-fit:cover;border-radius:8px;border:1px solid var(--line)"><button type="button" class="btn sm danger" data-i="${i}" data-k="img" style="position:absolute;top:-8px;right:-8px;min-height:22px;padding:0 6px" aria-label="移除圖片">×</button></div>`).join('') || '<span class="xs muted">尚未新增圖片</span>'; };
    const rf = () => { $('#nw-flist', o).innerHTML = files.map((f, i) => `<div class="nfile"><span>📎</span><b style="flex:1;word-break:break-all">${esc(f.name)}</b><span class="muted small">${esc(f.size || '')}${f.data ? '' : '（僅檔名）'}</span><button type="button" class="btn sm danger" data-i="${i}" data-k="file">移除</button></div>`).join('') || '<span class="xs muted">尚未新增附件</span>'; };
    ri(); rf();
    o.addEventListener('click', ev => { const t = ev.target.closest('[data-k]'); if (!t) return; if (t.dataset.k === 'img') { imgs.splice(+t.dataset.i, 1); ri(); } else { files.splice(+t.dataset.i, 1); rf(); } });
    $('#nw-ipick', o).onclick = () => $('#nw-ifile', o).click(); $('#nw-fpick', o).onclick = () => $('#nw-ffile', o).click();
    $('#nw-ifile', o).onchange = async ev => { for (const f of ev.target.files) { if (imgs.length >= 8) { toast('最多 8 張圖片', 'bad'); break; } const d = await readImg(f, 1200); if (d) imgs.push(d); } ri(); ev.target.value = ''; };
    $('#nw-ffile', o).onchange = async ev => { for (const f of ev.target.files) { files.push({ name: f.name, size: fsize(f.size), data: await readFile(f) }); } rf(); ev.target.value = ''; };
    $('#nw-f2', o).onsubmit = ev => { ev.preventDefault(); const t = $('#nw-t', o).value.trim(); if (!t) { $('#nw-err', o).textContent = '請輸入標題'; return; }
      const rec = { tag: $('#nw-tag', o).value, at: $('#nw-at', o).value || TODAY, title: t, body: $('#nw-b', o).value.trim(), imgs, files };
      if (id) Object.assign(n0, rec); else S.news.push(Object.assign({ id: 'W' + Date.now() }, rec));
      Core.save(); closeModal(); toast(id ? '已儲存' : '已發布，前台最新消息立即可見', 'ok'); route(); };
  }


  /* ---------- 事件 ---------- */
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-act]'); if (!a || ['SELECT', 'INPUT'].includes(a.tagName)) return; const act = a.dataset.act; const d = a.dataset;
    if (act === 'reset') { e.preventDefault(); confirmBox('重置示範資料', '將清除原型中的所有操作並還原初始示範資料（前後台共用）。', '確定重置', () => { Core.reset(); toast('已重置', 'ok'); route(); }, true); }
    else if (act === 'att') attModal(d.c, +d.n); else if (act === 'qr') qrModal(d.c, +d.n); else if (act === 'resched') reschedModal(d.c, +d.n); else if (act === 'print-sheet') sheetModal(d.c, +d.n);
    else if (act === 'all-p') $$('#modal-ov input[value="P"]').forEach(i => { i.checked = true; }); else if (act === 'all-clear') $$('#modal-ov input[type=radio]').forEach(i => { i.checked = false; });
    else if (act === 'sheet-pick') { const v = Core.view(Core.courseOf(d.c)); const s = v.ss.find(x => x.date >= TODAY) || v.ss[v.ss.length - 1]; sheetModal(d.c, s.n); }
    else if (act === 'rf-st') { RF.st = d.v; route(); }
    else if (act === 'bulk') { const ids = $$('.rs-ck:checked').map(i => i.value); if (!ids.length) { toast('請先勾選學員', 'bad'); return; } confirmBox('批次異動', '將 ' + ids.length + ' 筆報名設為「' + d.s + '」？', '確定', () => { ids.forEach(id => Core.setEnr(id, d.s, roleName())); toast('已更新 ' + ids.length + ' 筆', 'ok'); route(); }, d.s === '取消'); }
    else if (act === 'exp-roster') { const v = Core.view(Core.courseOf(d.c)); const rows = [['報名編號', '姓名', '身分證字號', '性別', '出生日期', '手機', 'Email', '身分別', '狀態', '報名時間', '出席率%', '備註（內部）']]; S.enr.filter(x => x.courseId === d.c).forEach(x => { const m = mem(x.memberId); const r = Core.memberRate(d.c, m.id); rows.push([x.id, m.name, m.idno, m.gender === 'F' ? 'F' : 'M', m.birth, m.phone, m.email, x.prio, x.status, x.at, r ? r.rate : '', x.remark || '']); }); csv('報名名單_' + v.c.name + '.csv', rows); toast('已匯出名單（示意：正式系統會寫入稽核紀錄）', 'ok'); }
    else if (act === 'pick-file') $('#im-file').click();
    else if (act === 'im-sample') { IM.file = '一般體適能檢測紀錄(' + (IM.kind === '一般' ? '23-64歲' : '65歲以上') + ')板橋-' + (IM.phase === '前測' ? '前' : '後') + '.xls'; IM.rows = buildRows(Core.courseOf(IM.cid)); IM.done = null; route(); }
    else if (act === 'im-reset') { IM.file = ''; IM.rows = null; IM.done = null; route(); } else if (act === 'im-go') doImport();
    else if (act === 'im-tpl') csv('體適能匯入範本_' + IM.kind + '.csv', [HEAD[IM.kind]]);
    else if (act === 'rp-export') exportReport(); else if (act === 'sv-export') exportSurvey();
    else if (act === 'rw-export') { const el = rewardRows().filter(r => r.ok); const R = S.reward; csv('新北幣符合名單_' + TODAY + '.csv', [['身分證字號', '姓名', '手機', '班級', '行政區', '出席率%', '已填問卷', '體適能進步%'], ...el.map(r => [r.m.idno, r.m.name, r.m.phone, r.v.c.name, r.v.c.dist + '區', r.mr.rate, r.sv ? '是' : '否', r.imp == null ? '' : r.imp])]); S.exports.push({ at: Core.nowStr(), by: roleName(), count: el.length, rule: '出席≥' + R.attend + '%' + (R.survey ? '＋問卷' : '') + (R.useImprove ? '＋進步≥' + R.improve + '%' : '') }); Core.save(); toast('已匯出 ' + el.length + ' 人，請交資訊中心發放', 'ok'); route(); }
    else if (act === 'bn-new') bannerModal(''); else if (act === 'bn-edit') bannerModal(d.id);
    else if (act === 'bn-del') confirmBox('刪除 Banner', '確定刪除此 Banner？前台首頁將不再顯示。', '刪除', () => { S.banners = S.banners.filter(b => b.id !== d.id); Core.save(); toast('已刪除', 'ok'); route(); }, true);
    else if (act === 'bn-up' || act === 'bn-down') { const L = S.banners.slice().sort((a, b) => a.order - b.order); const i = L.findIndex(b => b.id === d.id), j = act === 'bn-up' ? i - 1 : i + 1; if (j >= 0 && j < L.length) { const t = L[i].order; L[i].order = L[j].order; L[j].order = t; if (L[i].order === L[j].order) L[j].order += act === 'bn-up' ? 1 : -1; Core.save(); route(); } }
    else if (act === 'nw-new') newsModal(''); else if (act === 'nw-edit') newsModal(d.id);
    else if (act === 'nw-del') confirmBox('刪除最新消息', '確定刪除此則消息？前台將立即移除。', '刪除', () => { S.news = S.news.filter(n => n.id !== d.id); Core.save(); toast('已刪除', 'ok'); route(); }, true);
  });

  document.addEventListener('change', e => {
    const t = e.target; const act = t.dataset && t.dataset.act; const id = t.id;
    if (act === 'csel') location.hash = '#/' + t.dataset.page + '/' + t.value;
    else if (act === 'role') { S.admin = t.value; Core.save(); route(); }
    else if (act === 'cf' || id === 'cf-proj' || id === 'cf-dist' || id === 'cf-st') { CF.proj = $('#cf-proj').value; CF.dist = $('#cf-dist').value; CF.st = $('#cf-st').value; route(); }
    else if (act === 'pub') { const c = Core.courseOf(t.dataset.id); c.pub = t.checked ? 'on' : 'off'; Core.save(); toast(c.name + (t.checked ? ' 已上架' : ' 已下架'), 'ok'); route(); }
    else if (act === 'enr-st') changeEnr(t.dataset.id, t.value);
    else if (act === 'remark') { const en = S.enr.find(x => x.id === t.dataset.id); en.remark = t.value.trim(); Core.save(); toast('備註已儲存', 'ok'); }
    else if (act === 'bn-on') { const b = S.banners.find(x => x.id === t.dataset.id); b.on = t.checked; Core.save(); toast(t.checked ? '已啟用' : '已停用', 'ok'); route(); }
    else if (id === 'rf-full') { RF.full = t.checked; route(); }
    else if (id === 'ck-all') { $$('.rs-ck').forEach(i => { i.checked = t.checked; }); $('#sel-n').textContent = $$('.rs-ck:checked').length; }
    else if (t.classList.contains('rs-ck')) $('#sel-n').textContent = $$('.rs-ck:checked').length;
    else if (id === 'im-kind') { IM.kind = t.value; IM.rows = null; IM.file = ''; route(); } else if (id === 'im-phase') { IM.phase = t.value; IM.rows = null; IM.file = ''; route(); } else if (id === 'im-date') { IM.date = t.value; route(); }
    else if (id === 'im-file') { if (t.files[0]) { IM.file = t.files[0].name; IM.rows = buildRows(Core.courseOf(IM.cid)); IM.done = null; route(); } }
    else if (act === 'rp-proj') { RP.proj = t.value; RP.cid = ''; route(); } else if (act === 'rp-cid') { RP.cid = t.value; route(); }
    else if (act === 'sv-proj') { SV.proj = t.value; SV.cid = ''; route(); } else if (act === 'sv-cid') { SV.cid = t.value; route(); }
    else if (act === 'rw-f') { RW.proj = $('#rw-proj').value; RW.cid = $('#rw-cid').value; RW.dist = $('#rw-dist').value; route(); }
    else if (id === 'rw-att') { S.reward.attend = +t.value || 0; Core.save(); route(); } else if (id === 'rw-imp') { S.reward.improve = +t.value || 0; Core.save(); route(); } else if (id === 'rw-sv') { S.reward.survey = t.checked; Core.save(); route(); } else if (id === 'rw-useimp') { S.reward.useImprove = t.checked; Core.save(); route(); }
    else if (id === 'nt-type') { NT.type = t.value; route(); } else if (id === 'nt-cid') { NT.cid = t.value; route(); } else if (id === 'nt-pid') { NT.pid = t.value; route(); }
    else if (id === 'nt-tpl') { NT.tpl = t.value; NT.title = TPL[t.value][0]; NT.body = TPL[t.value][1]; route(); }
    else if (t.name === 'sm' && t.form && t.form.id === 'nt-f') { NT.sm = t.checked; NT.title = $('#nt-title').value; NT.body = $('#nt-body').value; route(); }
  });
  document.addEventListener('input', e => {
    const t = e.target;
    if (t.id === 'cf-kw') { CF.kw = t.value; clearTimeout(window.__t); window.__t = setTimeout(() => { route(); const i = $('#cf-kw'); i.focus(); i.setSelectionRange(99, 99); }, 250); }
    else if (t.id === 'rf-kw') { RF.kw = t.value; clearTimeout(window.__t); window.__t = setTimeout(() => { route(); const i = $('#rf-kw'); i.focus(); i.setSelectionRange(99, 99); }, 250); }
    else if (t.id === 'nq') { NQ = t.value; clearTimeout(window.__t); window.__t = setTimeout(() => { route(); const i = $('#nq'); i.focus(); i.setSelectionRange(99, 99); }, 250); }
    else if (t.id === 'nt-title' || t.id === 'nt-body') { NT.title = $('#nt-title').value; NT.body = $('#nt-body').value; const rcp = Core.audienceIds(NT.type === 'course' ? { type: 'course', courseId: NT.cid } : NT.type === 'project' ? { type: 'project', projectId: NT.pid } : { type: 'all' }).length; const per = Math.max(1, Math.ceil((NT.title.length + NT.body.length) / 70)); $('#nt-info').innerHTML = '收件人 <b>' + rcp + '</b> 位' + (NT.sm ? '；簡訊每人 ' + per + ' 則，預估 <b>' + rcp * per + '</b> 則（餘額 ' + S.smsBalance + '）' : ''); }
  });
  document.addEventListener('submit', e => {
    const f = e.target; if (f.id === 'cform') { e.preventDefault(); const d = readCourse(f); const err = $('#cf-err');
      const bad = !d.name ? '請輸入班級名稱' : !d.venue ? '請輸入上課地點' : !d.wd.length ? '請至少選擇一個上課星期' : !d.ns ? '請輸入總堂數' : d.t0 >= d.t1 ? '結束時間需晚於開始時間' : !d.start || !d.ro || !d.rc ? '請完整填寫日期' : d.ro > d.rc ? '報名截止日不可早於開始日' : d.rc > Core.sessionsOf(Object.assign({ over: {} }, d))[0].date ? '報名截止日不可晚於首堂上課日' : d.cap < 1 ? '名額至少 1 人' : '';
      if (bad) { err.textContent = bad; err.scrollIntoView({ block: 'center' }); return; } const id = f.dataset.id;
      if (id) Object.assign(Core.courseOf(id), d, { desc: d.desc || Core.courseOf(id).desc }); else { const nid = 'C' + String(Math.max(...S.courses.map(c => +c.id.slice(1))) + 1).padStart(2, '0'); S.courses.push(Object.assign({ id: nid, wcap: 10, fee: 0, over: {} }, d, { desc: d.desc || d.cat + '課程，由' + Core.vendorOf(d.vendor).name + '規劃執行。' })); }
      Core.save(); toast(id ? '已儲存班級設定' : '已建立班級（' + (d.pub === 'on' ? '已上架' : '草稿') + '）', 'ok'); location.hash = '#/courses'; }
    else if (f.id === 'nt-f') { e.preventDefault(); const fd = new FormData(f); const title = NT.title.trim(), body = NT.body.trim(); const err = $('#nt-err'); if (!title || !body) { err.textContent = '請填寫標題與內容'; return; } const aud = NT.type === 'course' ? { type: 'course', courseId: NT.cid } : NT.type === 'project' ? { type: 'project', projectId: NT.pid } : { type: 'all' }; const rcp = Core.audienceIds(aud).length; if (!rcp) { err.textContent = '此範圍沒有收件人'; return; }
      const ch = ['Email'].concat(fd.get('sm') ? ['簡訊'] : []); const sms = fd.get('sm') ? rcp * Math.max(1, Math.ceil((title.length + body.length) / 70)) : 0; if (sms > S.smsBalance) { err.textContent = '簡訊額度不足，請先儲值'; return; } S.smsBalance -= sms; Core.addMessage({ title, body, channels: ch, audience: aud, by: roleName(), sms }); NT.title = ''; NT.body = ''; NT.tpl = ''; toast('已發送給 ' + rcp + ' 位學員', 'ok'); route(); }
  });

  route();
})();
