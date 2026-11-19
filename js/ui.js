/* 共用 UI 小工具 */
(function () {
  'use strict';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  function toast(msg, kind) {
    let box = $('#toast-box'); if (!box) { box = document.createElement('div'); box.id = 'toast-box'; document.body.appendChild(box); }
    const t = document.createElement('div'); t.className = 'toast ' + (kind || ''); t.textContent = msg; box.appendChild(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, 3200);
  }

  function openModal(html, opt) {
    closeModal(); opt = opt || {};
    const o = document.createElement('div'); o.className = 'modal-ov'; o.id = 'modal-ov';
    o.innerHTML = '<div class="modal ' + (opt.wide ? 'wide' : '') + '" role="dialog" aria-modal="true">' + html + '</div>';
    o.addEventListener('mousedown', e => { if (e.target === o) closeModal(); });
    document.body.appendChild(o); document.body.classList.add('no-scroll');
    const f = $('input,select,textarea,button.primary', o); if (f && opt.focus !== false) f.focus();
    return o;
  }
  function closeModal() { const o = $('#modal-ov'); if (o) o.remove(); document.body.classList.remove('no-scroll'); }
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
  document.addEventListener('click', e => { if (e.target.closest('[data-close]')) closeModal(); });

  function confirmBox(title, msg, okText, cb, danger) {
    const o = openModal('<h3>' + esc(title) + '</h3><p class="muted">' + msg + '</p><div class="modal-foot"><button class="btn" data-close>取消</button><button class="btn ' + (danger ? 'danger' : 'primary') + '" id="cf-ok">' + esc(okText || '確定') + '</button></div>');
    $('#cf-ok', o).addEventListener('click', () => { closeModal(); cb(); });
  }

  function csv(name, rows) {
    const text = '﻿' + rows.map(r => r.map(v => { v = v == null ? '' : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(',')).join('\r\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' })); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  /* 示意 QR（非真實可掃描） */
  function qr(seed, size) {
    let h = 2166136261; for (const ch of String(seed)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
    const rnd = () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return (h >>> 0) / 4294967296; };
    const N = 27, cell = size / N; let out = '<svg class="qr" width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" role="img" aria-label="簽到 QR Code（示意）"><rect width="100%" height="100%" fill="#fff"/>';
    const finder = (x, y) => (x < 8 && y < 8) || (x > N - 9 && y < 8) || (x < 8 && y > N - 9);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { if (finder(x, y)) continue; if (rnd() > 0.5) out += '<rect x="' + (x * cell).toFixed(1) + '" y="' + (y * cell).toFixed(1) + '" width="' + cell.toFixed(1) + '" height="' + cell.toFixed(1) + '" fill="#111"/>'; }
    [[0, 0], [N - 7, 0], [0, N - 7]].forEach(([x, y]) => { out += '<rect x="' + x * cell + '" y="' + y * cell + '" width="' + 7 * cell + '" height="' + 7 * cell + '" fill="#111"/><rect x="' + (x + 1) * cell + '" y="' + (y + 1) * cell + '" width="' + 5 * cell + '" height="' + 5 * cell + '" fill="#fff"/><rect x="' + (x + 2) * cell + '" y="' + (y + 2) * cell + '" width="' + 3 * cell + '" height="' + 3 * cell + '" fill="#111"/>'; });
    return out + '</svg>';
  }

  const bar = (v, max, cls) => '<div class="bar ' + (cls || '') + '"><i style="width:' + Math.max(0, Math.min(100, max ? v * 100 / max : 0)) + '%"></i></div>';
  const badge = (t, k) => '<span class="badge ' + (k || '') + '">' + esc(t) + '</span>';
  const statusKind = { '報名中': 'ok', '額滿候補': 'warn', '進行中': 'info', '尚未開放': 'gray', '報名截止': 'gray', '已結束': 'gray', '草稿': 'gray', '已下架': 'bad', '已錄取': 'ok', '待審核': 'warn', '候補': 'info', '取消': 'gray' };
  const stBadge = s => badge(s, statusKind[s] || 'gray');
  const opts = (arr, sel, all) => (all ? '<option value="">' + esc(all) + '</option>' : '') + arr.map(a => { const v = typeof a === 'object' ? a.v : a, t = typeof a === 'object' ? a.t : a; return '<option value="' + esc(v) + '"' + (String(v) === String(sel) ? ' selected' : '') + '>' + esc(t) + '</option>'; }).join('');
  const tbd = n => '<span class="tbd" title="會議紀錄「待確認」第 ' + n + ' 項，尚未定案">待確認 #' + n + '</span>';

  const mark = '<svg class="mark" viewBox="0 0 48 48" aria-hidden="true"><defs><linearGradient id="mg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#E4501B"/><stop offset="1" stop-color="#F5A31A"/></linearGradient></defs><circle cx="14" cy="9" r="4.2" fill="#E4501B"/><circle cx="34" cy="9" r="4.2" fill="#F5A31A"/><path d="M5 16c10 2 14 10 19 22M14 16c8 4 11 11 14 22M43 16c-10 2-14 10-19 22M34 16c-8 4-11 11-14 22" stroke="url(#mg)" stroke-width="4.5" stroke-linecap="round" fill="none"/><circle cx="24" cy="30" r="3" fill="#E4501B"/></svg>';

  window.UI = { esc, $, $$, toast, openModal, closeModal, confirmBox, csv, qr, bar, badge, stBadge, opts, tbd, mark };
})();
