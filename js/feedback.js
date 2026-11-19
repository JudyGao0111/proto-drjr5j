/* 回報修改工具：在 Prototype 任一畫面直接填寫修改需求，匯出成回報表（.xlsx） */
(function () {
  'use strict';
  const KEY = 'ntpc-proto-feedback-v1';
  const PAGES = ['前台｜全站頁首／頁尾', '前台｜首頁', '前台｜最新消息（列表）', '前台｜最新消息（內頁）', '前台｜課程列表（找課程）', '前台｜課程詳情', '前台｜報名流程-步驟1 確認資料', '前台｜報名流程-步驟2 同意須知', '前台｜報名完成頁', '前台｜登入', '前台｜忘記密碼', '前台｜註冊', '前台｜會員中心-總覽（獎勵與目標）', '前台｜會員中心-我的課表', '前台｜會員中心-簽到簽退', '前台｜會員中心-我的體適能', '前台｜會員中心-滿意度問卷', '前台｜會員中心-通知', '前台｜會員中心-個人資料', '前台｜會員中心-修改手機／Email 驗證視窗',
    '後台｜全站側欄／頁首（身分切換）', '後台｜儀表板', '後台｜班級管理（列表）', '後台｜班級設定（新增／編輯表單）', '後台｜場次與簽到（列表）', '後台｜改期／停課視窗', '後台｜出缺席登載視窗', '後台｜QR 簽到視窗／紙本簽到表', '後台｜報名名單與審核', '後台｜體適能匯入', '後台｜成果統計報表-總體統計表', '後台｜成果統計報表-出席率總表', '後台｜成果統計報表-體適能前後測', '後台｜滿意度統計', '後台｜新北幣名單', '後台｜通知與公告', '後台｜首頁 Banner 管理', '後台｜最新消息管理',
    '其他｜入口頁（原型說明）', '其他｜示範資料（班級／學員／廠商名稱等）', '其他｜全站配色／字體／版面風格', '其他｜新功能需求（目前沒有的頁面或功能）', '其他｜流程或規則（跨多頁的邏輯）'];
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  let st = (() => { try { const o = JSON.parse(localStorage.getItem(KEY)); if (o && o.items) return o; } catch (e) { /* ignore */ } return { seq: 0, items: [] }; })();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); return true; } catch (e) { return false; } };
  let draftImgs = [], editing = null, picking = false, tab = 'new';

  function say(msg, bad) {
    const t = document.createElement('div'); t.textContent = msg;
    t.style.cssText = 'position:fixed;left:50%;bottom:84px;transform:translateX(-50%);z-index:400;background:' + (bad ? '#B3261E' : '#1C2230') + ';color:#fff;padding:10px 18px;border-radius:10px;font-size:14px;box-shadow:0 6px 24px rgba(0,0,0,.3);max-width:90vw';
    document.body.appendChild(t); setTimeout(() => t.remove(), 3000);
  }

  /* ---------- 判斷目前畫面 ---------- */
  function context() {
    const file = location.pathname.split('/').pop() || 'index.html'; const h = location.hash.slice(1).split('?')[0]; const [a, b, c] = h.split('/').filter(Boolean);
    const C = window.Core; const modal = $('#modal-ov .modal'); const mt = modal ? ($('h3', modal) || {}).textContent || '' : ''; let where = '其他', page = '其他｜入口頁（原型說明）', role = '不適用', extra = '';
    if (file === 'front.html') {
      where = '前台';
      const tabs = { overview: '會員中心-總覽（獎勵與目標）', courses: '會員中心-我的課表', checkin: '會員中心-簽到簽退', fitness: '會員中心-我的體適能', survey: '會員中心-滿意度問卷', notices: '會員中心-通知', profile: '會員中心-個人資料' };
      page = !a ? '首頁' : a === 'courses' ? '課程列表（找課程）' : a === 'course' ? '課程詳情' : a === 'news' ? (b ? '最新消息（內頁）' : '最新消息（列表）') : a === 'forgot' ? '忘記密碼' : a === 'login' ? '登入' : a === 'register' ? '註冊' : a === 'me' ? (tabs[b || 'overview'] || '會員中心-總覽（獎勵與目標）') : a === 'enroll' ? ($('.card.center h2') ? '報名完成頁' : (($('.steps .on') || {}).textContent || '').startsWith('2') ? '報名流程-步驟2 同意須知' : '報名流程-步驟1 確認資料') : '首頁'; page = '前台｜' + page;
      if (modal && /QR/.test(mt)) page = '前台｜會員中心-簽到簽退'; if (modal && /驗證新的/.test(mt)) page = '前台｜會員中心-修改手機／Email 驗證視窗';
      if ((a === 'course' || a === 'enroll') && b && C) { const c0 = C.courseOf(b); if (c0) extra = '班級 ' + c0.id + '「' + c0.name + '」'; }
    } else if (file === 'admin.html') {
      where = '後台'; role = C && /^V\d/.test(C.S.admin || '') ? '廠商' : '體育局';
      const m = { dashboard: '儀表板', courses: '班級管理（列表）', course: '班級設定（新增／編輯表單）', sessions: '場次與簽到（列表）', roster: '報名名單與審核', import: '體適能匯入', survey: '滿意度統計', rewards: '新北幣名單', notices: '通知與公告', banners: '首頁 Banner 管理', news: '最新消息管理' };
      page = a === 'reports' ? (b === 'rate' ? '成果統計報表-出席率總表' : b === 'prepost' ? '成果統計報表-體適能前後測' : '成果統計報表-總體統計表') : (m[a || 'dashboard'] || '儀表板'); page = '後台｜' + page;
      if (modal) { if (/改期|停課/.test(mt)) page = '後台｜改期／停課視窗'; else if (/出缺席/.test(mt)) page = '後台｜出缺席登載視窗'; else if (/QR|簽到表/.test(mt + modal.textContent.slice(0, 40))) page = '後台｜QR 簽到視窗／紙本簽到表'; }
      if (b && C && /^C\d+$/.test(b)) { const c0 = C.courseOf(b); if (c0) extra = '班級 ' + c0.id + '「' + c0.name + '」'; }
      if (C && /^V\d/.test(C.S.admin || '')) extra += (extra ? '；' : '') + '以' + C.vendorOf(C.S.admin).name + '身分檢視';
    }
    return { where, page, role, extra, device: window.innerWidth < 768 ? '手機' : '電腦', path: file + (location.hash || '') };
  }

  /* ---------- 版面 ---------- */
  const css = `
#fb-btn{position:fixed;right:16px;bottom:16px;z-index:250;display:flex;align-items:center;gap:8px;border:0;border-radius:99px;background:#1C2230;color:#fff;font:700 14px/1 "Noto Sans TC","Microsoft JhengHei",sans-serif;padding:12px 18px;cursor:pointer;box-shadow:0 6px 22px rgba(0,0,0,.3)}
#fb-btn:hover{background:#E4501B}#fb-btn b{background:#E4501B;border-radius:99px;padding:2px 8px;font-size:12px}#fb-btn:hover b{background:#fff;color:#E4501B}
#fb-panel{position:fixed;top:0;right:0;bottom:0;width:min(460px,100vw);z-index:260;background:#fff;box-shadow:-10px 0 40px rgba(0,0,0,.25);transform:translateX(105%);transition:transform .25s;display:flex;flex-direction:column;font:14px/1.55 "Noto Sans TC","Microsoft JhengHei",sans-serif;color:#1C2230}
#fb-panel.open{transform:none}#fb-panel.hide{display:none}
#fb-panel header{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;background:#1C2230;color:#fff}#fb-panel header b{font-size:16px}
#fb-panel header button{background:none;border:0;color:#fff;font-size:22px;cursor:pointer;line-height:1}
.fb-tabs{display:flex;border-bottom:1px solid #E3E6EC}.fb-tabs button{flex:1;padding:11px;border:0;background:none;font:700 14px inherit;font-family:inherit;color:#6B7385;cursor:pointer;border-bottom:3px solid transparent}.fb-tabs .on{color:#C03E0E;border-color:#E4501B}
#fb-body{flex:1;overflow:auto;padding:16px 18px}
#fb-panel label.l{display:block;font-weight:700;font-size:13px;margin:12px 0 5px;color:#3C4557}#fb-panel label.l i{color:#B3261E;font-style:normal}
#fb-panel input[type=text],#fb-panel select,#fb-panel textarea{width:100%;font:inherit;padding:8px 10px;border:1px solid #cfd4de;border-radius:8px;background:#fff;color:inherit}
#fb-panel textarea{min-height:70px;resize:vertical}
.fb-chips{display:flex;gap:6px;flex-wrap:wrap}.fb-chips label{cursor:pointer}.fb-chips input{display:none}.fb-chips span{display:inline-block;padding:6px 14px;border:1px solid #cfd4de;border-radius:99px;font-weight:600}.fb-chips input:checked+span{background:#1C2230;color:#fff;border-color:#1C2230}
.fb-chips.pri input[value="必改"]:checked+span{background:#B3261E;border-color:#B3261E}.fb-chips.pri input[value="想要"]:checked+span{background:#A85B00;border-color:#A85B00}.fb-chips.pri input[value="先不改只討論"]:checked+span{background:#1752C7;border-color:#1752C7}
.fb-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.fb-btn2{border:1px solid #cfd4de;background:#fff;border-radius:8px;padding:7px 12px;font:700 13px inherit;font-family:inherit;cursor:pointer}.fb-btn2:hover{border-color:#E4501B;color:#C03E0E}
.fb-btn2.p{background:#E4501B;border-color:#E4501B;color:#fff}.fb-btn2.p:hover{background:#C03E0E;color:#fff}.fb-btn2.d{color:#B3261E}
.fb-hint{font-size:12px;color:#6B7385;margin-top:4px}
.fb-thumbs{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}.fb-thumbs div{position:relative}.fb-thumbs img{width:84px;height:64px;object-fit:cover;border-radius:8px;border:1px solid #cfd4de;display:block}.fb-thumbs button{position:absolute;top:-6px;right:-6px;width:20px;height:20px;border-radius:50%;border:0;background:#B3261E;color:#fff;cursor:pointer;line-height:1}
#fb-foot{padding:12px 18px;border-top:1px solid #E3E6EC;display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}
.fb-item{border:1px solid #E3E6EC;border-radius:10px;padding:12px;margin-bottom:10px}.fb-item .t{display:flex;justify-content:space-between;gap:8px;align-items:center;font-size:13px;color:#6B7385}
.fb-tag{display:inline-block;padding:1px 9px;border-radius:99px;font-size:12px;font-weight:700;color:#fff}
.fb-picking{position:fixed;left:50%;top:14px;transform:translateX(-50%);z-index:500;background:#E4501B;color:#fff;padding:10px 18px;border-radius:10px;font:700 14px "Noto Sans TC","Microsoft JhengHei",sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.35)}
#fb-hl{position:fixed;z-index:490;pointer-events:none;border:3px solid #E4501B;background:rgba(228,80,27,.12);border-radius:6px;transition:all .06s}
.fb-flash{outline:3px dashed #E4501B!important;outline-offset:2px}
body.fb-pick *{cursor:crosshair!important}
@media print{#fb-btn,#fb-panel{display:none!important}}
#toast-box{bottom:80px!important}`;
  const style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);
  const root = document.createElement('div'); root.id = 'fb-root'; document.body.appendChild(root);
  root.innerHTML = `<button id="fb-btn" aria-label="回報修改">💬 回報修改 <b id="fb-n" style="display:none">0</b></button><aside id="fb-panel" aria-label="回報修改"><header><b>💬 回報修改</b><button id="fb-x" aria-label="關閉">×</button></header><div class="fb-tabs"><button data-t="new" class="on">新增回報</button><button data-t="list">我的回報清單（<span id="fb-cnt">0</span>）</button></div><div id="fb-body"></div><div id="fb-foot"></div></aside>`;
  const panel = $('#fb-panel'), body = $('#fb-body'), foot = $('#fb-foot');

  const pri = ['必改', '想要', '先不改只討論'];
  function formHtml() {
    return `<label class="l">修改位置（自動帶入，可改）</label><div class="fb-chips">${['前台', '後台', '其他'].map(w => `<label><input type="radio" name="where" value="${w}"><span>${w}</span></label>`).join('')}</div>
      <label class="l">頁面</label><select id="fb-page">${PAGES.map(p => `<option>${esc(p)}</option>`).join('')}</select>
      <label class="l">優先順序</label><div class="fb-chips pri">${pri.map(p => `<label><input type="radio" name="pri" value="${p}" ${p === '想要' ? 'checked' : ''}><span>${p}</span></label>`).join('')}</div>
      <label class="l">怎麼指（路徑／畫面位置）</label><textarea id="fb-how" rows="3"></textarea><div style="margin-top:6px"><button type="button" class="fb-btn2" id="fb-pick">🎯 在畫面上點選位置</button> <span class="fb-hint">點選後會自動寫出元素名稱與所在區塊</span></div>
      <label class="l">改什麼 <i>*</i></label><textarea id="fb-what" rows="3" placeholder="寫你想看到的結果，例如：新增欄位『請假人數』"></textarea>
      <label class="l">為什麼（原因／情境）</label><textarea id="fb-why" rows="2"></textarea>
      <label class="l">圖檔（截圖或草圖）</label><div><button type="button" class="fb-btn2" id="fb-file">🖼 選擇圖片</button> <span class="fb-hint">或直接在此頁面按 Ctrl+V 貼上截圖（Win+Shift+S 可截圖）</span><input type="file" id="fb-input" accept="image/*" multiple style="display:none"></div><div class="fb-thumbs" id="fb-thumbs"></div>
      <div class="fb-row"><div><label class="l">裝置</label><select id="fb-device"><option>手機</option><option>電腦</option><option>都要</option></select></div><div><label class="l">檢視身分</label><select id="fb-role"><option>體育局</option><option>廠商</option><option>皆可</option><option>不適用</option></select></div></div>`;
  }
  const touched = {};
  function fillCtx(force) {
    const x = context();
    if (force || !touched.where) { const r = $(`input[name=where][value="${x.where}"]`, body); if (r) r.checked = true; }
    if (force || !touched.page) $('#fb-page', body).value = x.page;
    if (force || !touched.device) $('#fb-device', body).value = x.device;
    if (force || !touched.role) $('#fb-role', body).value = x.role;
    if (force || !touched.how) $('#fb-how', body).value = '路徑：' + x.path + (x.extra ? '（' + x.extra + '）' : '') + '\n位置：';
  }
  function renderThumbs() { $('#fb-thumbs', body).innerHTML = draftImgs.map((im, i) => `<div><img src="${im.data}" alt="附圖 ${i + 1}"><button data-rm="${i}" aria-label="移除">×</button></div>`).join(''); }
  function showNew(load) {
    tab = 'new'; body.innerHTML = formHtml(); Object.keys(touched).forEach(k => delete touched[k]);
    foot.innerHTML = `<button class="fb-btn2" id="fb-clear">清空</button><button class="fb-btn2 p" id="fb-save">${editing ? '更新回報' : '加入回報清單'}</button>`;
    if (load) { const it = load; $(`input[name=where][value="${it.where}"]`, body).checked = true; $('#fb-page', body).value = it.page; $(`input[name=pri][value="${it.pri}"]`, body).checked = true; $('#fb-how', body).value = it.how; $('#fb-what', body).value = it.what; $('#fb-why', body).value = it.why; $('#fb-device', body).value = it.device; $('#fb-role', body).value = it.role; draftImgs = it.imgs.slice(); ['where', 'page', 'device', 'role', 'how'].forEach(k => { touched[k] = true; }); renderThumbs(); } else { draftImgs = []; fillCtx(true); }
    $$('.fb-tabs button').forEach(b => b.classList.toggle('on', b.dataset.t === 'new'));
  }
  function showList() {
    tab = 'list'; $$('.fb-tabs button').forEach(b => b.classList.toggle('on', b.dataset.t === 'list'));
    const col = { '必改': '#B3261E', '想要': '#A85B00', '先不改只討論': '#1752C7' };
    body.innerHTML = st.items.length ? st.items.slice().reverse().map(it => `<div class="fb-item"><div class="t"><span><b style="color:#1C2230">#${it.id}</b> <span class="fb-tag" style="background:${col[it.pri]}">${it.pri}</span> ${esc(it.where)}｜${esc(it.device)}</span><span><button class="fb-btn2" data-edit="${it.id}">編輯</button> <button class="fb-btn2 d" data-del="${it.id}">刪除</button></span></div><div class="fb-hint" style="margin:6px 0 2px">${esc(it.page)}</div><div style="white-space:pre-wrap">${esc(it.what)}</div>${it.imgs.length ? `<div class="fb-hint">🖼 ${it.imgs.length} 張圖</div>` : ''}</div>`).join('') : '<div style="text-align:center;color:#6B7385;padding:40px 0">尚無回報。<br>切到「新增回報」開始填寫。</div>';
    foot.innerHTML = `<button class="fb-btn2 d" id="fb-purge" ${st.items.length ? '' : 'disabled'}>清空清單</button><button class="fb-btn2" id="fb-csv" ${st.items.length ? '' : 'disabled'}>匯出 CSV</button><button class="fb-btn2 p" id="fb-xlsx" ${st.items.length ? '' : 'disabled'}>⬇ 匯出 Excel（.xlsx）</button>`;
  }
  function refreshCount() { $('#fb-cnt').textContent = st.items.length; const n = $('#fb-n'); n.textContent = st.items.length; n.style.display = st.items.length ? '' : 'none'; }
  function open(t) { panel.classList.remove('hide'); panel.classList.add('open'); if (t === 'list') showList(); else if (tab !== 'new' || !$('#fb-what', body)) showNew(); else fillCtx(false); }
  function close() { panel.classList.remove('open'); }

  /* ---------- 圖片 ---------- */
  function addImage(blob) {
    return new Promise(res => {
      const url = URL.createObjectURL(blob); const img = new Image();
      img.onload = () => { const m = 1100; const s = Math.min(1, m / Math.max(img.width, img.height)); const w = Math.round(img.width * s), h = Math.round(img.height * s); const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.drawImage(img, 0, 0, w, h); draftImgs.push({ data: c.toDataURL('image/jpeg', 0.82), w, h }); URL.revokeObjectURL(url); renderThumbs(); res(); };
      img.onerror = () => { URL.revokeObjectURL(url); say('無法讀取此圖片', true); res(); }; img.src = url;
    });
  }
  document.addEventListener('paste', e => { if (!panel.classList.contains('open') || tab !== 'new') return; const f = Array.from(e.clipboardData.items || []).filter(i => i.type.startsWith('image/')); if (!f.length) return; e.preventDefault(); f.forEach(i => addImage(i.getAsFile())); say('已貼上截圖'); });

  /* ---------- 在畫面上點選 ---------- */
  const hl = document.createElement('div'); hl.id = 'fb-hl'; hl.style.display = 'none'; document.body.appendChild(hl);
  let bar = null, lastEl = null;
  const inFb = el => !el || el.closest('#fb-root') || el.id === 'fb-hl';
  function describe(el) {
    const T = { A: '連結', BUTTON: '按鈕', INPUT: '輸入欄位', SELECT: '下拉選單', TEXTAREA: '文字框', TH: '表格欄位標題', TD: '表格儲存格', TR: '表格列', H1: '標題', H2: '標題', H3: '小標題', H4: '小標題', LI: '清單項目', LABEL: '欄位標籤', IMG: '圖片', SVG: '圖示', B: '文字', SPAN: '文字', P: '段落', DIV: '區塊', SECTION: '區塊', I: '進度條', ASIDE: '側欄' };
    const tag = el.tagName.toUpperCase(); let kind = T[tag] || '區塊'; if (el.classList.contains('badge')) kind = '狀態標籤'; if (el.classList.contains('card')) kind = '卡片'; if (el.classList.contains('bar')) kind = '進度條'; if (el.classList.contains('chip')) kind = '篩選標籤'; if (el.classList.contains('kpi')) kind = '數字卡片'; if (el.classList.contains('btn')) kind = '按鈕'; if (el.classList.contains('hero')) kind = '首頁大圖區'; if (el.classList.contains('modal')) kind = '彈出視窗';
    let label = (el.getAttribute('aria-label') || (tag === 'INPUT' || tag === 'TEXTAREA' ? el.placeholder || (el.labels && el.labels[0] ? el.labels[0].textContent : '') || el.value : '') || el.innerText || el.textContent || '').trim().replace(/\s+/g, ' ');
    if (label.length > 40) label = label.slice(0, 40) + '…';
    const area = el.closest('.modal') ? '彈出視窗' : el.closest('.side') ? '左側選單' : el.closest('.adm-h') ? '後台頁首' : el.closest('.site-h') ? '前台頁首' : el.closest('.topbar') ? '最上方黑色列' : el.closest('.footer') ? '頁尾' : el.closest('.me-side') ? '會員中心左側選單' : el.closest('.sticky') ? '右側報名欄' : el.closest('.toolbar,.filters,.searchbar') ? '篩選列' : el.closest('.tabs') ? '分頁標籤' : el.closest('.tbl-wrap') ? '表格' : '';
    const card = el.closest('.card,.modal'); let ct = ''; if (card) { const h = card.querySelector('h1,h2,h3,.sec-t,b'); if (h && h !== el && !el.contains(h)) ct = h.textContent.trim().replace(/\s+/g, ' ').slice(0, 24); }
    let row = ''; const tr = el.closest('tr'); if (tr && tr.parentElement.tagName === 'TBODY') { const f = tr.querySelector('b,td'); if (f) row = f.textContent.trim().replace(/\s+/g, ' ').slice(0, 20); }
    return '【' + kind + '】' + (label ? '「' + label + '」' : '') + (ct ? '，在「' + ct + '」區塊' : '') + (row ? '，該列「' + row + '」' : '') + (area ? '（' + area + '）' : '');
  }
  const blk = e => { if (!inFb(e.target)) { e.preventDefault(); e.stopImmediatePropagation(); } };
  const mv = e => { const el = document.elementFromPoint(e.clientX, e.clientY); if (inFb(el)) { hl.style.display = 'none'; lastEl = null; return; } lastEl = el; const r = el.getBoundingClientRect(); hl.style.cssText = `display:block;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px`; };
  const pk = e => { if (inFb(e.target)) return; e.preventDefault(); e.stopImmediatePropagation(); const el = lastEl || e.target; const d = describe(el); endPick(); el.classList.add('fb-flash'); setTimeout(() => el.classList.remove('fb-flash'), 2500); const x = context(); open('new'); const t = $('#fb-how', body); t.value = '路徑：' + x.path + (x.extra ? '（' + x.extra + '）' : '') + '\n位置：' + d; touched.how = true; say('已指定位置'); };
  const esc2 = e => { if (e.key === 'Escape') { endPick(); open('new'); } };
  function startPick() { picking = true; panel.classList.add('hide'); document.body.classList.add('fb-pick'); bar = document.createElement('div'); bar.className = 'fb-picking'; bar.textContent = '請點一下要修改的位置（Esc 取消）'; document.body.appendChild(bar); document.addEventListener('mousemove', mv, true); document.addEventListener('click', pk, true); ['mousedown', 'mouseup', 'submit', 'change'].forEach(t => document.addEventListener(t, blk, true)); document.addEventListener('keydown', esc2, true); }
  function endPick() { picking = false; document.body.classList.remove('fb-pick'); hl.style.display = 'none'; if (bar) bar.remove(); bar = null; document.removeEventListener('mousemove', mv, true); document.removeEventListener('click', pk, true); ['mousedown', 'mouseup', 'submit', 'change'].forEach(t => document.removeEventListener(t, blk, true)); document.removeEventListener('keydown', esc2, true); panel.classList.remove('hide'); }

  /* ---------- 儲存／事件 ---------- */
  function saveItem() {
    const what = $('#fb-what', body).value.trim(); if (!what) { say('請填寫「改什麼」', true); $('#fb-what', body).focus(); return; }
    const val = n => ($(`input[name=${n}]:checked`, body) || {}).value || '';
    const it = { id: editing || String(++st.seq).padStart(3, '0'), where: val('where'), pri: val('pri'), page: $('#fb-page', body).value, how: $('#fb-how', body).value.trim(), what, why: $('#fb-why', body).value.trim(), imgs: draftImgs.slice(), device: $('#fb-device', body).value, role: $('#fb-role', body).value, at: new Date().toLocaleString('zh-TW', { hour12: false }), url: location.pathname.split('/').pop() + location.hash, vp: window.innerWidth + '×' + window.innerHeight };
    const prev = st.items.slice(), prevSeq = st.seq; const i = st.items.findIndex(x => x.id === it.id); if (i >= 0) st.items[i] = it; else st.items.push(it);
    if (!save()) { st.items = prev; st.seq = prevSeq; say('瀏覽器儲存空間不足：請先匯出並清空清單，或減少圖片', true); return; }
    say(editing ? '已更新回報 #' + it.id : '已加入回報 #' + it.id); editing = null; refreshCount(); showNew();
  }
  root.addEventListener('click', e => {
    const t = e.target; if (t.closest('#fb-btn')) { panel.classList.contains('open') ? close() : open(); return; }
    if (t.closest('#fb-x')) close(); else if (t.dataset.t) { t.dataset.t === 'list' ? showList() : showNew(); }
    else if (t.id === 'fb-pick') startPick(); else if (t.id === 'fb-file') $('#fb-input').click(); else if (t.id === 'fb-save') saveItem();
    else if (t.id === 'fb-clear') { editing = null; showNew(); } else if (t.dataset.rm) { draftImgs.splice(+t.dataset.rm, 1); renderThumbs(); }
    else if (t.dataset.edit) { const it = st.items.find(x => x.id === t.dataset.edit); editing = it.id; showNew(it); } else if (t.dataset.del) { if (confirm('刪除回報 #' + t.dataset.del + '？')) { st.items = st.items.filter(x => x.id !== t.dataset.del); save(); refreshCount(); showList(); } }
    else if (t.id === 'fb-purge') { if (confirm('清空全部 ' + st.items.length + ' 筆回報？（建議先匯出）')) { st.items = []; save(); refreshCount(); showList(); } }
    else if (t.id === 'fb-xlsx') exportXlsx(); else if (t.id === 'fb-csv') exportCsv();
  });
  root.addEventListener('change', e => { const t = e.target; if (t.id === 'fb-input') { Array.from(t.files).forEach(addImage); t.value = ''; } else if (t.name === 'where') touched.where = true; else if (t.id === 'fb-page') touched.page = true; else if (t.id === 'fb-device') touched.device = true; else if (t.id === 'fb-role') touched.role = true; });
  root.addEventListener('input', e => { if (e.target.id === 'fb-how') touched.how = true; });
  window.addEventListener('hashchange', () => { if (panel.classList.contains('open') && tab === 'new' && !editing && $('#fb-what', body)) fillCtx(false); });
  window.addEventListener('resize', () => { if (panel.classList.contains('open') && tab === 'new' && $('#fb-what', body)) fillCtx(false); });

  /* ---------- 匯出 ---------- */
  const HEAD = ['編號', '修改位置', '優先順序', '頁面（下拉選）', '怎麼指（路徑／畫面上的哪個位置）', '改什麼', '為什麼（原因／情境）', '圖檔（填檔名；圖放在「Prototype修改回報圖檔」資料夾）', '裝置', '檢視身分', '狀態（Claude 填）', 'Claude 回覆／需向您確認的問題', '回報時間／網址（自動）'];
  const imgNames = it => it.imgs.map((_, i) => it.id + '-' + (i + 1) + '.jpg');
  const stamp = () => { const d = new Date(); const p = n => String(n).padStart(2, '0'); return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes()); };
  const rowOf = it => [it.id, it.where, it.pri, it.page, it.how, it.what, it.why, it.imgs.length ? imgNames(it).join('；') + '（圖見「截圖」工作表）' : '', it.device, it.role, '待處理', '', it.at + '｜' + it.url + '｜視窗 ' + it.vp];
  function download(name, blob) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800); }
  function exportCsv() { const q = v => { v = String(v == null ? '' : v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }; download('Prototype修改需求回報_' + stamp() + '.csv', new Blob(['﻿' + [HEAD].concat(st.items.map(rowOf)).map(r => r.map(q).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' })); say('已匯出 CSV（不含圖片）'); }

  const enc = new TextEncoder(); const CRC = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = u => { let c = ~0; for (let i = 0; i < u.length; i++) c = CRC[(c ^ u[i]) & 255] ^ (c >>> 8); return ~c >>> 0; };
  function zip(files) {
    const parts = [], cen = []; let off = 0; const w16 = (a, v) => a.push(v & 255, (v >> 8) & 255); const w32 = (a, v) => a.push(v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255);
    files.forEach(f => { const nm = enc.encode(f.name), crc = crc32(f.data), n = f.data.length; const h = []; w32(h, 0x04034b50); w16(h, 20); w16(h, 0x0800); w16(h, 0); w16(h, 0); w16(h, 0x21); w32(h, crc); w32(h, n); w32(h, n); w16(h, nm.length); w16(h, 0); parts.push(new Uint8Array(h), nm, f.data);
      const c = []; w32(c, 0x02014b50); w16(c, 20); w16(c, 20); w16(c, 0x0800); w16(c, 0); w16(c, 0); w16(c, 0x21); w32(c, crc); w32(c, n); w32(c, n); w16(c, nm.length); w16(c, 0); w16(c, 0); w16(c, 0); w16(c, 0); w32(c, 0); w32(c, off); cen.push(new Uint8Array(c), nm); off += h.length + nm.length + n; });
    const cl = cen.reduce((a, b) => a + b.length, 0); const e = []; w32(e, 0x06054b50); w16(e, 0); w16(e, 0); w16(e, files.length); w16(e, files.length); w32(e, cl); w32(e, off); w16(e, 0);
    const all = parts.concat(cen, [new Uint8Array(e)]); const out = new Uint8Array(all.reduce((a, b) => a + b.length, 0)); let p = 0; all.forEach(b => { out.set(b, p); p += b.length; }); return out;
  }
  const x = s => String(s == null ? '' : s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const colL = i => String.fromCharCode(65 + i);
  const cell = (r, c, v, s) => '<c r="' + colL(c) + r + '" t="inlineStr" s="' + s + '"><is><t xml:space="preserve">' + x(v) + '</t></is></c>';
  function buildXlsx() {
    const items = st.items; const imgs = []; items.forEach(it => it.imgs.forEach((im, i) => imgs.push({ it, im, n: i + 1 }))); const hasImg = imgs.length > 0; const NS = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"'; const X = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
    const widths = [7, 11, 15, 34, 44, 46, 36, 34, 10, 14, 14, 40, 40];
    const priStyle = { '必改': 5, '想要': 6, '先不改只討論': 7 };
    let rows = '<row r="1" ht="46" customHeight="1">' + HEAD.map((h, i) => cell(1, i, h, i < 8 ? 1 : 2)).join('') + '</row>';
    items.forEach((it, k) => { const r = k + 2, v = rowOf(it); const lines = Math.max(2, Math.ceil(String(it.what).length / 22), Math.ceil(String(it.how).length / 20)); rows += '<row r="' + r + '" ht="' + Math.min(200, 18 + lines * 14) + '" customHeight="1">' + v.map((val, i) => cell(r, i, val, i === 2 ? (priStyle[it.pri] || 4) : [0, 1, 8, 9, 10].includes(i) ? 4 : 3)).join('') + '</row>'; });
    const sheet1 = X + '<worksheet ' + NS + '><sheetViews><sheetView workbookViewId="0"><pane xSplit="1" ySplit="1" topLeftCell="B2" activePane="bottomRight" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/><cols>' + widths.map((w, i) => '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + w + '" customWidth="1"/>').join('') + '</cols><sheetData>' + rows + '</sheetData><autoFilter ref="A1:M' + (items.length + 1) + '"/></worksheet>';
    const styles = X + '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="5"><font><sz val="10"/><name val="Microsoft JhengHei"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Microsoft JhengHei"/></font><font><b/><sz val="10"/><color rgb="FFB3261E"/><name val="Microsoft JhengHei"/></font><font><b/><sz val="10"/><color rgb="FFA85B00"/><name val="Microsoft JhengHei"/></font><font><b/><sz val="10"/><color rgb="FF1752C7"/><name val="Microsoft JhengHei"/></font></fonts><fills count="7"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE4501B"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1C2230"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFDE8E6"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFF1D6"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE5EDFD"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFD0D5DD"/></left><right style="thin"><color rgb="FFD0D5DD"/></right><top style="thin"><color rgb="FFD0D5DD"/></top><bottom style="thin"><color rgb="FFD0D5DD"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="8"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="1" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="2" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="top"/></xf><xf numFmtId="0" fontId="3" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="top"/></xf><xf numFmtId="0" fontId="4" fillId="6" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="top"/></xf></cellXfs></styleSheet>';
    const files = [];
    let ct = X + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="jpeg" ContentType="image/jpeg"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' + (hasImg ? '<Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>' : '') + '</Types>';
    files.push({ name: '[Content_Types].xml', data: enc.encode(ct) });
    files.push({ name: '_rels/.rels', data: enc.encode(X + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>') });
    files.push({ name: 'xl/workbook.xml', data: enc.encode(X + '<workbook ' + NS + '><sheets><sheet name="修改需求" sheetId="1" r:id="rId1"/>' + (hasImg ? '<sheet name="截圖" sheetId="2" r:id="rId2"/>' : '') + '</sheets></workbook>') });
    files.push({ name: 'xl/_rels/workbook.xml.rels', data: enc.encode(X + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' + (hasImg ? '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>' : '') + '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>') });
    files.push({ name: 'xl/styles.xml', data: enc.encode(styles) }); files.push({ name: 'xl/worksheets/sheet1.xml', data: enc.encode(sheet1) });
    if (hasImg) {
      let r = 1, caps = '', anchors = '', rels = '';
      imgs.forEach((o, k) => { const w = Math.min(560, o.im.w), h = Math.round(o.im.h * w / o.im.w); caps += '<row r="' + r + '">' + cell(r, 0, '#' + o.it.id + '-' + o.n + '.jpg｜' + o.it.page + '｜' + o.it.what.replace(/\s+/g, ' ').slice(0, 40), 3) + '</row>';
        anchors += '<xdr:oneCellAnchor><xdr:from><xdr:col>0</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>' + r + '</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:ext cx="' + w * 9525 + '" cy="' + h * 9525 + '"/><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="' + (k + 2) + '" name="Picture ' + (k + 1) + '"/><xdr:cNvPicPr/></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="rId' + (k + 1) + '"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="' + w * 9525 + '" cy="' + h * 9525 + '"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor>';
        rels += '<Relationship Id="rId' + (k + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image' + (k + 1) + '.jpeg"/>';
        const b64 = o.im.data.split(',')[1]; const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); files.push({ name: 'xl/media/image' + (k + 1) + '.jpeg', data: u }); r += Math.ceil(h / 20) + 2; });
      files.push({ name: 'xl/worksheets/sheet2.xml', data: enc.encode(X + '<worksheet ' + NS + '><cols><col min="1" max="1" width="90" customWidth="1"/></cols><sheetData>' + caps + '</sheetData><drawing r:id="rId1"/></worksheet>') });
      files.push({ name: 'xl/worksheets/_rels/sheet2.xml.rels', data: enc.encode(X + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/></Relationships>') });
      files.push({ name: 'xl/drawings/drawing1.xml', data: enc.encode(X + '<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' + anchors + '</xdr:wsDr>') });
      files.push({ name: 'xl/drawings/_rels/drawing1.xml.rels', data: enc.encode(X + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + rels + '</Relationships>') });
    }
    return zip(files);
  }
  function exportXlsx() { download('Prototype修改需求回報_' + stamp() + '.xlsx', new Blob([buildXlsx()], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })); say('已匯出 Excel；請把檔案放到專案資料夾，再告訴我檔名'); }

  window.Feedback = { items: () => st.items, buildXlsx, open, describe, context };
  refreshCount();
})();
