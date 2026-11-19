/* 存取閘門：從雲端網址開啟時需輸入密碼；本機（file://、localhost）直接放行。
   通過前不會載入任何程式與示範資料。注意：這是前端密碼，屬「防誤闖」，不是真正的保密機制。 */
(function () {
  'use strict';
  const me = document.currentScript;
  const list = (me.dataset.scripts || '').split(',').map(s => s.trim()).filter(Boolean);
  const host = location.hostname;
  const isLocal = location.protocol === 'file:' || ['localhost', '127.0.0.1', '[::1]', '::1', ''].includes(host) || host.endsWith('.localhost');
  const force = new URLSearchParams(location.search).get('gate') === '1'; // 本機預覽密碼畫面用
  const cfg = window.GATE_CONFIG || {};
  const KEY = 'ntpc-proto-gate-v1';

  const load = i => { if (i >= list.length) return; const s = document.createElement('script'); s.src = list[i]; s.onload = () => load(i + 1); s.onerror = () => console.error('載入失敗：' + list[i]); document.body.appendChild(s); };
  const start = () => { document.querySelectorAll('[data-gated]').forEach(e => { e.hidden = false; }); load(0); };
  if (isLocal && !force) { start(); return; }

  const read = st => { try { return JSON.parse(st.getItem(KEY) || 'null'); } catch (e) { return null; } };
  const saved = [read(sessionStorage), read(localStorage)].find(t => t && cfg.hash && t.h === cfg.hash && t.exp > Date.now());
  if (saved) { start(); return; }

  const hex2u8 = h => new Uint8Array((h.match(/../g) || []).map(x => parseInt(x, 16)));
  const u82hex = u => Array.from(u).map(b => b.toString(16).padStart(2, '0')).join('');
  async function derive(pw) {
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits']);
    return u82hex(new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: hex2u8(cfg.salt), iterations: cfg.iter || 150000 }, key, 256)));
  }

  const css = '#gate{position:fixed;inset:0;z-index:9999;display:flex;overflow:auto;padding:20px;background:linear-gradient(135deg,#E4501B,#F5A31A);font-family:"Noto Sans TC","Microsoft JhengHei",system-ui,sans-serif;color:#1C2230}'
    + '#gate .g{margin:auto;background:#fff;border-radius:18px;padding:30px 28px;width:100%;max-width:400px;box-shadow:0 20px 60px rgba(0,0,0,.3)}#gate h1{font-size:21px;margin:0 0 6px}#gate p{margin:0 0 14px;color:#3C4557;font-size:14px;line-height:1.6}'
    + '#gate .tag{display:inline-block;background:#FFF0E8;color:#C03E0E;font-weight:700;font-size:12px;border-radius:99px;padding:2px 10px;margin-bottom:10px}#gate label{display:block;font-weight:700;font-size:13px;margin-bottom:5px}'
    + '#gate .row{display:flex;gap:8px}#gate input[type=password],#gate input[type=text]{flex:1;font:inherit;padding:10px 12px;border:1px solid #cfd4de;border-radius:9px;min-height:44px;min-width:0}#gate input:focus{outline:3px solid rgba(228,80,27,.25);border-color:#E4501B}'
    + '#gate button{font:inherit;font-weight:700;border-radius:9px;min-height:44px;padding:0 16px;cursor:pointer;border:1px solid #cfd4de;background:#fff}#gate button.p{width:100%;background:#E4501B;border-color:#E4501B;color:#fff;margin-top:14px;font-size:16px}#gate button.p:disabled{opacity:.55;cursor:wait}'
    + '#gate .ck{display:flex;gap:8px;align-items:center;margin-top:12px;font-size:13px;color:#3C4557}#gate .err{color:#B3261E;font-size:13px;min-height:20px;margin-top:8px}#gate .s{font-size:12px;color:#6B7385;margin-top:14px;line-height:1.6}';
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  const box = document.createElement('div'); box.id = 'gate';
  const head = '<span class="tag">Prototype 示範版・非官方網站</span><h1>全民運動課程報名系統</h1>';
  const foot = '<div class="s">此網站為需求溝通用的示範版，所有課程、學員與數據皆為虛構。請向提供連結的人索取密碼。</div>';
  if (!cfg.hash || !cfg.salt) box.innerHTML = '<div class="g">' + head + '<p>此網站<b>尚未設定存取密碼</b>，目前無法進入。</p><p>請管理者依「上架說明」設定密碼後重新上傳。</p></div>';
  else if (!(window.crypto && crypto.subtle)) box.innerHTML = '<div class="g">' + head + '<p>瀏覽器環境不支援密碼驗證，請改用 <b>https</b> 開頭的網址，或更新瀏覽器。</p></div>';
  else box.innerHTML = '<form class="g" id="gf" autocomplete="off">' + head + '<p>這是受保護的示範網站，請輸入存取密碼。</p><label for="gp">存取密碼</label><div class="row"><input id="gp" type="password" autocomplete="current-password" required><button type="button" id="gs" aria-label="顯示或隱藏密碼">顯示</button></div><label class="ck"><input type="checkbox" id="gr"> 在這台裝置記住 ' + (cfg.days || 7) + ' 天</label><div class="err" id="ge" role="alert"></div><button class="p" id="go">進入</button>' + foot + '</form>';
  document.body.appendChild(box);
  const f = document.getElementById('gf'); if (!f) return;
  let fails = 0; const pw = document.getElementById('gp'); pw.focus();
  document.getElementById('gs').onclick = e => { const show = pw.type === 'password'; pw.type = show ? 'text' : 'password'; e.target.textContent = show ? '隱藏' : '顯示'; };
  f.onsubmit = async e => {
    e.preventDefault(); const go = document.getElementById('go'), err = document.getElementById('ge'); if (!pw.value) return; go.disabled = true; err.textContent = '';
    let h = ''; try { h = await derive(pw.value); } catch (x) { err.textContent = '驗證失敗，請重新整理後再試'; go.disabled = false; return; }
    if (h === cfg.hash) {
      const rec = JSON.stringify({ h: cfg.hash, exp: Date.now() + (document.getElementById('gr').checked ? (cfg.days || 7) * 864e5 : 12 * 36e5) });
      try { (document.getElementById('gr').checked ? localStorage : sessionStorage).setItem(KEY, rec); } catch (x) { /* ignore */ }
      box.remove(); st.remove(); start(); return;
    }
    fails++; err.textContent = '密碼不正確' + (fails >= 3 ? '（請向提供連結的人確認密碼）' : ''); pw.value = ''; pw.focus();
    const wait = Math.min(5, fails); let n = wait; go.textContent = '請稍候 ' + n + ' 秒'; const t = setInterval(() => { n--; if (n <= 0) { clearInterval(t); go.disabled = false; go.textContent = '進入'; } else go.textContent = '請稍候 ' + n + ' 秒'; }, 1000);
  };
})();
