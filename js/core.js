/* 共用資料與規則（前台、後台共用同一份示範資料，存在瀏覽器 localStorage） */
(function () {
  'use strict';
  const KEY = 'ntpc-proto-v1';
  const TODAY = '2027-04-21'; // 示範日期（週三）
  const DISTRICTS = ['板橋','三重','中和','永和','新莊','新店','土城','蘆洲','汐止','樹林','淡水','鶯歌','三峽','瑞芳','五股','泰山','林口','深坑','石碇','坪林','三芝','石門','八里','平溪','雙溪','貢寮','金山','萬里','烏來'];
  const CATS = ['有氧律動','肌力訓練','跑步健走','球類運動','瑜珈伸展','舞蹈','銀髮活力','親子運動'];
  const PROJECTS = [
    { id: 'P1', name: '116年運動熱區活動', short: '運動熱區' },
    { id: 'P2', name: '116年女性常態運動計畫', short: '女性常態' },
    { id: 'P3', name: '116年運動i臺灣常態課程', short: '運動i臺灣' }
  ];
  const VENDORS = [
    { id: 'V1', name: '飛躍運動企業社' }, { id: 'V2', name: '動感策略行銷公司' },
    { id: 'V3', name: '樂活體能協會' }, { id: 'V4', name: '里仁運動學院' },
    { id: 'V5', name: '青春律動工作室' }, { id: 'V6', name: '北岸體育推廣協會' }
  ];
  const WK = ['日','一','二','三','四','五','六'];
  const ACTIVE = ['已錄取', '待審核', '候補'];

  /* ---------- 工具 ---------- */
  const s2d = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d, 12); };
  const d2s = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const addDays = (s, n) => { const d = s2d(s); d.setDate(d.getDate() + n); return d2s(d); };
  const diffDays = (a, b) => Math.round((s2d(b) - s2d(a)) / 864e5);
  const fmtD = (s, y) => (y ? s.slice(0, 4) + '/' : '') + s.slice(5, 7) + '/' + s.slice(8, 10) + '(' + WK[s2d(s).getDay()] + ')';
  const ageAt = (birth, on) => { const b = s2d(birth), t = s2d(on); let a = t.getFullYear() - b.getFullYear(); if (t.getMonth() < b.getMonth() || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) a--; return a; };
  const nowTime = () => { const d = new Date(); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
  const nowStr = () => TODAY + ' ' + nowTime();
  const pct = (a, b) => b ? Math.round(a * 1000 / b) / 10 : 0;
  const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
  const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

  const LMAP = { A:10,B:11,C:12,D:13,E:14,F:15,G:16,H:17,I:34,J:18,K:19,L:20,M:21,N:22,O:35,P:23,Q:24,R:25,S:26,T:27,U:28,V:29,W:32,X:30,Y:31,Z:33 };
  const idSum = (l, d8) => { const n = LMAP[l]; let s = Math.floor(n / 10) + (n % 10) * 9; for (let i = 0; i < 8; i++) s += (+d8[i]) * (8 - i); return s; };
  const makeId = (l, g, serial) => { const d8 = (g === 'M' ? '1' : '2') + serial; return l + d8 + ((10 - idSum(l, d8) % 10) % 10); };
  const validId = id => /^[A-Z][12]\d{8}$/.test(id) && (idSum(id[0], id.slice(1, 9)) + (+id[9])) % 10 === 0;
  const maskId = id => id.slice(0, 3) + '****' + id.slice(-3);
  const maskPhone = p => p.slice(0, 4) + '-***-' + p.slice(-3);

  /* ---------- 示範資料 ---------- */
  const SPEC = [
    { id:'C01', proj:'P1', vendor:'V1', name:'肌力有氧班', cat:'肌力訓練', dist:'板橋', venue:'板橋區 ○○里活動中心', io:'室內', wd:[3,5], t0:'19:00', t1:'20:30', start:'2027-04-02', ns:24, kind:'長期帶狀', limit:true, cap:30, ro:'2027-03-01', rc:'2027-03-26', n:28, c:2, pool:'A', instr:'黃教練', survey:'any' },
    { id:'C02', proj:'P1', vendor:'V1', name:'戶外團跑班', cat:'跑步健走', dist:'林口', venue:'林口 ○○運動公園', io:'室外', wd:[2,5], t0:'19:30', t1:'21:00', start:'2027-04-02', ns:24, kind:'長期帶狀', limit:true, cap:25, ro:'2027-03-01', rc:'2027-03-26', n:25, w:3, c:1, pool:'A', instr:'周教練', survey:'last' },
    { id:'C03', proj:'P1', vendor:'V2', name:'MV 舞蹈班', cat:'舞蹈', dist:'泰山', venue:'泰山區 ○○里禮堂', io:'室內', wd:[6,0], t0:'10:00', t1:'11:30', start:'2027-04-03', ns:24, kind:'長期帶狀', limit:true, cap:35, ro:'2027-03-01', rc:'2027-03-26', n:33, c:1, pool:'A', instr:'Lily 老師', survey:'last' },
    { id:'C04', proj:'P1', vendor:'V2', name:'核心瑜珈班', cat:'瑜珈伸展', dist:'淡水', venue:'淡水區 ○○社區活動中心', io:'半室內', wd:[2,4], t0:'18:30', t1:'20:00', start:'2027-05-04', ns:24, kind:'長期帶狀', limit:true, cap:25, ro:'2027-03-15', rc:'2027-04-30', n:14, pool:'A', instr:'陳老師', survey:'last' },
    { id:'C05', proj:'P1', vendor:'V3', name:'晨間健走樂活班', cat:'跑步健走', dist:'三芝', venue:'三芝區 ○○里運動公園', io:'室外', wd:[1,3], t0:'09:00', t1:'10:30', start:'2027-05-03', ns:24, kind:'長期帶狀', limit:true, cap:25, ro:'2027-03-15', rc:'2027-04-28', n:9, pool:'A', instr:'吳教練', survey:'last' },
    { id:'C06', proj:'P1', vendor:'V3', name:'銀髮活力班', cat:'銀髮活力', dist:'石門', venue:'石門區 ○○里活動中心', io:'室內', wd:[2,4], t0:'09:30', t1:'11:00', start:'2027-05-04', ns:24, kind:'長期帶狀', limit:true, cap:25, ro:'2027-03-15', rc:'2027-04-30', n:18, pool:'B', instr:'吳教練', survey:'last' },
    { id:'C07', proj:'P2', vendor:'V4', name:'女性核心肌力班', cat:'肌力訓練', dist:'新店', venue:'新店區 ○○里活動中心', io:'室內', wd:[2,4], t0:'19:00', t1:'20:30', start:'2027-05-11', ns:24, kind:'長期帶狀', limit:true, cap:25, ro:'2027-03-15', rc:'2027-05-05', review:true, prio:5, n:17, p:4, pool:'A', fem:true, instr:'謝教練', survey:'last' },
    { id:'C08', proj:'P2', vendor:'V4', name:'女力慢跑班', cat:'跑步健走', dist:'三峽', venue:'三峽區 ○○體育館周邊', io:'室外', wd:[3,6], t0:'19:00', t1:'20:30', start:'2027-04-07', ns:24, kind:'長期帶狀', limit:true, cap:25, ro:'2027-03-01', rc:'2027-03-31', review:true, prio:5, n:25, w:3, c:1, pool:'A', fem:true, instr:'謝教練', survey:'last' },
    { id:'C09', proj:'P2', vendor:'V5', name:'女性瑜珈伸展班', cat:'瑜珈伸展', dist:'雙溪', venue:'雙溪區公所 禮堂', io:'室內', wd:[4,6], t0:'14:00', t1:'15:30', start:'2027-05-13', ns:24, kind:'長期帶狀', limit:true, cap:10, ro:'2027-03-15', rc:'2027-05-07', review:true, prio:3, n:4, p:2, pool:'A', fem:true, instr:'林老師', survey:'last' },
    { id:'C10', proj:'P2', vendor:'V5', name:'女性有氧舞蹈班', cat:'舞蹈', dist:'土城', venue:'土城區 ○○里活動中心', io:'室內', wd:[1,3], t0:'19:00', t1:'20:30', start:'2027-06-01', ns:24, kind:'長期帶狀', limit:true, cap:25, ro:'2027-05-01', rc:'2027-05-25', n:0, pool:'A', fem:true, instr:'林老師', survey:'last' },
    { id:'C11', proj:'P3', vendor:'V6', name:'樂齡體適能班', cat:'銀髮活力', dist:'坪林', venue:'坪林區 ○○里活動中心', io:'室內', wd:[2,5], t0:'09:00', t1:'10:30', start:'2027-05-04', ns:24, kind:'長期帶狀', limit:true, cap:10, ro:'2027-03-15', rc:'2027-04-30', n:6, pool:'B', instr:'張教練', survey:'last' },
    { id:'C12', proj:'P3', vendor:'V6', name:'親子趣味體能班', cat:'親子運動', dist:'蘆洲', venue:'蘆洲區 ○○國小體育館', io:'室內', wd:[6], t0:'10:00', t1:'11:30', start:'2027-05-08', ns:12, kind:'中期', limit:false, cap:20, ro:'2027-03-15', rc:'2027-04-15', n:11, pool:'A', instr:'張教練', survey:'last' },
    { id:'C13', proj:'P3', vendor:'V5', name:'飛盤體驗工作坊（單堂）', cat:'球類運動', dist:'板橋', venue:'板橋區 ○○公園', io:'室外', wd:[6], t0:'14:00', t1:'16:00', start:'2027-05-15', ns:1, kind:'短期', limit:false, cap:40, ro:'2027-04-01', rc:'2027-05-12', n:22, pool:'A', instr:'林老師', survey:'last' },
    { id:'C14', proj:'P3', vendor:'V3', name:'羽球入門班（4堂）', cat:'球類運動', dist:'中和', venue:'中和區 ○○運動中心', io:'室內', wd:[3], t0:'19:00', t1:'21:00', start:'2027-05-05', ns:4, kind:'短期', limit:false, cap:20, ro:'2027-04-01', rc:'2027-05-02', n:20, w:2, pool:'A', instr:'吳教練', survey:'last' },
    { id:'C15', proj:'P3', vendor:'V2', name:'戶外健走探索（單堂）', cat:'跑步健走', dist:'金山', venue:'金山區 老街周邊', io:'室外', wd:[0], t0:'08:00', t1:'10:00', start:'2027-04-25', ns:1, kind:'短期', limit:false, cap:50, ro:'2027-03-20', rc:'2027-04-23', n:31, pool:'A', instr:'Lily 老師', survey:'last' },
    { id:'C16', proj:'P1', vendor:'V1', name:'主題活動日：全民運動趣', cat:'有氧律動', dist:'新莊', venue:'新莊區 ○○體育場', io:'室外', wd:[6], t0:'13:00', t1:'16:00', start:'2027-05-22', ns:1, kind:'短期', limit:false, cap:80, ro:'2027-04-10', rc:'2027-05-18', n:35, pool:'A', instr:'黃教練', survey:'last' },
    { id:'C17', proj:'P3', vendor:'V6', name:'銀髮平衡訓練（4堂）', cat:'銀髮活力', dist:'永和', venue:'永和區 ○○國民運動中心', io:'室內', wd:[4], t0:'10:00', t1:'11:30', start:'2027-03-04', ns:4, kind:'短期', limit:false, cap:20, ro:'2027-02-01', rc:'2027-03-01', n:18, pool:'B', instr:'張教練', survey:'last' },
    { id:'C18', proj:'P1', vendor:'V4', name:'夜間有氧燃脂班（12堂）', cat:'有氧律動', dist:'三重', venue:'三重區 ○○里活動中心', io:'室內', wd:[2], t0:'19:30', t1:'21:00', start:'2027-05-11', ns:12, kind:'中期', limit:false, cap:30, ro:'2027-03-15', rc:'2027-05-07', n:12, pool:'A', instr:'謝教練', survey:'last' },
    { id:'C19', proj:'P1', vendor:'V2', name:'肌力雕塑班', cat:'肌力訓練', dist:'中和', venue:'中和區 ○○里活動中心', io:'室內', wd:[3,5], t0:'19:00', t1:'20:30', start:'2027-05-05', ns:24, kind:'長期帶狀', limit:true, cap:25, ro:'2027-03-15', rc:'2027-04-30', n:16, pool:'A', instr:'Lily 老師', survey:'last' },
    { id:'C20', proj:'P3', vendor:'V1', name:'太極養生班', cat:'銀髮活力', dist:'樹林', venue:'樹林區 ○○里活動中心', io:'室內', wd:[2,4], t0:'09:30', t1:'11:00', start:'2027-05-04', ns:24, kind:'長期帶狀', limit:true, cap:25, ro:'2027-03-15', rc:'2027-04-30', n:8, pool:'A', instr:'黃教練', survey:'last' }
  ];

  const descOf = c => c.cat + '課程，由' + (VENDORS.find(v => v.id === c.vendor) || {}).name + '規劃執行。' +
    (c.kind === '長期帶狀' ? '連續 12 週、每週 2 堂，共 24 堂，每堂 1.5 小時；建議出席達 60% 以上，並於課程前後各完成一次體適能檢測。' : c.kind === '中期' ? '連續 12 堂的進階體能課程。' : '短期體驗課程，歡迎各年齡層民眾參加。');

  function seedState() {
    const r = rng(20270421);
    const pickI = n => Math.floor(r() * n);
    const sur = ['陳','林','黃','張','李','王','吳','劉','蔡','楊','許','鄭','謝','郭','洪','曾','邱','廖','賴','徐'];
    const gF = ['美玲','淑芬','雅婷','怡君','惠雯','佩珊','秀英','麗華','玉蘭','靜怡','詩涵','婉婷','淑惠','寶珠','雅雯'];
    const gM = ['志明','建宏','家豪','俊傑','宗翰','文彬','國華','明德','柏翰','信宏','永昌','進財'];
    const letters = 'ABCDEFHJKLMNPQRSTUVXYZ';
    const members = [{ id:'M001', name:'陳美玲', gender:'F', birth:'1978-05-14', idno:makeId('A','F','2345678'), phone:'0900123456', email:'demo.member@example.com', district:'板橋', prefs:['有氧律動','肌力訓練'], regAt:'2027-03-02', pw:'Demo1234' }];
    for (let i = 2; i <= 91; i++) {
      const senior = i > 61;
      const g = r() < (senior ? 0.62 : 0.72) ? 'F' : 'M';
      const y = senior ? 1938 + pickI(23) : 1963 + pickI(40);
      const birth = y + '-' + String(1 + pickI(12)).padStart(2, '0') + '-' + String(1 + pickI(28)).padStart(2, '0');
      let serial = ''; for (let k = 0; k < 7; k++) serial += pickI(10);
      members.push({ id:'M' + String(i).padStart(3, '0'), name: sur[pickI(sur.length)] + (g === 'F' ? gF : gM)[pickI(g === 'F' ? gF.length : gM.length)], gender:g, birth, idno:makeId(letters[pickI(letters.length)], g, serial), phone:'0900' + String(100000 + pickI(899999)), email:'user' + i + '@example.com', district:DISTRICTS[pickI(DISTRICTS.length)], prefs:[], regAt:'2027-03-0' + (1 + pickI(9)), pw:'Demo1234' });
    }
    const courses = SPEC.map(s => Object.assign({ wcap: 10, review: false, prio: 0, fee: 0, prepost: true, pub: 'on', over: {}, desc: '' }, s, { desc: descOf(s) }));
    const enr = []; let eid = 1;
    courses.forEach((c, ci) => {
      const poolM = members.filter(m => (c.pool === 'B' ? ageAt(m.birth, TODAY) >= 65 : ageAt(m.birth, TODAY) < 65) && (!c.fem || m.gender === 'F') && m.id !== 'M001');
      const total = (c.n || 0) + (c.p || 0) + (c.w || 0) + (c.c || 0);
      const list = []; for (let k = 0; k < total; k++) list.push(poolM[(ci * 7 + k) % poolM.length]);
      const seen = new Set(); const uniq = []; list.forEach(m => { if (!seen.has(m.id)) { seen.add(m.id); uniq.push(m); } });
      if (c.id === 'C01') { const i = uniq.findIndex(m => m.id === 'M001'); if (i < 0) uniq.unshift(members[0]); }
      let idx = 0;
      const push = (st, count) => { for (let k = 0; k < count && idx < uniq.length; k++, idx++) {
        const day = 1 + (idx % 20); enr.push({ id:'E' + String(eid++).padStart(4, '0'), courseId:c.id, memberId:uniq[idx].id, status:st, at:'2027-03-' + String(day).padStart(2, '0') + ' ' + String(8 + (idx % 10)).padStart(2, '0') + ':' + String((idx * 7) % 60).padStart(2, '0'), prio:'一般', note:'', remark:'' }); } };
      push('已錄取', c.n || 0); push('待審核', c.p || 0); push('候補', c.w || 0); push('取消', c.c || 0);
    });

    // 出缺席（進行中班級）
    const att = {};
    courses.filter(c => c.start < TODAY && sessionsOf(c).some(x => x.date <= TODAY)).forEach(c => {
      att[c.id] = {}; const adm = enr.filter(e => e.courseId === c.id && e.status === '已錄取');
      const rel = {}; adm.forEach(e => { rel[e.memberId] = 0.5 + r() * 0.48; });
      sessionsOf(c).forEach(s => { if (s.date > TODAY) return; att[c.id][s.n] = {};
        adm.forEach(e => { if (s.date === TODAY) return; const x = r();
          att[c.id][s.n][e.memberId] = x < rel[e.memberId] ? { s:'P', in:c.t0, out:c.t1, via:r() < 0.85 ? 'QR' : '紙本' } : x < rel[e.memberId] + 0.03 ? { s:'L' } : { s:'A' }; }); });
    });
    // 示範學員 M001 在 C01 前 5 堂：出席 4、缺席 1
    ['P','P','P','A','P'].forEach((v, i) => { att.C01[i + 1].M001 = v === 'P' ? { s:'P', in:'18:52', out:'20:31', via:'QR' } : { s:'A' }; });
    // 今日第 6 堂：已有部分學員先簽到
    const todayN = sessionsOf(courses[0]).find(x => x.date === TODAY).n;
    enr.filter(e => e.courseId === 'C01' && e.status === '已錄取' && e.memberId !== 'M001').slice(0, 9).forEach(e => { att.C01[todayN][e.memberId] = { s:'P', in:'18:5' + (r() * 9 | 0), out:null, via:'QR' }; });

    // 體適能（歷史資料）
    const fit = []; let fid = 1;
    const adultV = (r2, base) => { const h = 150 + (r2() * 25 | 0), w = 45 + (r2() * 33 | 0); return base || { height:h, weight:+w.toFixed(1), bmi:+(w / ((h / 100) ** 2)).toFixed(1), whr:+(0.72 + r2() * 0.18).toFixed(2), situp:10 + (r2() * 20 | 0), sitreach:15 + (r2() * 30 | 0), stepIdx:+(40 + r2() * 30).toFixed(1) }; };
    const m1pre = { height:158, weight:61.4, bmi:24.6, whr:0.84, situp:16, sitreach:28, stepIdx:48.2 };
    const m1post = { height:158, weight:59.6, bmi:23.9, whr:0.82, situp:22, sitreach:34, stepIdx:55.7 };
    fit.push({ id:'F' + fid++, memberId:'M001', courseId:null, date:'2026-04-12', phase:'前測', kind:'一般', src:'歷史資料', v:m1pre, g:{ situp:2, sitreach:2, stepIdx:3 } });
    fit.push({ id:'F' + fid++, memberId:'M001', courseId:null, date:'2026-07-05', phase:'後測', kind:'一般', src:'歷史資料', v:m1post, g:{ situp:3, sitreach:3, stepIdx:4 } });
    members.filter(m => m.id !== 'M001').forEach((m, i) => {
      if (i % 3 !== 0) return;
      if (ageAt(m.birth, TODAY) >= 65) {
        const a = { chairStand:12 + (r() * 12 | 0), armCurl:12 + (r() * 12 | 0), stepInPlace:60 + (r() * 50 | 0), chairReach:+(5 + r() * 14).toFixed(1) };
        const b = { chairStand:a.chairStand + (r() * 7 | 0) - 1, armCurl:a.armCurl + (r() * 6 | 0) - 1, stepInPlace:a.stepInPlace + (r() * 14 | 0) - 2, chairReach:+(a.chairReach + r() * 4 - 0.5).toFixed(1) };
        fit.push({ id:'F' + fid++, memberId:m.id, courseId:null, date:'2026-04-10', phase:'前測', kind:'銀髮', src:'歷史資料', v:a, g:{} });
        fit.push({ id:'F' + fid++, memberId:m.id, courseId:null, date:'2026-07-01', phase:'後測', kind:'銀髮', src:'歷史資料', v:b, g:{} });
      } else {
        const a = adultV(r);
        const b = Object.assign({}, a, { situp:a.situp + (r() * 9 | 0) - 1, sitreach:a.sitreach + (r() * 8 | 0) - 1, stepIdx:+(a.stepIdx + r() * 10 - 1.5).toFixed(1) });
        fit.push({ id:'F' + fid++, memberId:m.id, courseId:null, date:'2026-04-12', phase:'前測', kind:'一般', src:'歷史資料', v:a, g:{} });
        fit.push({ id:'F' + fid++, memberId:m.id, courseId:null, date:'2026-07-05', phase:'後測', kind:'一般', src:'歷史資料', v:b, g:{} });
      }
    });

    // 滿意度問卷（已有班級的歷史填答）
    const surveys = []; const W = (opts, w) => { let x = r() * w.reduce((a, b) => a + b, 0); for (let i = 0; i < opts.length; i++) { x -= w[i]; if (x <= 0) return opts[i]; } return opts[0]; };
    const idents = ['一般身分者','原住民族籍','新住民','上班族','家管/退休人員','其他'];
    const chans = ['新北運動聚點FB','新北體育局LINE','運動i臺灣網頁','主辦單位FB或官網','親友介紹','活動傳單、海報、電子看板','其他'];
    ['C01','C02','C03','C08','C17'].forEach(cid => {
      const adm = enr.filter(e => e.courseId === cid && e.status === '已錄取'); const need = Math.round(adm.length * (cid === 'C17' ? 0.82 : 0.58));
      adm.slice(0, need).forEach(e => { const m = members.find(x => x.id === e.memberId); if (m.id === 'M001') return;
        const base = () => W([5,4,3,2,1], [5,4,1,0.2,0.05]);
        surveys.push({ id:'S' + surveys.length, courseId:cid, memberId:m.id, at:'2027-04-1' + (r() * 9 | 0), gender:m.gender === 'F' ? '女' : '男', age:ageAt(m.birth, TODAY) >= 65 ? '65歲以上' : '23-64歲',
          ident:[W(idents, [10,1,1,4,5,1])], first:W(['是','不是'], [6,4]), other:W(['有','沒有'], [4,6]), channel:[W(chans, [4,5,3,2,6,3,1])],
          freq:W(['每週有固定參與','偶爾有','以前沒有運動習慣，因為本活動才開始嘗試'], [3,4,3]), conv:W(['便利','不便利'], [9,1]), aware:W(['有','沒有'], [8,2]), will:W(['有','沒有'], [9,1]),
          rate:{ 活動宣傳:base(), 活動時間:base(), 活動內容:base(), 活動師資:base(), 活動場地:base() }, text:r() < 0.12 ? W(['老師很用心，希望延長課程','場地停車不太方便','希望增加假日班','很喜歡，已邀鄰居一起參加'], [1,1,1,1]) : '' }); });
    });

    return {
      v: 1, me: null, members, courses, enr, att, fit, surveys, eidSeq: eid, fidSeq: fid, sidSeq: surveys.length,
      messages: [
        { id:'N1', at:'2027-04-14 16:20', title:'【課程異動】戶外團跑班 4/16 改為室內場地', body:'因天氣預報有雨，4/16（五）戶外團跑班改至林口 ○○里活動中心室內上課，時間不變。', channels:['Email','簡訊'], audience:{ type:'course', courseId:'C02' }, by:'飛躍運動企業社', sms:25 },
        { id:'N2', at:'2027-03-28 10:05', title:'【開課通知】116 年常態課程 4/1 起陸續開課', body:'提醒您：開課前請完成 Email 或簡訊驗證，並攜帶水壺與毛巾。上課時請以手機掃描現場 QR Code 簽到、簽退。', channels:['Email'], audience:{ type:'all' }, by:'體育局', sms:0 }
      ],
      news: seedNews(), banners: seedBanners(), newsV: 2,
      smsBalance: 2975, reward: { attend:60, survey:true, improve:10 }, exports: []
    };
  }

  const NEWS_TAGS = { '置頂': '#8E5BA6', '重要': '#E8A317', '活動': '#E4501B', '須知': '#0F7B55', '公告': '#1752C7' };
  const poster = (t, c1, c2) => 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="360" viewBox="0 0 800 360"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + c1 + '"/><stop offset="1" stop-color="' + c2 + '"/></linearGradient></defs><rect width="800" height="360" fill="url(#g)"/><text x="48" y="190" font-size="44" font-weight="700" fill="#fff" font-family="Microsoft JhengHei,sans-serif">' + t + '</text><text x="48" y="240" font-size="22" fill="#fff" opacity=".85" font-family="Microsoft JhengHei,sans-serif">（示範圖片）</text></svg>');
  function seedNews() {
    return [
      { id:'W5', at:'2027-03-01', tag:'置頂', title:'【公告】116 年度常態運動課程報名說明（請務必閱讀）', body:'歡迎報名 116 年度新北市常態運動課程！\n\n一、全民皆可報名，不限新北市民或戶籍，課程免費。\n二、24 堂長期帶狀課程，每人每年最多報名 2 班（以班為單位）；短期課程不受此限。\n三、上課請以手機掃描現場 QR Code 簽到、簽退。\n四、課程如有改期、停課，將以 Email 或簡訊通知。\n\n詳細內容請見附件。', imgs:[poster('116 年度常態運動課程報名說明', '#E4501B', '#F5A31A')], files:[{ name:'116年度課程報名說明.pdf', size:'312 KB' }, { name:'報名流程圖.png', size:'180 KB' }] },
      { id:'W6', at:'2027-04-15', tag:'重要', title:'【重要】颱風或天候不佳時，課程異動通知方式', body:'遇颱風、豪雨或停班停課，課程是否照常將於上課前 2 小時以 Email／簡訊通知已報名學員，並同步公告於本網站。\n\n請民眾務必確認個人資料中的手機與 Email 正確。', imgs:[], files:[] },
      { id:'W7', at:'2027-04-10', tag:'活動', title:'【活動】主題活動日「全民運動趣」5/22 開放報名', body:'5 月 22 日（六）下午於新莊體育場舉辦主題活動日，邀請運動選手與地方名人與大家一起動起來，名額 80 人，額滿為止。', imgs:[poster('主題活動日｜全民運動趣', '#1752C7', '#3B74E8')], files:[] },
      { id:'W4', at:'2027-04-08', tag:'須知', title:'【須知】體適能前後測時程提醒', body:'每班前測請於第 1 堂課前後 7 日內完成；後測於最後一堂課前後 7 日內完成，前後測需間隔至少 12 週（78 天）。', imgs:[], files:[] },
      { id:'W3', at:'2027-03-20', tag:'須知', title:'【須知】簽到簽退與請假方式', body:'上課請以手機掃描現場 QR Code 簽到、簽退；無手機者可由老師以紙本簽到表補登。', imgs:[], files:[] },
      { id:'W2', at:'2027-03-10', tag:'須知', title:'【須知】長期帶狀課程報名限制說明', body:'24 堂帶狀課程每人每年最多報名 2 班（以班為單位），短期課程不受此限。', imgs:[], files:[] },
      { id:'W1', at:'2027-03-01', tag:'公告', title:'【公告】116 年度常態運動課程 3/1 起開放報名', body:'本年度課程由多家運動課程廠商規劃執行，全民皆可報名，不限新北市民。', imgs:[], files:[] },
      { id:'W8', at:'2027-02-20', tag:'公告', title:'【公告】課程廠商教育訓練時程', body:'各課程廠商請於 2 月底前完成教育訓練並上架課程。', imgs:[], files:[] }
    ];
  }
  function seedBanners() {
    return [
      { id:'B1', title:'116 年度常態運動課程 開放報名中', sub:'全民皆可報名・不限新北市民・課程免費', img:'', bg:1, link:'#/courses', on:true, start:'', end:'', order:1, overlay:true },
      { id:'B2', title:'主題活動日｜全民運動趣', sub:'5/22（六）新莊體育場，邀請選手與地方名人一起動起來', img:'', bg:2, link:'#/course/C16', on:true, start:'', end:'', order:2, overlay:true },
      { id:'B3', title:'做體適能前後測，看見自己的進步', sub:'登入會員中心即可查看歷次檢測結果與獎勵目標', img:'', bg:3, link:'#/news/W4', on:true, start:'', end:'', order:3, overlay:true }
    ];
  }

  /* ---------- 狀態 ---------- */
  const S = {};
  const migrate = () => {
    if (!S.newsV) { S.news = seedNews(); S.newsV = 2; }
    if (!S.banners) S.banners = seedBanners();
    S.members.forEach(m => { if (!m.pw) m.pw = 'Demo1234'; });
    S.enr.forEach(e => { if (e.remark == null) e.remark = ''; });
  };
  const load = () => { try { const t = localStorage.getItem(KEY); if (t) { const o = JSON.parse(t); if (o && o.v === 1) { Object.assign(S, o); migrate(); return; } } } catch (e) { /* ignore */ } Object.assign(S, seedState()); };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } };
  const reset = () => { Object.keys(S).forEach(k => delete S[k]); Object.assign(S, seedState()); save(); };

  /* ---------- 場次 / 狀態 ---------- */
  function sessionsOf(c) {
    const out = []; let d = c.start; let guard = 0;
    while (out.length < c.ns && guard++ < 800) {
      if (c.wd.includes(s2d(d).getDay())) {
        const n = out.length + 1; const o = (c.over && c.over[n]) || {};
        out.push({ n, date: o.date || d, base: d, t0: o.t0 || c.t0, t1: o.t1 || c.t1, venue: o.venue || c.venue, cancelled: !!o.cancelled, moved: !!(o.date || o.t0 || o.venue), note: o.note || '', io: c.io });
      }
      d = addDays(d, 1);
    }
    return out;
  }
  const enrOf = (cid, sts) => S.enr.filter(e => e.courseId === cid && (!sts || sts.includes(e.status)));
  const memberOf = id => S.members.find(m => m.id === id);
  const courseOf = id => S.courses.find(c => c.id === id);
  const projOf = id => PROJECTS.find(p => p.id === id) || PROJECTS[0];
  const vendorOf = id => VENDORS.find(v => v.id === id) || VENDORS[0];
  function view(c) {
    const ss = sessionsOf(c); const first = ss[0].date, last = ss[ss.length - 1].date;
    const adm = enrOf(c.id, ['已錄取']).length, pend = enrOf(c.id, ['待審核']).length, wait = enrOf(c.id, ['候補']).length;
    const occ = adm + pend; let st;
    if (c.pub === 'draft') st = '草稿'; else if (c.pub === 'off') st = '已下架';
    else if (TODAY > last) st = '已結束'; else if (TODAY >= first) st = '進行中';
    else if (TODAY < c.ro) st = '尚未開放'; else if (TODAY > c.rc) st = '報名截止';
    else if (occ >= c.cap) st = '額滿候補'; else st = '報名中';
    return { c, ss, first, last, adm, pend, wait, occ, left: Math.max(0, c.cap - occ), st, proj: projOf(c.proj), vendor: vendorOf(c.vendor) };
  }
  const views = () => S.courses.map(view);

  /* ---------- 報名規則 ---------- */
  const longCount = (mid, year, exceptCid) => S.enr.filter(e => e.memberId === mid && ACTIVE.includes(e.status) && e.courseId !== exceptCid && (c => c && c.limit && c.start.slice(0, 4) === year)(courseOf(e.courseId))).length;
  function canEnroll(mid, cid) {
    const c = courseOf(cid), v = view(c);
    const mine = S.enr.find(e => e.memberId === mid && e.courseId === cid && ACTIVE.includes(e.status));
    if (mine) return { ok: false, code: 'dup', msg: '您已報名此課程（' + mine.status + '）', enr: mine };
    if (c.proj === 'P2' && (memberOf(mid) || {}).gender !== 'F') return { ok: false, code: 'gender', msg: '本計畫以女性民眾為服務對象' };
    if (!['報名中', '額滿候補'].includes(v.st)) return { ok: false, code: 'closed', msg: v.st === '尚未開放' ? '尚未開放報名（' + fmtD(c.ro) + ' 起）' : '目前無法報名（' + v.st + '）' };
    const used = c.limit ? longCount(mid, c.start.slice(0, 4), cid) : 0;
    if (c.limit && used >= 2) return { ok: false, code: 'limit', msg: '長期帶狀課程每人每年最多報名 2 班，您今年已報名 ' + used + ' 班', used };
    const mode = v.st === '額滿候補' ? 'wait' : c.review ? 'review' : 'admit';
    return { ok: true, mode, used, v };
  }
  function enroll(mid, cid, extra) {
    const chk = canEnroll(mid, cid); if (!chk.ok) return chk;
    const st = chk.mode === 'wait' ? '候補' : chk.mode === 'review' ? '待審核' : '已錄取';
    const e = { id: 'E' + String(S.eidSeq++).padStart(4, '0'), courseId: cid, memberId: mid, status: st, at: nowStr(), prio: (extra && extra.prio) || '一般', note: (extra && extra.note) || '', remark: '' };
    S.enr.push(e); save(); return { ok: true, enr: e, status: st };
  }
  function addMessage(m) { const o = Object.assign({ id: 'N' + (S.messages.length + 1) + '_' + Date.now(), at: nowStr(), channels: ['Email'], sms: 0, by: '系統' }, m); S.messages.unshift(o); save(); return o; }
  function setEnr(id, st, by) {
    const e = S.enr.find(x => x.id === id); if (!e || e.status === st) return null; const was = e.status; e.status = st; let promoted = null;
    if (['已錄取', '待審核'].includes(was) && ['取消', '候補'].includes(st)) {
      const c = courseOf(e.courseId), v = view(c);
      if (v.occ < c.cap && v.st !== '已結束') {
        const w = enrOf(c.id, ['候補']).sort((a, b) => a.at.localeCompare(b.at))[0];
        if (w) { w.status = c.review ? '待審核' : '已錄取'; promoted = w; addMessage({ title: '【候補遞補通知】' + c.name, body: '您候補的「' + c.name + '」已有名額釋出，目前狀態：' + w.status + '。', channels: ['Email', '簡訊'], audience: { type: 'member', memberId: w.memberId }, by: by || '系統', sms: 1 }); }
      }
    }
    save(); return { e, promoted };
  }
  const messagesFor = mid => S.messages.filter(m => m.audience.type === 'all' || (m.audience.type === 'member' && m.audience.memberId === mid) || (m.audience.type === 'course' && S.enr.some(e => e.memberId === mid && e.courseId === m.audience.courseId && ACTIVE.includes(e.status))) || (m.audience.type === 'project' && S.enr.some(e => e.memberId === mid && ACTIVE.includes(e.status) && (courseOf(e.courseId) || {}).proj === m.audience.projectId)));
  function audienceIds(a) { const ids = new Set(); if (a.type === 'all') S.members.forEach(m => ids.add(m.id)); else if (a.type === 'member') ids.add(a.memberId); else S.enr.forEach(e => { if (!ACTIVE.includes(e.status)) return; const c = courseOf(e.courseId); if ((a.type === 'course' && e.courseId === a.courseId) || (a.type === 'project' && c && c.proj === a.projectId)) ids.add(e.memberId); }); return Array.from(ids); }

  /* ---------- 出席 ---------- */
  const attRec = (cid, n, mid) => (((S.att[cid] || {})[n]) || {})[mid];
  function setAtt(cid, n, mid, rec) { S.att[cid] = S.att[cid] || {}; S.att[cid][n] = S.att[cid][n] || {}; if (rec) S.att[cid][n][mid] = rec; else delete S.att[cid][n][mid]; save(); }
  const heldSessions = c => sessionsOf(c).filter(s => !s.cancelled && s.date < TODAY);
  function memberRate(cid, mid) { const c = courseOf(cid); const hs = heldSessions(c); if (!hs.length) return null; const p = hs.filter(s => (attRec(cid, s.n, mid) || {}).s === 'P').length; return { p, total: hs.length, rate: pct(p, hs.length) }; }
  function courseRate(cid) { const c = courseOf(cid); const hs = heldSessions(c); const adm = enrOf(cid, ['已錄取']); if (!hs.length || !adm.length) return null;
    const per = hs.map(s => adm.filter(e => (attRec(cid, s.n, e.memberId) || {}).s === 'P').length); const rates = adm.map(e => memberRate(cid, e.memberId).rate);
    return { avg: pct(per.reduce((a, b) => a + b, 0), hs.length * adm.length), reach60: rates.filter(x => x >= 60).length, adm: adm.length, held: hs.length, per }; }

  /* ---------- 體適能 ---------- */
  const METRICS = {
    '一般': [{ k:'height', n:'身高', u:'cm', d:0 }, { k:'weight', n:'體重', u:'kg', d:0 }, { k:'bmi', n:'BMI', u:'', d:0 }, { k:'whr', n:'腰臀圍比', u:'', d:-1 }, { k:'situp', n:'仰臥捲腹', u:'次', d:1 }, { k:'sitreach', n:'坐姿體前彎', u:'cm', d:1 }, { k:'stepIdx', n:'心肺耐力（體力指數）', u:'', d:1 }],
    '銀髮': [{ k:'chairStand', n:'椅子坐立（下肢肌力）', u:'次', d:1 }, { k:'armCurl', n:'肱二頭肌屈舉（上肢肌力）', u:'次', d:1 }, { k:'stepInPlace', n:'原地站立抬膝（心肺）', u:'次', d:1 }, { k:'chairReach', n:'椅子坐姿體前彎', u:'cm', d:1 }]
  };
  const fitOf = mid => { const id = (memberOf(mid) || {}).idno; return S.fit.filter(f => f.memberId === mid || (f.idno && f.idno === id)).sort((a, b) => b.date.localeCompare(a.date)); };
  function fitPair(mid) { const l = fitOf(mid); const post = l.find(f => f.phase === '後測'); if (!post) return null; const pre = l.find(f => f.phase === '前測' && f.kind === post.kind && f.date < post.date); return pre ? { pre, post } : null; }
  function improve(pair) { if (!pair) return null; const ks = METRICS[pair.pre.kind].filter(m => m.d === 1).map(m => m.k); const arr = ks.map(k => pair.pre.v[k] ? (pair.post.v[k] - pair.pre.v[k]) * 100 / pair.pre.v[k] : 0); return Math.round(avg(arr) * 10) / 10; }
  const tw = d => { const [y, m, a] = d.split('-'); return String(+y - 1911).padStart(3, '0') + m + a; };

  /* ---------- 問卷 ---------- */
  const surveyDone = (mid, cid) => S.surveys.some(s => s.memberId === mid && s.courseId === cid);

  load(); save();
  const validPw = p => /^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(p || '');
  const sortNews = L => L.slice().sort((a, b) => (b.tag === '置頂') - (a.tag === '置頂') || b.at.localeCompare(a.at));
  const activeBanners = () => S.banners.filter(b => b.on && (!b.start || b.start <= TODAY) && (!b.end || b.end >= TODAY)).sort((a, b) => a.order - b.order);
  window.Core = { NEWS_TAGS, validPw, sortNews, activeBanners, S, TODAY, DISTRICTS, CATS, PROJECTS, VENDORS, WK, ACTIVE, METRICS, save, reset, s2d, d2s, addDays, diffDays, fmtD, ageAt, nowTime, nowStr, pct, avg, rng, validId, makeId, maskId, maskPhone, tw,
    sessionsOf, enrOf, memberOf, courseOf, projOf, vendorOf, view, views, canEnroll, enroll, setEnr, addMessage, messagesFor, audienceIds, attRec, setAtt, heldSessions, memberRate, courseRate, fitOf, fitPair, improve, surveyDone, longCount };
})();
