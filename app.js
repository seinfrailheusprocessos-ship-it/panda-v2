(function(){
/* ===== a_core.js ===== */
'use strict';
/* =====================================================================
   Proc.Ios 3 — núcleo
   ===================================================================== */
const BUILD = 'pwa', PWA = BUILD === 'pwa';
const APP_NOME = 'Panda Matriz';
const VERSAO_APP = 'V1.SMDIEDC';   /* Secretaria Municipal de Infraestrutura e Defesa Civil de Ilhéus */
const $ = id => document.getElementById(id);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const clone = o => JSON.parse(JSON.stringify(o));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function b64u8(b64){ const s = atob(b64); const u = new Uint8Array(s.length); for(let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; }
const safeName = (s, ext) => (String(s || 'Documento').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 90) || 'Documento') + ext;
const plural = (n, a, b) => n + ' ' + (n === 1 ? a : b);
const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/* ---------- datas e valores ---------- */
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const hojeISO = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
function dataBR(iso){ if(!iso) return ''; const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? m[3] + '/' + m[2] + '/' + m[1] : String(iso); }
function dataCurta(ts){ if(!ts) return ''; const d = new Date(ts); return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear(); }
function diasEntre(a, b){ if(!a) return null; const x = new Date(a + 'T12:00:00'), y = b ? new Date(b + 'T12:00:00') : new Date(); return Math.round((y - x) / 86400000); }
function somaDias(iso, n){ if(!iso || !n) return ''; const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + (+n)); return d.toISOString().slice(0, 10); }
function numBR(v){ if(v === '' || v == null) return null; if(typeof v === 'number') return v; const s = String(v).replace(/[R$\s]/g, ''); const n = parseFloat(/,\d{1,2}$/.test(s) || /\.\d{3}/.test(s) ? s.replace(/\./g, '').replace(',', '.') : s.replace(',', '.')); return isNaN(n) ? null : n; }
function fmtBRL(v){ const n = numBR(v); return n == null ? '' : 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits:2, maximumFractionDigits:2 }); }

/* ---------- DOM ---------- */
function h(tag, attrs, ...kids){
  const el = document.createElement(tag);
  if(attrs) for(const k in attrs){
    const v = attrs[k];
    if(v == null || v === false) continue;
    if(k === 'class') el.className = v;
    else if(k === 'html') el.innerHTML = v;
    else if(k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if(k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if(k === 'dataset') Object.assign(el.dataset, v);
    else if(v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  const add = c => { if(c == null || c === false) return; if(Array.isArray(c)) c.forEach(add); else el.append(c instanceof Node ? c : document.createTextNode(String(c))); };
  kids.forEach(add);
  return el;
}

/* ---------- guardado no aparelho (IndexedDB) ---------- */
let _db = null;
function idb(){
  if(_db) return _db;
  _db = new Promise((res, rej) => {
    let r;
    try{ r = indexedDB.open('procios3', 1); }catch(e){ rej(e); return; }
    r.onupgradeneeded = () => { const d = r.result; if(!d.objectStoreNames.contains('kv')) d.createObjectStore('kv'); if(!d.objectStoreNames.contains('files')) d.createObjectStore('files', { keyPath:'id' }); };
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
  _db.catch(() => { _db = null; });
  return _db;
}
async function idbDo(store, mode, fn){
  try{
    const d = await idb();
    return await new Promise((res, rej) => {
      const tx = d.transaction(store, mode), st = tx.objectStore(store), rq = fn(st);
      tx.oncomplete = () => res(rq && 'result' in rq ? rq.result : undefined);
      tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error);
    });
  }catch(e){ console.warn('idb', e); return undefined; }
}
const kvGet = k => idbDo('kv', 'readonly', st => st.get(k));
/* leitura que avisa quando o armazenamento falha (não confunde erro com vazio) */
async function kvGetStrict(k){
  const d = await idb();
  return await new Promise((res, rej) => { const tx = d.transaction('kv', 'readonly'), rq = tx.objectStore('kv').get(k); rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error); tx.onabort = () => rej(tx.error); });
}
const kvSet = (k, v) => idbDo('kv', 'readwrite', st => st.put(v, k));
const lsGet = (k, d) => { try{ const v = localStorage.getItem('procios3.' + k); return v == null ? d : JSON.parse(v); }catch(e){ return d; } };
const lsSet = (k, v) => { try{ localStorage.setItem('procios3.' + k, JSON.stringify(v)); }catch(e){} };

/* ---------- avisos ---------- */
let toastT;
function toast(m, o = {}){
  const t = $('toast'); t.replaceChildren(h('span', null, m));
  if(o.acao) t.append(h('button', { onclick:() => { t.hidden = true; o.fn(); } }, o.acao));
  t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, o.ms || (o.acao ? 6000 : 2600));
}
function busy(txt){
  $('busyTxt').textContent = txt || 'Preparando…'; $('busy').hidden = false;
  return { txt(t){ $('busyTxt').textContent = t; }, end(){ $('busy').hidden = true; } };
}

/* ---------- ícones ---------- */
const P_ = (d, extra) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${extra || ''}>${d}</svg>`;
const I = {
  chevL:P_('<path d="M15 5l-7 7 7 7"/>', ' stroke-width="2.2"'), chevR:P_('<path d="M9 5l7 7-7 7"/>', ' stroke-width="2.2"'),
  chevU:P_('<path d="M5 15l7-7 7 7"/>', ' stroke-width="2.2"'), chevD:P_('<path d="M5 9l7 7 7-7"/>', ' stroke-width="2.2"'),
  personPlus:P_('<circle cx="10" cy="8" r="3.6"/><path d="M3.5 20c.6-3.6 3.3-5.6 6.5-5.6 1.4 0 2.7.4 3.8 1.1M18.5 14v6M15.5 17h6"/>', ' stroke-width="1.8"'),
  plusBold:P_('<path d="M12 5v14M5 12h14"/>', ' stroke-width="2.4"'),
  plusCircle:P_('<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>'),
  selbox:P_('<rect x="3.5" y="5.5" width="17" height="13" rx="2" stroke-dasharray="2.4 2.4"/><path d="M12 8.5v7M10.3 8.5h3.4M10.3 15.5h3.4"/>'),
  highlighter:P_('<path d="M5 20h14"/><path d="M8 16l-1-3 8-8 4 4-8 8z"/>'),
  textsize:P_('<path d="M3 18l4.5-11L12 18M4.6 14h5.8M14 18l3-7.5 3 7.5M15 15.5h4"/>'),
  keyboard:P_('<rect x="2.5" y="6" width="19" height="12" rx="2"/><path d="M6 10h.01M9 10h.01M12 10h.01M15 10h.01M18 10h.01M7 14h10"/>'),
  campo:P_('<rect x="3" y="7" width="12" height="10" rx="2" stroke-dasharray="2.2 2"/><path d="M15 12h6M18.5 9.5 21 12l-2.5 2.5"/>', ' stroke-width="1.8"'),
  table:P_('<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M3.5 9.5h17M3.5 14.5h17M10 9.5v10"/>'),
  rotR:P_('<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>'),
  rotL:P_('<path d="M4 11a8 8 0 1 1 2.3 5.7"/><path d="M4 4v7h7"/>'),
  print:P_('<path d="M7 9V4h10v5"/><rect x="4" y="9" width="16" height="7" rx="2"/><path d="M7 14h10v6H7z"/>'),
  camera:P_('<path d="M4 8h3l2-2.5h6L17 8h3v11H4z"/><circle cx="12" cy="13.2" r="3.6"/>'),
  folderPlus:P_('<path d="M3.5 7.5a2 2 0 0 1 2-2h4l2 2.2h7a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/><path d="M12 10.5v5M9.5 13h5"/>'),
  selpg:P_('<rect x="4" y="3.5" width="7" height="9" rx="1.2"/><rect x="13" y="3.5" width="7" height="9" rx="1.2"/><rect x="4" y="14.5" width="7" height="6" rx="1.2"/><path d="M14.5 17.5l1.8 1.8 3.2-3.6"/>'),
  side:P_('<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><path d="M9 4.5v15M5.8 8.5h1M5.8 11.5h1M5.8 14.5h1"/>'),
  sideR:P_('<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><path d="M15 4.5v15M17.2 8.5h1M17.2 11.5h1M17.2 14.5h1"/>'),
  sig:P_('<path d="M4 19c3-.5 4.5-3 6-6.5S13.5 5 15.5 5 17 7.5 14 11s-5 7-2 7 4.5-2.5 6-2.5c1 0 1.5.8 2 1.5"/>'),
  paper:P_('<path d="M7 3.5h7l4 4V20a.5.5 0 0 1-.5.5h-10A.5.5 0 0 1 7 20z" transform="translate(-.5 0)"/><path d="M13.5 3.5V8h4"/><path d="M9.5 12.5h5M9.5 15.5h5"/>'),
  menu:P_('<path d="M4 7h16M4 12h16M4 17h10"/>'), back:P_('<path d="M15 6l-6 6 6 6"/>'), plus:P_('<path d="M12 5v14M5 12h14"/>'),
  x:P_('<path d="M6 6l12 12M18 6L6 18"/>'), chev:P_('<path d="M9 6l6 6-6 6"/>'), down:P_('<path d="M6 9l6 6 6-6"/>'), up:P_('<path d="M6 15l6-6 6 6"/>'),
  more:P_('<circle cx="5" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="19" cy="12" r="1.3" fill="currentColor"/>'),
  trash:P_('<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>'), rot:P_('<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>'),
  dl:P_('<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>'), word:P_('<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M7.5 9l1.5 6 2-5 2 5 1.5-6"/>'),
  doc:P_('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>'),
  docplus:P_('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M12 11v6M9 14h6"/>'),
  pdf:P_('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M8.5 16.5v-4h1.2a1.2 1.2 0 0 1 0 2.4H8.5M13 12.5v4h.8a1.7 1.7 0 0 0 0-3.4H13z"/>'),
  layers:P_('<path d="M12 3 3 8l9 5 9-5-9-5z"/><path d="M3 12.5l9 5 9-5"/><path d="M3 17l9 5 9-5"/>'),
  folder:P_('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'),
  folderShare:P_('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M12 16v-5M9.5 13.5 12 11l2.5 2.5"/>'),
  search:P_('<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/>'),
  zoomIn:P_('<circle cx="10.5" cy="10.5" r="6.3"/><path d="M15.2 15.2l4.6 4.6M7.9 10.5h5.2M10.5 7.9v5.2"/>'),
  zoomOut:P_('<circle cx="10.5" cy="10.5" r="6.3"/><path d="M15.2 15.2l4.6 4.6M7.9 10.5h5.2"/>'),
  gear:P_('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  home:P_('<path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z"/>'),
  share:P_('<path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7"/><path d="M16 6l-4-4-4 4M12 2v13"/>'),
  note:P_('<path d="M5 4h14v12l-4 4H5z"/><path d="M15 20v-4h4M8.5 9h7M8.5 12.5h5"/>'),
  report:P_('<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4"/><path d="M9.5 17v-3M12.5 17v-6M15.5 17v-4"/>'),
  pen:P_('<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/>'),
  copy:P_('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>'),
  check:P_('<path d="M5 12.5l4.5 4.5L19 7.5"/>', ' stroke-width="2.3"'),
  clock:P_('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
  route:P_('<circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M8 18h6a3 3 0 0 0 0-6h-4a3 3 0 0 1 0-6h6"/>'),
  paste:P_('<rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4.5V3.8c0-.4.3-.8.8-.8h4.4c.5 0 .8.4.8.8v.7"/><path d="M9 10h6M9 13.5h6M9 17h3.5"/>'),
  eye:P_('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
  blank:P_('<rect x="5" y="3" width="14" height="18" rx="2"/>'),
  split:P_('<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M5 12h3M10.5 12h3M16 12h3"/>'),
  dup:P_('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M4 16V6a2 2 0 0 1 2-2h10"/><path d="M14 11v6M11 14h6"/>'),
  undo:P_('<path d="M9 14l-4-4 4-4"/><path d="M5 10h9a5 5 0 0 1 0 10h-2"/>'),
  stamp:P_('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/>'),
  hash:P_('<path d="M5 9h14M5 15h14M10 4l-2 16M16 4l-2 16"/>'),
  clip:P_('<path d="M20 11.5l-7.8 7.8a5 5 0 0 1-7.1-7.1l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7l-8.5 8.5a1.7 1.7 0 0 1-2.4-2.4l7.8-7.8"/>'),
  whats:P_('<path d="M4 20l1.3-4A8 8 0 1 1 8 18.7z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 .8c-.9-.4-1.6-1.1-2-2l.8-1-1-2z"/>'),
  info:P_('<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8v.01"/>'),
  sparkle:P_('<path d="M12 4l1.8 4.7L18.5 10.5l-4.7 1.8L12 17l-1.8-4.7L5.5 10.5l4.7-1.8z"/><path d="M19 16l.7 1.6 1.6.7-1.6.7L19 20.6l-.7-1.6-1.6-.7 1.6-.7z"/>'),
  calc:P_('<rect x="5" y="3" width="14" height="18" rx="2"/><rect x="8" y="6" width="8" height="3" rx="1"/><path d="M8.5 13h.01M12 13h.01M15.5 13h.01M8.5 16.5h.01M12 16.5h.01M15.5 16.5h.01"/>'),
  cal:P_('<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M4 9h16M8 3v4M16 3v4M8 13h3M8 16.5h6"/>'),
  mail:P_('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M4 7l8 6 8-6"/>'),
  contract:P_('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M8.5 12h7M8.5 15h5"/><path d="M14.5 18.5l1.4 1.4 2.6-2.8"/>'),
  gavel:P_('<path d="M4 20h9M14.5 4.5l5 5M12 7l5 5M16.5 5.5l-8 8-2-2 8-8z"/><path d="M9.5 12.5l2 2-4 4-2-2z"/>'),
  pin:P_('<path d="M9 3h6l-1 6 3 3v2H7v-2l3-3-1-6z"/><path d="M12 14v7"/>'),
  boxes:P_('<rect x="3" y="4" width="8" height="7" rx="1"/><rect x="13" y="4" width="8" height="7" rx="1"/><rect x="8" y="13" width="8" height="7" rx="1"/>')
};

/* ---------- brasão e carimbos ---------- */
const B64_BRASAO = "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";
const B64_CARIMBO_SEINFRA = "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";
const B64_CARIMBO_LIC = "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";
const B64_PANDA = "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";
const BRAS_SRC = 'data:image/jpeg;base64,' + B64_BRASAO;
const BRAS_IMG = new Image(); BRAS_IMG.src = BRAS_SRC;
const PANDA_SRC = 'data:image/png;base64,' + B64_PANDA;

/* ---------- ajustes ---------- */
const REV_PROMPT = 'Você é revisor de textos oficiais da Prefeitura Municipal de Ilhéus (Secretaria de Infraestrutura e Defesa Civil). Revise o TEXTO abaixo em português do Brasil:\n' +
  '- corrija ortografia, acentuação, crase, concordância, regência e pontuação;\n' +
  '- mantenha o sentido, os termos técnicos de engenharia, números, datas, valores e nomes exatamente como estão;\n' +
  '- mantenha o tom formal e impessoal de nota técnica ou despacho; melhore a clareza só quando a frase estiver confusa;\n' +
  '- não acrescente informações nem opiniões;\n' +
  '- nunca use a palavra "tratativa" ou "tratativas" (prefira reuniões, ajustes ou interação).\n' +
  'Responda primeiro com o texto revisado, sem comentários. Depois, numa linha sozinha, escreva ---MUDANÇAS--- e liste em tópicos curtos o que mudou (ou "Nenhuma mudança necessária").';
const SETTINGS_PADRAO = () => ({
  v:4,
  timbre:'completo',          /* 'brasao' = só o brasão · 'completo' = brasão + Estado da Bahia / Prefeitura (padrão MPF) */
  brasTexto:'todas',          /* brasão dos textos novos: todas | primeira | nenhum */
  carimbo:'nenhum', numerar:false, inicial:1,
  deitada:'esq',              /* página deitada vira para a esquerda na impressão → carimbo no canto inferior direito */
  zoom:88,
  cidade:'Ilhéus',
  setor:'Superintendência de Projetos e Fiscalização',
  signatarios:[
    { id:'s3', nome:'Gabriel de Andrade Cerqueira', cargo:'Secretário de Infraestrutura e Defesa Civil', mat:'', autoridade:true, sec:'seinfra' },
    { id:'s10', nome:'Evani Cavalcante de Souza Rocha', cargo:'Secretária Municipal de Educação', mat:'', autoridade:false, sec:'educacao' },
    { id:'s2', nome:'Hiago C. S. Guimarães Ramos', cargo:'Superintendente de Projetos e Fiscalização', mat:'', autoridade:false },
    { id:'s6', nome:'Isabela Farias de Lima', cargo:'Gerente de Infraestrutura', mat:'', autoridade:false },
    { id:'s8', nome:'Lorena Santos Damasceno de Melo', cargo:'Engenheira Civil', mat:'', reg:'CREA nº 3000135893BA', autoridade:false },
    { id:'s1', nome:'Lucas S. L. P. Santana', cargo:'Assistente Administrativo', mat:'023479', autoridade:false },
    { id:'s7', nome:'Pedro Fontes Barifaldi Hirs', cargo:'Gerente de Vias Públicas', mat:'', autoridade:false },
    { id:'s4', nome:'Roberto Fontes Passos Dias', cargo:'Superintendente de Manutenção', mat:'', autoridade:false },
    { id:'s9', nome:'Sonilda Santana de Mello', cargo:'Secretária Municipal de Saúde', mat:'', autoridade:false, sec:'saude' },
    { id:'s5', nome:'Vinícius Oliveira Teixeira', cargo:'Gerente de Orçamento e Controle', mat:'', autoridade:false }
  ],
  secretarias:null,
  orgao:'Secretaria Municipal de Infraestrutura e Defesa Civil de Ilhéus',
  sigla:'SMDIEDC',
  sigLine:false,
  ia:{ prov:'auto', claudeKey:'', geminiKey:'', claudeModel:'claude-haiku-4-5', geminiModel:'gemini-2.5-flash', tier:'quick', prompt:REV_PROMPT },
  modelos:null,
  lay:null
});
let settings = SETTINGS_PADRAO();
function saveSettings(){ try{ if(LAY.editando) layHistGuardar(); }catch(e){} lsSet('settings', settings); kvSet('settings', settings); }
function signatario(id){ return settings.signatarios.find(s => s.id === id) || settings.signatarios[0] || { nome:'', cargo:'', mat:'' }; }
const cargoLinha = s => s ? (s.cargo || '') + (s.mat ? ' – Matrícula nº ' + s.mat : '') : '';

/* ===== b_engine.js ===== */

/* =====================================================================
   Motor de documentos — padrão MPI (Modelos Padronizados de Ilhéus)
   A4 · margens: sup. 2 cm (5 cm com cabeçalho) · inf. 2 cm · esq. 3 cm · dir. 2,5 cm
   Times 12 · entrelinhas 1,15 · 6 pt depois de cada parágrafo
   ===================================================================== */
const PAG = {
  retrato: { W:595.28, H:841.89, T:56.69, B:56.69, L:85.04, R:70.87 },
  paisagem: { W:841.89, H:595.28, T:56.69, B:56.69, L:70.87, R:70.87 }
};
for(const k in PAG){ const g = PAG[k]; g.CW = g.W - g.L - g.R; g.ALT = g.H - g.T - g.B; }
const T_TIMBRE = 141.73;               /* com cabeçalho, o texto começa a 5 cm do topo */
const K_ALT = 1.107, K_ASC = 0.891;    /* métricas do Times */
const RECUO = 35.43, RECUO_CIT = 113.39, ESPACO_ASSIN = 80;
const ESTILOS = {
  tit:   { size:12, f:'b', al:'center', bf:0, af:0, kn:1, kl:1, caixa:1 },
  ident: { size:12, f:'b', al:'center', bf:0, af:40, kn:1, kl:1, caixa:1 },
  dt:    { size:12, al:'right', bf:0, af:18, kn:1, kl:1 },
  bl:    { size:12, al:'left', bf:0, af:0, kl:1 },
  cap:   { size:12, f:'b', al:'left', bf:12, af:6, kn:1, kl:1 },
  sub:   { size:12, f:'b', al:'left', bf:12, af:6, kn:1, kl:1 },
  corpo: { size:12, al:'justify', bf:0, af:6 },
  item:  { size:12, al:'justify', bf:0, af:6, kl:1 },
  alin:  { size:12, al:'justify', bf:0, af:6, kl:1, ind:28.35 },
  cit:   { size:11, al:'justify', bf:0, af:6, ind:RECUO_CIT, lf:1 },
  loc:   { size:12, al:'left', bf:12, af:0, kn:1, kl:1 },
  sig1:  { size:12, f:'b', al:'center', bf:ESPACO_ASSIN, af:0, kn:1, kl:1 },
  sig2:  { size:12, f:'b', al:'center', bf:0, af:0, kl:1 },
  tdoc:  { size:14, f:'b', al:'center', bf:12, af:6, kn:1, kl:1 },
  capa:  { size:16, f:'b', al:'center', bf:250, af:0, kn:1, kl:1, caixa:1, desce:1 }
};
const WIN_EXTRA = '€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ';
const WIN_TROCA = { '≤':'<=', '≥':'>=', '→':'->', '←':'<-', '☐':'( )', '☒':'(X)', '☑':'(X)', '✓':'v', '✔':'v', '\t':' ', ' ':' ', ' ':' ', ' ':' ', ' ':' ', ' ':' ', '​':'', '‐':'-', '‑':'-', '−':'-', 'Ω':'Ohm', 'μ':'u', '′':"'", '″':'"', '∅':'Ø' };
function winAnsi(s){ return String(s == null ? '' : s).replace(/[^\x20-\x7E\xA0-\xFF\n]/g, c => WIN_EXTRA.includes(c) ? c : (WIN_TROCA[c] != null ? WIN_TROCA[c] : '')); }
async function fontes(pdf){
  const F = PDFLib.StandardFonts;
  return { r: await pdf.embedFont(F.TimesRoman), b: await pdf.embedFont(F.TimesRomanBold), i: await pdf.embedFont(F.TimesRomanItalic), bi: await pdf.embedFont(F.TimesRomanBoldItalic),
    h: await pdf.embedFont(F.Helvetica), hb: await pdf.embedFont(F.HelveticaBold) };
}
let _fm = null;
async function fontesMedida(){ if(_fm) return _fm; const d = await PDFLib.PDFDocument.create(); _fm = await fontes(d); return _fm; }
function largura(font, txt, size){
  const c = font.__w || (font.__w = {}); let w = 0;
  for(const ch of txt){ if(c[ch] === undefined){ try{ c[ch] = font.widthOfTextAtSize(ch, 1000); }catch(e){ c[ch] = font.widthOfTextAtSize('?', 1000); } } w += c[ch]; }
  return w * size / 1000;
}

/* ---------- datas e nomes ---------- */
const MESES_EXT = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
function dataExtenso(iso){ const d = iso ? new Date(iso + 'T12:00:00') : new Date(); const dia = d.getDate(); return (dia === 1 ? '1º' : dia) + ' de ' + MESES_EXT[d.getMonth()] + ' de ' + d.getFullYear(); }
const CONECTIVOS = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o', 'as', 'os', 'em', 'na', 'no', 'nas', 'nos', 'para', 'por', 'com', 'à', 'às', 'ao', 'aos', 'sem', 'sob', 'um', 'uma']);
/* Iniciais maiúsculas, conectivos em minúscula; siglas (tudo maiúsculo com 2+ letras) ficam como estão */
function titleCase(s){
  return String(s || '').split(/(\s+)/).map((w, i) => {
    if(!w.trim()) return w;
    if(/^[A-ZÀ-Ý0-9]{2,}[.\-]?$/.test(w) && /[A-Z]/.test(w) && w.length <= 6 && !/^[A-ZÀ-Ý]{4,}$/.test(w.replace(/\W/g, ''))) return w;
    if(/^\d/.test(w) || /\./.test(w) && w.length <= 3) return w;
    const low = w.toLocaleLowerCase('pt-BR');
    if(i > 0 && CONECTIVOS.has(low)) return low;
    return low.charAt(0).toLocaleUpperCase('pt-BR') + low.slice(1);
  }).join('');
}

/* ---------- HTML → blocos ---------- */
/* marca-texto no PDF e no Word: só quando o Exportar pede "com marcações" */
let PDF_MARCAS = false;
function runsDe(no, base, ctx){
  const out = [];
  (function walk(n, st){
    for(const c of Array.from(n.childNodes)){
      if(c.nodeType === 3){ const t = c.data.replace(/[\r\n\t]+/g, ' '); if(t) out.push({ t, b:st.b, i:st.i, u:st.u, sup:st.sup, m:st.m }); continue; }
      if(c.nodeType !== 1) continue;
      const tg = c.tagName;
      if(tg === 'BR'){ out.push({ br:true }); continue; }
      if(tg === 'UL' || tg === 'OL') continue;
      if(tg === 'SUP' && c.classList && c.classList.contains('nr')){
        const nota = c.getAttribute('data-nota') || '';
        if(ctx){ ctx.notas.push(nota); out.push({ t:String(ctx.notas.length), b:st.b, i:false, sup:true, nota:ctx.notas.length }); }
        continue;
      }
      if(c.classList && c.classList.contains('naoimp')) continue;
      const w = (c.getAttribute && c.getAttribute('style')) || '';
      const s2 = { b: st.b || tg === 'B' || tg === 'STRONG' || /font-weight\s*:\s*(bold|[6-9]00)/i.test(w), i: st.i || tg === 'I' || tg === 'EM', u: st.u || tg === 'U', sup: st.sup || tg === 'SUP', m: st.m || (PDF_MARCAS && tg === 'MARK' && c.classList && c.classList.contains('mt')) };
      walk(c, s2);
    }
  })(no, base || { b:false, i:false, u:false, sup:false });
  while(out.length && out[0].t != null && !out[0].t.trim()) out.shift();
  while(out.length && out[0].br) out.shift();
  if(out.length && out[0].t) out[0].t = out[0].t.replace(/^\s+/, '');
  while(out.length && (out[out.length - 1].br || (out[out.length - 1].t != null && !out[out.length - 1].t.trim()))) out.pop();
  if(out.length && out[out.length - 1].t) out[out.length - 1].t = out[out.length - 1].t.replace(/\s+$/, '');
  return out;
}
/* parágrafo numerado (1.1, 2., a), I -) e vocativo não levam recuo de primeira linha */
function semRecuo(txt){
  const t = String(txt || '').trim();
  return /^(\d+(\.\d+)*[.)º°]?|[a-z]\)|[IVXLC]+\s*[.)–-]|[-–•▪])\s/.test(t) || /^(senhor|senhora|senhores|excelent|prezad|ilustr|magn[íi]fic|vossa)[^.]{0,70},$/i.test(t);
}
const alinea = n => { let s = ''; n++; while(n > 0){ const m = (n - 1) % 26; s = String.fromCharCode(97 + m) + s; n = Math.floor((n - 1) / 26); } return s; };
function htmlParaBlocos(src, ctx){
  let d = src;
  if(typeof src === 'string' || src == null){ d = document.createElement('div'); d.innerHTML = src || ''; }
  ctx = ctx || { notas:[] };
  const out = [];
  const R = (el, base) => runsDe(el, base, ctx);
  function lista(el, nivel){
    let k = 0;
    for(const li of Array.from(el.children)){
      if(li.tagName !== 'LI') continue;
      const pref = el.tagName === 'OL' ? (k + 1) + '. ' : alinea(k) + ') ';
      const runs = R(li);
      if(runs.length) out.push({ s:'item', runs:[{ t:pref }].concat(runs), ind:28.35 * nivel, el:li });
      k++;
      for(const sub of Array.from(li.children)) if(sub.tagName === 'UL' || sub.tagName === 'OL') lista(sub, nivel + 1);
    }
  }
  function tabela(el){
    const rows = [];
    el.querySelectorAll('tr').forEach(tr => {
      if(tr.closest('table') !== el) return;
      const cels = Array.from(tr.children).filter(c => /^T[DH]$/.test(c.tagName));
      if(!cels.length) return;
      const hdr = cels.every(c => c.tagName === 'TH');
      rows.push({ hdr, cels: cels.map(c => ({ runs: R(c, { b: c.tagName === 'TH', i:false, u:false }), al: (c.classList && c.classList.contains('n')) || /right/.test((c.style && c.style.textAlign) || '') ? 'right' : /center/.test((c.style && c.style.textAlign) || '') ? 'center' : 'left' })) });
    });
    if(rows.length) out.push({ s:'tab', rows, size:10, el });
  }
  function citacao(el){
    const ps = Array.from(el.children).filter(c => c.tagName === 'P');
    if(!ps.length){ const r = R(el); if(r.length) out.push({ s:'cit', runs:r, el }); return; }
    ps.forEach(p => { const r = R(p); if(r.length) out.push({ s:'cit', runs:r, el:p }); });
  }
  function blocos(no){
    for(const c of Array.from(no.childNodes)){
      if(c.nodeType === 3){ if(c.data.trim()) out.push({ s:'corpo', runs:[{ t:c.data.trim() }], ind:semRecuo(c.data) ? 0 : RECUO, el:null }); continue; }
      if(c.nodeType !== 1) continue;
      const t = c.tagName, cl = c.classList;
      if(cl && cl.contains('naoimp')) continue;
      if(t === 'H1'){ const r = R(c, { b:true, i:false, u:false }); if(r.length) out.push({ s:cl && cl.contains('capa') ? 'capa' : 'tit', runs:r, el:c }); continue; }
      if(/^H[2-6]$/.test(t)){ const r = R(c, { b:true, i:false, u:false }); if(r.length) out.push({ s: t === 'H2' ? 'cap' : 'sub', runs:r, el:c }); continue; }
      if(t === 'P'){
        const r = R(c);
        if(cl.contains('dt')){ out.push({ s:'dt', runs:r, el:c }); continue; }
        if(!r.length) continue;
        const al = (c.style && c.style.textAlign) || null;
        const s = cl.contains('id') ? 'ident' : cl.contains('bl') ? 'bl' : cl.contains('alin') ? 'alin' : 'corpo';
        const b = { s, runs:r, al: s === 'corpo' || s === 'alin' ? al : null, el:c };
        if(s === 'corpo') b.ind = al && al !== 'justify' ? 0 : semRecuo(r.map(x => x.t || '').join('')) ? 0 : RECUO;
        out.push(b); continue;
      }
      if(t === 'UL' || t === 'OL'){ lista(c, 1); continue; }
      if(t === 'TABLE'){ tabela(c); continue; }
      if(t === 'HR'){ if(cl.contains('quebra') || cl.contains('qp')) out.push({ s:'quebra', el:c }); continue; }
      if(t === 'BLOCKQUOTE'){ citacao(c); continue; }
      if(t === 'DIV' || t === 'SECTION'){ blocos(c); continue; }
      const r = R({ childNodes:[c] }); if(r.length) out.push({ s:'corpo', runs:r, ind:RECUO, el:c });
    }
  }
  blocos(d);
  return out;
}
/* regras de espaço entre as primeiras linhas (título, identificação, bloco de cabeçalho) */
function ajustarSequencia(bl){
  const caixa = b => Object.assign({}, b, { runs: b.runs.map(r => r.t != null && !r.sup ? Object.assign({}, r, { t: r.t.toLocaleUpperCase('pt-BR') }) : r) });
  const out = bl.map(b => (ESTILOS[b.s] || {}).caixa ? caixa(b) : Object.assign({}, b));
  for(let i = 0; i < out.length; i++){
    const b = out[i], nx = out[i + 1];
    if(b.s === 'tit') b.af = nx && nx.s === 'ident' ? 0 : nx && nx.s === 'dt' ? 22 : 40;
    if(b.s === 'ident' && nx && nx.s === 'dt') b.af = 22;
    if(b.s === 'bl' && nx && nx.s !== 'bl') nx.bf = Math.max(nx.bf || ESTILOS[nx.s] && ESTILOS[nx.s].bf || 0, 12);
  }
  return out;
}
function blocosSimples(src){ return htmlParaBlocos(src).map(b => b.s === 'tit' ? Object.assign({}, b, { s:'tdoc' }) : b.s === 'corpo' ? Object.assign({}, b, { ind:0 }) : b); }

/* fecho automático: local e data + assinatura (nome e cargo em negrito, centralizados) */
function fechoAtivo(d){ return !!d && d.kind === 'texto' && !(d.sig && d.sig.sem); }
function blocosFecho(d, els){
  const s = d.sig || {}, pes = s.pessoa ? pessoaPorId(s.pessoa) : null, out = [];
  els = els || {};
  if(!docTemDataNoTopo(d)){
    const runs = s.modo === 'fisica' ? [{ t:'Ilhéus, ' + dataExtenso(s.data) + '.' }] : [{ t:'Ilhéus, ' }, { t:'data da assinatura eletrônica', i:true }, { t:'.' }];
    out.push({ s:'loc', runs, el:els.loc || null });
  }
  out.push({ s:'sig1', runs:[{ t: pes ? titleCase(pes.nome) : '[Signatário]' }], el:els.n1 || null });
  if(pes && pes.cargo) out.push({ s:'sig2', runs:[{ t:pes.cargo }], el:els.n2 || null });
  if(pes && pes.reg) out.push({ s:'sig2', runs:[{ t:pes.reg }], el:els.n3 || null });
  return out;
}
function docTemDataNoTopo(d){ return /class="dt"/.test(d.html || '') || d.tipo === 'of'; }
function runsDataTopo(d){ const s = d.sig || {}; return s.modo === 'fisica' ? [{ t:'Ilhéus, ' + dataExtenso(s.data) + '.' }] : [{ t:'Ilhéus, ' }, { t:'data da assinatura eletrônica', i:true }, { t:'.' }]; }
function blocosDoc(src, d, ctx, els){
  let bl = htmlParaBlocos(src, ctx);
  if(d) bl = bl.map(b => b.s === 'dt' ? Object.assign({}, b, { runs:runsDataTopo(d) }) : b);
  bl = bl.filter(b => b.s !== 'dt' || b.runs.length);
  bl = ajustarSequencia(bl);
  if(fechoAtivo(d)){
    /* bloco inseparável: o último parágrafo desce junto com a data e o nome/cargo */
    const u = bl[bl.length - 1];
    if(u && u.s !== 'quebra' && u.s !== 'tab') Object.assign(u, { kn:1, kl:1 });
    bl = bl.concat(blocosFecho(d, els));
  }
  return bl;
}

/* ---------- quebra de linhas ---------- */
function fonteDe(F, run, estilo){ const b = run.b || estilo.f === 'b' || estilo.f === 'bi', i = run.i || estilo.f === 'i' || estilo.f === 'bi'; return b && i ? F.bi : b ? F.b : i ? F.i : F.r; }
function palavras(runs, F, size, estilo){
  const out = []; let atual = null;
  const fecha = () => { if(atual && atual.parts.length) out.push(atual); atual = null; };
  for(const r of runs){
    if(r.br){ fecha(); out.push({ br:true }); continue; }
    const font = fonteDe(F, r, estilo), sz = r.sup ? size * 0.62 : size;
    for(const p of winAnsi(r.t).split(/( +)/)){
      if(!p) continue;
      if(/^ +$/.test(p)){ fecha(); continue; }
      atual = atual || { parts:[], w:0 };
      const w = largura(font, p, sz);
      atual.parts.push({ t:p, font, u:!!r.u, m:!!r.m, w, sz: r.sup ? sz : null, dy: r.sup ? size * 0.34 : 0, nota: r.nota || null }); atual.w += w;
    }
  }
  fecha();
  return out;
}
function quebrar(pals, larg, F, size){
  const esp = largura(F.r, ' ', size);
  const linhas = []; let lin = { ws:[], w:0 };
  const fecha = forcada => { linhas.push({ ws:lin.ws, w:lin.w, fim:forcada, sp:esp }); lin = { ws:[], w:0 }; };
  for(const p of pals){
    if(p.br){ fecha(true); continue; }
    let pw = p;
    while(pw.w > larg && pw.parts.length){
      if(lin.ws.length) fecha(false);
      const cab = { parts:[], w:0 }, rest = { parts:[], w:0 };
      let cheio = false;
      for(const part of pw.parts){
        if(cheio){ rest.parts.push(part); rest.w += part.w; continue; }
        let t = '';
        const psz = part.sz || size;
        for(const ch of part.t){ const w2 = largura(part.font, t + ch, psz); if(cab.w + w2 > larg && (cab.w > 0 || t)){ cheio = true; break; } t += ch; }
        if(t){ const w = largura(part.font, t, psz); cab.parts.push(Object.assign({}, part, { t, w })); cab.w += w; }
        if(t.length < part.t.length){ const r = part.t.slice(t.length); const w = largura(part.font, r, psz); rest.parts.push(Object.assign({}, part, { t:r, w })); rest.w += w; cheio = true; }
      }
      if(!cab.parts.length) break;
      lin.ws.push(cab); lin.w = cab.w; fecha(false);
      pw = rest;
    }
    if(!pw.parts.length) continue;
    if(lin.ws.length && lin.w + esp + pw.w > larg + 0.01) fecha(false);
    lin.w += (lin.ws.length ? esp : 0) + pw.w; lin.ws.push(pw);
  }
  if(lin.ws.length || !linhas.length) fecha(true);
  linhas.forEach(l => { l.notas = []; l.ws.forEach(w => w.parts.forEach(p => { if(p.nota) l.notas.push(p.nota); })); });
  return linhas;
}
function posLinha(l, x, larg, size, al, y, ind1){
  const n = l.ws.length; let gap = l.sp, x0 = x + (ind1 || 0), lw = larg - (ind1 || 0);
  if(al === 'justify' && !l.fim && n > 1) gap = (lw - (l.w - l.sp * (n - 1))) / (n - 1);
  else if(al === 'center') x0 = x + (larg - l.w) / 2;
  else if(al === 'right') x0 = x + larg - l.w;
  let cx = x0; const ws = [];
  for(const w of l.ws){ ws.push({ x:cx, parts:w.parts }); cx += w.w + gap; }
  return { k:'ln', y, size, ws, notas:l.notas };
}
/* recuo só na 1ª linha: quebra a 1ª linha com a largura menor */
function quebrarComRecuo(pals, larg, F, size, ind1){
  if(!ind1) return quebrar(pals, larg, F, size);
  const l1 = quebrar(pals, larg - ind1, F, size);
  if(l1.length <= 1) return l1;
  const usadas = l1[0].ws.length;
  let conta = 0, i = 0;
  for(; i < pals.length && conta < usadas; i++) if(!pals[i].br) conta++;
  const resto = quebrar(pals.slice(i), larg, F, size);
  return [l1[0]].concat(resto);
}
function medir(b, F, G){
  if(b.s === 'quebra') return { tipo:'quebra' };
  if(b.s === 'tab') return medirTabela(b, F, G);
  const e = Object.assign({}, ESTILOS[b.s] || ESTILOS.corpo);
  if(b.bf != null) e.bf = b.bf;
  if(b.af != null) e.af = b.af;
  const size = e.size, lh = size * K_ALT * (e.lf || 1.15);
  const blocoInd = b.s === 'corpo' ? 0 : (b.ind != null ? b.ind : (e.ind || 0));
  const ind1 = b.s === 'corpo' ? (b.ind || 0) : 0;
  const larg = G.CW - blocoInd;
  const ls = quebrarComRecuo(palavras(b.runs, F, size, e), larg, F, size, ind1);
  return { tipo:'p', size, lh, x:G.L + blocoInd, w:larg, ind1, ls, bf:e.bf, af:e.af, kn:!!(e.kn || b.kn), kl:!!(e.kl || b.kl), h:ls.length * lh, al:b.al || e.al, desce:!!e.desce };
}
function medirTabela(b, F, G){
  const size = b.size || 10, pad = 3.5, lh = size * K_ALT * 1.12;
  const nc = Math.max(...b.rows.map(r => r.cels.length));
  const nat = Array(nc).fill(0), minw = Array(nc).fill(0);
  for(const r of b.rows) r.cels.forEach((c, i) => {
    const pals = palavras(c.runs, F, size, { f: r.hdr ? 'b' : null });
    let tot = 0, maior = 0;
    for(const p of pals) if(!p.br){ tot += p.w + largura(F.r, ' ', size); maior = Math.max(maior, p.w); }
    nat[i] = Math.max(nat[i], Math.min(tot, 260)); minw[i] = Math.max(minw[i], Math.min(maior, 90));
  });
  let ws = nat.map((n, i) => Math.max(n, minw[i], 24) + 2 * pad);
  const soma = ws.reduce((a, x) => a + x, 0);
  ws = ws.map(w => w * G.CW / soma);
  const rows = b.rows.map(r => {
    let x = G.L, hmax = 0; const cels = [];
    for(let i = 0; i < nc; i++){
      const c = r.cels[i] || { runs:[] };
      const ls = quebrar(palavras(c.runs, F, size, { f: r.hdr ? 'b' : null }), ws[i] - 2 * pad, F, size);
      const th = ls.length * lh; hmax = Math.max(hmax, th);
      cels.push({ x, w:ws[i], ls, th, al:c.al || 'left' }); x += ws[i];
    }
    return { hdr:r.hdr, cels, h:hmax + 2 * pad, fill: r.hdr ? 'F1F3F5' : null };
  });
  const hdrH = rows.filter(r => r.hdr).reduce((a, r) => a + r.h, 0);
  return { tipo:'tab', size, lh, pad, rows, hdrH, bf:6, af:6, kn:false, kl:false };
}
/* notas de rodapé: Times 10, a largura toda */
function medirNotas(textos, F, G){
  return textos.map((t, i) => {
    const size = 10, lh = size * K_ALT;
    const ls = quebrar(palavras([{ t:String(i + 1), sup:true }, { t:' ' + t }], F, size, {}), G.CW, F, size);
    return { ls, lh, size, h:ls.length * lh + 2 };
  });
}
function paginar(medidos, G, opt){
  const paginas = []; let pg = null, y = 0, topo = true, n = 0, ultAf = 0;
  const notas = opt.notas || [];
  const antes = m => opt.colapsar ? Math.max(0, m.bf - ultAf) : m.bf;
  const nova = () => {
    pg = { itens:[], notas:[], notasH:0 }; paginas.push(pg); topo = true; ultAf = 0;
    if(opt.timbre === 'todas' || (opt.timbre === 'primeira' && n === 0)) pg.timbre = true;
    y = pg.timbre ? T_TIMBRE : G.T; n++;
  };
  const limite = () => G.H - G.B - (pg.notasH ? pg.notasH + 9 : 0);
  const resta = () => limite() - y;
  const alt = () => G.H - G.B - (pg && pg.timbre ? T_TIMBRE : G.T);
  function precisa(i){
    let tot = 0;
    for(let j = i; j < medidos.length && j - i < 14; j++){
      const m = medidos[j];
      if(m.tipo === 'quebra') break;
      tot += (j === i && topo) ? 0 : (j === i ? antes(m) : (opt.colapsar ? Math.max(0, m.bf - medidos[j - 1].af) : m.bf));
      if(m.tipo === 'tab'){ const r1 = m.rows.find(r => !r.hdr); tot += m.hdrH + (r1 ? r1.h : 0); break; }
      if(m.kn && j + 1 < medidos.length){ tot += m.h + m.af; continue; }
      tot += m.kl ? m.h : m.lh * Math.min(m.ls.length, 2);
      break;
    }
    return tot;
  }
  const baseY = m => y + (m.lh - m.size * K_ALT) / 2 + m.size * K_ASC;
  function extraNotas(l){
    const novas = (l.notas || []).filter(k => !pg.notas.includes(k));
    if(!novas.length) return { novas, h:0 };
    return { novas, h: novas.reduce((a, k) => a + (opt.notasM[k - 1] ? opt.notasM[k - 1].h : 0), 0) + (pg.notasH ? 0 : 9) };
  }
  function paragrafo(m){
    if(m.desce && topo) y = Math.max(y, (G.H - m.h) / 2 - 30);
    else if(!topo) y += antes(m);
    const L = m.ls.length; let p = 0;
    while(p < L){
      const falta = L - p, cabe = Math.floor((resta() + 0.01) / m.lh);
      let k;
      if(cabe >= falta) k = falta;
      else {
        k = cabe;
        if(m.kl && falta * m.lh <= alt() && !topo) k = 0;
        if(p === 0 && k === 1 && L > 1) k = 0;
        if(falta - k === 1 && k > 1) k -= 1;
        if(k <= 0 && topo) k = Math.max(1, cabe);
      }
      let j = 0;
      for(; j < k; j++){
        const l = m.ls[p + j], ex = extraNotas(l);
        if(ex.h && y + m.lh + ex.h > G.H - G.B - (pg.notasH ? pg.notasH + 9 : 0) && !(topo && j === 0)) break;
        if(ex.novas.length){ ex.novas.forEach(nk => { pg.notas.push(nk); pg.notasH += opt.notasM[nk - 1] ? opt.notasM[nk - 1].h : 0; }); }
        const it = posLinha(l, m.x, m.w, m.size, m.al, baseY(m), p + j === 0 ? m.ind1 : 0); it.bi = m.bi; it.top = y; it.bot = y + m.lh; pg.itens.push(it); y += m.lh;
        topo = false;
      }
      p += j;
      if(p < L) nova();
    }
    y += m.af; ultAf = m.af;
  }
  function linhaTab(r, m, ri){
    const x0 = r.cels[0].x, x1 = r.cels[r.cels.length - 1].x + r.cels[r.cels.length - 1].w;
    if(r.fill) pg.itens.push({ k:'rect', x:x0, y, w:x1 - x0, h:r.h, fill:r.fill, bi:m.bi, ri, top:y, bot:y + r.h });
    if(r.hdr || topoTab){ pg.itens.push({ k:'hl', x0, x1, y, c:'9AA1AA', lw:0.8, bi:m.bi, ri }); topoTab = false; }
    pg.itens.push({ k:'hl', x0, x1, y:y + r.h, c: r.hdr ? '9AA1AA' : 'D5D9DE', lw: r.hdr ? 0.8 : 0.5, bi:m.bi, ri, top:y, bot:y + r.h });
    for(const c of r.cels){
      let yy = y + m.pad;
      for(const l of c.ls){ const it = posLinha(l, c.x + m.pad, c.w - 2 * m.pad, m.size, c.al, yy + (m.lh - m.size * K_ALT) / 2 + m.size * K_ASC); it.bi = m.bi; it.ri = ri; pg.itens.push(it); yy += m.lh; }
    }
    y += r.h;
  }
  let topoTab = false;
  function tabela(m){
    if(!topo) y += antes(m);
    const cab = m.rows.filter(r => r.hdr);
    topoTab = true;
    m.rows.forEach((r, ri) => {
      if(!r.hdr && r.h > resta() && !topo){ nova(); topoTab = true; cab.forEach(c => linhaTab(c, m, -1)); }
      linhaTab(r, m, ri); topo = false;
    });
    y += m.af; ultAf = m.af;
  }
  nova();
  medidos.forEach((m, i) => {
    if(m.tipo === 'quebra'){ if(!topo) nova(); else pg.forcada = true; return; }
    const need = precisa(i);
    if(!topo && need > resta() && need <= alt()) nova();
    if(m.tipo === 'tab') tabela(m); else paragrafo(m);
  });
  return paginas;
}

/* ---------- desenho ---------- */
const cor = hex => { const a = parseInt(hex, 16); return PDFLib.rgb((a >> 16 & 255) / 255, (a >> 8 & 255) / 255, (a & 255) / 255); };
const TIMBRE_LINHAS = ['ESTADO DA BAHIA', 'PREFEITURA MUNICIPAL DE ILHÉUS'];
/* cabeçalho: brasão, duas linhas em negrito do mesmo tamanho e um traço com a largura do nome da prefeitura */
const TB = { top:28, bh:56, gap:5, size:10.5, lh:13.1, trGap:3, trW:1 };
TB.bw = TB.bh * 43 / 46.7;
const timbreLinhas = () => settings.timbre === 'brasao' ? [] : TIMBRE_LINHAS;
function desenharTimbre(page, R, G){
  const H = page.getHeight(), cx = G.L + G.CW / 2, ls = timbreLinhas();
  page.drawImage(R.IMG.brasao, { x:cx - TB.bw / 2, y:H - TB.top - TB.bh, width:TB.bw, height:TB.bh });
  let yTop = TB.top + TB.bh + TB.gap;
  ls.forEach(t => { const w = largura(R.F.b, t, TB.size); page.drawText(winAnsi(t), { x:cx - w / 2, y:H - (yTop + (TB.lh - TB.size * K_ALT) / 2 + TB.size * K_ASC), size:TB.size, font:R.F.b }); yTop += TB.lh; });
  if(ls.length){ const wr = largura(R.F.b, ls[ls.length - 1], TB.size), yr = H - (yTop + TB.trGap); page.drawLine({ start:{ x:cx - wr / 2, y:yr }, end:{ x:cx + wr / 2, y:yr }, thickness:TB.trW, color:PDFLib.rgb(0, 0, 0) }); }
}
/* tarja no pé da folha: margem a margem, Helvetica 7,2, texto corrido justificado */
function medirTarja(runs, R, G){
  const F = { r:R.F.h, b:R.F.hb, i:R.F.h, bi:R.F.hb }, size = 7.2, pad = 5.5;
  const ls = quebrar(palavras(runs, F, size, {}), G.CW - 2 * pad, F, size);
  const lh = size * 1.3;
  return { ls, lh, size, pad, h:ls.length * lh + 6 };
}
function desenharTarja(page, T, G){
  const H = page.getHeight(), x = G.L, w = G.CW, yb = 12;
  /* sem fundo e sem borda: só o texto em cinza claro (legível na xerox) */
  let yy = H - (yb + T.h) + 3;
  for(const l of T.ls){
    const it = posLinha(l, x + T.pad, w - 2 * T.pad, T.size, 'justify', yy + T.size * 0.93, 0);
    for(const ww of it.ws){ let cx = ww.x; for(const p of ww.parts){ page.drawText(p.t, { x:cx, y:H - it.y, size:T.size, font:p.font, color:cor('8E8E93') }); cx += p.w; } }
    yy += T.lh;
  }
}
function desenharPagina(page, pg, R, G, extra){
  const H = G.H;
  if(pg.timbre) desenharTimbre(page, R, G);
  const fontReal = f => R.F[f === R.MF.b ? 'b' : f === R.MF.i ? 'i' : f === R.MF.bi ? 'bi' : f === R.MF.h ? 'h' : f === R.MF.hb ? 'hb' : 'r'];
  const linha = (it) => {
    /* marca-texto: fundo amarelo-esverdeado desbotado atrás das palavras marcadas (o espaço entre duas marcadas também) */
    it.ws.forEach((w, k) => {
      let x = w.x;
      w.parts.forEach((p, j) => {
        if(p.m){
          const prox = j === w.parts.length - 1 && it.ws[k + 1] && it.ws[k + 1].parts[0] && it.ws[k + 1].parts[0].m ? it.ws[k + 1].x : x + p.w, sz = p.sz || it.size;
          page.drawRectangle({ x, y:H - it.y - sz * 0.24, width:Math.max(prox - x, p.w), height:sz * 1.12, color:cor('EEF4BC') });
        }
        x += p.w;
      });
    });
    for(const w of it.ws){
      let x = w.x;
      for(const p of w.parts){
        page.drawText(p.t, { x, y:H - it.y + (p.dy || 0), size:p.sz || it.size, font:fontReal(p.font) });
        if(p.u) page.drawLine({ start:{ x, y:H - it.y - 1.6 }, end:{ x:x + p.w, y:H - it.y - 1.6 }, thickness:0.6, color:PDFLib.rgb(0, 0, 0) });
        x += p.w;
      }
    }
  };
  for(const it of pg.itens){
    if(it.k === 'rect'){ page.drawRectangle({ x:it.x, y:H - it.y - it.h, width:it.w, height:it.h, color: it.fill ? cor(it.fill) : undefined, borderColor: it.stroke ? cor(it.stroke) : undefined, borderWidth: it.stroke ? it.lw : 0 }); continue; }
    if(it.k === 'hl'){ page.drawLine({ start:{ x:it.x0, y:H - it.y }, end:{ x:it.x1, y:H - it.y }, thickness:it.lw, color:cor(it.c) }); continue; }
    linha(it);
  }
  /* notas de rodapé desta folha */
  if(pg.notas && pg.notas.length && extra && extra.notasM){
    let y = G.H - G.B - pg.notasH;
    page.drawLine({ start:{ x:G.L, y:H - y + 4 }, end:{ x:G.L + G.CW * 0.34, y:H - y + 4 }, thickness:0.5, color:PDFLib.rgb(0, 0, 0) });
    for(const k of pg.notas){
      const nm = extra.notasM[k - 1]; if(!nm) continue;
      nm.ls.forEach((l, j) => {
        const it = posLinha(l, G.L, G.CW, nm.size, 'justify', y + 1 + j * nm.lh + nm.size * K_ASC, 0);
        linha(it);
      });
      y += nm.h;
    }
  }
  if(extra && extra.tarja) desenharTarja(page, extra.tarja, G);
  if(extra && extra.carimboImg){
    const im = extra.carimboImg, bw = 64, bh = 40, k = Math.min(bw / im.width, bh / im.height), w = im.width * k, h = im.height * k;
    page.drawImage(im, { x:G.W - 3 - w, y:8 + (bh - h) / 2, width:w, height:h });
  }
}
async function recursos(pdf, need = {}){
  const R = { F: await fontes(pdf), MF: await fontesMedida(), IMG:{} };
  if(need.brasao) R.IMG.brasao = await pdf.embedJpg(b64u8(B64_BRASAO));
  if(need.carimbo === 'seinfra') R.IMG.carimbo = await pdf.embedPng(b64u8(B64_CARIMBO_SEINFRA));
  if(need.carimbo === 'licitacao') R.IMG.lic = await pdf.embedPng(b64u8(B64_CARIMBO_LIC));
  return R;
}
function geo(page){
  const a = page.getCropBox ? page.getCropBox() : page.getMediaBox();
  const W = a.width, H = a.height, R = (((page.getRotation().angle || 0) % 360) + 360) % 360;
  return {
    R, VW: R === 90 || R === 270 ? H : W, VH: R === 90 || R === 270 ? W : H,
    u(x, y){ let p; if(R === 90) p = { x:y, y:x }; else if(R === 180) p = { x:W - x, y }; else if(R === 270) p = { x:W - y, y:H - x }; else p = { x, y:H - y }; return { x:p.x + a.x, y:p.y + a.y }; }
  };
}
/* brasão pequeno sobre páginas de PDF (quando você marca "brasão" numa página escaneada) */
function timbreEmPagina(page, R){
  const g = geo(page), rot = PDFLib.degrees(g.R), bw = 43, bh = 46.7, top = 14.17, cx = g.VW / 2;
  const p = g.u(cx - bw / 2, top + bh);
  page.drawImage(R.IMG.brasao, { x:p.x, y:p.y, width:bw, height:bh, rotate:rot });
}
/* Carimbo e número sempre no canto superior direito da folha EM PÉ.
   Página deitada (planilha): a página continua deitada; só o carimbo gira. */
function quadroEmPe(g, modo){
  if(!(g.VW > g.VH * 1.02)) return { PW:g.VW, PH:g.VH, map:(x, y) => g.u(x, y), rot:g.R };
  if(modo === 'dir') return { PW:g.VH, PH:g.VW, map:(px, py) => g.u(py, g.VH - px), rot:g.R + 90 };
  return { PW:g.VH, PH:g.VW, map:(px, py) => g.u(g.VW - py, px), rot:g.R - 90 };
}
function carimbar(pdf, R, opt){
  const tipo = opt.carimbo || 'nenhum';
  if(tipo === 'nenhum' && !opt.numerar) return;
  const ini = parseInt(opt.inicial, 10) || 1;
  const C = tipo === 'licitacao' ? { img:R.IMG.lic, w:66.3, h:66.5, cx:38.15, by:56.1 } : { img:R.IMG.carimbo, w:66.3, h:67.7, cx:0.504 * 66.3, by:14.1 + 0.504 * 67.7 + 5.3 };
  const nums = opt.numeros || null;
  pdf.getPages().forEach((page, i) => {
    const n = String(nums && nums[i] != null ? nums[i] : ini + i), Q = quadroEmPe(geo(page), opt.deitada || settings.deitada), rot = PDFLib.degrees(Q.rot);
    if(tipo !== 'nenhum'){
      const x = Q.PW - 19.4 - C.w, p = Q.map(x, 14.1 + C.h);
      page.drawImage(C.img, { x:p.x, y:p.y, width:C.w, height:C.h, rotate:rot });
      if(opt.numerar){ const w = largura(R.F.h, n, 15), q = Q.map(x + C.cx - w / 2, C.by); page.drawText(n, { x:q.x, y:q.y, size:15, font:R.F.h, rotate:rot }); }
    } else {
      const t = 'Fls. ' + n, w = largura(R.F.hb, t, 10), q = Q.map(Q.PW - 19.4 - w, 30);
      page.drawText(t, { x:q.x, y:q.y, size:10, font:R.F.hb, rotate:rot });
    }
  });
}
const libsPdf = () => !!window.PDFLib;
function needLibs(pdfjs){
  if(!window.PDFLib || (pdfjs && !window.pdfjsLib)){ toast('As ferramentas de PDF ainda estão carregando. Verifique a internet e tente de novo.'); return false; }
  return true;
}
const modoTimbre = bras => bras === 'nenhum' ? 'nenhuma' : bras === 'primeira' ? 'primeira' : 'todas';

/* Diagramação sem gerar arquivo: nº de páginas e onde cada página começa (para a mesa).
   src: o corpo do texto (elemento ou HTML); d: o documento; els: elementos do fecho na tela */
async function diagramarTexto(src, d, els){
  const MF = await fontesMedida(), G = PAG.retrato;
  const ctx = { notas:[] };
  const bl = d && d.raw ? blocosSimples(src) : blocosDoc(src, d, ctx, els);
  const medidos = bl.map((b, i) => { const m = medir(b, MF, G); m.bi = i; return m; });
  if(!medidos.length) return { n:1, quebras:[], notas:[] };
  const paginas = paginar(medidos, G, { timbre:modoTimbre(d && d.bras), colapsar:true, notas:ctx.notas, notasM:medirNotas(ctx.notas, MF, G) });
  const quebras = [];
  const visto = {};
  paginas.forEach((pg, k) => {
    const primeiro = pg.itens.find(it => (it.k === 'ln' || it.k === 'rect' || it.k === 'hl') && it.ri !== -1);
    if(k > 0){
      const b = primeiro ? bl[primeiro.bi] : null;
      const linhasAntes = primeiro ? (visto[primeiro.bi] || 0) : 0;
      const tab = b && b.s === 'tab';
      quebras.push({ el: b && b.el, linhas: primeiro && primeiro.k === 'ln' && !tab ? linhasAntes : 0, ri: tab ? primeiro.ri : null, lh: primeiro && medidos[primeiro.bi] && medidos[primeiro.bi].lh, vazia:!primeiro });
    }
    pg.itens.forEach(it => { if(it.k === 'ln') visto[it.bi] = (visto[it.bi] || 0) + 1; });
  });
  return { n:paginas.length, quebras, notas:ctx.notas };
}
async function imgDeDataURL(pdf, url){
  if(!url) return null;
  try{ const m = /^data:image\/(png|jpe?g);base64,(.*)$/.exec(url); if(!m) return null; const u8 = b64u8(m[2]); return m[1] === 'png' ? await pdf.embedPng(u8) : await pdf.embedJpg(u8); }catch(e){ return null; }
}
const PDFGen = {
  /* texto → PDF. o = { doc, proc, bras, raw, title } */
  async texto(src, o = {}){
    const pdf = await PDFLib.PDFDocument.create();
    const d = o.doc || null, bras = o.bras || (d && d.bras) || 'todas';
    const temBras = bras !== 'nenhum';
    const R = await recursos(pdf, { brasao:temBras });
    const G = PAG.retrato, ctx = { notas:[] };
    const bl = o.raw ? blocosSimples(src) : blocosDoc(src, d, ctx);
    const medidos = bl.map((b, i) => { const m = medir(b, R.MF, G); m.bi = i; return m; });
    if(!medidos.length) throw new Error('vazio');
    const notasM = medirNotas(ctx.notas, R.MF, G);
    const paginas = paginar(medidos, G, { timbre:modoTimbre(bras), colapsar:true, notas:ctx.notas, notasM });
    const extra = { notasM };
    if(!o.raw && d){
      const runs = tarjaRuns(d, o.proc || null);
      if(runs && runs.length) extra.tarja = medirTarja(runs, R, G);
    }
    paginas.forEach((pg, k) => { const page = pdf.addPage([G.W, G.H]); desenharPagina(page, pg, R, G, extra); const r = d && d.rotF && d.rotF[k]; if(r) page.setRotation(PDFLib.degrees(r)); });
    if(o.title) pdf.setTitle(o.title);
    pdf.setCreator('Panda'); pdf.setProducer('Panda');
    return { bytes: await pdf.save(), pages: paginas };
  },
  async countPages(bytes){ const p = await PDFLib.PDFDocument.load(bytes, { ignoreEncryption:true, updateMetadata:false }); return p.getPageCount(); },
  /* copia as páginas de um arquivo (com giro, brasão, retiradas, brancas) para `out` */
  async appendFile(out, f, R, only){
    const pl = (only || f.pl).filter(e => !e.d);
    const src = pl.some(e => e.s >= 0) ? await PDFLib.PDFDocument.load(f.bytes, { ignoreEncryption:true, updateMetadata:false }) : null;
    const idx = pl.filter(e => e.s >= 0).map(e => e.s);
    const copied = idx.length ? await out.copyPages(src, idx) : [];
    let k = 0;
    for(const e of pl){
      let page;
      if(e.s < 0) page = out.addPage([PAG.retrato.W, PAG.retrato.H]);
      else { page = copied[k++]; out.addPage(page); }
      if(e.r) page.setRotation(PDFLib.degrees((((page.getRotation().angle || 0) + e.r) % 360 + 360) % 360));
      if(e.b) timbreEmPagina(page, R);
    }
    return pl.length;
  },
  async fileBytes(f, only){
    const out = await PDFLib.PDFDocument.create();
    const pl = (only || f.pl).filter(e => !e.d);
    if(!pl.length) throw new Error('sem páginas');
    const R = await recursos(out, { brasao: pl.some(e => e.b) });
    await PDFGen.appendFile(out, f, R, pl);
    out.setTitle(f.name || ''); out.setCreator('Panda'); out.setProducer('Panda');
    return out.save();
  },
  /* itens: {kind:'file', f} | {kind:'texto', html, bras, doc, proc} */
  async merge(items, opt, avisar){
    avisar = avisar || (() => {});
    const out = await PDFLib.PDFDocument.create();
    const temBras = items.some(it => it.kind === 'file' && it.f.pl.some(e => e.b && !e.d));
    const R = await recursos(out, { brasao:temBras, carimbo:opt.carimbo });
    const falhas = [];
    for(let i = 0; i < items.length; i++){
      const it = items[i];
      avisar('Juntando ' + (i + 1) + ' de ' + items.length + '…');
      await sleep(0);
      try {
        if(it.kind === 'texto'){
          const t = await PDFGen.texto(it.html, { bras:it.bras, doc:it.doc, proc:it.proc, raw:it.raw });
          const src = await PDFLib.PDFDocument.load(t.bytes);
          (await out.copyPages(src, src.getPageIndices())).forEach(p => out.addPage(p));
        } else await PDFGen.appendFile(out, it.f, R);
      } catch(e){ console.warn(e); falhas.push(it.name || (it.f && it.f.name) || 'arquivo'); }
    }
    if(!out.getPageCount()) throw new Error('Nenhuma página para juntar.');
    carimbar(out, R, opt || {});
    out.setTitle(opt.titulo || ''); out.setCreator('Panda'); out.setProducer('Panda');
    return { bytes: await out.save(), paginas: out.getPageCount(), falhas };
  },
  async separate(items, opt, avisar){
    const zip = new JSZip();
    let n = parseInt(opt.inicial, 10) || 1;
    for(let i = 0; i < items.length; i++){
      const it = items[i];
      const r = await PDFGen.merge([it], Object.assign({}, opt, { inicial:n }), () => avisar && avisar('Preparando ' + (i + 1) + ' de ' + items.length + '…'));
      n += r.paginas;
      zip.file(String(i + 1).padStart(2, '0') + ' ' + safeName(it.name || (it.f && it.f.name), '.pdf'), r.bytes);
    }
    return zip.generateAsync({ type:'blob', compression:'DEFLATE', compressionOptions:{ level:6 } });
  },
  async imageToPdf(bytes, name){
    const pdf = await PDFLib.PDFDocument.create();
    let img;
    if(/\.png$/i.test(name)) img = await pdf.embedPng(bytes);
    else if(/\.jpe?g$/i.test(name)) img = await pdf.embedJpg(bytes);
    else {
      const bmp = await createImageBitmap(new Blob([bytes]));
      const cv = document.createElement('canvas'); cv.width = bmp.width; cv.height = bmp.height; cv.getContext('2d').drawImage(bmp, 0, 0);
      const b = await new Promise(r => cv.toBlob(r, 'image/jpeg', 0.88));
      img = await pdf.embedJpg(new Uint8Array(await b.arrayBuffer()));
    }
    const G = img.width > img.height ? PAG.paisagem : PAG.retrato;
    const page = pdf.addPage([G.W, G.H]);
    const m = 20, k = Math.min((G.W - 2 * m) / img.width, (G.H - 2 * m) / img.height);
    page.drawImage(img, { x:(G.W - img.width * k) / 2, y:(G.H - img.height * k) / 2, width:img.width * k, height:img.height * k });
    return new Uint8Array(await pdf.save());
  }
};

/* =====================================================================
   Texto colado → HTML (limpeza de HTML e Markdown do Claude)
   ===================================================================== */
function limparHTML(html){
  const d = new DOMParser().parseFromString(html, 'text/html');
  const raiz = document.createElement('div');
  const BLOCO = /^(P|DIV|H[1-6]|UL|OL|LI|TABLE|THEAD|TBODY|TFOOT|TR|TD|TH|BLOCKQUOTE|PRE|SECTION|ARTICLE|HEADER|FOOTER|MAIN)$/;
  function estilo(el){
    const st = (el.getAttribute('style') || '').toLowerCase();
    return { b:/font-weight\s*:\s*(bold|[6-9]00)/.test(st), naoB:/font-weight\s*:\s*(normal|[1-4]00)/.test(st), i:/font-style\s*:\s*italic/.test(st), u:/text-decoration[^;]*underline/.test(st) };
  }
  function inline(no, destino){
    for(const c of Array.from(no.childNodes)){
      if(c.nodeType === 3){ destino.append(document.createTextNode(c.data.replace(/[\t\r\n]+/g, ' '))); continue; }
      if(c.nodeType !== 1) continue;
      const t = c.tagName;
      if(/^(SCRIPT|STYLE|META|TITLE|LINK|IMG|SVG|BUTTON|INPUT)$/.test(t)) continue;
      if(t === 'BR'){ destino.append(document.createElement('br')); continue; }
      const st = estilo(c);
      let alvo = destino, wrap = null;
      if((t === 'B' || t === 'STRONG') && !st.naoB) wrap = 'strong';
      else if(t === 'I' || t === 'EM') wrap = 'em';
      else if(t === 'U') wrap = 'u';
      else if(t === 'SPAN' || t === 'FONT'){ if(st.b) wrap = 'strong'; else if(st.i) wrap = 'em'; else if(st.u) wrap = 'u'; }
      if(wrap){ const w = document.createElement(wrap); destino.append(w); alvo = w; }
      if(BLOCO.test(t)){ if(destino.lastChild && destino.lastChild.nodeName !== 'BR') destino.append(document.createElement('br')); }
      inline(c, alvo);
    }
  }
  function blocos(no, destino){
    let p = null;
    const fechaP = () => { if(p && p.textContent.trim()) destino.append(p); p = null; };
    for(const c of Array.from(no.childNodes)){
      if(c.nodeType === 3){ if(!c.data.trim()){ if(p) p.append(' '); continue; } p = p || document.createElement('p'); p.append(document.createTextNode(c.data.replace(/[\t\r\n]+/g, ' '))); continue; }
      if(c.nodeType !== 1) continue;
      const t = c.tagName;
      if(/^(SCRIPT|STYLE|META|TITLE|LINK|HEAD|IMG|SVG|BUTTON|INPUT|NAV)$/.test(t)) continue;
      if(t === 'HR'){ fechaP(); continue; }
      if(/^H[1-6]$/.test(t)){ fechaP(); const x = document.createElement(t === 'H1' ? 'h2' : t.toLowerCase()); inline(c, x); if(x.textContent.trim()) destino.append(x); continue; }
      if(t === 'P' || t === 'PRE'){ fechaP(); const x = document.createElement('p'); inline(c, x); if(x.textContent.trim()) destino.append(x); continue; }
      if(t === 'UL' || t === 'OL'){ fechaP(); destino.append(lista(c)); continue; }
      if(t === 'TABLE'){ fechaP(); destino.append(tabela(c)); continue; }
      if(/^(DIV|BLOCKQUOTE|SECTION|ARTICLE|HEADER|FOOTER|MAIN|BODY|CENTER)$/.test(t) || (t === 'B' && estilo(c).naoB)){
        if(Array.from(c.children).some(k => BLOCO.test(k.tagName))){ fechaP(); blocos(c, destino); }
        else { fechaP(); const x = document.createElement('p'); inline(c, x); if(x.textContent.trim()) destino.append(x); }
        continue;
      }
      p = p || document.createElement('p'); inline({ childNodes:[c] }, p);
    }
    fechaP();
  }
  function lista(el){
    const x = document.createElement(el.tagName.toLowerCase());
    for(const li of Array.from(el.children)){
      if(li.tagName !== 'LI') continue;
      const y = document.createElement('li');
      for(const c of Array.from(li.childNodes)){
        if(c.nodeType === 1 && (c.tagName === 'UL' || c.tagName === 'OL')) y.append(lista(c));
        else if(c.nodeType === 1 && c.tagName === 'P'){ if(y.childNodes.length) y.append(document.createElement('br')); inline(c, y); }
        else inline({ childNodes:[c] }, y);
      }
      x.append(y);
    }
    return x;
  }
  function tabela(el){
    const t = document.createElement('table'), tb = document.createElement('tbody'); t.append(tb);
    el.querySelectorAll('tr').forEach(tr => {
      if(tr.closest('table') !== el) return;
      const r = document.createElement('tr');
      Array.from(tr.children).forEach(c => { if(!/^T[DH]$/.test(c.tagName)) return; const x = document.createElement(c.tagName.toLowerCase()); inline(c, x); r.append(x); });
      if(r.children.length) tb.append(r);
    });
    return t;
  }
  blocos(d.body, raiz);
  raiz.querySelectorAll('p,li,h1,h2,h3,h4,h5,h6,td,th').forEach(b => {
    while(b.firstChild && (b.firstChild.nodeName === 'BR' || (b.firstChild.nodeType === 3 && !b.firstChild.data.trim()))) b.firstChild.remove();
    while(b.lastChild && (b.lastChild.nodeName === 'BR' || (b.lastChild.nodeType === 3 && !b.lastChild.data.trim()))) b.lastChild.remove();
  });
  raiz.querySelectorAll(':scope > p').forEach(p => {
    const txt = p.textContent.trim();
    const soNeg = p.childNodes.length === 1 && p.firstChild.nodeName === 'STRONG';
    if(soNeg && txt.split(/\s+/).length <= 12 && !/[;,]$/.test(txt)){ const h2 = document.createElement('h2'); h2.textContent = txt; p.replaceWith(h2); }
    else if(/^[a-z]\)\s/.test(txt)) p.className = 'alin';
  });
  return raiz.innerHTML;
}
function mdInline(s){
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^\w])__(.+?)__(?=[^\w]|$)/g, '$1<strong>$2</strong>')
    .replace(/(^|[^*\w])\*(?!\s)([^*\n]+?)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/`([^`]+)`/g, '$1');
}
function mdParaHTML(md){
  const L = String(md).replace(/\r\n?/g, '\n').replace(/\u00a0/g, ' ').split('\n');
  const out = [];
  const proxima = i => { for(let j = i + 1; j < L.length; j++) if(L[j].trim()) return L[j].trim(); return ''; };
  let i = 0;
  while(i < L.length){
    const t = L[i].trim();
    if(!t){ i++; continue; }
    let m;
    if((m = t.match(/^(#{1,6})\s+(.*)$/))){ const n = Math.max(2, m[1].length); out.push('<h' + n + '>' + mdInline(m[2].replace(/\s*#+\s*$/, '').replace(/\*\*/g, '')) + '</h' + n + '>'); i++; continue; }
    if(/^(-{3,}|\*{3,}|_{3,})$/.test(t)){ i++; continue; }
    if(t.startsWith('|') && i + 1 < L.length && /^\|?\s*:?-{2,}/.test(L[i + 1].trim())){
      const linhas = [];
      const cels = s => s.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
      linhas.push(cels(t)); i += 2;
      while(i < L.length && L[i].trim().startsWith('|')){ linhas.push(cels(L[i])); i++; }
      out.push('<table><tbody>' + linhas.map((r, k) => '<tr>' + r.map(c => k === 0 ? '<th>' + mdInline(c.replace(/\*\*/g, '')) + '</th>' : '<td>' + mdInline(c) + '</td>').join('') + '</tr>').join('') + '</tbody></table>');
      continue;
    }
    if(/^[-*+•]\s+/.test(t)){
      const itens = [];
      while(i < L.length && /^\s*[-*+•]\s+/.test(L[i])){ itens.push(L[i].trim().replace(/^[-*+•]\s+/, '')); i++; }
      out.push('<ul>' + itens.map(x => '<li>' + mdInline(x) + '</li>').join('') + '</ul>');
      continue;
    }
    if(/^>\s?/.test(t)){ out.push('<p>' + mdInline(t.replace(/^>\s?/, '')) + '</p>'); i++; continue; }
    if((m = t.match(/^(\*\*)?(\d+)\.\s+(.+?)(\*\*)?$/))){
      const txt = m[3].replace(/\*\*/g, '').trim();
      const neg = !!(m[1] && m[4]);
      const seg = proxima(i).replace(/^\*\*/, '');
      const temSub = new RegExp('^' + m[2] + '\\.\\d').test(seg);
      const caixa = txt === txt.toLocaleUpperCase('pt-BR') && /[A-ZÀ-Ú]/.test(txt);
      if((neg || temSub || caixa) && txt.split(/\s+/).length <= 14 && !/[;,.]$/.test(txt)){ out.push('<h2>' + mdInline(m[2] + '. ' + txt) + '</h2>'); i++; continue; }
    }
    if((m = t.match(/^\*\*([^*]+)\*\*:?$/)) && m[1].split(/\s+/).length <= 12 && out.length > 1){ out.push('<h2>' + mdInline(m[1].trim() + (t.endsWith(':') ? ':' : '')) + '</h2>'); i++; continue; }
    if(/^[a-z]\)\s+/.test(t)){ out.push('<p class="alin">' + mdInline(t) + '</p>'); i++; continue; }
    out.push('<p>' + mdInline(t.replace(/^\*\*(.+)\*\*$/, '$1')) + '</p>'); i++;
  }
  return out.join('');
}
const looksMarkdown = t => /(^|\n)\s*(#{1,6}\s|[-*+]\s|\|.*\|)|\*\*[^*]+\*\*/.test(t);
function htmlDeColagem(cd){
  const html = cd.getData('text/html'), txt = cd.getData('text/plain');
  if(txt && (!html || looksMarkdown(txt))) return mdParaHTML(txt);
  if(html) return limparHTML(html);
  return mdParaHTML(txt || '');
}

/* =====================================================================
   Word (.docx) no mesmo padrão MPI: cabeçalho, título, bloco, capítulos,
   citação, notas de rodapé, fecho e tarja no rodapé
   ===================================================================== */
async function buildDocx(src, d, proc){
  const x = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const ctx = { notas:[] };
  const bl = blocosDoc(src, d, ctx);
  const tw = pt => Math.round(pt * 20);
  const run = (r, size, eb, ei, fonte) => {
    if(r.br) return '<w:r><w:br/></w:r>';
    if(r.nota) return `<w:r><w:rPr><w:vertAlign w:val="superscript"/><w:sz w:val="${Math.round(size * 2)}"/></w:rPr><w:footnoteReference w:id="${r.nota}"/></w:r>`;
    const b = r.b || eb, i = r.i || ei;
    const f = fonte ? `<w:rFonts w:ascii="${fonte}" w:hAnsi="${fonte}" w:cs="${fonte}"/>` : '';
    return `<w:r><w:rPr>${f}${b ? '<w:b/>' : ''}${i ? '<w:i/>' : ''}${r.u ? '<w:u w:val="single"/>' : ''}${r.m ? '<w:shd w:val="clear" w:color="auto" w:fill="EEF4BC"/>' : ''}${r.sup ? '<w:vertAlign w:val="superscript"/>' : ''}<w:sz w:val="${Math.round(size * 2)}"/><w:szCs w:val="${Math.round(size * 2)}"/></w:rPr><w:t xml:space="preserve">${x(r.t)}</w:t></w:r>`;
  };
  const jc = { justify:'both', center:'center', left:'left', right:'right' };
  let prevAf = 0, body = '';
  for(const b of bl){
    if(b.s === 'quebra'){ body += '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'; prevAf = 0; continue; }
    if(b.s === 'tab'){
      const nc = Math.max(...b.rows.map(r => r.cels.length));
      const brd = '<w:tblBorders><w:top w:val="single" w:sz="6" w:space="0" w:color="9AA1AA"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="D5D9DE"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="D5D9DE"/><w:left w:val="nil"/><w:right w:val="nil"/><w:insideV w:val="nil"/></w:tblBorders>';
      const TW = tw(PAG.retrato.CW);
      const nat = Array(nc).fill(4);
      b.rows.forEach(r => r.cels.forEach((c, i) => { const n = c.runs.map(q => q.t || '').join('').length; nat[i] = Math.max(nat[i], Math.min(n, 40)); }));
      const soma = nat.reduce((a, v) => a + v, 0), cw = nat.map(v => Math.round(v / soma * TW));
      body += `<w:tbl><w:tblPr><w:tblW w:w="${TW}" w:type="dxa"/><w:tblLayout w:type="fixed"/>${brd}<w:tblCellMar><w:left w:w="70" w:type="dxa"/><w:right w:w="70" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${cw.map(w => `<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>`;
      for(const r of b.rows){
        body += '<w:tr>' + (r.hdr ? '<w:trPr><w:tblHeader/></w:trPr>' : '');
        for(let i = 0; i < nc; i++){
          const c = r.cels[i] || { runs:[] };
          body += `<w:tc><w:tcPr><w:tcW w:w="${cw[i]}" w:type="dxa"/>${r.hdr ? '<w:tcBorders><w:bottom w:val="single" w:sz="6" w:space="0" w:color="9AA1AA"/></w:tcBorders><w:shd w:val="clear" w:color="auto" w:fill="F1F3F5"/>' : ''}</w:tcPr><w:p><w:pPr><w:spacing w:before="40" w:after="40" w:line="248" w:lineRule="auto"/>${c.al === 'right' ? '<w:jc w:val="right"/>' : c.al === 'center' ? '<w:jc w:val="center"/>' : ''}</w:pPr>${c.runs.map(q => run(q, 10, r.hdr, false)).join('')}</w:p></w:tc>`;
        }
        body += '</w:tr>';
      }
      body += '</w:tbl>'; prevAf = 0; continue;
    }
    const e = Object.assign({}, ESTILOS[b.s] || ESTILOS.corpo);
    if(b.bf != null) e.bf = b.bf;
    if(b.af != null) e.af = b.af;
    const before = Math.max(0, e.bf - prevAf);
    const blocoInd = b.s === 'corpo' ? 0 : (b.ind != null ? b.ind : (e.ind || 0)), ind1 = b.s === 'corpo' ? (b.ind || 0) : 0;
    const al = jc[b.al || e.al] || 'both';
    const line = Math.round(240 * (e.lf || 1.15));
    const indXml = blocoInd || ind1 ? `<w:ind w:left="${tw(blocoInd)}"${ind1 ? ` w:firstLine="${tw(ind1)}"` : ''}/>` : '';
    body += `<w:p><w:pPr>${e.kn || b.kn ? '<w:keepNext/>' : ''}${e.kl || b.kl ? '<w:keepLines/>' : ''}<w:spacing w:before="${tw(before)}" w:after="${tw(e.af)}" w:line="${line}" w:lineRule="auto"/>${indXml}<w:jc w:val="${al}"/></w:pPr>${b.runs.map(r => run(r, e.size, e.f === 'b' || e.f === 'bi', e.f === 'i' || e.f === 'bi')).join('')}</w:p>`;
    prevAf = e.af;
  }
  const bras = (d && d.bras) || 'todas', temBras = bras !== 'nenhum';
  const NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"';
  const G = PAG.retrato, MF = await fontesMedida();
  const pHdr = (inner, after, extra) => `<w:p><w:pPr><w:spacing w:before="0" w:after="${after || 0}" w:line="${tw(TB.lh)}" w:lineRule="exact"/>${extra || ''}<w:jc w:val="center"/></w:pPr>${inner}</w:p>`;
  const cx = Math.round(TB.bw * 12700), cy = Math.round(TB.bh * 12700);
  const drawing = `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="1" name="Brasao"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="0" name="brasao.jpg"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdImg"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
  const hdrLine = t => `<w:r><w:rPr><w:b/><w:sz w:val="21"/><w:szCs w:val="21"/></w:rPr><w:t xml:space="preserve">${x(t)}</w:t></w:r>`;
  const ls = timbreLinhas();
  let hdrBody = `<w:p><w:pPr><w:spacing w:before="0" w:after="${tw(TB.gap)}" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/></w:pPr>${drawing}</w:p>`;
  ls.forEach((t, i) => {
    let extra = '';
    if(i === ls.length - 1){ const wr = largura(MF.b, t, TB.size), sobra = Math.max(0, (G.CW - wr) / 2 - 2); extra = `<w:pBdr><w:bottom w:val="single" w:sz="8" w:space="2" w:color="000000"/></w:pBdr><w:ind w:left="${tw(sobra)}" w:right="${tw(sobra)}"/>`; }
    hdrBody += pHdr(hdrLine(t), 0, extra);
  });
  const header1 = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:hdr ${NS}>${hdrBody}</w:hdr>`;
  const header2 = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:hdr ${NS}><w:p><w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr></w:p></w:hdr>`;
  /* rodapé: a tarja em uma célula clara, margem a margem */
  const tr = d ? tarjaRuns(d, proc || null) : null;
  let footer = '';
  if(tr && tr.length){
    const cell = `<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="220" w:lineRule="auto"/><w:jc w:val="both"/></w:pPr>${tr.map(r => run(r, 7.2, false, false, 'Arial')).join('')}</w:p>`;
    footer = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr ${NS}><w:tbl><w:tblPr><w:tblW w:w="${tw(G.CW)}" w:type="dxa"/><w:tblBorders><w:top w:val="single" w:sz="4" w:color="CCD1D7"/><w:left w:val="single" w:sz="4" w:color="CCD1D7"/><w:bottom w:val="single" w:sz="4" w:color="CCD1D7"/><w:right w:val="single" w:sz="4" w:color="CCD1D7"/></w:tblBorders><w:tblCellMar><w:top w:w="50" w:type="dxa"/><w:left w:w="110" w:type="dxa"/><w:bottom w:w="50" w:type="dxa"/><w:right w:w="110" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid><w:gridCol w:w="${tw(G.CW)}"/></w:tblGrid><w:tr><w:tc><w:tcPr><w:tcW w:w="${tw(G.CW)}" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="FAFBFC"/></w:tcPr>${cell}</w:tc></w:tr></w:tbl><w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="120" w:lineRule="exact"/></w:pPr></w:p></w:ftr>`;
  }
  /* notas de rodapé */
  const temNotas = ctx.notas.length > 0;
  const notesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:footnotes ${NS}><w:footnote w:type="separator" w:id="-1"><w:p><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:r><w:separator/></w:r></w:p></w:footnote><w:footnote w:type="continuationSeparator" w:id="0"><w:p><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:r><w:continuationSeparator/></w:r></w:p></w:footnote>${ctx.notas.map((t, i) => `<w:footnote w:id="${i + 1}"><w:p><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="both"/></w:pPr><w:r><w:rPr><w:vertAlign w:val="superscript"/><w:sz w:val="20"/></w:rPr><w:footnoteRef/></w:r><w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:t xml:space="preserve"> ${x(t)}</w:t></w:r></w:p></w:footnote>`).join('')}</w:footnotes>`;
  let refs = '';
  if(bras === 'todas') refs = '<w:headerReference w:type="default" r:id="rIdH1"/>';
  if(bras === 'primeira') refs = '<w:headerReference w:type="default" r:id="rIdH2"/><w:headerReference w:type="first" r:id="rIdH1"/>';
  if(footer) refs += '<w:footerReference w:type="default" r:id="rIdF1"/>' + (bras === 'primeira' ? '<w:footerReference w:type="first" r:id="rIdF1"/>' : '');
  const topo = temBras ? T_TIMBRE : G.T;
  const sect = `<w:sectPr>${refs}${temNotas ? '<w:footnotePr><w:numFmt w:val="decimal"/></w:footnotePr>' : ''}<w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="${tw(topo)}" w:right="${tw(G.R)}" w:bottom="${tw(G.B)}" w:left="${tw(G.L)}" w:header="${tw(TB.top)}" w:footer="${tw(12)}" w:gutter="0"/>${bras === 'primeira' ? '<w:titlePg/>' : ''}</w:sectPr>`;
  const doc = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${NS}><w:body>${body}${sect}</w:body></w:document>`;
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="pt-BR" w:eastAsia="pt-BR" w:bidi="ar-SA"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style></w:styles>`;
  const zip = new JSZip();
  const ov = [];
  if(temBras) ov.push('<Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/><Override PartName="/word/header2.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>');
  if(footer) ov.push('<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>');
  if(temNotas) ov.push('<Override PartName="/word/footnotes.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footnotes+xml"/>');
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="jpg" ContentType="image/jpeg"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>${ov.join('')}</Types>`);
  zip.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  zip.file('word/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdSt" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>${temBras ? '<Relationship Id="rIdH1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/><Relationship Id="rIdH2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header2.xml"/>' : ''}${footer ? '<Relationship Id="rIdF1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>' : ''}${temNotas ? '<Relationship Id="rIdFn" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footnotes" Target="footnotes.xml"/>' : ''}</Relationships>`);
  zip.file('word/document.xml', doc);
  zip.file('word/styles.xml', styles);
  if(footer) zip.file('word/footer1.xml', footer);
  if(temNotas) zip.file('word/footnotes.xml', notesXml);
  if(temBras){
    zip.file('word/header1.xml', header1); zip.file('word/header2.xml', header2);
    zip.file('word/_rels/header1.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdImg" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/brasao.jpg"/></Relationships>');
    zip.file('word/media/brasao.jpg', b64u8(B64_BRASAO));
  }
  return zip.generateAsync({ type:'blob', mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}

/* ===== c_data.js ===== */
/* =====================================================================
   Dados: processos (objetos), documentos, arquivos, ficha, REVIT e modelos
   ===================================================================== */
const CATS = [['licitacoes', 'Licitações'], ['aditivos', 'Aditivos'], ['mp', 'MP'], ['diversos', 'Outras demandas'], ['autorizacoes', 'Autorizações']];
const catName = id => (CATS.find(c => c[0] === id) || [, 'Outras demandas'])[1];
const STATUS = ['Em elaboração', 'Tramitando', 'Aguardando resposta', 'Parado', 'Concluído'];
const MODALIDADES = ['Concorrência Eletrônica', 'Concorrência Eletrônica – SRP', 'Pregão Eletrônico', 'Pregão Eletrônico – SRP', 'Dispensa de Licitação', 'Inexigibilidade', 'Adesão a Ata', 'Outra'];
const SETORES = ['Superintendência de Projetos e Fiscalização', 'Gabinete da SEINFRA', 'Procuradoria-Geral do Município', 'Controladoria-Geral do Município', 'Secretaria da Fazenda', 'Contabilidade', 'Setor de Licitações', 'Setor de Contratos', 'Gerência de Fiscalização', 'Gerência de Orçamento e Controle', 'PROGER', 'Empresa contratada'];
const TIPOS_OBJ = ['Licitação', 'Aditivo', 'Processo administrativo'];
const MOD_COD = ['CP – Concorrência Pública', 'PE – Pregão Eletrônico', 'PP – Pregão Presencial', 'DL – Dispensa de Licitação', 'IN – Inexigibilidade'];
const ESPECIES = ['PRZ – Prazo', 'VAL – Valor', 'QTD – Quantitativo', 'REQ – Reequilíbrio'];
const SIM_NAO = ['Não', 'Sim'];

/* campos da ficha central: [chave, rótulo, tipo, grupo] */
const FICHA = [
  ['num', 'Nº do processo', 'text', 'Identificação'],
  ['objeto', 'Objeto', 'area', 'Identificação'],
  ['modalidade', 'Modalidade', 'list:MODALIDADES', 'Identificação'],
  ['licNum', 'Nº da concorrência / pregão', 'text', 'Identificação'],
  ['setor', 'Setor responsável', 'list:SETORES', 'Identificação'],
  ['revitInicio', 'Início do estudo (REVIT)', 'date', 'REVIT'],
  ['tipoObj', 'Tipo', 'list:TIPOS_OBJ', 'REVIT'],
  ['modCod', 'Modalidade (sigla)', 'list:MOD_COD', 'REVIT'],
  ['srp', 'Registro de preços', 'list:SIM_NAO', 'REVIT'],
  ['especie', 'Espécie do aditivo', 'list:ESPECIES', 'REVIT'],
  ['sigla', 'Sigla do objeto', 'text', 'REVIT'],
  ['pca', 'Plano de Contratações Anual', 'list:PCA_OPC', 'Planejamento'],
  ['pcaItem', 'Item do PCA (se consta)', 'text', 'Planejamento'],
  ['necessidade', 'Descrição da necessidade', 'area', 'Planejamento'],
  ['parcelamento', 'Parcelamento do objeto', 'area', 'Planejamento'],
  ['contratada', 'Contratada', 'text', 'Contrato'],
  ['cnpj', 'CNPJ', 'text', 'Contrato'],
  ['contratadaEnd', 'Endereço da contratada', 'text', 'Contrato'],
  ['contratadaResp', 'Responsável pela contratada', 'text', 'Contrato'],
  ['contrato', 'Nº do contrato', 'text', 'Contrato'],
  ['fiscal', 'Fiscal do contrato', 'text', 'Contrato'],
  ['gestor', 'Gestor do contrato', 'text', 'Contrato'],
  ['dotacao', 'Dotação orçamentária', 'text', 'Contrato'],
  ['valorInicial', 'Valor inicial', 'money', 'Valores'],
  ['valorAtual', 'Valor atualizado', 'money', 'Valores'],
  ['medido', 'Valor medido / pago', 'money', 'Valores'],
  ['saldo', 'Saldo', 'money', 'Valores'],
  ['assinatura', 'Assinatura do contrato', 'date', 'Datas e prazos'],
  ['inicio', 'Início (ordem de serviço)', 'date', 'Datas e prazos'],
  ['prazo', 'Prazo de execução (dias)', 'number', 'Datas e prazos'],
  ['termino', 'Término previsto', 'date', 'Datas e prazos'],
  ['vigencia', 'Vigência do contrato', 'date', 'Datas e prazos'],
  ['obs', 'Observações', 'area', 'Outros']
];
const FICHA_KEYS = FICHA.map(f => f[0]);
/* marcadores dos modelos → campo da ficha */
const MARCADORES = {
  processo:'num', objeto:'objeto', modalidade:'modalidade', setor:'setor', contratada:'contratada', cnpj:'cnpj', contrato:'contrato',
  fiscal:'fiscal', gestor:'gestor', dotacao:'dotacao', valor_inicial:'valorInicial', valor_atual:'valorAtual', medido:'medido', saldo:'saldo',
  assinatura:'assinatura', inicio:'inicio', prazo:'prazo', termino:'termino', vigencia:'vigencia', concorrencia:'licNum',
  necessidade:'necessidade', parcelamento:'parcelamento', contratada_endereco:'contratadaEnd', contratada_responsavel:'contratadaResp', pca_item:'pcaItem'
};
const MARC_ROTULO = { processo:'nº do processo', objeto:'objeto', modalidade:'modalidade', setor:'setor', contratada:'contratada', cnpj:'CNPJ', contrato:'nº do contrato',
  fiscal:'fiscal', gestor:'gestor', dotacao:'dotação', valor_inicial:'valor inicial', valor_atual:'valor atualizado', medido:'valor medido', saldo:'saldo',
  assinatura:'data de assinatura', inicio:'data de início', prazo:'prazo', termino:'término', vigencia:'vigência', data:'data', cidade:'cidade', ano:'ano',
  concorrencia:'nº da concorrência', secretaria_demandante:'secretaria demandante', autoridade_demandante:'autoridade da secretaria', cargo_autoridade_demandante:'cargo da autoridade', srp:'registro de preços', revit:'nº do REVIT', revit_inicio:'início do REVIT', revit_codigo:'código do REVIT', numint:'numeração interna',
  pca:'Plano de Contratações Anual', pca_item:'item do PCA', necessidade:'descrição da necessidade', parcelamento:'parcelamento do objeto', contratada_endereco:'endereço da contratada', contratada_responsavel:'responsável pela contratada' };

/* número por extenso (inteiros até 999.999) */
function extenso(n){
  n = Math.floor(Math.abs(+n)); if(!n) return 'zero';
  const U = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
  const D = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
  const C = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];
  const ate999 = x => { if(x === 100) return 'cem'; const c = Math.floor(x / 100), r = x % 100, p = []; if(c) p.push(C[c]); if(r){ if(r < 20) p.push(U[r]); else { const d = Math.floor(r / 10), u = r % 10; p.push(D[d] + (u ? ' e ' + U[u] : '')); } } return p.join(' e '); };
  if(n < 1000) return ate999(n);
  const mil = Math.floor(n / 1000), r = n % 1000;
  return (mil === 1 ? 'mil' : ate999(mil) + ' mil') + (r ? (r < 100 || r % 100 === 0 ? ' e ' : ' ') + ate999(r) : '');
}
function fichaBruta(p, k){
  const f = (p && p.ficha) || {};
  if(k === 'saldo' && !f.saldo){ const a = numBR(f.valorAtual || f.valorInicial), m = numBR(f.medido); if(a != null && m != null) return a - m; }
  if(k === 'valorAtual' && !f.valorAtual) return f.valorInicial || '';
  if(k === 'termino' && !f.termino && f.inicio && f.prazo) return somaDias(f.inicio, f.prazo);
  return f[k] == null ? '' : f[k];
}
function fichaValor(p, k){
  const def = FICHA.find(x => x[0] === k), v = fichaBruta(p, k);
  if(v === '' || v == null) return '';
  if(!def) return String(v);
  if(def[2] === 'money') return fmtBRL(v);
  if(def[2] === 'date') return dataBR(v);
  if(k === 'prazo'){ const n = parseInt(v, 10); return isNaN(n) ? String(v) : n + ' (' + extenso(n) + ') dias'; }
  return String(v);
}

/* ---------- REVIT: relatório de estudo de viabilidade técnica ----------
   Número: dia.mês.ano(2 dígitos).sequência do dia — com a data REAL de início do estudo */
const PALAVRA_SIGLA = { reforma:'REF', construcao:'CON', pavimentacao:'PAV', drenagem:'DRE', manutencao:'MAN', ampliacao:'AMP', recuperacao:'REC', requalificacao:'RQL', implantacao:'IMP',
  fornecimento:'FOR', aquisicao:'AQU', servico:'SER', servicos:'SER', locacao:'LOC', projeto:'PRJ', projetos:'PRJ', fiscalizacao:'FIS', urbanizacao:'URB', contencao:'CTN', restauracao:'RES', adequacao:'ADE', revitalizacao:'REV', limpeza:'LIM', elaboracao:'ELA' };
const GENERICAS = new Set(['contratacao', 'empresa', 'especializada', 'execucao', 'obra', 'obras', 'para', 'municipal', 'municipio', 'ilheus', 'engenharia']);
function siglaDoObjeto(obj){
  const pal = norm(obj || '').replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter(Boolean);
  let cab = '', i = 0;
  for(; i < pal.length; i++){ if(PALAVRA_SIGLA[pal[i]]){ cab = PALAVRA_SIGLA[pal[i]]; i++; break; } }
  if(!cab){ const p0 = pal.find(w => !CONECTIVOS.has(w) && !GENERICAS.has(w)); if(!p0) return ''; cab = p0.slice(0, 3).toUpperCase(); i = pal.indexOf(p0) + 1; }
  const ini = pal.slice(i).filter(w => !CONECTIVOS.has(w) && !GENERICAS.has(w) && !/^\d+$/.test(w)).slice(0, 3).map(w => w[0].toUpperCase()).join('');
  return ini ? cab + '-' + ini : cab;
}
const revitData = p => (p.ficha && p.ficha.revitInicio) || '';
function revitNumero(p){
  const iso = revitData(p); if(!iso) return '';
  const [y, m, d] = iso.split('-');
  return d + '.' + m + '.' + y.slice(2) + '.' + (p.ficha.revitSeq || 1);
}
function revitCodigo(p){
  const f = p.ficha || {}, t = f.tipoObj === 'Aditivo' ? 'A' : f.tipoObj === 'Licitação' ? 'L' : f.tipoObj ? 'P' : '';
  const partes = [];
  if(t) partes.push(t);
  if(t === 'A' && f.especie) partes.push(f.especie.slice(0, 3));
  else if(f.modCod) partes.push(f.modCod.slice(0, 2));
  if(f.srp === 'Sim') partes.push('SRP');
  const cod = partes.join('-'), sig = f.sigla || siglaDoObjeto(f.objeto);
  return [cod, sig].filter(Boolean).join(' · ');
}
const revitTexto = p => revitNumero(p) ? 'REVIT N. ' + revitNumero(p) + (revitCodigo(p) ? ' · ' + revitCodigo(p) : '') : '';
/* sequência do dia: menor número ainda não usado por outro objeto com o mesmo início */
function revitSeqLivre(iso, exceto){
  const usados = new Set(DB.procs.filter(q => q !== exceto && q.ficha && q.ficha.revitInicio === iso).map(q => +q.ficha.revitSeq || 1));
  let n = 1; while(usados.has(n)) n++; return n;
}
const NOME_MOD = { CP:'Concorrência Pública', PE:'Pregão Eletrônico', PP:'Pregão Presencial', DL:'Dispensa de Licitação', IN:'Inexigibilidade' };

const chaveExtra = k => norm(k).replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
const MARC_ESPECIAIS = ['data', 'cidade', 'ano', 'assinante', 'cargo_assinante', 'numint'];
function marcadorValor(p, k, o){
  if(k === 'data') return dataExtenso();
  if(k === 'cidade') return settings.cidade || '';
  if(k === 'ano') return String(new Date().getFullYear());
  if(k === 'numint') return (o && o.numint) || '';
  if(k === 'revit') return p ? revitNumero(p) : '';
  if(k === 'revit_inicio') return p && revitData(p) ? dataBR(revitData(p)) : '';
  if(k === 'revit_codigo') return p ? revitCodigo(p) : '';
  if(k === 'secretaria_demandante'){ const s = secretariaDoProc(p); return s ? s.nome : ''; }
  if(k === 'autoridade_demandante'){ const a = autoridadeDe(p); return a ? titleCase(a.nome) : ''; }
  if(k === 'cargo_autoridade_demandante'){ const a = autoridadeDe(p); return a ? a.cargo || '' : ''; }
  if(k === 'srp') return p && p.ficha ? p.ficha.srp || '' : '';
  if(k === 'pca') return pcaFrase(p);
  const campo = MARCADORES[k]; if(campo) return fichaValor(p, campo);
  const ex = ((p && p.ficha && p.ficha.extras) || []).find(e => chaveExtra(e.k) === k);
  return ex ? ex.v || '' : '';
}

/* ---------- signatários ---------- */
const pessoaPorId = id => (settings.signatarios || []).find(s => s.id === id) || null;
const autoridade = () => (settings.signatarios || []).find(s => s.autoridade) || null;
const pessoaLinha = s => s ? titleCase(s.nome) + (s.cargo ? ' — ' + s.cargo : '') : '';

/* ---------- modelos de documento (padrão MPI) ----------
   Uma linha = um parágrafo.
   "# " título · "= " identificação (caixa alta, abaixo do título) · "| " linha do bloco de cabeçalho
   "|+ " linha do bloco com espaço antes · "@data" local e data no alto (ofício) · "## " capítulo
   "> " citação · "---" nova página · [texto] campo para preencher · {{marcador}} dado da ficha
   Linhas com {{numint}} só aparecem no documento avulso; linhas com {{processo}} só no documento de processo.
   O fecho (local, data e assinatura) e a tarja entram sozinhos. */
const MODELOS_V = 4;
const MODELOS_PADRAO = () => [
  { id:'ci', grupo:'Comunicações', tipo:'ci', nome:'Comunicação interna', sig:'s2',
    texto:'# COMUNICAÇÃO INTERNA\n= SEINFRA N. {{numint}}\n| **De:** Secretaria Municipal de Infraestrutura e Defesa Civil\n| **Para:** [destinatário]\n| **Assunto:** [assunto]\n| **Referência:** Processo Administrativo nº {{processo}}\n[Texto da comunicação.]\nAtenciosamente,' },
  { id:'of', grupo:'Comunicações', tipo:'of', nome:'Ofício', sig:'autoridade',
    texto:'# OFÍCIO\n= SEINFRA N. {{numint}}\n@data\n| A Sua Senhoria o(a) Senhor(a)\n| [NOME DO DESTINATÁRIO]\n| [Cargo]\n| [Órgão] – [Cidade-UF]\n|+ **Assunto:** [assunto]\n| **Referência:** Processo Administrativo nº {{processo}}\nSenhor(a) [cargo],\n[Texto do ofício.]\nAtenciosamente,' },
  { id:'nt', grupo:'Comunicações', tipo:'nt', nome:'Nota técnica', sig:'s2',
    texto:'# NOTA TÉCNICA Nº [000]/{{ano}}\n= SEINFRA N. {{numint}}\n| **Assunto:** [assunto]\n| **Interessada:** {{contratada}}\n| **Referência:** Processo Administrativo nº {{processo}}\n## 1. Objetivo\n1.1 [Objetivo desta nota técnica.]\n## 2. Histórico\n2.1 O Contrato nº {{contrato}}, firmado com a empresa {{contratada}}, tem valor de {{valor_atual}} e prazo de execução de {{prazo}}.\n2.2 [Histórico do pedido.]\n## 3. Análise\n3.1 [Análise técnica.]\n## 4. Conclusão\n4.1 [Conclusão.]' },
  { id:'lct01', grupo:'Despachos', tipo:'desp', nome:'LCT.01 · Despacho — responsáveis pelo DFD e pelo ETP', sig:'autoridade',
    texto:'# DESPACHO\n| **Interessado:** Superintendência de Projetos e Fiscalização\n| **Assunto:** Responsáveis técnicos pelo DFD e pelo ETP\n| **Referência:** Processo Administrativo nº {{processo}}\nConsiderando o Documento de Formalização da Demanda (DFD) juntado às fls. [__], que registra a necessidade de {{objeto}}, aprovo a demanda apresentada.\nConfirmo o servidor [nome do servidor], [cargo], matrícula nº [000000], como responsável pela elaboração do DFD, e designo o servidor [nome do servidor], [cargo], [registro profissional], como responsável técnico pela elaboração do Estudo Técnico Preliminar (ETP), nos termos do art. 18 da Lei nº 14.133, de 1º de abril de 2021.\nEncaminhe-se à Superintendência de Projetos e Fiscalização para as providências cabíveis.' },
  { id:'desp-rec', grupo:'Despachos', tipo:'desp', nome:'Despacho de recebimento', sig:'s1',
    texto:'# DESPACHO\n| **Referência:** Processo Administrativo nº {{processo}}\nRecebido nesta data. De ordem do Superintendente de Projetos e Fiscalização, [providência].' },
  { id:'desp-rem', grupo:'Despachos', tipo:'desp', nome:'Despacho de remessa', sig:'s1',
    texto:'# DESPACHO\n| **Referência:** Processo Administrativo nº {{processo}}\nDe ordem do Superintendente de Projetos e Fiscalização, encaminhe-se o presente processo à [setor de destino], para [finalidade].' },
  { id:'desp-jun', grupo:'Despachos', tipo:'desp', nome:'Despacho de juntada', sig:'s1',
    texto:'# DESPACHO\n| **Referência:** Processo Administrativo nº {{processo}}\nJunte-se aos autos [documento], referente a {{objeto}}. Após, encaminhe-se à [setor] para prosseguimento.' },
  { id:'dfd', grupo:'Planejamento da contratação', tipo:'dfd', nome:'DFD', sig:'autoridade',
    texto:'# DOCUMENTO DE FORMALIZAÇÃO DA DEMANDA (DFD)\n| **Objeto:** {{objeto}}\n| **Referência:** Processo Administrativo nº {{processo}}\n## 1. Identificação da Área Requisitante\n1.1 Órgão: Secretaria de Infraestrutura e Defesa Civil – SEINFRA.\n1.2 Setor requisitante: {{setor}}.\n1.3 Responsável pela demanda: [nome do servidor], matrícula nº [000000].\n## 2. Objeto\n2.1 Contratação de empresa especializada para {{objeto}}.\n## 3. Justificativa da Necessidade\n3.1 [Justificativa da necessidade da contratação.]\n## 4. Quantidade e Previsão\n4.1 [Quantidades estimadas e data pretendida.]\n## 5. Valor Estimado\n5.1 Valor estimado: {{valor_inicial}}.\n## 6. Plano de Contratações Anual\n6.1 [Vinculação ao PCA.]\n## 7. Dotação Orçamentária\n7.1 {{dotacao}}\n## 8. Estudo de Viabilidade Técnica\n8.1 O presente DFD marca a conclusão do Relatório de Estudo de Viabilidade Técnica (REVIT N. {{revit}}), iniciado em {{revit_inicio}}.' },
  { id:'etp', grupo:'Planejamento da contratação', tipo:'etp', nome:'ETP', sig:'s2',
    texto:'# ESTUDO TÉCNICO PRELIMINAR (ETP)\n| **Objeto:** {{objeto}}\n| **Responsável técnico:** [nome], [cargo], [registro profissional]\n| **Referência:** Processo Administrativo nº {{processo}}\n## 1. Descrição da Necessidade\n1.1 [Necessidade a ser atendida.]\n## 2. Previsão no Plano de Contratações Anual\n2.1 [Previsão no PCA.]\n## 3. Requisitos da Contratação\n3.1 [Requisitos.]\n## 4. Estimativa das Quantidades\n4.1 [Quantidades e memória de cálculo.]\n## 5. Levantamento de Mercado\n5.1 [Alternativas analisadas.]\n## 6. Estimativa do Valor\n6.1 Valor estimado: {{valor_inicial}}.\n## 7. Descrição da Solução como um Todo\n7.1 [Solução.]\n## 8. Justificativa para o Parcelamento ou Não\n8.1 [Parcelamento.]\n## 9. Resultados Pretendidos\n9.1 [Resultados.]\n## 10. Providências Prévias\n10.1 [Providências.]\n## 11. Contratações Correlatas e Interdependentes\n11.1 [Contratações correlatas.]\n## 12. Impactos Ambientais\n12.1 [Impactos e medidas mitigadoras.]\n## 13. Viabilidade da Contratação\n13.1 [Posicionamento conclusivo.]' },
  { id:'pb', grupo:'Planejamento da contratação', tipo:'pb', nome:'Projeto básico', sig:'s2',
    texto:'# PROJETO BÁSICO\n| **Objeto:** {{objeto}}\n| **Regime de execução:** [regime]\n| **Referência:** Processo Administrativo nº {{processo}}\n## 1. Objeto\n1.1 Contratação de empresa especializada em engenharia para {{objeto}}, no âmbito do REVIT N. {{revit}}, iniciado em {{revit_inicio}}.\n## 2. Justificativa\n2.1 [Justificativa.]\n## 3. Descrição dos Serviços\n3.1 [Descrição conforme memorial descritivo e planilha.]\n## 4. Prazo de Execução\n4.1 O prazo de execução é de {{prazo}}, contados da ordem de serviço.\n## 5. Valor Estimado\n5.1 O valor estimado é de {{valor_inicial}}.\n## 6. Qualificação Técnica\n6.1 [Exigências de qualificação técnica.]\n## 7. Medição e Pagamento\n7.1 [Critérios de medição e pagamento.]\n## 8. Fiscalização\n8.1 [Fiscalização.]\n## 9. Obrigações das Partes\n9.1 [Obrigações.]' },
  { id:'tr', grupo:'Planejamento da contratação', tipo:'tr', nome:'Termo de referência', sig:'s2',
    texto:'# TERMO DE REFERÊNCIA\n| **Objeto:** {{objeto}}\n| **Referência:** Processo Administrativo nº {{processo}}\n## 1. Definição do Objeto\n1.1 {{objeto}}.\n## 2. Fundamentação da Contratação\n2.1 [Fundamentação.]\n## 3. Descrição da Solução\n3.1 [Solução.]\n## 4. Requisitos da Contratação\n4.1 [Requisitos.]\n## 5. Modelo de Execução\n5.1 [Execução.]\n## 6. Modelo de Gestão do Contrato\n6.1 [Gestão e fiscalização.]\n## 7. Critérios de Medição e Pagamento\n7.1 [Medição e pagamento.]\n## 8. Seleção do Fornecedor\n8.1 Modalidade: {{modalidade}}.\n## 9. Estimativa do Valor\n9.1 Valor estimado: {{valor_inicial}}.\n## 10. Adequação Orçamentária\n10.1 {{dotacao}}' },
  { id:'livre', grupo:'Outros', tipo:'livre', nome:'Texto livre (MPI organiza)', sig:'s2', texto:'# [TÍTULO]\n[Texto.]' },
  { id:'anexo', grupo:'Outros', tipo:'anexo', nome:'Anexo em texto (sem assinatura)', sig:null, texto:'# [TÍTULO DO ANEXO]\n[Texto.]' }
];
const modelos = () => settings.modelos && settings.modelosV === MODELOS_V ? settings.modelos : MODELOS_PADRAO();
const GRUPOS_MODELO = ['Comunicações', 'Despachos', 'Planejamento da contratação', 'Outros'];
const TIPO_NOME = { ci:'Comunicação interna', of:'Ofício', nt:'Nota técnica', desp:'Despacho', dfd:'DFD', etp:'ETP', pb:'Projeto básico', tr:'Termo de referência', livre:'Texto', anexo:'Anexo', capa:'Folha-marcador', sol:'Solicitação de demanda', decl:'Declaração de vantajosidade' };
const tipoDoc = d => d.tipo || ((modelos().find(m => m.id === d.modelo) || {}).tipo) || (d.modelo && /^desp/.test(d.modelo) ? 'desp' : 'livre');

function tplParaHTML(texto, p, o){
  o = o || {};
  const avulso = !!o.avulso;
  const linhas = String(texto || '').replace(/\r/g, '').split('\n').filter(l => avulso ? !/\{\{\s*processo\s*\}\}/.test(l) : !/\{\{\s*numint\s*\}\}/.test(l));
  const inl = s => esc(s)
    .replace(/\[([^\]\n]{1,80})\]/g, (m, t) => `<span class="campo">[${t}]</span>`)
    .replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/g, (m, k) => { const v = marcadorValor(p, k, o); return v ? `<span class="fc" data-f="${k}">${esc(v)}</span>` : `<span class="fc vazio" data-f="${k}">[${esc(MARC_ROTULO[k] || k.replace(/_/g, ' '))}]</span>`; })
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  const out = [];
  for(const l of linhas){
    const t = l.trim();
    if(!t) continue;
    if(t === '---') out.push('<hr class="qp">');
    else if(t === '@data') out.push('<p class="dt"></p>');
    else if(t.startsWith('## ')) out.push('<h2>' + inl(t.slice(3)) + '</h2>');
    else if(t.startsWith('# ')) out.push('<h1>' + inl(t.slice(2)) + '</h1>');
    else if(t.startsWith('= ')) out.push('<p class="id">' + inl(t.slice(2)) + '</p>');
    else if(t.startsWith('|+ ')) out.push('<p class="bl sep">' + inl(t.slice(3)) + '</p>');
    else if(t.startsWith('| ')) out.push('<p class="bl">' + inl(t.slice(2)) + '</p>');
    else if(t.startsWith('> ')) out.push('<blockquote><p>' + inl(t.slice(2)) + '</p></blockquote>');
    else out.push('<p>' + inl(t) + '</p>');
  }
  return out.join('') || '<p><br></p>';
}
/* ficha mudou → atualiza os campos {{…}} dos textos que ainda têm o valor antigo */
function replicarFicha(p, antes, docs){
  const velho = { ficha:antes || {} };
  let mudou = 0;
  for(const d of (docs || p.docs)){
    if(d.kind !== 'texto' || !d.html || d.html.indexOf('data-f=') < 0) continue;
    const box = document.createElement('div'); box.innerHTML = d.html;
    let alt = false;
    box.querySelectorAll('span.fc[data-f]').forEach(sp => {
      const k = sp.dataset.f; if(MARC_ESPECIAIS.includes(k)) return;
      const antigo = marcadorValor(velho, k), novo = marcadorValor(p, k), atual = sp.textContent;
      if(atual !== antigo && !sp.classList.contains('vazio')) return;
      if(!novo && sp.classList.contains('vazio')) return;
      if(atual === novo) return;
      if(novo){ sp.textContent = novo; sp.classList.remove('vazio'); }
      else { sp.textContent = '[' + (MARC_ROTULO[k] || k) + ']'; sp.classList.add('vazio'); }
      alt = true;
    });
    if(alt){ d.html = box.innerHTML; d.pags = null; mudou++; }
  }
  return mudou;
}

/* ---------- tarja (pé de todas as folhas) ---------- */
function tarjaRuns(d, p){
  const s = d.sig || {}, pes = s.pessoa ? pessoaPorId(s.pessoa) : null;
  if(!pes || s.sem) return null;
  const runs = [{ t:'Signatário: ' }, { t:titleCase(pes.nome), b:true }];
  if(pes.cargo) runs.push({ t:' (' + pes.cargo + ')' });
  if(s.modo === 'fisica') runs.push({ t:', ' + dataExtenso(s.data || hojeISO()) });   /* data só na assinatura física */
  const q = procDaTarja(d, p);
  if(q && q.ficha && q.ficha.num){
    const tipo = tipoDoc(d);
    runs.push({ t:' · ' + (tipo === 'desp' ? 'Expedido nos autos do ' : tipo === 'dfd' ? 'Documento integrante do ' : 'Documento vinculado ao ') }, { t:'Processo Administrativo nº ' + q.ficha.num, b:true });
  }
  if(s.revit && q && revitTexto(q)) runs.push({ t:' · ' + revitTexto(q) + (tipoDoc(d) === 'dfd' && revitData(q) ? ', iniciado em ' + dataBR(revitData(q)) : '') });
  runs.push({ t:'.' });
  return runs;
}
/* processo citado na tarja: o escolhido na hora, o do próprio documento, ou nenhum */
function procDaTarja(d, p){
  const s = d.sig || {};
  if(s.vinculo === false || s.vinculo === 'nenhum') return null;
  if(typeof s.vinculo === 'string'){ const q = procPorId(s.vinculo); if(q) return q; }
  return p && !p.avulsa && !p.avdoc ? p : null;
}
function novoSig(pessoa, extra){ return Object.assign({ pessoa: pessoa || null, data:null, modo:'eletronica', vinculo:true, revit:false, sem:false }, extra || {}); }
function sigDoModelo(m){
  const id = m && m.sig === 'autoridade' ? (autoridade() || {}).id : m && m.sig;
  return novoSig(id && pessoaPorId(id) ? id : null, { sem: !!(m && m.tipo === 'anexo') });
}

/* ---------- estado ---------- */
let DB = null;   /* { v, procs:[], ui:{}, numint:{} } */
const novoProc = (extra) => Object.assign({ id:uid(), created:Date.now(), updated:Date.now(), cat:'diversos', status:'Em elaboração', fls0:1,
  ficha:{ extras:[] }, docs:[], tram:[], notas:[] }, extra || {});
function procAvulsa(){
  let p = DB.procs.find(x => x.avulsa);
  if(!p){ p = novoProc({ id:'avulsa', avulsa:true, ficha:{ num:'', objeto:'', extras:[] } }); DB.procs.push(p); }
  if(p.ficha.objeto === 'Mesa avulsa') p.ficha.objeto = '';
  return p;
}
const procPorId = id => DB.procs.find(p => p.id === id) || null;
const procsReais = () => DB.procs.filter(p => !p.avulsa && !p.avdoc);
const avulsosDoc = tipo => DB.procs.filter(p => p.avdoc && (!tipo || p.tipoAv === tipo));
const tituloProc = p => p.avulsa ? 'PDFs soltos' : p.avdoc ? (TIPO_NOME[p.tipoAv] || 'Documento') + (p.numint ? ' · ' + p.numint : '') : (p.ficha.num ? 'Processo ' + p.ficha.num : 'Processo sem número');
const objetoProc = p => p.avulsa ? 'PDFs e textos sem processo' : p.avdoc ? (p.ficha.objeto || 'Sem rótulo') : (p.ficha.objeto || 'Objeto não informado');
const touch = p => { if(p) p.updated = Date.now(); };
let _svT = null, DB_ERRO = false;
function saveDB(now){
  clearTimeout(_svT);
  if(DB_ERRO || !DB) return;
  const run = () => kvSet('db', DB);
  if(now) return run();
  _svT = setTimeout(run, 350);
}
function guardarAgora(){ try{ if(typeof salvarTudo === 'function') salvarTudo(); }catch(e){} if(DB && !DB_ERRO) kvSet('db', DB); }
window.addEventListener('pagehide', guardarAgora);
document.addEventListener('visibilitychange', () => { if(document.hidden) guardarAgora(); });

/* ---------- fixados e últimos ---------- */
function uiLista(k){ DB.ui = DB.ui || {}; if(!Array.isArray(DB.ui[k])) DB.ui[k] = []; DB.ui[k] = DB.ui[k].filter(id => procPorId(id)); return DB.ui[k]; }
const fixados = () => uiLista('fix').map(procPorId).filter(Boolean);
const estaFixado = p => uiLista('fix').includes(p.id);
function fixar(p, sim){ const L = uiLista('fix'); const i = L.indexOf(p.id); if(sim && i < 0) L.unshift(p.id); if(!sim && i >= 0) L.splice(i, 1); saveDB(); }
function moverFixado(p, dir){ const L = uiLista('fix'), i = L.indexOf(p.id), j = i + dir; if(i < 0 || j < 0 || j >= L.length) return; L.splice(i, 1); L.splice(j, 0, p.id); saveDB(); }
function marcarUltimo(p){ if(!p || p.avulsa) return; const L = uiLista('ult'); const i = L.indexOf(p.id); if(i >= 0) L.splice(i, 1); L.unshift(p.id); if(L.length > 5) L.length = 5; }
const ultimos = () => uiLista('ult').map(procPorId).filter(p => p && !estaFixado(p));

/* ---------- numeração interna dos avulsos: SEINFRA N. 001.26.09.2026 ---------- */
function numsDoDia(iso){ DB.numint = DB.numint || {}; return DB.numint[iso] || []; }
function seqLivre(iso){ const u = new Set(numsDoDia(iso).map(x => x.seq)); let n = 1; while(u.has(n)) n++; return n; }
function numintTexto(seq, iso){ const [y, m, d] = iso.split('-'); return String(seq).padStart(3, '0') + '.' + d + '.' + m + '.' + y; }
function reservarNum(seq, iso, tipo, rot){ DB.numint = DB.numint || {}; const L = DB.numint[iso] = DB.numint[iso] || []; if(!L.some(x => x.seq === seq)) L.push({ seq, tipo, rot:rot || '', hora:Date.now() }); }
function liberarNum(numint){
  const m = /^(\d{3})\.(\d{2})\.(\d{2})\.(\d{4})$/.exec(numint || ''); if(!m) return;
  const iso = m[4] + '-' + m[3] + '-' + m[2]; if(!DB.numint || !DB.numint[iso]) return;
  DB.numint[iso] = DB.numint[iso].filter(x => x.seq !== +m[1]);
}

/* ---------- anexos: acompanham o documento principal ---------- */
function ordenarAnexos(p){
  const principais = p.docs.filter(d => !d.pai || !p.docs.some(x => x.id === d.pai));
  const out = [];
  for(const d of principais){ out.push(d); p.docs.filter(x => x.pai === d.id).forEach(a => out.push(a)); }
  p.docs.splice(0, p.docs.length, ...out);
}
const anexosDe = (p, d) => p.docs.filter(x => x.pai === d.id);
function numeracaoLinha(p){
  const out = {}; let n = 0;
  for(const d of p.docs){
    if(!d.linha) continue;
    if(d.pai && out[d.pai]){ const pai = out[d.pai]; pai.k = (pai.k || 0) + 1; out[d.id] = { n:pai.n + '.' + pai.k }; }
    else { n++; out[d.id] = { n:String(n) }; }
  }
  return out;
}

function seedDB(){
  const p = novoProc({ cat:'aditivos', status:'Tramitando',
    ficha:{ num:'0000.2026', objeto:'Pavimentação e drenagem do bairro Exemplo – aditivo de prazo (exemplo)', modalidade:'Concorrência Eletrônica', setor:'Superintendência de Projetos e Fiscalização',
      contratada:'Construtora Exemplo Ltda.', cnpj:'00.000.000/0001-00', contrato:'000/2026', fiscal:'', valorInicial:'1850000', valorAtual:'', medido:'1147000',
      assinatura:'2026-02-10', inicio:'2026-03-02', prazo:'180', vigencia:'2027-02-10', tipoObj:'Aditivo', especie:'PRZ – Prazo', revitInicio:hojeISO(), revitSeq:1, extras:[] } });
  const nt = tplParaHTML('# NOTA TÉCNICA Nº 000/2026\n| **Assunto:** Pedido de prorrogação de prazo – Contrato nº {{contrato}}\n| **Interessada:** {{contratada}}\n| **Referência:** Processo Administrativo nº {{processo}}\n## 1. Objetivo\n1.1 Esta nota analisa o pedido de prorrogação de prazo apresentado pela contratada {{contratada}}, referente ao Contrato nº {{contrato}}.\n## 2. Histórico\n2.1 O contrato foi assinado com prazo de execução de {{prazo}}, contados da ordem de serviço.\n2.2 Durante a execução, a fiscalização registrou em diário de obra 23 dias de chuva com paralisação total dos serviços de terraplenagem.\n## 3. Análise\n3.1 As paralisações por chuva estão comprovadas pelos registros do diário de obra e caracterizam fato alheio à vontade das partes.\n3.2 O saldo contratual de {{saldo}} permanece compatível com o novo prazo proposto.\n## 4. Conclusão\n4.1 Do ponto de vista técnico, o pedido de prorrogação de 90 (noventa) dias é procedente.', p);
  p.docs.push({ id:uid(), kind:'texto', nome:'Nota técnica 000/2026', modelo:'nt', tipo:'nt', sig:novoSig('s2'), html:nt, bras:'todas', linha:true, repo:false, criado:Date.now(), mpi:true });
  const rem = MODELOS_PADRAO().find(m => m.id === 'desp-rem');
  p.docs.push({ id:uid(), kind:'texto', nome:'Despacho de remessa', modelo:'desp-rem', tipo:'desp', sig:novoSig('s1'), html:tplParaHTML(rem.texto, p), bras:'todas', linha:true, repo:false, criado:Date.now(), mpi:true });
  p.tram.push({ id:uid(), setor:'Superintendência de Projetos e Fiscalização', chegada:somaDias(hojeISO(), -6), saida:somaDias(hojeISO(), -1), acao:'Analisar pedido de aditivo de prazo' });
  p.tram.push({ id:uid(), setor:'Procuradoria-Geral do Município', chegada:somaDias(hojeISO(), -1), saida:'', acao:'Parecer jurídico sobre o aditivo' });
  p.notas.push({ id:uid(), tipo:'pend', t:'Juntar cronograma físico-financeiro revisado', resp:'Contratada', prazo:somaDias(hojeISO(), 5), ok:false, criado:Date.now() });
  p.notas.push({ id:uid(), tipo:'def', t:'Aditivo só de prazo, sem alteração de valor', resp:'', ok:false, criado:Date.now() });
  return { v:4, procs:[p], ui:{ tab:'procs', fix:[p.id], ult:[] }, numint:{} };
}

/* ---------- migração: documentos do padrão antigo (Proc.Ios) para o padrão MPI ---------- */
function migrarDoc(d){
  if(d.kind !== 'texto') return;
  if(typeof d.sig === 'string' || !d.sig) d.sig = novoSig(typeof d.sig === 'string' && pessoaPorId(d.sig) ? d.sig : null);
  if(!d.tipo) d.tipo = tipoDoc(d);
  if(d.mpi) return;
  d.mpi = true;
  if(!d.html) return;
  const box = document.createElement('div'); box.innerHTML = d.html;
  const els = Array.from(box.children).filter(e => e.textContent.trim());
  if(!els.length) return;
  /* fecho antigo: [cidade, data] + nome + cargo → sai do texto (agora é automático) */
  const nomes = (settings.signatarios || []).map(s => norm(s.nome));
  const ult = els.slice(-3);
  const ehNome = e => e.querySelector('[data-f="assinante"]') || nomes.includes(norm(e.textContent.trim()));
  const ehCargo = e => e.querySelector('[data-f="cargo_assinante"]') || (settings.signatarios || []).some(s => s.cargo && norm(e.textContent).startsWith(norm(s.cargo)));
  const ehLocal = e => e.querySelector('[data-f="cidade"]') || /^ilh[eé]us\b.*\d{4}\.?$/i.test(e.textContent.trim());
  if(ult.length >= 2 && ehNome(ult[ult.length - 2]) && ehCargo(ult[ult.length - 1])){
    const nomeTxt = norm(ult[ult.length - 2].textContent.trim()); const achou = (settings.signatarios || []).find(s => norm(s.nome) === nomeTxt);
    if(achou && !d.sig.pessoa) d.sig.pessoa = achou.id;
    ult[ult.length - 1].remove(); ult[ult.length - 2].remove();
    if(ult.length === 3 && ehLocal(ult[0])) ult[0].remove();
  }
  const resto = Array.from(box.children).filter(e => e.textContent.trim());
  /* 1ª linha → título; 2ª linha curta em caixa alta → identificação */
  if(!box.querySelector('h1') && resto[0] && resto[0].tagName === 'P' && !resto[0].className){
    const h = document.createElement('h1'); h.innerHTML = resto[0].innerHTML; resto[0].replaceWith(h);
    const r1 = resto[1];
    if(r1 && r1.tagName === 'P' && !r1.className && r1.textContent.trim().length < 140 && r1.textContent === r1.textContent.toLocaleUpperCase('pt-BR')) r1.classList.add('id');
  }
  d.html = box.innerHTML; d.pags = null;
}
function migrarDB(){
  if(!DB) return;
  DB.ui = DB.ui || {}; DB.numint = DB.numint || {};
  if(!Array.isArray(DB.ui.fix)) DB.ui.fix = [];
  if(!Array.isArray(DB.ui.ult)) DB.ui.ult = [];
  for(const p of DB.procs){
    for(const d of p.docs) migrarDoc(d);
    if(!p.avulsa && !p.avdoc && p.ficha && !p.ficha.revitInicio && (DB.v || 3) < 4){ /* sem data inventada: fica em branco até você informar */ }
  }
  DB.v = 4;
}

/* ---------- arquivos (PDF) no aparelho ----------
   doc pdf = { id, kind:'pdf', nome, fileId, pages, pl:[{s,r,b,d}], sz:[[w,h,rot]] }
   s: página do original (-1 = em branco) · r: giro extra · b: brasão · d: retirada */
const BYTES = new Map();
async function bytesDe(fileId){
  if(BYTES.has(fileId)){ const v = BYTES.get(fileId); BYTES.delete(fileId); BYTES.set(fileId, v); return v; }
  const rec = await idbDo('files', 'readonly', st => st.get(fileId));
  if(!rec) return null;
  const b = rec.bytes instanceof Uint8Array ? rec.bytes : new Uint8Array(rec.bytes);
  BYTES.set(fileId, b);
  while(BYTES.size > 8){ const k = BYTES.keys().next().value; BYTES.delete(k); }
  return b;
}
async function guardarBytes(bytes, name, id){
  id = id || uid();
  const r = await idbDo('files', 'readwrite', st => st.put({ id, name, bytes }));
  if(r === undefined) throw new Error('Sem espaço ou sem permissão para guardar arquivos neste aparelho.');
  BYTES.set(id, bytes);
  return id;
}
const fileEmUso = (fileId, exceto) => DB.procs.some(q => q.docs.some(x => x !== exceto && x.kind === 'pdf' && x.fileId === fileId));
const apagarBytes = id => { BYTES.delete(id); dropPdf(id); return idbDo('files', 'readwrite', st => st.delete(id)); };
async function medirPdf(bytes){
  const pdf = await PDFLib.PDFDocument.load(bytes, { ignoreEncryption:true, updateMetadata:false });
  return pdf.getPages().map(pg => { let s; try{ s = pg.getCropBox(); }catch(e){ s = pg.getSize(); } if(!s || !s.width) s = pg.getSize(); return [Math.round(s.width * 10) / 10, Math.round(s.height * 10) / 10, ((pg.getRotation().angle || 0) % 360 + 360) % 360]; });
}
async function novoDocPdf(p, name, bytes, onde){
  const sz = await medirPdf(bytes);
  const fileId = await guardarBytes(bytes, name);
  const d = { id:uid(), kind:'pdf', nome:String(name || 'Arquivo').replace(/\.(pdf|jpe?g|png|webp|heic|gif|bmp)$/i, ''), fileId, pages:sz.length,
    pl:sz.map((_, i) => ({ s:i, r:0, b:false, d:false })), sz, linha: onde !== 'repo', repo: onde === 'repo' || onde === 'ambos', criado:Date.now() };
  p.docs.push(d); touch(p);
  return d;
}
const vivas = d => d.kind === 'pdf' ? d.pl.filter(e => !e.d) : [];
function tamanhoPagina(d, e){
  if(e.s < 0) return [PAG.retrato.W, PAG.retrato.H];
  const z = (d.sz && d.sz[e.s]) || [PAG.retrato.W, PAG.retrato.H, 0];
  const rot = ((z[2] || 0) + (e.r || 0)) % 360;
  return rot === 90 || rot === 270 ? [z[1], z[0]] : [z[0], z[1]];
}
/* nº de páginas de cada documento (textos: diagramação real do PDF) */
function paginasDoc(d){ return d.kind === 'pdf' ? vivas(d).length : (d.pags || 1); }
function folhas(p){
  const out = {}; let n = parseInt(p.fls0, 10) || 1;
  for(const d of p.docs){ if(!d.linha) continue; const k = paginasDoc(d); out[d.id] = { ini:n, fim:n + k - 1, k }; n += k; }
  /* k = 0: documento sem páginas (todas retiradas) */
  out._total = n - (parseInt(p.fls0, 10) || 1);
  return out;
}
/* local e situação atual (tramitação) */
function ondeEsta(p){ const t = p.tram[p.tram.length - 1]; return t ? t.setor : ''; }
function tramAtual(p){ return p.tram[p.tram.length - 1] || null; }
const pendAbertas = p => p.notas.filter(n => n.tipo === 'pend' && !n.ok);

/* ---------- importação do Proc.Ios 2 (mesmo endereço) ---------- */
async function importarV2(){
  let st = null;
  if(DB && DB.importouV2) return 0;
  try{ st = JSON.parse(localStorage.getItem('procios.state') || 'null'); }catch(e){}
  if(!st || !Array.isArray(st.procs) || !st.procs.length) return 0;
  let arquivos = [];
  try{
    arquivos = await new Promise(res => {
      const r = indexedDB.open('procios', 1);
      r.onupgradeneeded = () => { r.transaction.abort(); res([]); };
      r.onsuccess = () => { try{ const q = r.result.transaction('files', 'readonly').objectStore('files').getAll(); q.onsuccess = () => res(q.result || []); q.onerror = () => res([]); }catch(e){ res([]); } };
      r.onerror = () => res([]);
    });
  }catch(e){ arquivos = []; }
  const porId = {}; arquivos.forEach(f => porId[f.id] = f);
  const n = await converterV2(st, async id => porId[id] ? { name:porId[id].name, bytes:porId[id].bytes, pl:porId[id].pl } : null);
  if(n) DB.importouV2 = true;
  return n;
}
/* converte processos do Proc.Ios 2 (do aparelho ou de um backup) */
async function converterV2(st, arquivo){
  let n = 0;
  for(const q of st.procs){
    const i = q.info || {};
    const p = novoProc({ cat:q.cat || 'diversos', ficha:{ num:i.num || '', objeto:i.objeto || i.title || '', modalidade:i.modalidade || '', contratada:i.contratada || '', contrato:i.contrato || '',
      fiscal:i.fiscal || '', valorInicial:i.inicial ? String(i.inicial) : '', medido:i.medido ? String(i.medido) : '', assinatura:i.assinatura || '', inicio:i.os || '', prazo:i.prazo ? String(i.prazo) : '', vigencia:i.vigencia || '', extras:[] } });
    for(const d of (q.docs || [])){
      if(d.html && d.html.replace(/<[^>]+>/g, '').trim()) p.docs.push({ id:uid(), kind:'texto', nome:titleOf(d.html), html:d.html, bras:d.bras || 'todas', linha:true, repo:false, criado:Date.now() }); migrarDoc(p.docs[p.docs.length - 1]);
      for(const fid of (d.files || [])){
        const f = await arquivo(fid); if(!f || !f.bytes) continue;
        try{
          const bytes = f.bytes instanceof Uint8Array ? f.bytes : new Uint8Array(f.bytes);
          const nd = await novoDocPdf(p, f.name, bytes, 'linha');
          if(Array.isArray(f.pl) && f.pl.length) nd.pl = f.pl;
        }catch(e){}
      }
    }
    DB.procs.push(p); n++;
  }
  return n;
}
function titleOf(html){
  const d = document.createElement('div'); d.innerHTML = html || '';
  const el = Array.from(d.children).find(x => x.textContent.trim());
  const t = el ? el.textContent.split('\n')[0].trim() : '';
  if(!t) return 'Documento sem título';
  const c = t.toLocaleLowerCase('pt-BR');
  return (c.charAt(0).toLocaleUpperCase('pt-BR') + c.slice(1)).slice(0, 70);
}

/* recalcula o nº de páginas dos textos (relatório, ajustes, documento movido) */
async function recontar(p, forcar){
  if(!window.PDFLib) return false;
  let mudou = false;
  for(const d of p.docs){
    if(d.kind !== 'texto' || (!forcar && d.pags)) continue;
    try{ const r = await diagramarTexto(d.html || '', d); if(d.pags !== r.n){ d.pags = r.n; mudou = true; } }catch(e){}
  }
  if(mudou) saveDB();
  return mudou;
}

/* ===== d_ui.js ===== */
/* =====================================================================
   Folhas (sheets), menus, perguntas, arquivo pronto, prévia
   ===================================================================== */
const SHEETS = [];
function sheet(o){
  const bg = h('div', { class:'sh-bg' });
  const fechar = h('button', { class:'ib', 'aria-label':'Fechar', html:I.x });
  const corpo = h('div', { class:'shb' }, o.corpo || null);
  const el = h('div', { class:'sh' + (o.cheio ? ' cheio' : '') + (o.alerta ? ' alerta' : ''), role:o.alerta ? 'alertdialog' : 'dialog', 'aria-modal':'true', 'aria-label':o.titulo || '' },
    h('div', { class:'shh' }, h('h3', null, o.titulo || ''), o.cabExtra || null, fechar), corpo);
  const s = { el, corpo, fechado:false,
    fechar(v){ if(s.fechado) return; s.fechado = true; bg.remove(); el.remove(); const i = SHEETS.indexOf(s); if(i >= 0) SHEETS.splice(i, 1); if(o.aoFechar) o.aoFechar(v); },
    rodape(btns){
      const old = el.querySelector('.shf'); if(old) old.remove();
      if(!btns || !btns.length) return;
      el.append(h('div', { class:'shf' }, btns.filter(Boolean).map(b => h('button', { class:'btn ' + (b.v || ''), disabled:b.disabled, onclick:async () => { if(b.fn){ const r = await b.fn(s); if(r === false || b.fica) return; } s.fechar(); } }, b.ic ? h('span', { html:I[b.ic] }) : null, b.t))));
    }
  };
  fechar.onclick = () => s.fechar();
  if(!o.fixo) bg.onclick = () => s.fechar();
  s.rodape(o.botoes);
  $('sheets').append(bg, el); SHEETS.push(s);
  /* como no iPhone: puxar a folha para baixo pelo topo fecha */
  if(!o.alerta && !o.fixo && window.innerWidth < 720){
    const hd = el.querySelector('.shh'); let y0 = null, dy = 0;
    hd.addEventListener('pointerdown', e => { if(e.target.closest('button,input,select,textarea')) return; y0 = e.clientY; dy = 0; el.style.transition = 'none'; try{ hd.setPointerCapture(e.pointerId); }catch(err){} });
    hd.addEventListener('pointermove', e => { if(y0 == null) return; dy = Math.max(0, e.clientY - y0); el.style.transform = dy ? 'translateY(' + dy + 'px)' : ''; });
    const fim = () => { if(y0 == null) return; y0 = null; el.style.transition = 'transform .2s ease'; if(dy > 90){ el.style.transform = 'translateY(100%)'; setTimeout(() => s.fechar(), 180); } else el.style.transform = ''; };
    hd.addEventListener('pointerup', fim); hd.addEventListener('pointercancel', fim);
  }
  if(o.foco !== false) setTimeout(() => { const f = el.querySelector('[autofocus]'); if(f) f.focus(); }, 80);
  return s;
}
/* menu suspenso no estilo iOS, preso a um botão (o "+") */
function popMenu(ancora, itens, o = {}){
  const orig = itens, edit = !!(o.chave && typeof LAY !== 'undefined' && LAY.editando);
  if(o.chave && typeof personalizarMenu === 'function') itens = personalizarMenu(o.chave, itens);
  if(o.chave && typeof LAY !== 'undefined') LAY.reabrir = () => popMenu(ancora, orig, o);
  const r = ancora.getBoundingClientRect(), W = window.innerWidth, H = window.innerHeight;
  const bg = h('div', { class:'pm-bg' }), box = h('div', { class:'pm', role:'menu' });
  const reg = { fechar(){ if(reg.f) return; reg.f = true; bg.remove(); box.remove(); const i = SHEETS.indexOf(reg); if(i >= 0) SHEETS.splice(i, 1); if(o.aoFechar) o.aoFechar(); } };
  itens.forEach(it => {
    if(!it) return;
    if(it === '-'){ if(box.lastChild && !box.lastChild.classList.contains('pm-sep')) box.append(h('div', { class:'pm-sep' })); return; }
    box.append(h('button', { class:'pm-i' + (it.danger ? ' danger' : '') + (it.on ? ' on' : '') + (it.oculto ? ' oculto' : '') + (it.cls ? ' ' + it.cls : ''), role:'menuitem', disabled:it.off && !edit, onclick:() => { reg.fechar(); if(edit) editarItemMenu(o.chave, it, itens); else it.fn(); } },
      h('span', null, it.t + (it.oculto ? ' (escondido)' : ''), it.sub ? h('small', null, it.sub) : null), it.ic ? h('i', { html:I[it.ic] || '' }) : null));
  });
  if(edit) box.append(h('div', { class:'pm-sep' }), h('button', { class:'pm-i on', onclick:() => { reg.fechar(); adicionarItemMenu(o.chave); } }, h('span', null, '+ Adicionar item'), h('i', { html:I.plus })));
  bg.onclick = () => reg.fechar();
  [bg, box].forEach(x => x.addEventListener('pointerdown', ev => ev.preventDefault()));   // não tira o cursor do texto
  document.body.append(bg, box); SHEETS.push(reg);
  const bw = box.offsetWidth, bh = box.offsetHeight;
  let x = r.left + r.width / 2 > W / 2 ? r.right - bw : r.left; x = Math.max(8, Math.min(W - bw - 8, x));
  let y = r.top + r.height / 2 < H / 2 ? r.bottom + 6 : r.top - bh - 8; y = Math.max(8, Math.min(H - bh - 8, y));
  box.style.left = x + 'px'; box.style.top = y + 'px';
  return reg;
}
const fecharFolhaTopo = () => { const s = SHEETS[SHEETS.length - 1]; if(s){ s.fechar(); return true; } return false; };
function menu(titulo, itens, ancora){
  if(ancora && ancora.isConnected) return popMenu(ancora, itens);
  const s = sheet({ titulo, corpo:itens.filter(Boolean).map(it => {
    if(it === '-') return h('div', { class:'msep' });
    return h('button', { class:'mitem' + (it.danger ? ' danger' : ''), onclick:() => { s.fechar(); it.fn(); } },
      it.ic ? h('span', { html:I[it.ic] || '' }) : null, h('span', { class:'grow' }, it.t, it.sub ? h('small', null, it.sub) : null));
  }) });
  return s;
}
function confirmar(titulo, msg, rotulo, perigo){
  return new Promise(res => {
    let ok = false;
    sheet({ titulo, alerta:true, corpo:h('p', { style:{ margin:'0' } }, msg || ''), aoFechar:() => res(ok),
      botoes:[{ t:'Cancelar', v:'ghost' }, { t:rotulo || 'Confirmar', v:perigo ? 'danger' : 'pri', fn:() => { ok = true; } }] });
  });
}
function perguntar(titulo, rotulo, valor, ok, o = {}){
  return new Promise(res => {
    let out = null;
    const inp = o.area ? h('textarea', { class:'txa', autofocus:true }) : h('input', { class:'inp', type:o.tipo || 'text', autofocus:true, list:o.lista || null });
    inp.value = valor || '';
    const s = sheet({ titulo, alerta:true, corpo:[h('label', { class:'fld' }, h('span', null, rotulo), inp), o.dica ? h('p', { class:'muted', style:{ margin:0, fontSize:'13px' } }, o.dica) : null], aoFechar:() => res(out),
      botoes:[{ t:'Cancelar', v:'ghost' }, { t:ok || 'OK', v:'pri', fn:() => { out = inp.value.trim(); } }] });
    if(!o.area) inp.addEventListener('keydown', e => { if(e.key === 'Enter'){ out = inp.value.trim(); s.fechar(); } });
    setTimeout(() => { inp.focus(); if(inp.select) inp.select(); }, 90);
  });
}
function escolher(titulo, opcoes, atual){
  return new Promise(res => {
    let v = null;
    const s = sheet({ titulo, aoFechar:() => res(v), corpo:opcoes.map(o => h('button', { class:'mitem', onclick:() => { v = o[0]; s.fechar(); } },
      h('span', { class:'grow' }, o[1], o[2] ? h('small', null, o[2]) : null), o[0] === atual ? h('span', { html:I.check, style:{ color:'var(--accent)' } }) : null)) });
  });
}

/* ---------- arquivo pronto: compartilhar ou baixar ---------- */
const MIME = { pdf:'application/pdf', docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document', zip:'application/zip', txt:'text/plain', json:'application/json' };
async function offer(data, name, o = {}){
  const ext = (name.match(/\.([a-z0-9]+)$/i) || [, ''])[1].toLowerCase();
  const blob = data instanceof Blob ? data : new Blob([data], { type:MIME[ext] || 'application/octet-stream' });
  if(!PWA && window.claude && window.claude.use){
    const dl = await window.claude.use('downloads');
    if(!dl){ toast('Salvar arquivos não está disponível nesta visualização. Instale o app no celular para compartilhar.'); return; }
    try{ await dl.save({ filename:name, data:blob }); toast('Arquivo salvo.'); }
    catch(e){ if(e && e.code !== 'declined' && e.code !== 'cancelled') toast('O arquivo não foi salvo. Tente de novo.'); }
    return;
  }
  const file = new File([blob], name, { type:MIME[ext] || blob.type || 'application/octet-stream' });
  let pode = false;
  try{ pode = !!(navigator.canShare && navigator.canShare({ files:[file] })); }catch(e){}
  const baixar = () => { const a = h('a', { href:URL.createObjectURL(file), download:name }); document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000); toast('Arquivo baixado.'); };
  sheet({ titulo:'Arquivo pronto', corpo:[
    h('div', { class:'opt' }, h('span', { html:ext === 'docx' ? I.word : ext === 'zip' ? I.folder : I.pdf }), h('b', { class:'grow', style:{ overflowWrap:'anywhere' } }, name)),
    pode ? h('p', { class:'muted', style:{ margin:0, fontSize:'13px' } }, 'Compartilhar abre o menu do Android: WhatsApp, Gmail, Drive…') : null
  ], botoes:[
    pode ? { t:'Compartilhar', v:'acc', ic:'share', fn:async () => { try{ await navigator.share({ files:[file], title:name, text:o.texto || undefined }); }catch(e){ if(!e || e.name !== 'AbortError') toast('Não foi possível compartilhar. Use Baixar.'); } } } : null,
    { t:'Baixar', v:pode ? 'ghost' : 'pri', ic:'dl', fn:baixar }
  ] });
}
async function copiarTexto(t, ok){
  try{ await navigator.clipboard.writeText(t); toast(ok || 'Copiado.'); return true; }
  catch(e){
    const ta = h('textarea', { style:{ position:'fixed', opacity:'0' } }); ta.value = t; document.body.append(ta); ta.select();
    let r = false; try{ r = document.execCommand('copy'); }catch(err){}
    ta.remove();
    if(r){ toast(ok || 'Copiado.'); return true; }
    sheet({ titulo:'Copie o texto', corpo:h('textarea', { class:'txa', style:{ minHeight:'240px' }, readonly:true }, t) });
    return false;
  }
}

/* ---------- pdf.js ---------- */
const PDFJS = new Map();
function getPdf(key, bytes){
  const c = PDFJS.get(key);
  if(c && c.bytes === bytes) return c.p;
  if(c) c.p.then(d => d.destroy()).catch(() => {});
  const p = pdfjsLib.getDocument(Object.assign({ data:bytes.slice(), isEvalSupported:false }, window.PDFJS_OPTS || {})).promise;
  PDFJS.set(key, { bytes, p });
  if(PDFJS.size > 10){ for(const k of PDFJS.keys()){ if(k !== key){ PDFJS.get(k).p.then(d => d.destroy()).catch(() => {}); PDFJS.delete(k); break; } } }
  return p;
}
function dropPdf(key){ const c = PDFJS.get(key); if(c){ c.p.then(d => d.destroy()).catch(() => {}); PDFJS.delete(key); } }
function drawBrasOverlay(ctx, sc, VW){
  /* igual ao PDF gerado: só o brasão, centralizado no alto da página */
  const bw = 43, bh = 46.7, top = 14.17, cx = VW / 2;
  try{ ctx.drawImage(BRAS_IMG, (cx - bw / 2) * sc, top * sc, bw * sc, bh * sc); }catch(e){}
}
async function desenharPaginaPdf(cv, pdfDoc, e, cssW){
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  if(cv._task){ try{ cv._task.cancel(); }catch(err){} cv._task = null; }
  if(e.s < 0){
    const W = PAG.retrato.W, H = PAG.retrato.H, k = cssW * dpr / W;
    cv.width = Math.round(W * k); cv.height = Math.round(H * k);
    const ctx = cv.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
    if(e.b) drawBrasOverlay(ctx, k, W);
    return;
  }
  const pg = await pdfDoc.getPage(e.s + 1);
  const rot = ((pg.rotate + (e.r || 0)) % 360 + 360) % 360;
  const v1 = pg.getViewport({ scale:1, rotation:rot });
  const k = cssW * dpr / v1.width;
  const vp = pg.getViewport({ scale:k, rotation:rot });
  const off = document.createElement('canvas');
  off.width = Math.max(1, Math.floor(vp.width)); off.height = Math.max(1, Math.floor(vp.height));
  const octx = off.getContext('2d'); octx.fillStyle = '#fff'; octx.fillRect(0, 0, off.width, off.height);
  const task = pg.render({ canvasContext:octx, viewport:vp, canvas:off });
  cv._task = task;
  try{ await task.promise; }catch(err){ if(cv._task === task) cv._task = null; throw err; }
  if(cv._task === task) cv._task = null;
  if(e.b) drawBrasOverlay(octx, k, v1.width);
  cv.width = off.width; cv.height = off.height;
  cv.getContext('2d').drawImage(off, 0, 0);
}
const temPdfjs = () => !!window.pdfjsLib;
function precisaLibs(){
  if(!window.PDFLib || !window.JSZip){ toast('As ferramentas de PDF ainda estão carregando. Verifique a internet e tente de novo.'); return false; }
  return true;
}

/* ---------- prévia de um PDF gerado ---------- */
let PREV = null;
async function previa(bytes, nome){
  const eu = PREV = { bytes, nome };
  $('pvTit').textContent = nome.replace(/\.pdf$/i, '');
  const box = $('prevPages'); box.replaceChildren(h('div', { class:'muted', style:{ padding:'30px' } }, 'Abrindo…'));
  $('vPrev').hidden = false;
  if(!temPdfjs()){ box.replaceChildren(h('div', { class:'empty' }, 'A prévia precisa do leitor de PDF, que ainda está carregando.')); return; }
  try{
    const doc = await getPdf('prev', bytes);
    if(PREV !== eu) return;
    box.replaceChildren();
    for(let i = 1; i <= doc.numPages; i++){
      if(PREV !== eu) return;
      const cv = h('canvas'); box.append(cv);
      const pg = await doc.getPage(i), v = pg.getViewport({ scale:1 });
      const w = Math.min(window.innerWidth * 0.92, 760), k = w * Math.min(devicePixelRatio || 1, 2) / v.width, vp = pg.getViewport({ scale:k });
      cv.width = vp.width; cv.height = vp.height;
      await pg.render({ canvasContext:cv.getContext('2d'), viewport:vp }).promise;
    }
  }catch(e){ if(PREV === eu) box.replaceChildren(h('div', { class:'empty' }, 'Não foi possível mostrar a prévia.')); }
}
$('pvBack').onclick = () => { $('vPrev').hidden = true; dropPdf('prev'); PREV = null; };
$('pvSend').onclick = () => { if(PREV) offer(PREV.bytes, PREV.nome); };

/* ---------- entrada de arquivos (PDF, fotos, ZIP do WhatsApp) ---------- */
const RX_PDF = /\.pdf$/i, RX_IMG = /\.(jpe?g|png|webp|gif|bmp|heic)$/i;
async function expandirEntradas(list){
  const out = [];
  for(const file of list){
    const nm = file.name || 'arquivo';
    if(file.bytes && !(file instanceof Blob)){ if(file.tipo !== 'outro') out.push({ name:nm, bytes:file.bytes }); continue; }   /* já lido (triagem) */
    if(/\.zip$/i.test(nm) || /zip/.test(file.type || '')){
      try{
        const z = await JSZip.loadAsync(file);
        const ents = Object.values(z.files).filter(en => !en.dir && !/(^|\/)(__MACOSX|\.)/.test(en.name) && (RX_PDF.test(en.name) || RX_IMG.test(en.name)))
          .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { numeric:true }));
        if(!ents.length){ toast('Nenhum PDF ou foto dentro de ' + nm + '.'); continue; }
        const esc_ = ents.length > 1 ? await escolherDoZip(nm, ents) : ents;
        for(const en of esc_) out.push({ name:en.name.split('/').pop(), bytes:await en.async('uint8array') });
      }catch(e){ toast('Não foi possível abrir ' + nm + '.'); }
    } else if(RX_PDF.test(nm) || file.type === 'application/pdf' || RX_IMG.test(nm) || /^image\//.test(file.type || '')){
      let name = nm;
      if(!RX_PDF.test(name) && !RX_IMG.test(name)) name += file.type === 'application/pdf' ? '.pdf' : '.jpg';
      out.push({ name, bytes:new Uint8Array(await file.arrayBuffer()) });
    } else toast(nm + ': envie PDF, foto ou ZIP.');
  }
  return out;
}
function escolherDoZip(nome, ents){
  return new Promise(res => {
    let out = [];
    const boxes = ents.map(en => h('input', { type:'checkbox', checked:true }));
    const lista = ents.map((en, i) => h('label', { class:'zitem' }, boxes[i], h('span', { class:'grow' }, en.name.split('/').pop())));
    sheet({ titulo:'Arquivos do ZIP', corpo:[h('p', { class:'muted', style:{ margin:0 } }, nome + ' · ' + plural(ents.length, 'arquivo', 'arquivos')),
      h('div', { class:'row' }, h('button', { class:'btn sm soft', onclick:() => boxes.forEach(b => b.checked = true) }, 'Marcar todos'), h('button', { class:'btn sm soft', onclick:() => boxes.forEach(b => b.checked = false) }, 'Desmarcar')),
      h('div', null, lista)], aoFechar:() => res(out),
      botoes:[{ t:'Cancelar', v:'ghost' }, { t:'Incluir marcados', v:'pri', fn:() => { out = ents.filter((_, i) => boxes[i].checked); } }] });
  });
}
let _fileCb = null;
function escolherArquivos(cb){ _fileCb = cb; $('fileIn').click(); }
$('fileIn').onchange = e => { const l = [...e.target.files]; e.target.value = ''; if(l.length && _fileCb) _fileCb(l); };
/* inclui arquivos num processo; onde = 'linha' | 'repo' | 'ambos' ; depois = id do doc após o qual inserir */
async function incluirArquivos(p, list, onde, depois){
  if(!precisaLibs()) return [];
  const ents = await filtrarGrandes(await expandirEntradas(list));
  if(!ents.length) return [];
  const b = busy('Preparando arquivos…'), novos = [];
  try{
    for(const it of ents){
      b.txt('Lendo ' + it.name + '…');
      try{
        const bytes = RX_IMG.test(it.name) ? await PDFGen.imageToPdf(it.bytes, it.name) : it.bytes;
        const d = await novoDocPdf(p, it.name, bytes, onde);
        novos.push(d);
      }catch(err){ toast('Não foi possível abrir ' + it.name + (/encrypt/i.test(String(err && err.message)) ? ' (PDF protegido).' : '.')); }
    }
  } finally { b.end(); }
  if(novos.length && depois){
    const i = p.docs.findIndex(d => d.id === depois);
    if(i >= 0){ p.docs = p.docs.filter(d => !novos.includes(d)); p.docs.splice(i + 1, 0, ...novos); }
  }
  if(novos.length){ touch(p); saveDB(true); }
  return novos;
}


/* ---------- triagem: ZIP e vários arquivos ----------
   Cada arquivo ganha Linha / Repositório / Ignorar. Word, Excel, DWG e outros ficam em Ignorar. */
const RX_OUTRO = /\.[a-z0-9]{2,5}$/i;
async function expandirTudo(list){
  const out = [];
  for(const file of list){
    const nm = file.name || 'arquivo';
    if(/\.zip$/i.test(nm) || /zip/.test(file.type || '')){
      try{
        const z = await JSZip.loadAsync(file);
        const ents = Object.values(z.files).filter(en => !en.dir && !/(^|\/)(__MACOSX|\.)/.test(en.name)).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { numeric:true }));
        for(const en of ents){
          const name = en.name.split('/').pop();
          if(RX_PDF.test(name) || RX_IMG.test(name)) out.push({ name, bytes:await en.async('uint8array'), tipo: RX_PDF.test(name) ? 'pdf' : 'img', zip:nm });
          else out.push({ name, bytes:null, tipo:'outro', zip:nm });
        }
      }catch(e){ toast('Não foi possível abrir ' + nm + '.'); }
    } else if(RX_PDF.test(nm) || file.type === 'application/pdf'){
      out.push({ name: RX_PDF.test(nm) ? nm : nm + '.pdf', bytes:new Uint8Array(await file.arrayBuffer()), tipo:'pdf' });
    } else if(RX_IMG.test(nm) || /^image\//.test(file.type || '')){
      out.push({ name: RX_IMG.test(nm) ? nm : nm + '.jpg', bytes:new Uint8Array(await file.arrayBuffer()), tipo:'img' });
    } else out.push({ name:nm, bytes:null, tipo:'outro' });
  }
  return out;
}
async function infoPdf(bytes){
  try{ const sz = await medirPdf(bytes); const deit = sz.filter(z => { const r = (z[2] || 0) % 180; return r ? z[1] > z[0] : z[0] > z[1]; }).length; return { n:sz.length, deitadas:deit }; }
  catch(e){ return { n:0, deitadas:0, erro:true }; }
}
async function triagemSheet(ents, destinoFixo){
  const b0 = busy('Lendo arquivos…');
  for(const e of ents){ e.dest = e.tipo === 'outro' ? 'ignorar' : 'linha'; e.giro = 0; if(e.tipo === 'pdf') e.info = await infoPdf(e.bytes); else if(e.tipo === 'img') e.info = { n:1, deitadas:0 }; }
  b0.end();
  let destino = destinoFixo || (VIEW === 'mesa' && M.p && !M.p.avdoc ? M.p.id : 'avulsa');
  const lista = h('div', { style:{ display:'flex', flexDirection:'column', gap:'8px' } });
  const pe = h('div', { class:'shf' });
  const bubs = (e) => h('div', { class:'pbub', style:{ margin:'6px 0 0' } }, [['linha', 'Linha'], ['repo', 'Repositório'], ['ignorar', 'Ignorar']].map(([k, t]) => {
    const bt = h('button', { style: e.dest === k ? { background:'var(--accent-soft)', borderColor:'var(--accent)', color:'var(--accent)' } : null, disabled: e.tipo === 'outro' && k !== 'ignorar', onclick:() => { e.dest = k; pinta(); } }, t); return bt; }));
  function pinta(){
    lista.replaceChildren();
    ents.forEach(e => {
      const sub = e.tipo === 'outro' ? 'não é PDF (fica de fora)' : (e.info && e.info.n ? plural(e.info.n, 'página', 'páginas') : '') + (e.info && e.info.deitadas ? ' · ' + (e.info.deitadas === e.info.n ? 'deitada' : e.info.deitadas + ' deitadas') : '');
      const card = h('div', { class:'rvItem' }, h('div', null, h('b', { style:{ fontSize:'14px', overflowWrap:'anywhere' } }, e.name), h('div', { class:'muted', style:{ fontSize:'12.5px' } }, sub)), bubs(e));
      if(e.info && e.info.deitadas && e.dest !== 'ignorar') card.append(h('button', { class:'btn sm ghost', style:{ alignSelf:'flex-start', color:'var(--accent)' }, onclick:() => { e.giro = (e.giro + 90) % 360; pinta(); } }, h('span', { html:I.rotR }), e.giro ? 'Girado ' + e.giro + '° (toque para girar mais)' : 'Página deitada: girar o arquivo todo?'));
      lista.append(card);
    });
    const n = ents.filter(e => e.dest !== 'ignorar').length;
    const ps = [['avulsa', 'PDFs soltos']].concat(fixados().filter(p => !p.avdoc).map(p => [p.id, p.ficha.objeto || tituloProc(p)])).concat(procsReais().filter(p => !estaFixado(p)).sort((a, b) => b.updated - a.updated).slice(0, 4).map(p => [p.id, p.ficha.objeto || tituloProc(p)])).concat([['novo', '+ Novo processo']]);
    if(destino !== 'avulsa' && destino !== 'novo' && !ps.some(x => x[0] === destino)){ const pp = procPorId(destino); if(pp) ps.splice(1, 0, [pp.id, pp.ficha.objeto || tituloProc(pp)]); }
    pe.replaceChildren(h('div', { style:{ width:'100%', display:'flex', flexDirection:'column', gap:'8px' } },
      h('div', { class:'lbl' }, 'Destino'),
      h('div', { class:'pbub', style:{ margin:0 } }, ps.map(([id, t]) => h('button', { style: destino === id ? { background:'var(--accent-soft)', borderColor:'var(--accent)', color:'var(--accent)' } : null, onclick:() => { destino = id; pinta(); } }, t.length > 34 ? t.slice(0, 33) + '…' : t))),
      h('button', { class:'btn acc', disabled:!n, onclick:() => incluir() }, n ? 'Incluir ' + plural(n, 'arquivo', 'arquivos') : 'Nada para incluir')));
  }
  const s = sheet({ titulo:'Arquivos recebidos', cheio:true, corpo:[h('p', { class:'muted', style:{ margin:0, fontSize:'13px' } }, 'Escolha para onde vai cada arquivo. Planilha deitada pode ser girada aqui ou depois, na mesa.'), lista] });
  s.el.append(pe);
  pinta();
  async function incluir(){
    let p = destino === 'avulsa' ? procAvulsa() : destino === 'novo' ? null : procPorId(destino);
    if(!p){ p = novoProc({ ficha:{ objeto:'', extras:[] } }); DB.procs.push(p); }
    s.fechar();
    const b = busy('Incluindo arquivos…'), novos = [];
    try{
      for(const e of ents){
        if(e.dest === 'ignorar' || !e.bytes) continue;
        b.txt('Lendo ' + e.name + '…');
        try{
          const bytes = e.tipo === 'img' ? await PDFGen.imageToPdf(e.bytes, e.name) : e.bytes;
          const d = await novoDocPdf(p, e.name, bytes, e.dest);
          if(e.giro) d.pl.forEach(x => x.r = e.giro);
          novos.push(d);
        }catch(err){ toast('Não foi possível abrir ' + e.name + (/encrypt/i.test(String(err && err.message)) ? ' (PDF protegido).' : '.')); }
      }
    } finally { b.end(); }
    touch(p); marcarUltimo(p); saveDB(true);
    abrirMesa(p, { pdf: p.avulsa, doc:novos[0] && novos[0].id });
    if(destino === 'novo') setTimeout(() => fichaSheet(p), 300);
    toast(plural(novos.length, 'arquivo incluído', 'arquivos incluídos') + '.');
  }
}

/* =====================================================================
   Inteligência artificial (revisão de texto)
   No link do Claude: usa a sua conta do Claude. No app instalado: chave de API
   do Claude ou do Gemini (Ajustes). Sem chave: copia e abre o app escolhido.
   ===================================================================== */
async function iaDisponivel(){
  if(!PWA && window.claude && window.claude.use){ try{ const s = await window.claude.use('sample'); if(s) return { tipo:'claude-app', s }; }catch(e){} }
  const ia = settings.ia || {};
  if((ia.prov === 'claude' || ia.prov === 'auto') && ia.claudeKey) return { tipo:'claude-api' };
  if((ia.prov === 'gemini' || ia.prov === 'auto') && ia.geminiKey) return { tipo:'gemini-api' };
  return null;
}
/* turns: [{role:'user'|'assistant', content}] ; forte = usar o modelo mais forte */
async function iaPedir(turns, o = {}){
  const via = await iaDisponivel();
  if(!via) throw { code:'sem_ia' };
  const ia = settings.ia;
  if(via.tipo === 'claude-app'){
    const op = { modelTier:o.forte ? 'default' : (ia.tier || 'quick') };
    if(o.signal) op.signal = o.signal;
    if(o.cache === false) op.cache = false;
    if(o.onText) op.onText = x => o.onText(x.text);
    const r = await via.s(turns, op);
    return r.text;
  }
  if(via.tipo === 'claude-api'){
    const model = o.forte && /haiku/.test(ia.claudeModel) ? 'claude-sonnet-5' : (ia.claudeModel || 'claude-haiku-4-5');
    const r = await fetch('https://api.anthropic.com/v1/messages', { method:'POST', signal:o.signal,
      headers:{ 'content-type':'application/json', 'x-api-key':ia.claudeKey, 'anthropic-version':'2023-06-01', 'anthropic-dangerous-direct-browser-access':'true' },
      body:JSON.stringify({ model, max_tokens:4096, messages:turns }) });
    const j = await r.json().catch(() => ({}));
    if(!r.ok) throw { code:'api', message:(j.error && j.error.message) || ('Erro ' + r.status) };
    const t = (j.content || []).map(c => c.text || '').join('');
    if(o.onText) o.onText(t);
    return t;
  }
  const model = ia.geminiModel || 'gemini-2.5-flash';
  const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent?key=' + encodeURIComponent(ia.geminiKey), {
    method:'POST', signal:o.signal, headers:{ 'content-type':'application/json' },
    body:JSON.stringify({ contents:turns.map(t => ({ role:t.role === 'assistant' ? 'model' : 'user', parts:[{ text:t.content }] })) }) });
  const j = await r.json().catch(() => ({}));
  if(!r.ok) throw { code:'api', message:(j.error && j.error.message) || ('Erro ' + r.status) };
  const t = (((j.candidates || [])[0] || {}).content || { parts:[] }).parts.map(p => p.text || '').join('');
  if(o.onText) o.onText(t);
  return t;
}
function iaErro(e){
  const c = e && e.code;
  return ({ not_granted:'Você não permitiu o uso do Claude nesta página.', rate_limited:'Muitos pedidos seguidos. Espere um pouco e tente de novo.', cancelled:'Parado.',
    prompt_too_large:'Trecho grande demais. Selecione menos texto.', refused:'O Claude não quis responder a esse trecho.', session_expired:'Sua sessão expirou. Recarregue a página.',
    sem_ia:'Sem inteligência artificial configurada. Use “Levar ao Claude” ou “Levar ao Gemini”, ou coloque uma chave em Ajustes.' })[c]
    || (c === 'api' ? 'A IA respondeu com erro: ' + (e.message || '') : (e && e.name === 'AbortError') ? 'Parado.' : 'Não deu para responder agora. Tente de novo em instantes.');
}

/* ===== e_home.js ===== */
/* =====================================================================
   Tela inicial (Panda): processos fixados, últimos, bolinhas, acesso rápido
   ===================================================================== */
let VIEW = 'home';
function mostrar(v){
  VIEW = v;
  $('vHome').hidden = v !== 'home'; $('vMesa').hidden = v !== 'mesa'; $('vRel').hidden = v !== 'rel'; $('vPasta').hidden = v !== 'pasta'; $('vProc').hidden = !(v === 'proc' || (v === 'mesa' && M.split));
  if(DB){ DB.ui.view = v; saveDB(); }
}
const STATUS_COR = { 'Em elaboração':'acc', 'Tramitando':'', 'Aguardando resposta':'warn', 'Parado':'danger', 'Concluído':'ok' };
const chipStatus = s => h('span', { class:'chip ' + (STATUS_COR[s] || '') }, s || 'Em elaboração');
function haQuanto(iso){ const n = diasEntre(iso); if(n == null) return ''; return n <= 0 ? 'desde hoje' : n === 1 ? 'há 1 dia' : 'há ' + n + ' dias'; }
function quando(ts){
  if(!ts) return '';
  const d = new Date(ts), hoje = new Date(), ontem = new Date(Date.now() - 864e5);
  const hm = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  if(d.toDateString() === hoje.toDateString()) return 'hoje, ' + hm;
  if(d.toDateString() === ontem.toDateString()) return 'ontem';
  return dataBR(new Date(ts - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10));
}
/* toque longo: mostra o nome ou abre o menu */
function toqueLongo(el, fn){
  let t = null, longo = false, x0 = 0, y0 = 0;
  el.addEventListener('pointerdown', e => { longo = false; x0 = e.clientX; y0 = e.clientY; t = setTimeout(() => { longo = true; if(navigator.vibrate) try{ navigator.vibrate(12); }catch(err){} fn(); }, 480); });
  el.addEventListener('pointermove', e => { if(Math.abs(e.clientX - x0) + Math.abs(e.clientY - y0) > 10) clearTimeout(t); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(e => el.addEventListener(e, () => clearTimeout(t)));
  el.addEventListener('click', ev => { if(longo){ ev.preventDefault(); ev.stopImmediatePropagation(); longo = false; } }, true);
  el.addEventListener('contextmenu', ev => { ev.preventDefault(); });
}

/* tela inicial no estilo iOS: busca, Fixados, Recentes e um único + */
const HOME = { busca:'', editar:false };
function renderHome(){
  const b = $('homeBody'); b.replaceChildren();
  const tab = DB.ui.tab || 'procs';
  document.body.dataset.tab = tab;
  $('pandaImg').src = PANDA_SRC; $('verBadge').textContent = VERSAO_APP;
  $('homeTabs').replaceChildren(h('b', { class:'hTit' }, 'Início'));
  homeProcessos(b);
  if(PWA && window.__instalar) b.append(h('div', { class:'row', style:{ justifyContent:'center', marginTop:'22px' } },
    h('button', { class:'btn sm', onclick:async () => { const e = window.__instalar; window.__instalar = null; e.prompt(); renderHome(); } }, 'Instalar no celular')));
  if(!$('hPanel').classList.contains('open')) $('hPanel').replaceChildren();
  if(typeof aplicarLayUI === 'function') aplicarLayUI();
}
function setTab(t){ DB.ui.tab = t; saveDB(); renderHome(); }
function subProc(p){
  if(p.avdoc) return (TIPO_NOME[p.tipoAv] || 'Documento') + (p.numint ? ' · SEINFRA N. ' + p.numint : '');
  const f = p.ficha || {};
  return [f.num || 'sem número', f.tipoObj || catName(p.cat)].filter(Boolean).join(' · ');
}
const tituloItem = p => p.avdoc ? objetoProc(p) : (p.ficha.objeto || tituloProc(p));
function linhaItem(p, extra, sub){
  const bt = h('button', { class:'aRow', onclick:() => { if(bt._aberto){ fecharDeslize(bt); return; } if(!HOME.editar) abrirItem(p); } },
    h('span', { class:'tx' }, h('b', null, tituloItem(p)), h('span', null, sub || subProc(p))),
    extra || h('span', { class:'chev', html:I.chevR }));
  toqueLongo(bt, () => menuItem(p, bt));
  if(HOME.editar) return bt;
  /* como no iPhone: deslizar para a direita fixa; para a esquerda mostra Apagar */
  const fx = estaFixado(p);
  const wrap = h('div', { class:'aSw' },
    h('button', { class:'swL', onclick:() => { fixar(p, !fx); renderHome(); toast(fx ? 'Desafixado.' : 'Fixado.', { ms:1200 }); } }, fx ? 'Desafixar' : 'Fixar'),
    h('button', { class:'swR', onclick:() => { fecharDeslize(bt); excluirProc(p); } }, 'Apagar'), bt);
  deslizar(bt);
  return wrap;
}
function fecharDeslize(row){ row._aberto = 0; row.style.transition = 'transform .2s ease'; row.style.transform = ''; }
function deslizar(row){
  let x0 = null, y0 = 0, dx = 0, modo = null;
  row.addEventListener('pointerdown', e => { x0 = e.clientX; y0 = e.clientY; dx = row._aberto || 0; modo = null; row.style.transition = 'none'; });
  row.addEventListener('pointermove', e => {
    if(x0 == null) return;
    const ddx = e.clientX - x0, ddy = e.clientY - y0;
    if(!modo){ if(Math.abs(ddx) > 10 && Math.abs(ddx) > Math.abs(ddy) * 1.3){ modo = 'h'; try{ row.setPointerCapture(e.pointerId); }catch(err){} } else if(Math.abs(ddy) > 10) modo = 'v'; }
    if(modo !== 'h') return;
    dx = Math.max(-110, Math.min(110, ddx + (row._aberto || 0))); row.style.transform = 'translateX(' + dx + 'px)';
  });
  const fim = () => {
    if(x0 == null) return; x0 = null; row.style.transition = 'transform .2s ease';
    if(modo !== 'h'){ return; }
    row._aberto = dx < -55 ? -84 : dx > 55 ? 84 : 0;
    row.style.transform = row._aberto ? 'translateX(' + row._aberto + 'px)' : '';
    row._arrastou = true; setTimeout(() => { row._arrastou = false; }, 60);
  };
  row.addEventListener('pointerup', fim); row.addEventListener('pointercancel', fim);
  row.addEventListener('click', ev => { if(row._arrastou){ ev.stopImmediatePropagation(); ev.preventDefault(); } }, true);
}
const pare = fn => ev => { ev.stopPropagation(); fn(); };
function homeProcessos(b){
  const busca = h('input', { placeholder:'Buscar', 'aria-label':'Buscar', value:HOME.busca, oninput:() => { HOME.busca = busca.value; desenha(); } });
  b.append(h('label', { class:'aBusca', 'data-lay':'busca' }, h('span', { html:I.search }), busca));
  const corpo = h('div'); b.append(corpo);
  function desenha(){
    corpo.replaceChildren();
    const q = norm(HOME.busca.trim());
    if(q){
      const achou = DB.procs.filter(p => !p.avulsa && norm([p.ficha.num, p.ficha.objeto, p.numint, TIPO_NOME[p.tipoAv], revitNumero(p)].join(' ')).includes(q)).slice(0, 40);
      corpo.append(h('div', { class:'aSec' }, 'Resultados'), achou.length ? h('div', { class:'aGrp' }, achou.map(p => linhaItem(p))) : h('div', { class:'aVazio' }, 'Nada encontrado.'));
      return;
    }
    const raiz = noPorId(RAIZ), fs = raiz.filhos.map(noPorId).filter(Boolean);
    if(fs.length) corpo.append(h('div', { class:'aGrp', style:{ marginTop:'14px' } }, fs.map(linhaNo)));
    const soltos = procsDoNo(raiz);
    if(soltos.length) corpo.append(h('div', { class:'aSec' }, 'Processos'), h('div', { class:'aGrp' }, soltos.map(p => linhaItem(p))));
    const fx = fixados();
    corpo.append(h('div', { class:'aSec' }, h('span', null, 'Fixados'), fx.length > 1 ? h('button', { onclick:() => { HOME.editar = !HOME.editar; desenha(); } }, HOME.editar ? 'OK' : 'Editar') : null));
    if(!fx.length) corpo.append(h('div', { class:'aGrp' }, h('div', { class:'aVazio' }, 'Toque e segure um processo para fixar aqui.')));
    else corpo.append(h('div', { class:'aGrp' }, fx.map((p, i) => linhaItem(p, HOME.editar ? h('span', { class:'ord' },
      h('button', { html:I.chevU, 'aria-label':'Subir', disabled:i === 0, onclick:pare(() => { moverFixado(p, -1); desenha(); }) }),
      h('button', { html:I.chevD, 'aria-label':'Descer', disabled:i === fx.length - 1, onclick:pare(() => { moverFixado(p, 1); desenha(); }) })) : null))));
    if(!fx.length) corpo.append(h('div', { class:'aVazio', style:{ textAlign:'center', marginTop:'30px' } }, 'Toque no + para começar.'));
  }
  desenha();
}
function menuMais(ancora){
  popMenu(ancora, [
    { t:'Novo documento', ic:'docplus', fn:() => novoDocumento({}) },
    { t:'Texto pronto', sub:'colar e sair no padrão', ic:'paste', fn:() => textoPronto({}) },
    { t:'Novo processo', ic:'folderPlus', fn:() => fichaSheet(null) },
    '-',
    { t:'Abrir PDF', ic:'pdf', fn:() => escolherArquivos(l => receberArquivos(l)) },
    { t:'Fotografar', ic:'camera', fn:() => fotografar() },
    { t:'Mesa de PDF', ic:'layers', fn:() => abrirMesaPdf() },
    '-',
    { t:'Calculadora', ic:'calc', fn:() => calcSheet() }
  ], { chave:'homeMais' });
}
function abrirItem(p){ if(p.avdoc) abrirAvulso(p); else if(p.avulsa) abrirMesa(p); else abrirProcTela(p); }
function menuItem(p, ancora){
  if(p.avdoc) return menuAvulso(p, ancora);
  menuProc(p, ancora);
}
function menuProc(p, ancora){
  const fx = estaFixado(p);
  menu(tituloProc(p), [
    { t:'Abrir processo', ic:'doc', fn:() => abrirProcTela(p) },
    { t:'Mover para outra pasta', ic:'folder', fn:() => moverProcPasta(p) },
    { t: fx ? 'Desafixar' : 'Fixar no início', ic:'pin', fn:() => { fixar(p, !fx); renderHome(); } },
    { t:'Montar PDF para imprimir ou exportar', ic:'layers', fn:() => exportarProcesso(p) },
    { t:'Ficha central', ic:'pen', fn:() => fichaSheet(p) },
    { t:'Relatório e prontuário', ic:'report', fn:() => abrirRel(p) },
    { t:'Registrar tramitação', ic:'route', fn:() => tramSheet(p) },
    '-',
    { t:'Duplicar processo', sub:'Copia a ficha e os textos, sem os PDFs', ic:'dup', fn:() => duplicarProc(p) },
    { t:'Excluir processo', ic:'trash', danger:true, fn:() => excluirProc(p) }
  ], ancora);
}
function exportarProcesso(p){ abrirMesa(p); setTimeout(() => { if(typeof entrarSelecao === 'function') entrarSelecao(true); }, 150); }
function duplicarProc(p){
  const q = novoProc({ cat:p.cat, status:'Em elaboração', ficha:clone(p.ficha) });
  q.ficha.num = (q.ficha.num || '') + (q.ficha.num ? ' (cópia)' : '');
  q.ficha.revitSeq = q.ficha.revitInicio ? revitSeqLivre(q.ficha.revitInicio, q) : q.ficha.revitSeq;
  const mapa = {};
  q.docs = p.docs.filter(d => d.kind === 'texto').map(d => { const n = Object.assign(clone(d), { id:uid() }); mapa[d.id] = n.id; return n; });
  q.docs.forEach(d => { if(d.pai) d.pai = mapa[d.pai] || null; });
  DB.procs.push(q); saveDB(true); renderHome(); toast('Processo duplicado.');
}
async function excluirProc(p){
  const nome = p.avdoc ? (TIPO_NOME[p.tipoAv] || 'Documento') + ' ' + (p.numint || '') : 'O processo ' + (p.ficha.num || '');
  if(!await confirmar('Excluir', nome + ' e todos os seus documentos e PDFs serão apagados deste aparelho.', 'Excluir', true)) return;
  DB.procs = DB.procs.filter(x => x !== p);
  if(p.avdoc && p.numint) liberarNum(p.numint);
  for(const d of p.docs) if(d.kind === 'pdf' && d.fileId && !fileEmUso(d.fileId)) await apagarBytes(d.fileId);
  saveDB(true);
  if(VIEW !== 'home') mostrar('home');
  renderHome(); if($('hPanel').classList.contains('open')) renderRapido();
  toast('Excluído.');
}

/* ---------- acesso rápido (aba da esquerda na tela inicial) ---------- */
function abrirRapido(){ renderRapido(); $('hPanel').classList.add('open'); $('hScrim').hidden = false; }
function fecharRapido(){ $('hPanel').classList.remove('open'); $('hScrim').hidden = true; }
const TIPOS_AV = [['ci', 'Comunicação interna'], ['of', 'Ofício'], ['nt', 'Nota técnica'], ['livre', 'Outros documentos']];
function ordemAv(lista){ return lista.slice().sort((a, b) => (a.ordem != null ? a.ordem : -a.created) - (b.ordem != null ? b.ordem : -b.created)); }
function moverAv(p, dir){
  const lista = ordemAv(avulsosDoc(p.tipoAv).filter(x => (x.caixa || '') === (p.caixa || '')));
  lista.forEach((x, i) => x.ordem = i);
  const i = lista.indexOf(p), j = i + dir; if(j < 0 || j >= lista.length) return;
  lista[i].ordem = j; lista[j].ordem = i; saveDB(); renderRapido();
}
function renderRapido(){
  const P = $('hPanel');
  const body = h('div', { class:'pb' });
  P.replaceChildren(h('div', { class:'ph' }, h('b', null, 'Acesso rápido'), h('button', { class:'hbtn', html:I.x, 'aria-label':'Fechar', onclick:fecharRapido })), body);
  const fx = fixados();
  body.append(h('div', { class:'hl' }, 'Fixados'));
  if(!fx.length) body.append(h('div', { class:'hvazio' }, 'Nada fixado ainda.'));
  fx.forEach((p, i) => body.append(h('div', { class:'qrow' },
    h('span', { class:'tx', onclick:() => { fecharRapido(); abrirItem(p); } }, h('b', null, p.avdoc ? objetoProc(p) : (p.ficha.objeto || tituloProc(p))), h('span', null, subProc(p))),
    h('span', { class:'mini' },
      h('button', { html:I.up, disabled:i === 0, onclick:() => { moverFixado(p, -1); renderRapido(); renderHome(); } }),
      h('button', { html:I.down, disabled:i === fx.length - 1, onclick:() => { moverFixado(p, 1); renderRapido(); renderHome(); } }),
      h('button', { html:I.share, 'aria-label':'Exportar', onclick:() => { fecharRapido(); exportarProcesso(p); } })))));
  const ul = uiLista('ult').map(procPorId).filter(p => p && !estaFixado(p) && !p.avdoc);
  if(ul.length){
    body.append(h('div', { class:'hl' }, 'Últimos processos'));
    ul.forEach(p => body.append(h('div', { class:'qrow' },
      h('span', { class:'tx', onclick:() => { fecharRapido(); abrirItem(p); } }, h('b', null, p.ficha.objeto || tituloProc(p)), h('span', null, quando(p.updated))),
      h('span', { class:'mini' }, h('button', { html:I.pin, onclick:() => { fixar(p, true); renderRapido(); renderHome(); } }), h('button', { html:I.share, onclick:() => { fecharRapido(); exportarProcesso(p); } })))));
  }
  body.append(h('div', { class:'hl' }, 'Documentos avulsos'));
  DB.ui.acc = DB.ui.acc || {};
  for(const [tipo, nome] of TIPOS_AV){
    const lista = avulsosDoc(tipo).filter(p => tipo !== 'livre' || !['ci', 'of', 'nt'].includes(p.tipoAv));
    const aberto = !!DB.ui.acc[tipo];
    const acc = h('div', { class:'acc' }, h('button', { onclick:() => { DB.ui.acc[tipo] = !aberto; saveDB(); renderRapido(); } }, h('span', null, nome), h('small', null, lista.length + (aberto ? ' ▾' : ' ▸'))));
    if(aberto){
      const caixas = Array.from(new Set(lista.map(p => p.caixa || ''))).sort((a, b) => a === '' ? -1 : b === '' ? 1 : a.localeCompare(b));
      for(const cx of caixas){
        if(cx) acc.append(h('div', { class:'cx' }, cx));
        ordemAv(lista.filter(p => (p.caixa || '') === cx)).forEach(p => {
          const it = h('div', { class:'it' },
            h('span', { class:'tx', onclick:() => { fecharRapido(); abrirAvulso(p); } }, h('b', null, p.numint ? 'SEINFRA N. ' + p.numint : (TIPO_NOME[p.tipoAv] || 'Documento')), h('span', null, objetoProc(p))),
            h('span', { class:'mini' },
              h('button', { html:I.up, onclick:() => moverAv(p, -1) }), h('button', { html:I.down, onclick:() => moverAv(p, 1) }),
              h('button', { html:I.x, 'aria-label':'Apagar', onclick:() => excluirProc(p) }),
              h('button', { html:I.share, 'aria-label':'Exportar', onclick:() => exportarAvulso(p) })));
          toqueLongo(it, () => menuAvulso(p));
          acc.append(it);
        });
      }
      acc.append(h('div', { class:'add' },
        h('button', { class:'btn sm', onclick:() => { fecharRapido(); novoDocumentoModelo({ modo:'avulso', tipo: tipo === 'livre' ? 'livre' : tipo }); } }, h('span', { html:I.plus }), 'Novo'),
        h('button', { class:'btn sm ghost', onclick:() => novaCaixa(tipo) }, h('span', { html:I.folder }), 'Nova caixa')));
    }
    body.append(acc);
  }
}
async function novaCaixa(tipo){
  const nome = await perguntar('Nova caixa', 'Nome da caixa (ex.: Toner e material, Defesa Civil)', '', 'Criar');
  if(!nome) return;
  DB.ui.caixas = DB.ui.caixas || {}; const L = DB.ui.caixas[tipo] = DB.ui.caixas[tipo] || [];
  if(!L.includes(nome)) L.push(nome);
  saveDB(); toast('Caixa criada. Toque e segure um documento para colocar nela.');
}
function caixasDe(tipo){ const L = ((DB.ui.caixas || {})[tipo] || []).slice(); avulsosDoc(tipo).forEach(p => { if(p.caixa && !L.includes(p.caixa)) L.push(p.caixa); }); return L; }
function menuAvulso(p, ancora){
  menu((TIPO_NOME[p.tipoAv] || 'Documento') + (p.numint ? ' · ' + p.numint : ''), [
    { t:'Abrir', ic:'doc', fn:() => abrirAvulso(p) },
    { t:'Exportar PDF', ic:'share', fn:() => exportarAvulso(p) },
    { t:'Colocar numa caixa', ic:'folder', fn:async () => {
      const L = caixasDe(p.tipoAv);
      const v = await escolher('Caixa', [['', 'Sem caixa']].concat(L.map(c => [c, c])).concat([['+nova', '+ Nova caixa']]), p.caixa || '');
      if(v == null) return;
      if(v === '+nova'){ const nome = await perguntar('Nova caixa', 'Nome da caixa', '', 'Criar'); if(!nome) return; p.caixa = nome; }
      else p.caixa = v;
      p.ordem = null; saveDB(); renderRapido();
    } },
    { t: estaFixado(p) ? 'Desafixar' : 'Fixar no início', ic:'pin', fn:() => { fixar(p, !estaFixado(p)); renderHome(); if($('hPanel').classList.contains('open')) renderRapido(); } },
    { t:'Criar processo a partir deste', sub:'O documento vira o primeiro da linha do processo', ic:'folderPlus', fn:() => processoDeAvulso(p) },
    '-',
    { t:'Apagar', ic:'trash', danger:true, fn:() => excluirProc(p) }
  ], ancora);
}
function processoDeAvulso(p){
  const q = novoProc({ cat:'diversos', ficha:{ objeto:p.ficha.objeto || '', extras:[] } });
  p.docs.forEach(d => q.docs.push(Object.assign(clone(d), { id:uid() })));
  DB.procs.push(q); marcarUltimo(q); saveDB(true);
  fecharRapido(); abrirMesa(q); fichaSheet(q);
  toast('Processo criado com o documento. Preencha a ficha.');
}
async function exportarAvulso(p){
  const d = p.docs.find(x => x.kind === 'texto') || p.docs[0]; if(!d) return;
  if(typeof baixarDoc === 'function') baixarDoc(d, p);
}
function abrirAvulso(p){
  const de = VIEW === 'mesa' && M.p && !M.p.avdoc && M.p !== p ? M.p.id : null;
  abrirMesa(p, { voltar:de });
}

/* ---------- busca ---------- */
function buscaSheet(){
  const inp = h('input', { class:'inp', placeholder:'Número, objeto, SEINFRA N. ou rótulo', autofocus:true });
  const res = h('div', { style:{ display:'flex', flexDirection:'column', gap:'6px' } });
  const s = sheet({ titulo:'Buscar', corpo:[inp, res] });
  const run = () => {
    const q = norm(inp.value.trim()); res.replaceChildren();
    if(!q) return;
    const achou = DB.procs.filter(p => !p.avulsa && norm([p.ficha.num, p.ficha.objeto, p.numint, TIPO_NOME[p.tipoAv], revitNumero(p)].join(' ')).includes(q)).slice(0, 30);
    if(!achou.length) res.append(h('div', { class:'hvazio' }, 'Nada encontrado.'));
    achou.forEach(p => res.append(h('button', { class:'qrow', onclick:() => { s.fechar(); abrirItem(p); } }, h('span', { class:'tx' }, h('b', null, p.avdoc ? objetoProc(p) : (p.ficha.objeto || tituloProc(p))), h('span', null, subProc(p))))));
  };
  inp.addEventListener('input', run);
  setTimeout(() => inp.focus(), 150);
}

/* ---------- PDF: anexar, câmera, juntar ---------- */
function pdfMenu(){
  const s = sheet({ titulo:'PDF', corpo:[h('div', { class:'dots', style:{ gridTemplateColumns:'repeat(3,1fr)', margin:'4px 0 6px' } },
    h('button', { class:'dot', html:I.clip, 'aria-label':'Anexar arquivos', onclick:() => { s.fechar(); escolherArquivos(l => receberArquivos(l)); } }),
    h('button', { class:'dot', html:I.camera, 'aria-label':'Fotografar', onclick:() => { s.fechar(); fotografar(); } }),
    h('button', { class:'dot', html:I.layers, 'aria-label':'Mesa de PDF', onclick:() => { s.fechar(); abrirMesaPdf(); } })),
    h('div', { class:'row', style:{ justifyContent:'space-around', fontSize:'12px', color:'var(--muted)', marginTop:'-4px' } }, h('span', null, 'Anexar'), h('span', null, 'Câmera'), h('span', null, 'Mesa de PDF'))] });
}
function fotografar(){
  const inp = $('camIn'); inp.value = '';
  inp.onchange = () => { const l = Array.from(inp.files || []); if(l.length) receberArquivos(l); };
  inp.click();
}
function abrirMesaPdf(){ const av = procAvulsa(); abrirMesa(av, { pdf:true }); }
/* arquivos recebidos: um PDF vai direto; ZIP ou vários passam pela triagem */
async function receberArquivos(lista, destino){
  if(!needLibs()) return;
  const arqs = await expandirTudo(lista);
  if(!arqs.length) return;
  if(arqs.length === 1 && /\.pdf$/i.test(arqs[0].name) && !destino){
    const av = procAvulsa();
    const novos = await incluirArquivos(av, arqs, 'linha');
    abrirMesa(av, { pdf:true, doc:novos[0] && novos[0].id });
    return;
  }
  triagemSheet(arqs, destino);
}
function abrirOtimizador(){ pdfMenu(); }

/* ---------- novo documento: nova página · neste processo · avulso ---------- */
function mpiParaLinhas(texto){
  const L = String(texto || '').replace(/\r/g, '').split('\n').map(x => x.trim()).filter(Boolean);
  if(!L.length) return '';
  const out = [];
  L.forEach((l, i) => {
    const semPonto = !/[.;:]$/.test(l);
    if(i === 0 && l.length <= 110 && (l === l.toLocaleUpperCase('pt-BR') || semPonto) && !/^\d/.test(l)){ out.push('# ' + l); return; }
    if(i === 1 && out[0] && out[0].startsWith('# ') && l.length <= 80 && l === l.toLocaleUpperCase('pt-BR') && /(N[º°o.]|SEINFRA|PROCESSO|\d)/.test(l)){ out.push('= ' + l); return; }
    const m = /^(De|Para|Assunto|Interessad[oa]|Refer[êe]ncia|Ref\.|Objeto|Contratad[oa]|Processo)\s*:\s*(.*)$/i.exec(l);
    if(m){ out.push('| **' + m[1] + ':** ' + m[2]); return; }
    const c = /^(\d{1,2})(?:[.)]|\s*[-–])\s+(.{2,90})$/.exec(l);
    if(c && !/\d+\.\d+/.test(l.slice(0, 5)) && (c[2] === c[2].toLocaleUpperCase('pt-BR') || (semPonto && c[2].length < 70))){ out.push('## ' + c[1] + '. ' + titleCase(c[2])); return; }
    if(/^["“].{120,}["”]$/.test(l)){ out.push('> ' + l.replace(/^["“]|["”]$/g, '')); return; }
    out.push(l);
  });
  return out.join('\n');
}
function htmlDoTexto(texto){
  const t = String(texto || '');
  if(/<\/?(p|h[1-6]|table|ul|ol|blockquote|div|br)\b/i.test(t)) return limparHTML(t);
  return null;
}
/* monta o documento de texto (sem pôr em lugar nenhum) */
function docDeTexto(o){
  const p = o.p || null, m = o.m || null;
  let html;
  const linhasModelo = m ? m.texto : '# [TÍTULO]\n[Texto.]';
  if(o.texto && o.texto.trim()){
    const pronto = htmlDoTexto(o.texto);
    if(pronto) html = pronto;
    else {
      let corpo = mpiParaLinhas(o.texto);
      if(m && m.tipo !== 'livre' && !o.semCab && !/^# /m.test(corpo)){
        const cab = m.texto.split('\n').filter(l => /^(# |= |\|\+? |@data)/.test(l.trim())).join('\n');
        corpo = cab + '\n' + corpo;
      }
      html = tplParaHTML(corpo, p, { avulso:o.avulso, numint:o.numint });
    }
  } else html = tplParaHTML(linhasModelo, p, { avulso:o.avulso, numint:o.numint });
  if(o.rotulo && /\[assunto\]/.test(html)) html = html.replace('<span class="campo">[assunto]</span>', esc(o.rotulo));
  const tipo = o.tipo || (m ? m.tipo : 'livre');
  return { id:uid(), kind:'texto', nome:o.rotulo || titleOf(html), modelo:m ? m.id : 'livre', tipo, sig:o.sig || sigDoModelo(m), html,
    bras:settings.brasTexto || 'todas', linha:true, repo:false, criado:Date.now(), mpi:true };
}
/* põe o documento na linha do processo: logo depois de "depois" (e dos anexos dele) ou no fim */
function porNaLinha(p, d, depois){
  const ref = d.pai || depois;
  let i = ref ? p.docs.findIndex(x => x.id === ref) : -1;
  if(i >= 0){ while(i + 1 < p.docs.length && p.docs[i + 1].pai === ref) i++; p.docs.splice(i + 1, 0, d); } else p.docs.push(d);
  ordenarAnexos(p);
  touch(p); saveDB(true);
  return d;
}
function criarDocumento(o){
  const d = docDeTexto(o);
  d.nome = o.rotulo || (o.m ? o.m.nome.replace(/^LCT\.\d+ · /, '') : titleOf(d.html));
  if(o.anexoDe){ d.pai = o.anexoDe; d.sig.sem = true; }
  porNaLinha(o.p, d, o.depois);
  if(typeof tirarVazio === 'function') tirarVazio(o.p, d);
  return d;
}
function criarTexto(p, m, sigId, depois){ const d = criarDocumento({ p, m, depois }); if(sigId && pessoaPorId(sigId)) d.sig.pessoa = sigId; return d; }
function optSheet(titulo, grupos, atual){
  return new Promise(res => {
    const box = h('div', { class:'optlist' });
    let s;
    grupos.forEach(g => {
      if(g.g) box.append(h('div', { class:'g' }, g.g));
      g.itens.forEach(it => box.append(h('button', { class:(it.v === atual ? 'on ' : '') + (it.usado ? 'usado' : ''), onclick:() => { res(it.v); s.fechar(); } }, h('span', null, it.t), it.sub ? h('small', null, it.sub) : null)));
    });
    s = sheet({ titulo, corpo:[box], aoFechar:() => res(null) });
  });
}
function novoDocumentoModelo(o){
  o = o || {};
  const naMesa = VIEW === 'mesa' && M.p;
  const ctxProc = o.p || (naMesa && !M.p.avulsa && !M.p.avdoc ? M.p : null);
  const docAtual = naMesa && M.cur && M.cur.d ? M.cur.d : null;
  let modo = o.modo || (ctxProc ? 'processo' : 'avulso');
  let proc = ctxProc, m = modelos().find(x => x.id === o.mid) || modelos().find(x => x.tipo === o.tipo) || modelos().find(x => x.id === (ctxProc ? 'desp-rem' : 'ci'));
  let anexo = false;
  const hoje = hojeISO(); let dia = hoje, seq = seqLivre(hoje);
  const segB = {}, seg = h('div', { class:'ndSeg' });
  [['pagina', 'Nova página'], ['processo', ctxProc ? 'Neste processo' : 'Em processo'], ['avulso', 'Avulso']].forEach(([k, t]) => {
    segB[k] = h('button', { onclick:() => { if(k === 'pagina'){ s.fechar(); novaPaginaNaMesa(); return; } modo = k; pinta(); } }, t);
    if(k === 'pagina' && !(naMesa && docAtual && docAtual.kind === 'texto')) segB[k].disabled = true;
    seg.append(segB[k]);
  });
  const tipoBtn = h('button', { class:'f sel', style:{ textAlign:'left' }, onclick:async () => {
    const ms = modelos(), gr = [];
    for(const g of GRUPOS_MODELO.concat(Array.from(new Set(ms.map(x => x.grupo))).filter(x => !GRUPOS_MODELO.includes(x)))){ const it = ms.filter(x => x.grupo === g).map(x => ({ v:x.id, t:x.nome })); if(it.length) gr.push({ g, itens:it }); }
    const v = await optSheet('Tipo de documento', gr, m && m.id); if(v){ m = ms.find(x => x.id === v); pinta(); }
  } });
  const rot = h('input', { class:'inp', placeholder:'Do que se trata (ex.: Solicitação de toner)' });
  const procBtn = h('button', { class:'f sel', style:{ textAlign:'left' }, onclick:async () => {
    const ps = procsReais().sort((a, b) => b.updated - a.updated);
    const v = await optSheet('Qual processo', [{ itens:ps.map(p => ({ v:p.id, t:p.ficha.objeto || tituloProc(p), sub:p.ficha.num || '' })) }], proc && proc.id);
    if(v){ proc = procPorId(v); pinta(); }
  } });
  const anexoChk = h('input', { type:'checkbox' });
  anexoChk.onchange = () => { anexo = anexoChk.checked; };
  const anexoLin = h('label', { class:'chk' }, anexoChk, h('span', null, ''));
  const numBtns = h('div', { class:'numrow' });
  const prev = h('div', { class:'nprev' });
  const texto = h('textarea', { class:'txa', rows:1, placeholder:'Colar ou escrever o texto (opcional)', onfocus:e => { e.target.rows = 6; } });
  const lblProc = h('div', { class:'lbl' }, 'Processo'), lblNum = h('div', { class:'lbl' }, 'Numeração interna');
  const info = h('p', { class:'muted', style:{ margin:0, fontSize:'13px' } });
  function numTxt(){ return numintTexto(seq, dia); }
  function pinta(){
    for(const k in segB) segB[k].classList.toggle('on', k === modo);
    tipoBtn.textContent = m ? m.nome : 'Escolher tipo';
    const emProc = modo === 'processo';
    lblProc.hidden = procBtn.hidden = !emProc || !!ctxProc;
    procBtn.textContent = proc ? (proc.ficha.objeto || tituloProc(proc)) : 'Escolher processo';
    anexoLin.hidden = !(emProc && ctxProc && docAtual);
    if(docAtual) anexoLin.lastChild.textContent = 'Anexo de: ' + docAtual.nome;
    lblNum.hidden = numBtns.hidden = emProc;
    numBtns.replaceChildren(
      h('small', { style:{ fontWeight:700, color:'var(--muted)', marginRight:'4px' } }, 'SEINFRA N.'),
      h('button', { class:'on', onclick:async () => {
        const us = numsDoDia(dia), gr = [{ itens:Array.from({ length:Math.max(12, seqLivre(dia) + 5) }, (_, i) => i + 1).map(n => { const u = us.find(x => x.seq === n); return { v:n, t:String(n).padStart(3, '0'), sub:u ? (TIPO_NOME[u.tipo] || '') + (u.rot ? ' · ' + u.rot : '') : 'livre', usado:!!u }; }) }];
        const v = await optSheet('Número do dia', gr, seq); if(v != null){ seq = v; pinta(); } } }, String(seq).padStart(3, '0')), '.',
      h('button', { onclick:async () => { const [y, mm] = dia.split('-'); const n = new Date(+y, +mm, 0).getDate(); const v = await optSheet('Dia', [{ itens:Array.from({ length:n }, (_, i) => ({ v:i + 1, t:String(i + 1).padStart(2, '0') })) }], +dia.slice(8)); if(v){ dia = y + '-' + mm + '-' + String(v).padStart(2, '0'); seq = seqLivre(dia); pinta(); } } }, dia.slice(8)), '.',
      h('button', { onclick:async () => { const [y, mm, dd] = dia.split('-'); const v = await optSheet('Mês', [{ itens:Array.from({ length:12 }, (_, i) => 12 - i).map(n => ({ v:n, t:String(n).padStart(2, '0') + ' · ' + MESES_EXT[n - 1] })) }], +mm); if(v){ const max = new Date(+y, v, 0).getDate(); dia = y + '-' + String(v).padStart(2, '0') + '-' + String(Math.min(+dd, max)).padStart(2, '0'); seq = seqLivre(dia); pinta(); } } }, dia.slice(5, 7)), '.',
      h('button', { onclick:async () => { const [y, mm, dd] = dia.split('-'); const a = new Date().getFullYear(); const v = await optSheet('Ano', [{ itens:[a, a - 1].map(n => ({ v:n, t:String(n) })) }], +y); if(v){ dia = v + '-' + mm + '-' + dd; seq = seqLivre(dia); pinta(); } } }, dia.slice(0, 4)));
    const tit = m ? (m.texto.split('\n').find(l => l.startsWith('# ')) || '# DOCUMENTO').slice(2).replace(/\{\{\s*ano\s*\}\}/, new Date().getFullYear()) : 'DOCUMENTO';
    prev.replaceChildren(document.createTextNode(tit.toLocaleUpperCase('pt-BR')), h('br'), document.createTextNode(emProc ? (proc ? 'Processo Administrativo nº ' + (proc.ficha.num || '[nº]') + ' · na referência e na tarja' : '') : 'SEINFRA N. ' + numTxt()));
    info.textContent = emProc ? (ctxProc && docAtual ? 'Entra logo depois de "' + docAtual.nome + '" e abre na folha. O número do processo e os dados da ficha entram sozinhos.' : 'O documento entra no fim da linha do processo e abre na folha.') : 'Documento solto, guardado em Acesso rápido › Documentos avulsos. Não usa número de processo.';
    btnOk.textContent = emProc ? 'Criar e abrir na folha' : 'Criar e abrir';
    btnPdf.hidden = btnWord.hidden = emProc;
  }
  const btnOk = h('button', { class:'btn acc', style:{ flex:'1' }, onclick:() => criar() });
  const btnPdf = h('button', { class:'btn', onclick:() => criar('pdf') }, h('span', { html:I.share }), 'PDF');
  const btnWord = h('button', { class:'btn', onclick:() => criar('word') }, h('span', { html:I.share }), 'Word');
  const corpo = [
    h('div', { class:'lbl' }, 'Tipo'), tipoBtn,
    h('div', { class:'lbl' }, 'Rótulo'), rot,
    lblProc, procBtn, anexoLin,
    lblNum, numBtns,
    prev, info,
    h('div', { class:'lbl' }, 'Texto'), texto];
  const s = sheet({ titulo:'', cheio:true, cabExtra:h('div', { class:'ndTop', style:{ flex:'1' } }, seg), corpo, botoes:[] });
  const pe = h('div', { class:'shf' }, btnOk, btnPdf, btnWord);
  s.el.append(pe);
  pinta();
  function criar(saida){
    if(!m) return toast('Escolha o tipo.');
    const r = rot.value.trim();
    if(modo === 'processo'){
      const p = proc; if(!p) return toast('Escolha o processo.');
      const d = criarDocumento({ p, m, texto:texto.value, rotulo:r, depois: p === ctxProc && docAtual ? docAtual.id : null, anexoDe: anexo && docAtual && p === ctxProc ? (docAtual.pai || docAtual.id) : null });
      s.fechar(); marcarUltimo(p);
      if(VIEW === 'mesa' && M.p === p){ renderMesa(true); setTimeout(() => { irParaDoc(d.id); focarDoc(d.id); }, 80); }
      else abrirMesa(p, { doc:d.id, focar:true });
      return;
    }
    const num = numTxt();
    reservarNum(seq, dia, m.tipo, r);
    const q = novoProc({ avdoc:true, tipoAv:['ci', 'of', 'nt'].includes(m.tipo) ? m.tipo : 'livre', numint:num, caixa:'', ficha:{ objeto:r || m.nome, extras:[] } });
    DB.procs.push(q);
    const d = criarDocumento({ p:q, m, texto:texto.value, rotulo:r, avulso:true, numint:num });
    d.nome = (TIPO_NOME[m.tipo] || m.nome) + ' SEINFRA N. ' + num;
    saveDB(true); s.fechar();
    if(saida === 'pdf' || saida === 'word'){ setTimeout(() => saida === 'pdf' ? baixarDoc(d, q) : baixarWord(d, q), 60); return; }
    abrirAvulso(q);
  }
}

/* ---------- Novo documento (simples): Texto pronto · Anexar PDF · por modelo ---------- */
/* onde o documento novo vai entrar: o processo aberto e o documento que está na tela */
function ctxNovoDoc(o){
  o = o || {};
  const naMesa = VIEW === 'mesa' && M.p;
  const p = o.p || (naMesa && !M.p.avulsa && !M.p.avdoc ? M.p : null);
  let atual = null;
  if(p && o.depois) atual = p.docs.find(x => x.id === o.depois) || null;
  else if(p && naMesa && M.p === p && M.cur && M.cur.d && M.cur.d.linha) atual = M.cur.d;
  return { p, atual, mesaPdf:!!(naMesa && M.p.avulsa && !o.p) };
}
function novoDocumento(o){
  o = o || {};
  const c = ctxNovoDoc(o);
  const onde = c.p ? (c.atual ? 'Entra logo depois de "' + c.atual.nome + '".' : 'Entra no fim da lista do processo.') : 'Sem processo: fica em Documentos avulsos.';
  let s;
  const cartao = (ic, t, sub, fn, lay) => h('button', { class:'ndCard', 'data-lay':lay, onclick:() => { s.fechar(); setTimeout(fn, 30); } },
    h('span', { class:'ic', html:I[ic] }), h('b', null, t), h('small', null, sub));
  const anexar = () => {
    if(c.p){ escolherArquivos(async l => {
      const novos = await incluirArquivos(c.p, l, 'linha', c.atual ? (c.p.docs.filter(x => x.pai === (c.atual.pai || c.atual.id)).pop() || c.atual).id : null);
      if(!novos.length) return;
      touch(c.p); saveDB(true); depoisDeIncluir(c.p, novos[0]);
      toast(novos.length === 1 ? 'PDF incluído.' : novos.length + ' arquivos incluídos.');
    }); return; }
    if(c.mesaPdf) return incluirPdfNaMesa();
    escolherArquivos(l => receberArquivos(l));
  };
  const mod = (mid, t, sub) => h('button', { class:'aRow', onclick:() => { s.fechar(); setTimeout(() => novoDocumentoModelo(Object.assign({}, o, { mid })), 30); } },
    h('span', { class:'tx' }, h('b', null, t), sub ? h('span', null, sub) : null), h('span', { class:'chev', html:I.chevR }));
  s = sheet({ titulo:'Novo documento', corpo:[
    h('div', { class:'ndCards' },
      cartao('paste', 'Texto pronto', 'Colar um texto e sair no padrão', () => textoPronto(o), 'ndTexto'),
      cartao('clip', 'Anexar PDF', 'PDF, foto ou ZIP', anexar, 'ndPdf')),
    h('p', { class:'ndOnde' }, onde),
    h('div', { class:'aSec' }, 'Novo documento por modelo'),
    h('div', { class:'aGrp' },
      mod('desp-rem', 'Despacho', 'remessa, recebimento, juntada'),
      mod('ci', 'Comunicação interna (CI)'),
      mod('of', 'Ofício'),
      mod('nt', 'Nota técnica'),
      h('button', { class:'aRow', onclick:() => { s.fechar(); setTimeout(() => novoDocumentoModelo(o), 30); } },
        h('span', { class:'tx' }, h('b', { style:{ color:'var(--accent)' } }, 'Outros modelos'), h('span', null, 'DFD, ETP, termo de referência, texto livre…')), h('span', { class:'chev', html:I.chevR })))] });
}
/* depois de pôr algo no processo: mostra onde entrou */
function depoisDeIncluir(p, d){
  if(VIEW === 'mesa' && M.p === p){ renderMesa(true); setTimeout(() => { irParaDoc(d.id); if(M.split) marcarAberto(d.id); if(VIEW === 'mesa' && M.split) renderProcTela(); }, 80); return; }
  if(VIEW === 'proc' && NAVP.proc === p.id){ renderProcTela(); const r = $('vProc').querySelector('.dRow[data-id="' + d.id + '"]'); if(r){ r.scrollIntoView({ block:'nearest' }); r.classList.add('novo'); setTimeout(() => r.classList.remove('novo'), 1600); } return; }
  abrirMesa(p, { doc:d.id });
}

/* ---------- Texto pronto: cola o texto e ele sai no padrão MPI ---------- */
let TP_RASCUNHO = '';
const TP_TIPOS = [['livre', 'Texto'], ['desp', 'Despacho'], ['dfd', 'DFD'], ['etp', 'ETP'], ['pb', 'Projeto básico'], ['tr', 'Termo de referência'], ['nt', 'Nota técnica'], ['ci', 'Comunicação interna'], ['of', 'Ofício'], ['sol', 'Solicitação de demanda'], ['decl', 'Declaração de vantajosidade'], ['anexo', 'Anexo (sem assinatura)']];
/* o tipo pelo título: DESPACHO, COMUNICAÇÃO INTERNA, OFÍCIO, NOTA TÉCNICA */
function tipoPeloTexto(t){
  const prim = (String(t || '').split('\n').find(x => x.trim()) || '').slice(0, 140);
  const tt = tipoDoTitulo(prim); if(tt && tt !== 'capa' && tt !== 'livre') return tt;
  const l = norm(prim.slice(0, 80));
  if(/^despacho/.test(l)) return 'desp';
  if(/^(comunicacao interna|c\.?i\.?\b)/.test(l)) return 'ci';
  if(/^oficio/.test(l)) return 'of';
  if(/^nota tecnica/.test(l)) return 'nt';
  if(/^anexo/.test(l)) return 'anexo';
  return null;
}
function sigPadraoTP(tipo){
  if(tipo === 'anexo') return '__sem';
  if(settings.tpSig && (settings.tpSig === '__sem' || pessoaPorId(settings.tpSig))) return settings.tpSig;
  const m = modelos().find(x => x.tipo === tipo) || modelos().find(x => x.id === 'livre');
  return sigDoModelo(m).pessoa || '';
}
function textoPronto(o){
  o = o || {};
  const c = ctxNovoDoc(o);
  const st = { tipo:null, tipoAuto:true, pessoa:'', pessoaMudou:false, modo:settings.tpModo || 'eletronica', partes:[] };
  const phTeor = 'Cole aqui o inteiro teor ou um documento.\n\nCada documento começa pelo título (DESPACHO, DOCUMENTO DE FORMALIZAÇÃO DE DEMANDA, ESTUDO TÉCNICO PRELIMINAR…) ou pela linha === DOCUMENTO: nome ===. O app reconhece e põe cada um no lugar da sequência.';
  const txa = h('textarea', { class:'txa tpTxa', placeholder:o.teor ? phTeor : 'Cole aqui o texto.\n\nA primeira linha vira o título. "De:", "Para:" e "Assunto:" ficam no bloco de cima; o resto vira parágrafos, com o fecho e a assinatura no fim.\n\nVários documentos de uma vez também servem: o app separa pelos títulos.', spellcheck:'true', lang:'pt-BR' });
  const info = h('div', { class:'tpTeor', hidden:true });
  let bPriRef = null;
  txa.value = TP_RASCUNHO;
  const nome = h('input', { class:'inp', placeholder:'Nome na lista (opcional)' });
  const grp = h('div', { class:'sgGrp tpSig' });
  const conta = h('span', { class:'tpConta' });
  const val = (t, fn, v) => { const b = h('button', { class:'sgRow', onclick:() => fn(b) }, h('span', null, t), h('span', { class:'v' }, h('span', null, v), h('i', { html:I.chevD, style:{ display:'flex' } }))); return b; };
  function pinta(){
    st.partes = txa.value.trim() ? dividirTeor(txa.value) : [];
    const multi = st.partes.length > 1;
    info.hidden = !multi;
    if(multi) info.replaceChildren(h('b', null, plural(st.partes.length, 'documento reconhecido', 'documentos reconhecidos')), h('div', { class:'tpChips' }, st.partes.map(x => h('span', { class:'tpChip' + (x.capa ? ' capa' : '') }, x.nome))));
    grp.hidden = multi;
    if(typeof lblNome !== 'undefined'){ lblNome.hidden = multi; nome.hidden = multi; dica.textContent = multi ? (c.p && temEsqueleto(c.p) ? 'Cada documento entra no lugar dele na sequência; o que não tiver lugar entra na ordem colada.' : 'Os documentos entram na ordem colada, cada um com as suas caixinhas de anexo.') : dicaSimples; }
    if(bPriRef && c.p){ const t = multi ? 'Montar ' + st.partes.length + ' documentos' : 'Entrar no processo'; if(bPriRef.textContent !== t) bPriRef.textContent = t; }
    if(st.tipoAuto){ const t = tipoPeloTexto(txa.value); st.tipo = t || 'livre'; }
    /* fecho solto no fim do texto colado: o signatário vem dele (se ainda não foi escolhido à mão) */
    const p0 = !multi && st.partes[0]; st.novo = null;
    if(p0 && !st.pessoaMudou){ if(p0.pessoa !== undefined) st.pessoa = p0.pessoa; else if(p0.novo) st.novo = p0.novo; }
    if(!st.pessoa) st.pessoa = sigPadraoTP(st.tipo);
    const pes = pessoaPorId(st.pessoa), nT = (TP_TIPOS.find(x => x[0] === st.tipo) || TP_TIPOS[0])[1];
    grp.replaceChildren(
      val('Tipo', b => popMenu(b, TP_TIPOS.map(([k, t]) => ({ t, on:st.tipo === k, fn:() => { st.tipo = k; st.tipoAuto = false; if(k === 'anexo') st.pessoa = '__sem'; pinta(); } }))), nT + (st.tipoAuto && st.tipo !== 'livre' ? ' (pelo título)' : '')),
      val('Signatário', b => menuSignatario(b, st.novo ? null : st.pessoa, id => { st.pessoa = id; st.pessoaMudou = true; st.novo = null; pinta(); }, { sem:true, pre:st.novo }),
        st.novo ? titleCase(st.novo.nome) + ' (novo)' : st.pessoa === '__sem' ? 'Sem assinatura' : pes ? titleCase(pes.nome) : 'Escolher'),
      st.pessoa === '__sem' ? null : val('Assinatura', b => popMenu(b, [['eletronica', 'Eletrônica', 'data da assinatura eletrônica'], ['fisica', 'Física (caneta)', 'com a data de hoje']].map(([k, t, sub]) => ({ t, sub, on:st.modo === k, fn:() => { st.modo = k; pinta(); } }))), st.modo === 'fisica' ? 'Física · hoje' : 'Eletrônica'));
    const L = txa.value.split('\n').filter(x => x.trim()).length;
    conta.textContent = L ? plural(L, 'linha', 'linhas') : '';
  }
  txa.addEventListener('input', () => { TP_RASCUNHO = txa.value; pinta(); });
  const colar = async () => {
    try{
      const t = navigator.clipboard && navigator.clipboard.readText ? await navigator.clipboard.readText() : '';
      if(!t) throw 0;
      txa.value = txa.value.trim() ? txa.value.replace(/\s*$/, '\n') + t : t; TP_RASCUNHO = txa.value; pinta();
    }catch(e){ txa.focus(); toast('Toque e segure dentro da caixa e escolha Colar.'); }
  };
  const barra = h('div', { class:'tpBar' },
    h('button', { class:'btn sm', onclick:colar }, h('span', { html:I.paste }), 'Colar'),
    conta,
    h('button', { class:'btn sm ghost', onclick:() => { txa.value = ''; TP_RASCUNHO = ''; st.tipoAuto = true; pinta(); txa.focus(); } }, 'Limpar'));
  const dicaSimples = c.p ? (c.atual ? 'Entrar no processo: fica logo depois de "' + c.atual.nome + '". Depois dá para arrastar ≡.' : 'Entrar no processo: fica no fim da lista. Depois dá para arrastar ≡.')
    : c.mesaPdf ? 'Pôr na mesa: vira folha de PDF, pronta para carimbar e numerar.' : 'Exportar guarda uma cópia em Documentos avulsos.';
  const dica = h('p', { class:'ndOnde' }, c.p ? (c.atual ? 'Entrar no processo: fica logo depois de "' + c.atual.nome + '". Depois dá para arrastar ≡.' : 'Entrar no processo: fica no fim da lista. Depois dá para arrastar ≡.')
    : c.mesaPdf ? 'Pôr na mesa: vira folha de PDF, pronta para carimbar e numerar.' : 'Exportar guarda uma cópia em Documentos avulsos.');
  const lblNome = h('div', { class:'lbl' }, 'Nome');
  const s = sheet({ titulo:o.teor ? 'Inteiro teor' : 'Texto pronto', cheio:true, corpo:[barra, txa, info, grp, lblNome, nome, dica] });
  pinta();
  /* o documento com o que está na caixa */
  function montar(p){
    let t = txa.value;
    if(!t.trim()){ toast('Cole o texto primeiro.'); txa.focus(); return null; }
    /* "Ilhéus, data" e nome/cargo soltos no fim saem do texto: o fecho entra sozinho (senão ficava repetido) */
    if(!htmlDoTexto(t)){
      const f = tirarFechoLinhas(t.replace(/\r/g, '').split('\n').filter(l => !/^\s*@signat[aá]rio\s*:/i.test(l)));
      if(f.linhas.some(l => l.trim())) t = f.linhas.join('\n');
      if(st.novo && !st.pessoaMudou){ st.pessoa = garantirSignatario(st.novo); st.novo = null; }
    }
    const sem = st.pessoa === '__sem';
    const sig = novoSig(sem ? null : st.pessoa || null, { sem, modo:st.modo, data:st.modo === 'fisica' ? hojeISO() : null, vinculo:!!(p && !p.avulsa && !p.avdoc) });
    const d = docDeTexto({ p, m:modelos().find(x => x.id === 'livre') || null, texto:t, tipo:st.tipo, sig, semCab:true });
    if(nome.value.trim()) d.nome = nome.value.trim();
    return d;
  }
  function lembrar(){ settings.tpSig = st.pessoa || null; settings.tpModo = st.modo; saveSettings(); }
  function pronto(){ TP_RASCUNHO = ''; lembrar(); s.fechar(); }
  async function ver(){
    if(!precisaLibs()) return;
    if(st.partes.length > 1){ previaDoc(docDaParte(st.partes[0], c.p), c.p); toast('A prévia mostra o primeiro documento.'); return; }
    const d = montar(c.p); if(!d) return;
    previaDoc(d, c.p);
  }
  function entrar(p, depois){
    if(!txa.value.trim()){ toast('Cole o texto primeiro.'); txa.focus(); return; }
    if(st.partes.length > 1 || temEsqueleto(p)){
      const partes = st.partes.length ? st.partes : dividirTeor(txa.value);
      if(partes.length === 1 && !st.tipoAuto) partes[0].tipo = st.tipo;
      const res = encaixarTeor(p, partes, { depois, sig:st.pessoaMudou ? st.pessoa : undefined });
      res.forEach(r => { const sg = r.d.sig; if(r.d.kind === 'texto' && sg && !sg.sem && (r.novo || partes.length === 1)){ sg.modo = st.modo; sg.data = st.modo === 'fisica' ? hojeISO() : null; } });
      if(partes.length === 1 && nome.value.trim() && res[0]) res[0].d.nome = nome.value.trim();
      saveDB(true); pronto();
      depoisDeMontar(p, res);
      return;
    }
    const d = montar(p); if(!d) return;
    porNaLinha(p, d, depois || null);
    pronto(); marcarUltimo(p);
    depoisDeIncluir(p, d);
    toast(depois ? 'Entrou depois de "' + ((p.docs.find(x => x.id === depois) || {}).nome || '') + '".' : 'Entrou no fim do processo.');
  }
  async function entrarEmOutro(){
    const ps = procsReais().sort((a, b) => b.updated - a.updated);
    if(!ps.length) return toast('Ainda não há processos.');
    const v = await optSheet('Entrar em qual processo?', [{ itens:ps.map(q => ({ v:q.id, t:q.ficha.objeto || tituloProc(q), sub:q.ficha.num || '' })) }], null);
    if(v) entrar(procPorId(v), null);
  }
  /* exportar: guarda uma cópia em Documentos avulsos e fica onde estava */
  function copiaAvulsa(d){
    const q = novoProc({ avdoc:true, tipoAv:'livre', numint:'', caixa:'', ficha:{ objeto:d.nome, extras:[] } });
    q.docs.push(d); DB.procs.push(q); saveDB(true);
    return q;
  }
  async function exportar(como){
    if(!precisaLibs()) return;
    if(st.partes.length > 1) return toast('São vários documentos: entre no processo e exporte de lá.');
    const d = montar(c.p); if(!d) return;
    const q = copiaAvulsa(d);
    if(c.p){ d.sig.vinculo = c.p.id; }
    pronto();
    setTimeout(() => como === 'word' ? baixarWord(d, c.p || q) : baixarDoc(d, c.p || q), 60);
  }
  async function porNaMesa(){
    if(!precisaLibs()) return;
    if(st.partes.length > 1) return toast('Para vários documentos, entre num processo.');
    const d = montar(null); if(!d) return;
    const b = busy('Pondo na mesa…');
    let bytes;
    try{ bytes = await bytesDoc(d, null); }catch(e){ b.end(); console.error(e); return toast('Não foi possível gerar o PDF.'); }
    const av = procAvulsa();
    const f = VIEW === 'mesa' && M.p === av && M.fsel ? folhaAtual() : null;
    const nd = await novoDocPdf(av, d.nome, bytes, 'linha');
    b.end();
    if(f && f.d){ av.docs = av.docs.filter(x => x !== nd); const i = av.docs.indexOf(f.d); av.docs.splice(i + 1, 0, nd); }
    touch(av); saveDB(true); pronto();
    if(VIEW === 'mesa' && M.p === av){ renderMesa(true); setTimeout(() => { irParaDoc(nd.id); if(M.fsel) renderSelBar(); }, 90); }
    else abrirMesa(av, { pdf:true, doc:nd.id });
    toast('Texto na mesa de PDF.');
  }
  const bVer = h('button', { class:'btn', onclick:ver }, h('span', { html:I.eye }), 'Ver');
  const bExp = h('button', { class:'btn', onclick:ev => popMenu(ev.currentTarget, [
    { t:'Salvar ou compartilhar o PDF', ic:'share', fn:() => exportar('pdf') },
    { t:'Word (para editar fora)', ic:'doc', fn:() => exportar('word') },
    c.mesaPdf ? null : '-',
    c.mesaPdf ? null : { t:'Pôr na Mesa de PDF', sub:'para carimbar e numerar', ic:'layers', fn:porNaMesa },
    c.p ? null : { t:'Entrar num processo…', ic:'folder', fn:entrarEmOutro }]) }, h('span', { html:I.share }), 'Exportar');
  const bPri = c.p ? h('button', { class:'btn acc', onclick:() => entrar(c.p, c.atual ? (c.atual.pai || c.atual.id) : null) }, 'Entrar no processo')
    : c.mesaPdf ? h('button', { class:'btn acc', onclick:porNaMesa }, 'Pôr na mesa')
      : h('button', { class:'btn acc', onclick:entrarEmOutro }, 'Entrar num processo');
  bPriRef = bPri; pinta();
  s.el.append(h('div', { class:'shf tpPe' }, bVer, bExp, bPri));
  setTimeout(() => { if(!txa.value) txa.focus(); }, 120);
}

/* ---------- calculadora ---------- */
function calcSheet(){
  let expr = '';
  const vis = h('div', { class:'calcv' }, '0');
  const put = s => { expr += s; vis.textContent = expr; };
  const calc = () => { try{ const v = Function('"use strict";return (' + expr.replace(/×/g, '*').replace(/÷/g, '/').replace(/,/g, '.').replace(/[^0-9+\-*/().]/g, '') + ')')(); if(v == null || !isFinite(v)) throw 0; expr = String(Math.round(v * 1e8) / 1e8); vis.textContent = (typeof v === 'number' ? v.toLocaleString('pt-BR', { maximumFractionDigits:8 }) : expr); }catch(e){ vis.textContent = 'erro'; expr = ''; } };
  const K = [['C', () => { expr = ''; vis.textContent = '0'; }], ['(', () => put('(')], [')', () => put(')')], ['÷', () => put('÷')],
    ['7', () => put('7')], ['8', () => put('8')], ['9', () => put('9')], ['×', () => put('×')],
    ['4', () => put('4')], ['5', () => put('5')], ['6', () => put('6')], ['−', () => put('-')],
    ['1', () => put('1')], ['2', () => put('2')], ['3', () => put('3')], ['+', () => put('+')],
    ['⌫', () => { expr = expr.slice(0, -1); vis.textContent = expr || '0'; }], ['0', () => put('0')], [',', () => put(',')], ['=', calc]];
  const grid = h('div', { class:'calcg' }, K.map(([t, fn]) => h('button', { class:'calcb' + (/[÷×\-+=]/.test(t) || t === '−' ? ' op' : '') + (t === 'C' ? ' cl' : '') + (t === '=' ? ' eq' : ''), onclick:fn }, t)));
  sheet({ titulo:'Calculadora', corpo:[vis, grid] });
}

/* ---------- ficha central ---------- */
function inputMoney(v){
  const i = h('input', { class:'inp', inputmode:'decimal', placeholder:'0,00' });
  const n = numBR(v); i.value = n == null ? '' : n.toLocaleString('pt-BR', { minimumFractionDigits:2, maximumFractionDigits:2 });
  i.addEventListener('blur', () => { const x = numBR(i.value); if(x != null) i.value = x.toLocaleString('pt-BR', { minimumFractionDigits:2, maximumFractionDigits:2 }); });
  return i;
}
function fichaSheet(p, o = {}){
  if(!p && !o.completa) return aberturaSheet(o);
  const novo = !p;
  const base = p ? p.ficha : { extras:[], setor:settings.setor || '' };
  const campos = {};
  const listas = { MODALIDADES, SETORES, TIPOS_OBJ, MOD_COD, ESPECIES, SIM_NAO, PCA_OPC };
  const SELECTS = ['TIPOS_OBJ', 'MOD_COD', 'ESPECIES', 'SIM_NAO', 'PCA_OPC'];
  const corpo = [];
  let grupo = null, box = null, revitLbl = null;
  if(novo) corpo.push(h('p', { class:'muted', style:{ margin:0, fontSize:'13.5px' } }, 'Preencha o que já souber. Tudo o que você colocar aqui entra sozinho nos despachos, na nota técnica, no DFD, no ETP e no TR. Dá para pular e preencher depois.'));
  const catSel = h('select', { class:'sel' }, CATS.map(c => h('option', { value:c[0], selected:(p ? p.cat : (o.cat || 'diversos')) === c[0] }, c[1])));
  const stSel = h('select', { class:'sel' }, STATUS.map(s => h('option', { value:s, selected:(p ? p.status : 'Em elaboração') === s }, s)));
  const fls = h('input', { class:'inp', inputmode:'numeric', value:p ? String(p.fls0 || 1) : '1' });
  for(const [k, rot, tipo, g] of FICHA){
    if(g !== grupo){ grupo = g; const lb = h('div', { class:'lbl', style:{ marginTop:'6px' } }, g === 'REVIT' ? 'REVIT — estudo de viabilidade técnica' : g); if(g === 'REVIT') revitLbl = lb; corpo.push(lb); box = h('div', { class:'fgrp' }); corpo.push(box); }
    let inp;
    if(tipo === 'money') inp = inputMoney(base[k]);
    else if(tipo === 'area') inp = h('textarea', { class:'txa', rows:k === 'objeto' ? 3 : 2 }, base[k] || '');
    else if(tipo === 'date') inp = h('input', { class:'inp', type:'date', value:base[k] || '' });
    else if(tipo === 'number') inp = h('input', { class:'inp', inputmode:'numeric', value:base[k] || '' });
    else if(tipo.startsWith('list:') && SELECTS.includes(tipo.slice(5))){ inp = h('select', { class:'sel' }, h('option', { value:'' }, '—'), listas[tipo.slice(5)].map(x => h('option', { value:x, selected:base[k] === x }, x))); }
    else if(tipo.startsWith('list:')){ const id = 'dl' + uid(); inp = h('input', { class:'inp', list:id, value:base[k] || '' }); box.append(h('datalist', { id }, listas[tipo.slice(5)].map(x => h('option', { value:x })))); }
    else inp = h('input', { class:'inp', value:base[k] || '' });
    if(k === 'saldo' || k === 'valorAtual' || k === 'termino') inp.placeholder = k === 'saldo' ? 'Calculado se vazio' : k === 'valorAtual' ? 'Igual ao inicial se vazio' : 'Início + prazo se vazio';
    campos[k] = { inp, tipo };
    box.append(h('label', { class:'fld' + (tipo === 'area' || k === 'num' ? ' w2' : '') }, h('span', null, rot), inp));
    if(k === 'contratada') box.append(h('button', { class:'btn sm soft', style:{ alignSelf:'end' }, onclick:ev => menuContratada(ev.currentTarget, inp.value, x => { const pc = patchContratada(x); ['contratada', 'cnpj', 'contratadaEnd', 'contratadaResp'].forEach(c => { if(campos[c]) campos[c].inp.value = pc[c]; }); }) }, 'Cadastro de contratadas'));
    if(k === 'num'){ box.append(h('label', { class:'fld' }, h('span', null, 'Categoria'), catSel), h('label', { class:'fld' }, h('span', null, 'Situação'), stSel)); }
  }
  const prevRevit = () => {
    if(!revitLbl) return;
    const f = ler(), q = { ficha:Object.assign({}, f, { revitSeq: p && p.ficha.revitInicio === f.revitInicio && p.ficha.revitSeq ? p.ficha.revitSeq : (f.revitInicio ? revitSeqLivre(f.revitInicio, p) : 1) }) };
    if(campos.sigla && !campos.sigla.inp.value) campos.sigla.inp.placeholder = siglaDoObjeto(campos.objeto.inp.value) || 'automática';
    revitLbl.textContent = 'REVIT — ' + (revitTexto(q) || 'informe a data real de início do estudo');
  };
  setTimeout(() => { Object.values(campos).forEach(c => c.inp.addEventListener('input', prevRevit)); Object.values(campos).forEach(c => c.inp.addEventListener('change', prevRevit)); prevRevit(); }, 0);
  corpo.push(h('div', { class:'lbl', style:{ marginTop:'6px' } }, 'Folhas'));
  corpo.push(h('div', { class:'fgrp' }, h('label', { class:'fld' }, h('span', null, 'Folha inicial do processo'), fls), h('p', { class:'muted', style:{ margin:0, fontSize:'12.5px', alignSelf:'end' } }, 'Se o processo já tem folhas antes do primeiro documento daqui.')));
  corpo.push(h('div', { class:'lbl', style:{ marginTop:'6px' } }, 'Campos extras'));
  const extras = h('div', { style:{ display:'flex', flexDirection:'column', gap:'8px' } });
  const addExtra = (k, v) => { const a = h('input', { class:'inp', placeholder:'Nome do campo', value:k || '' }), b = h('input', { class:'inp', placeholder:'Valor', value:v || '' }); const r = h('div', { class:'row', style:{ flexWrap:'nowrap' } }, a, b, h('button', { class:'ib sm', html:I.x, 'aria-label':'Remover', onclick:() => r.remove() })); r._k = a; r._v = b; extras.append(r); };
  (base.extras || []).forEach(e => addExtra(e.k, e.v));
  corpo.push(extras, h('button', { class:'btn sm soft', style:{ alignSelf:'flex-start' }, onclick:() => addExtra() }, h('span', { html:I.plus }), 'Campo extra'));
  corpo.push(h('p', { class:'muted', style:{ margin:0, fontSize:'12.5px' } }, 'Campo extra entra nos modelos como {{nome_do_campo}}.'));
  const ler = () => {
    const f = Object.assign({}, base || {}, { extras:[] }); FICHA_KEYS.forEach(k => delete f[k]);   /* guarda o que não está no formulário (secretaria, revitSeq…) */
    for(const k in campos){ const c = campos[k]; let v = c.inp.value.trim(); if(c.tipo === 'money'){ const n = numBR(v); v = n == null ? '' : String(Math.round(n * 100) / 100); } f[k] = v; }
    extras.querySelectorAll('.row').forEach(r => { const k = r._k.value.trim(), v = r._v.value.trim(); if(k) f.extras.push({ k, v }); });
    return f;
  };
  const salvar = abrir => {
    const f = ler();
    if(novo){
      if(f.revitInicio) f.revitSeq = revitSeqLivre(f.revitInicio);
      const q = novoProc({ cat:catSel.value, status:stSel.value, fls0:parseInt(fls.value, 10) || 1, ficha:f, pasta:o.pasta || null });
      DB.procs.push(q); marcarUltimo(q); saveDB(true);
      if(VIEW === 'home') renderHome();
      if(abrir) abrirProcTela(q); else redesenharNav();
      toast('Processo criado.');
      return;
    }
    if(VIEW === 'mesa' && M.p === p) salvarTudo();
    const antes = clone(p.ficha);
    if(f.revitInicio && (f.revitInicio !== antes.revitInicio || !antes.revitSeq)) f.revitSeq = revitSeqLivre(f.revitInicio, p); else f.revitSeq = antes.revitSeq;
    if(f.contratada) garantirContratada({ nome:f.contratada, cnpj:f.cnpj, end:f.contratadaEnd, resp:f.contratadaResp });
    p.ficha = f; p.cat = catSel.value; p.status = stSel.value; p.fls0 = parseInt(fls.value, 10) || 1; touch(p);
    const n = replicarFicha(p, antes);
    saveDB(true);
    toast(n ? 'Ficha salva. ' + plural(n, 'documento atualizado', 'documentos atualizados') + ' com os novos dados.' : 'Ficha salva.');
    aposMudarProc(p);
  };
  sheet({ titulo:novo ? 'Novo processo' : 'Ficha central', cheio:true, corpo, botoes:novo
    ? [{ t:'Pular a ficha', v:'ghost', fn:() => { const q = novoProc({ cat:catSel.value, fls0:parseInt(fls.value, 10) || 1, ficha:ler(), pasta:o.pasta || null }); DB.procs.push(q); marcarUltimo(q); saveDB(true); abrirProcTela(q); } }, { t:'Criar processo', v:'pri', fn:() => salvar(true) }]
    : [{ t:'Cancelar', v:'ghost' }, { t:'Salvar ficha', v:'pri', fn:() => salvar(false) }] });
}
/* redesenha o que estiver aberto depois de mudar um processo */
function aposMudarProc(p){
  if(VIEW === 'home') renderHome();
  if(VIEW === 'pasta') renderPasta();
  if(VIEW === 'proc') renderProcTela();
  if(VIEW === 'rel' && REL && REL.id === p.id) renderRel();
  if(VIEW === 'mesa' && M.p === p){ renderMesa(true); }
}

/* ---------- aba Relatórios do início ---------- */
function homeRelatorios(b){
  const ps = procsReais().sort((a, b) => b.updated - a.updated);
  b.append(h('div', { class:'sec-t' }, h('h3', null, 'Relatório geral')));
  const abertos = ps.filter(p => p.status !== 'Concluído');
  const totPend = ps.reduce((a, p) => a + pendAbertas(p).length, 0);
  b.append(h('div', { class:'rbox', style:{ display:'flex', flexDirection:'column', gap:'10px' } },
    h('div', { class:'stat' }, h('div', null, h('small', null, 'Objetos'), h('b', null, String(ps.length))), h('div', null, h('small', null, 'Em andamento'), h('b', null, String(abertos.length))), h('div', null, h('small', null, 'Pendências'), h('b', null, String(totPend)))),
    h('p', { class:'muted', style:{ margin:0, fontSize:'13px' } }, 'Lista de todos os objetos com situação, onde está e pendências. Serve para as reuniões.'),
    h('div', { class:'rbtns' }, h('button', { class:'btn acc', onclick:() => relGeralPdf(ps) }, h('span', { html:I.pdf }), 'PDF'), h('button', { class:'btn', onclick:() => copiarTexto(relGeralTexto(ps), 'Relatório copiado. Cole no WhatsApp.') }, h('span', { html:I.whats }), 'WhatsApp'))));
  b.append(h('div', { class:'sec-t' }, h('h3', null, 'Por processo')));
  if(!ps.length){ b.append(h('div', { class:'empty' }, 'Nenhum processo ainda.')); return; }
  const l = h('div', { class:'plist' });
  ps.forEach(p => {
    const t = tramAtual(p), pend = pendAbertas(p);
    l.append(h('button', { class:'pc', onclick:() => abrirRel(p) },
      h('div', { class:'l1' }, h('span', { class:'num' }, p.ficha.num ? 'Processo ' + p.ficha.num : 'Processo sem número'), chipStatus(p.status)),
      h('div', { class:'obj' }, objetoProc(p)),
      h('div', { class:'l3' }, t ? h('span', null, t.setor + (t.acao ? ' — ' + t.acao : '')) : h('span', null, 'Sem tramitação registrada'),
        pend.length ? h('span', { class:'chip warn' }, plural(pend.length, 'pendência', 'pendências')) : h('span', { class:'chip ok' }, 'Sem pendências'))));
  });
  b.append(l);
}

/* ===== f_mesa.js ===== */
/* =====================================================================
   Mesa: o processo inteiro em folhas, para ler e editar
   ===================================================================== */
const M = { p:null, zoom:88, selMode:false, painel:null, rTab:'pag', quebras:{}, pgList:[], anchors:[], cur:null, fls:{}, lay:null, editing:false };
const docEl = $('doc'), pagesEl = $('pages'), screenEl = $('mScreen');
const docById = id => M.p ? M.p.docs.find(d => d.id === id) || null : null;
const paginaEl = id => pagesEl.querySelector('.page[data-doc="' + id + '"]');

/* ---------- botões da tela (editáveis) ---------- */
const XS = [7.5, 21.5, 35.5, 49.5, 63.5, 77.5, 91.5];
function layPadrao(){
  const els = [];
  const ic = (code, x, ay, dy, size, rot, acao, cor, icone) => els.push({ id:uid(), code, type:'icone', x, ay, dy, size, shape:'bola', cor:cor || 'branco', rot, acao:acao || '', nota:'', ic:icone || '' });
  els.push(...topoPadrao());
  const up = [['R', 'revisar'], ['P', 'palavra'], ['¶', 'paragrafo'], ['T', 'tudo'], ['C', 'copiar'], ['V', 'colar'], ['▲', 'cima']];
  const dn = [['S', 'selecionar'], ['◀', 'esq'], ['▶', 'dir'], ['M', 'marca'], ['⊞', 'tabela'], ['Aa', 'formatar'], ['▼', 'baixo']];
  up.forEach((u, i) => ic('R' + (i + 1), XS[i], 'bottom', 74, 38, u[0], u[1]));
  dn.forEach((u, i) => ic('R' + (i + 8), XS[i], 'bottom', 28, 38, u[0], u[1]));
  return { v:3, topH:52, botH:100, abaY:12, leftW:88, rightW:92, speed:40, iconMode:'bola', labelMode:'nome', els };
}
/* barra de cima: início, título, lupa −, 88%, lupa +, rolar, notas, compartilhar */
function topoPadrao(){
  const els = [];
  const ic = (code, x, size, rot, acao, cor, icone) => els.push({ id:uid(), code, type:'icone', x, ay:'top', dy:26, size, shape:'bola', cor:cor || 'branco', rot, acao, nota:'', ic:icone || '' });
  ic('T1', 6.5, 34, 'Início', 'home', '', 'home');
  els.push({ id:uid(), code:'T2', type:'titulo', x:25.5, ay:'top', dy:26, w:27, h:40 });
  ic('Z2', 44.5, 30, 'Diminuir', 'zoomMenos', 'vidro', 'zoomOut');
  ic('Z1', 53, 32, '88%', 'zoom88', 'vidro');
  ic('Z3', 61.5, 30, 'Aumentar', 'zoomMais', 'vidro', 'zoomIn');
  ic('T3', 71.5, 34, 'Rolar', 'rolar');
  ic('T4', 81.5, 34, 'Folhas', 'selfolhas', '', 'selpg');
  ic('T5', 91.5, 34, 'Compartilhar', 'compartilhar', '', 'share');
  return els;
}
/* quem já tinha botões salvos: setas passam a mover o cursor e, se o topo estava como veio, ganha as lupas */
function migrarLay(L){
  L.els.forEach(e => { if(e.code === 'R7' && e.acao === 'anterior') e.acao = 'cima'; if(e.code === 'R14' && e.acao === 'proxima') e.acao = 'baixo'; });
  const orig = { T1:6.5, T2:31, Z1:55.5, T3:67, T4:79, T5:91 };
  const intacto = Object.keys(orig).every(c => { const e = L.els.find(x => x.code === c); return e && e.x === orig[c] && e.ay === 'top'; });
  if(intacto) L.els = L.els.filter(e => !(e.code in orig)).concat(topoPadrao());
  delete L.edgeTop; delete L.edgeH; if(L.abaY == null) L.abaY = 12;
  L.v = 2;
  return migrarLay3(L);
}
/* v3 (Panda): todos os botões iguais (sem o ▼ laranja) e o botão de notas vira seleção de folhas */
function migrarLay3(L){
  L.els.forEach(e => {
    if(e.cor === 'laranja'){ e.cor = 'branco'; if(e.size === 42) e.size = 38; }
    if(e.code === 'T4' && e.acao === 'notas'){ e.acao = 'selfolhas'; e.rot = 'Folhas'; e.ic = 'selpg'; }
  });
  L.v = 3; settings.lay = L; saveSettings();
  return L;
}
function layRetrato(){
  if(M.lay) return M.lay;
  let L = settings.lay;
  if(L && L.v === 1) L = migrarLay(L);
  else if(L && L.v === 2) L = migrarLay3(L);
  return M.lay = L && L.v === 3 ? L : layPadrao();
}
/* celular deitado = modo leitura: sem barra de cima, botões de leitura embaixo à esquerda, sem zoom */
function layDeitado(){
  if(M.layD) return M.layD;
  const els = [], b = (code, px, rot, acao, cor) => els.push({ id:'d-' + code, code, type:'icone', px, ay:'bottom', dy:27, size:38, shape:'bola', cor:cor || 'branco', rot, acao, nota:'', ic:'' });
  b('D1', 30, 'S', 'selecionar'); b('D2', 75, '◀', 'esq'); b('D3', 120, '▶', 'dir'); b('D4', 165, '▲', 'cima'); b('D5', 210, '▼', 'baixo');
  b('D6', 266, 'C', 'copiar'); b('D7', 311, 'V', 'colar'); b('D8', 368, 'Rolar', 'rolar');
  return M.layD = { v:2, topH:0, botH:54, abaY:10, leftW:52, rightW:58, iconMode:'bola', labelMode:'nome', els, fixo:true };
}
const lay = () => M.deitado ? layDeitado() : layRetrato();
/* margens seguras da tela (entalhe da câmera quando deitado) */
function margemSegura(){ const pr = $('saProbe'); if(!pr) return { l:0, r:0 }; const cs = getComputedStyle(pr); return { l:parseFloat(cs.paddingLeft) || 0, r:parseFloat(cs.paddingRight) || 0 }; }
const ehDeitado = () => { const W = window.innerWidth, H = window.innerHeight; return W > H && Math.min(screen.width || W, screen.height || H) < 600; };
const layY = (e, H) => e.ay === 'bottom' ? H - e.dy : e.dy;
/* em tela larga (computador) os botões ficam numa faixa central, do tamanho de um celular grande */
const faixaBotoes = W => Math.min(W, 640);
function aplicarBarras(){
  const L = lay();
  $('barTop').style.height = L.topH + 'px'; $('barTop').hidden = L.topH <= 0;
  $('barBot').style.height = L.botH + 'px'; $('barBot').hidden = L.botH <= 0;
  docEl.style.top = L.topH + 'px'; docEl.style.bottom = L.botH + 'px';
  const W = screenEl.clientWidth || window.innerWidth, F = faixaBotoes(W), sa = margemSegura();
  const mgL = (M.deitado ? sa.l : Math.round((W - F) / 2)) + 10, mgR = (M.deitado ? sa.r : Math.round((W - F) / 2)) + 10;
  const by = L.botH + (L.abaY == null ? 12 : L.abaY);
  $('edgeL').style.bottom = $('edgeR').style.bottom = by + 'px';
  $('edgeL').style.left = mgL + 'px'; $('edgeR').style.right = mgR + 'px';
  screenEl.classList.toggle('deitado', !!M.deitado);
  $('pLeft').style.width = L.leftW + '%'; $('pRight').style.width = L.rightW + '%';
  $('pill').style.top = (L.topH + 10) + 'px';
  /* bolinhas: ✎ signatário (ou PDF) acima do botão da aba esquerda; + novo documento acima da direita */
  $('bSig').style.left = $('bPdf').style.left = mgL + 'px'; $('bNovo').style.right = mgR + 'px';
  $('bSig').style.bottom = $('bPdf').style.bottom = $('bNovo').style.bottom = (by + 46) + 'px';
  M.abaPos = { l:mgL, r:mgR, b:by };
  $('fmt').style.bottom = (L.botH + 8) + 'px';
}
function rotuloEl(e){
  const L = lay();
  if(e.acao === 'zoom88') return L.labelMode === 'codigo' ? e.code : Math.round(M.zoom) + '%';
  return L.labelMode === 'codigo' ? e.code : L.labelMode === 'nome' ? (e.rot || '') : '';
}
function aplicarEl(n, e){
  const H = screenEl.clientHeight || window.innerHeight, W = screenEl.clientWidth || window.innerWidth, L = lay(), F = faixaBotoes(W);
  n.style.left = Math.round(e.px != null ? margemSegura().l + e.px : (W - F) / 2 + e.x / 100 * F) + 'px'; n.style.top = layY(e, H) + 'px';
  let cls = 'el ' + e.type; n.textContent = '';
  if(e.type === 'icone'){
    const lab = rotuloEl(e), shape = L.iconMode === 'misto' ? e.shape : L.iconMode;
    cls += ' ' + shape + (e.cor && e.cor !== 'branco' ? ' ' + e.cor : '') + (lab && lab.length <= 2 && !(e.ic && L.labelMode === 'nome') ? ' curto' : '') + (e.acao ? ' a-' + e.acao : '');
    if((e.acao === 'rolar' && ROL.on) || (e.acao === 'selecionar' && M.selMode) || (e.acao === 'selfolhas' && M.fsel) || (e.acao === 'formatar' && !$('fmt').hidden) || (e.acao === 'notas' && M.painel === 'dir' && M.rTab === 'notas')) cls += ' ativo';
    n.style.width = n.style.height = e.size + 'px';
    if(e.ic && I[e.ic] && L.labelMode === 'nome') n.innerHTML = I[e.ic]; else n.textContent = lab;
    n.setAttribute('aria-label', acaoNome(e.acao) || e.rot || e.code);
  } else if(e.type === 'titulo'){
    n.style.width = Math.round(e.w / 100 * F) + 'px'; n.style.height = e.h + 'px';
    const d = M.cur && M.cur.d, fl = M.cur && M.cur.fl;
    n.append(h('b', null, M.p ? (M.p.avulsa ? 'Mesa de PDF' : M.p.avdoc ? (M.p.numint ? 'SEINFRA N. ' + M.p.numint : (TIPO_NOME[M.p.tipoAv] || 'Avulso')) : (M.p.ficha.num ? M.p.ficha.num : 'Processo')) : ''), h('span', null, d ? d.nome + (fl ? ' · fls. ' + fl : '') : (M.p ? objetoProc(M.p) : '')));
    if(L.labelMode === 'codigo') n.append(h('span', { class:'tag' }, e.code));
  } else {
    n.style.width = Math.round(e.w / 100 * F) + 'px'; n.style.height = e.h + 'px';
    if(e.type === 'texto'){ cls += ' ' + (e.box || 'nenhuma') + (e.neg ? ' negrito' : ''); n.append(h('span', { class:'tx' }, e.text || '')); }
    if(L.labelMode === 'codigo') n.append(h('span', { class:'tag' }, e.code));
  }
  if(M.editing && ED.sel === e.id){ cls += ' sel'; n.append(h('span', { class:'knob' })); }
  n.className = cls;
}
function renderLay(){
  const layer = $('L-tela'); layer.replaceChildren();
  lay().els.forEach(e => { const n = h('div', { dataset:{ id:e.id } }); aplicarEl(n, e); layer.append(n); });
}
const elsDe = acao => Array.from($('L-tela').children).filter(n => { const e = lay().els.find(x => x.id === n.dataset.id); return e && (!acao || e.acao === acao); });
function atualizarIcones(){
  lay().els.forEach(e => { const n = $('L-tela').querySelector('[data-id="' + e.id + '"]'); if(n) aplicarEl(n, e); }); mostrarAbaBtns();
  const b = $('aBot').querySelector('[data-a="selecionar"]'); if(b) b.classList.toggle('on', !!M.selMode);
  const d = M.cur && M.cur.d; $('aSig').hidden = !(d && d.kind === 'texto');
}
/* botõezinhos das abas: somem quando uma aba ou a faixa de formatação está aberta */
function mostrarAbaBtns(){
  const esc = !!M.painel || !$('fmt').hidden || !!M.fsel || M.editing;
  $('edgeL').hidden = $('edgeR').hidden = esc;
  const d = M.cur && M.cur.d, bub = esc || !!M.deitado || !M.p;
  $('bNovo').hidden = bub || !!M.p.avulsa;
  $('bSig').hidden = bub || !d || d.kind !== 'texto';
  $('bPdf').hidden = bub || !d || d.kind !== 'pdf' || !M.cur.e;
}

/* ---------- abrir ---------- */
function abrirMesa(p, o = {}){
  if(M.p && M.p !== p) salvarTudo();
  if(M.fsel) sairSelecao(true);
  M.p = p; M.zoom = 100; pagesEl.style.setProperty('--tz', 1); pagesEl.classList.remove('tzoom'); M.quebras = {}; M.notas = {}; M.cur = null; M.selMode = false; TEC.digitando = false; TEC.ultimo = null;
  M.voltar = o.voltar || null; M.modoPdf = !!o.pdf;
  M.split = !p.avulsa && !p.avdoc && o.split !== false && !ehDeitado(); M.docAberto = o.doc || null;
  DB.ui.proc = p.id; if(!o.doc) DB.ui.doc = null; marcarUltimo(p); saveDB();
  fecharPainel(true); $('fmt').hidden = true; pararRolagem();
  mostrar('mesa');
  const vt = $('aHome').querySelector('span:last-child'); if(vt) vt.textContent = p.avulsa || p.avdoc ? 'Início' : 'Processo';
  if(M.split){ NAVP.proc = p.id; renderProcTela(); } else ajustarSplit();
  M.deitado = ehDeitado(); M.lastW = 0; M.girando = null;
  aplicarBarras();
  renderMesa();
  if(o.doc) setTimeout(() => { irParaDoc(o.doc); if(o.focar) focarDoc(o.doc); }, 60);
}
/* copia o que está na tela para os dados (só quando a mesa está aberta e é deste processo) */
function salvarTudo(){
  if(!M.p || VIEW !== 'mesa' || pagesEl.dataset.proc !== M.p.id) return;
  limparFolhaTmp(true);
  for(const k in salvarT) clearTimeout(salvarT[k]);
  pagesEl.querySelectorAll('.page.txt .body').forEach(b => { const d = docById(b.parentElement.dataset.doc); if(d) d.html = htmlDoBody(b); });
  saveDB(true);
}
/* grava só os textos que ainda tinham digitação pendente */
function descarregar(){
  if(!M.p || pagesEl.dataset.proc !== M.p.id) return;
  for(const id in salvarT){
    if(!salvarT[id]) continue;
    clearTimeout(salvarT[id]); salvarT[id] = 0;
    const d = docById(id), pg = paginaEl(id);
    if(d && pg) d.html = htmlDoBody(pg.querySelector('.body'));
  }
}
function largarMesa(){
  salvarTudo(); if(typeof limparVazios === 'function') limparVazios(M.p); pararRolagem(); fecharPainel(true);
  if(M.fsel) sairSelecao(true);
  pagesEl.replaceChildren(); pagesEl.dataset.proc = ''; M.p = null; esconderCaret();
  M.split = false; M.docAberto = null; ajustarSplit();
}
function sairMesa(){
  buscaFechar(); fecharComentario();
  salvarTudo(); pararRolagem(); fecharPainel(true);
  if(M.fsel) sairSelecao(true);
  const volta = M.voltar && procPorId(M.voltar);
  if(volta && volta !== M.p){ M.voltar = null; return abrirMesa(volta); }
  const p = M.p, real = p && !p.avulsa && !p.avdoc;
  largarMesa();
  if(real) return abrirProcTela(p);
  mostrar('home'); renderHome();
}

/* ---------- páginas ---------- */
let obs = null;
function larguraBase(){ return Math.min((docEl.clientWidth || window.innerWidth) * 0.92, 820); }
function renderMesa(manterScroll){
  const p = M.p; if(!p) return;
  descarregar();
  const sc = docEl.scrollTop;
  if(obs) obs.disconnect();
  obs = new IntersectionObserver(ents => ents.forEach(en => { if(en.isIntersecting) filaPdf(en.target); }), { root:docEl, rootMargin:'700px 0px' });
  pagesEl.replaceChildren(); pagesEl.dataset.proc = p.id;
  const linha = p.docs.filter(d => d.linha);
  if(!linha.length){
    pagesEl.append(h('div', { class:'mEmpty' }, h('b', null, p.avulsa ? 'Mesa de PDF' : 'Processo sem documentos'),
      h('span', null, p.avulsa ? 'Inclua PDFs, fotos, ZIP do WhatsApp ou um texto pronto para girar, carimbar e numerar.' : 'Comece por um documento novo ou inclua os PDFs que você já tem.'),
      h('div', { class:'row', style:{ justifyContent:'center' } },
        p.avulsa ? null : h('button', { class:'btn acc', onclick:() => novoDocumento({}) }, h('span', { html:I.docplus }), 'Novo documento'),
        h('button', { class:'btn', onclick:() => incluirPdfNaMesa() }, h('span', { html:I.clip }), 'Incluir PDF'),
        p.avulsa ? h('button', { class:'btn', onclick:() => fotografar() }, h('span', { html:I.camera }), 'Fotografar') : null,
        p.avulsa ? h('button', { class:'btn', onclick:() => textoPronto({}) }, h('span', { html:I.paste }), 'Texto pronto') : null),
      p.avulsa || p.avdoc ? null : h('button', { class:'btn ghost sm', onclick:() => fichaSheet(p) }, 'Preencher a ficha central')));
  }
  for(const d of linha){
    pagesEl.append(h('div', { class:'dlabel', dataset:{ lab:d.id } }, h('span', { class:'dn' }, d.nome), h('span', { class:'dfl' })));
    if(d.kind === 'texto'){
      const body = h('div', { class:'body', contenteditable:'true', spellcheck:'true', lang:'pt-BR', inputmode:TEC.digitando ? 'text' : 'none', html:d.html || '<p><br></p>' });
      const pg = h('div', { class:'page txt' + (d.bras === 'nenhum' ? ' semtimbre' : ''), dataset:{ doc:d.id } },
        d.bras !== 'nenhum' ? h('div', { class:'timbre' }, h('img', { src:BRAS_SRC, alt:'' }), timbreLinhas().map(t => h('b', null, t)), timbreLinhas().length ? h('i', { class:'rule' }) : null) : null,
        body, fechoEl(d), h('div', { class:'notasV', hidden:true }), tarjaEl(d), h('span', { class:'fl fl0' }));
      prepararCorpo(body, d);
      ligarTexto(body, d);
      pagesEl.append(pg);
    } else {
      const lv = vivas(d);
      if(!lv.length) pagesEl.append(h('div', { class:'page ph', dataset:{ doc:d.id } }, 'Todas as páginas deste PDF foram retiradas.', h('button', { class:'btn sm', onclick:() => { d.pl.forEach(e => e.d = false); saveDB(); renderMesa(true); } }, 'Restaurar páginas')));
      d.pl.forEach((e, idx) => {
        if(e.d) return;
        const [w, hh] = tamanhoPagina(d, e);
        const pg = h('div', { class:'page pdf', dataset:{ doc:d.id, i:String(idx) }, style:{ aspectRatio:w + ' / ' + hh } },
          h('canvas'), h('div', { class:'ld' }, temPdfjs() ? '' : 'Carregando leitor de PDF…'), h('span', { class:'fl' }));
        const tags = []; if(e.b) tags.push('Brasão'); if(e.s < 0) tags.push('Em branco');
        if(tags.length) pg.append(h('div', { class:'pb' }, tags.map(t => h('span', null, t))));
        pg._ratio = hh / w;
        pagesEl.append(pg); obs.observe(pg);
      });
    }
  }
  aplicarLarguras();
  atualizarFolhas();
  renderLay();
  if(manterScroll) docEl.scrollTop = sc;
  mapaPaginas(); aoRolar();
  diagramarTudo();
  if(M.painel) renderPainel();
  mostrarAbaBtns();
  if(M.fsel) pintarSelecao();
  atualizarCaret();
  if(typeof aplicarLayUI === 'function') aplicarLayUI();
  if(typeof pintarSelos === 'function') pintarSelos();
  if(BUSCA.bar && BUSCA.q) buscar(BUSCA.q, true);
}
function aplicarLarguras(){
  const w = Math.round(Math.min((docEl.clientWidth || window.innerWidth) * 0.88, 820));   /* folha travada em 88% */
  pagesEl.querySelectorAll('.page').forEach(p => p.style.width = w + 'px');
  pagesEl.querySelectorAll('.dlabel').forEach(l => l.style.width = w + 'px');
}
function atualizarFolhas(){
  if(!M.p) return;
  const F = M.fls = folhas(M.p);
  pagesEl.querySelectorAll('.dlabel').forEach(l => { const f = F[l.dataset.lab]; l.querySelector('.dfl').textContent = !f ? '' : f.k === 0 ? 'sem páginas' : f.k > 1 ? 'fls. ' + f.ini + '–' + f.fim : 'fls. ' + f.ini; });
  const cont = {};
  pagesEl.querySelectorAll('.page.pdf').forEach(pg => { const f = F[pg.dataset.doc]; if(!f) return; const k = cont[pg.dataset.doc] || 0; cont[pg.dataset.doc] = k + 1; pg.querySelector('.fl').textContent = 'fls. ' + (f.ini + k); });
  pagesEl.querySelectorAll('.page.txt').forEach(pg => { const f = F[pg.dataset.doc]; if(!f) return; pg.querySelector('.fl0').textContent = 'fls. ' + f.ini; pg.querySelectorAll('.brk .fl').forEach((m, j) => m.textContent = 'fls. ' + (f.ini + j + 1)); });
}

/* ---------- PDF: desenho sob demanda ---------- */
let filaP = Promise.resolve();
function filaPdf(pg){
  if(pg._fila) return; pg._fila = true;
  filaP = filaP.then(() => desenharPg(pg)).catch(e => { console.warn('pdf', e); const ld = pg.querySelector('.ld'); if(ld){ ld.textContent = 'Não consegui mostrar esta página. Toque para tentar de novo.'; ld.onclick = () => { pg._key = null; ld.textContent = 'Carregando…'; filaPdf(pg); }; } }).then(() => { pg._fila = false; });
}
async function desenharPg(pg){
  if(!temPdfjs() || !pg.isConnected) return;
  const d = docById(pg.dataset.doc); if(!d) return;
  const e = d.pl[+pg.dataset.i]; if(!e) return;
  const w = pg.clientWidth, key = w + '|' + JSON.stringify(e);
  if(pg._key === key) return;
  const bytes = await bytesDe(d.fileId);
  if(!bytes){ pg.querySelector('.ld').textContent = 'Arquivo não encontrado neste aparelho.'; return; }
  const pdf = await getPdf(d.fileId, bytes);
  await desenharPaginaPdf(pg.querySelector('canvas'), pdf, e, w);
  pg._key = key;
  try{ await aposDesenharPdf(pg, pdf, e, w); }catch(err){ console.warn('camada de texto', err); }
  const ld = pg.querySelector('.ld'); if(ld) ld.textContent = '';
}
function redesenharVisiveis(){
  const top = docEl.scrollTop - 400, bot = docEl.scrollTop + docEl.clientHeight + 400;
  pagesEl.querySelectorAll('.page.pdf').forEach(pg => { if(pg.offsetTop + pg.offsetHeight > top && pg.offsetTop < bot) filaPdf(pg); });
}
window.addEventListener('pdfjs-ready', () => { if(VIEW === 'mesa'){ pagesEl.querySelectorAll('.page.pdf .ld').forEach(l => l.textContent = ''); redesenharVisiveis(); } });

/* ---------- texto: edição, colagem e diagramação ---------- */
const salvarT = {}, diagT = {};
function ligarTexto(body, d){
  body.addEventListener('input', () => {
    if(body.querySelector('p.tmpP')) limparFolhaTmp(false);
    body.querySelectorAll('.campo,.fc.vazio').forEach(c => { if(!/^\[.*\]$/.test(c.textContent.trim())){ c.classList.remove('campo'); c.classList.remove('vazio'); } });
    clearTimeout(salvarT[d.id]); salvarT[d.id] = setTimeout(() => { salvarT[d.id] = 0; if(body.isConnected){ d.html = htmlDoBody(body); touch(M.p); saveDB(); } }, 450);
    clearTimeout(diagT[d.id]); diagT[d.id] = setTimeout(() => diagramar(d), 900);
  });
  body.addEventListener('paste', e => {
    const cd = e.clipboardData; if(!cd) return;
    /* inteiro teor marcado (bolinha i ou o texto todo): o que se cola substitui o documento e sai no padrão */
    if(typeof colarNoInteiro === 'function' && colarNoInteiro(body, d, cd)){ e.preventDefault(); return; }
    const html = htmlDeColagem(cd);
    if(html == null) return;
    e.preventDefault();
    const s = window.getSelection();
    const campo = s.anchorNode && (s.anchorNode.nodeType === 1 ? s.anchorNode : s.anchorNode.parentElement).closest('.campo');
    if(campo && body.contains(campo) && body.children.length === 1 && campo.parentElement === body.firstElementChild){
      body.innerHTML = html || '<p><br></p>';
      if(d.modelo === 'colar' && d.nome === 'Texto pronto'){ d.nome = titleOf(body.innerHTML); const l = pagesEl.querySelector('[data-lab="' + d.id + '"] .dn'); if(l) l.textContent = d.nome; }
      body.dispatchEvent(new Event('input')); toast('Texto colado no padrão do texto pronto.'); return;
    }
    document.execCommand('insertHTML', false, html || '');
  });
  body.addEventListener('click', e => {
    if(typeof tocarCampo === 'function') return tocarCampo(e, body, d);
    const c = e.target.closest('.campo,.fc.vazio');
    if(c && !M.editing) selecionarNo(c);
  });
  body.addEventListener('focus', () => { M.focoDoc = d.id; });
}
let diagFila = Promise.resolve();
function diagramar(d){
  diagFila = diagFila.then(async () => {
    if(!window.PDFLib || !M.p || d.kind !== 'texto') return;
    const pg = paginaEl(d.id); if(!pg) return;
    const body = pg.querySelector('.body');
    try{
      prepararCorpo(body, d);
      const fe = pg.querySelector('.fecho'), els = fe ? { loc:fe.querySelector('.loc'), n1:fe.querySelector('.n1'), n2:fe.querySelector('.n2:not(.n3)'), n3:fe.querySelector('.n3') } : null;
      const r = await diagramarTexto(body, d, els);
      M.quebras[d.id] = r.quebras;
      mostrarNotas(pg, r.notas);
      const mudou = d.pags !== r.n; d.pags = r.n;
      marcar(d);
      if(mudou){ atualizarFolhas(); saveDB(); }
      mapaPaginas();
    }catch(e){ console.warn('diagramação', e); }
  });
  return diagFila;
}
function diagramarTudo(){ if(!M.p) return; M.p.docs.filter(d => d.linha && d.kind === 'texto').forEach(d => diagramar(d)); }
/* ---------- paginação na tela como no Word (Etapa 1) ----------
   Cada quebra vira um "vão" dentro do próprio texto: o fim da folha (com a tarja), a faixa cinza
   "fim da folha N" e o topo da folha seguinte (com o timbre). O texto continua no mesmo parágrafo,
   só que na folha de baixo, exatamente onde o PDF quebra. */
const GAP_PX = 30;
const brkIni = b => b.offsetTop + (b._ini || 0);
/* HTML do corpo sem os vãos de paginação (é o que se guarda) */
function htmlDoBody(body){
  if(!body) return '';
  if(!body.querySelector('.pgap, .fcEd')) return body.innerHTML;
  const c = body.cloneNode(true); c.querySelectorAll('.pgap').forEach(x => x.remove()); c.normalize();
  c.querySelectorAll('.fcEd').forEach(x => { x.classList.remove('fcEd'); ['contenteditable', 'inputmode', 'enterkeyhint'].forEach(a => x.removeAttribute(a)); });
  return c.innerHTML;
}
/* começo da n-ésima linha (0 = primeira) de um bloco na tela */
function inicioDaLinha(el, n){
  const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), r = document.createRange();
  let t, tops = [], last = null;
  while((t = w.nextNode())){
    if(t.parentElement && t.parentElement.closest('.pgap')) continue;
    const s = t.data;
    for(let i = 0; i < s.length; i++){
      if(/\s/.test(s[i])) continue;
      if(i > 0 && !/\s/.test(s[i - 1])) continue;
      r.setStart(t, i); r.setEnd(t, i + 1);
      const rc = r.getBoundingClientRect(); if(!rc.height) continue;
      const top = Math.round(rc.top);
      if(last == null || top > last + 2){ tops.push({ node:t, off:i, top }); last = top; }
      if(tops.length > n) return tops[n];
    }
  }
  return null;
}
function tirarVaos(pg){
  const g = pg.querySelectorAll('.pgap'); if(!g.length) return;
  const sel = guardarSel();
  g.forEach(x => x.remove());
  pg.querySelectorAll('.body').forEach(b => b.normalize());
  voltarSel(sel);
}
function novoVao(d, fl, timbre){
  const runs = tarjaRuns(d, M.p);
  const g = h('span', { class:'brk pgap naoimp', contenteditable:'false', 'aria-hidden':'true' },
    h('span', { class:'pgTarja', html: runs ? runsHTML(runs) : '' }),
    h('span', { class:'pgFim' }, 'fim da folha ' + (fl - 1)),
    timbre ? h('span', { class:'pgTimbre' }, h('img', { src:BRAS_SRC, alt:'' }), timbreLinhas().map(t => h('b', null, t)), timbreLinhas().length ? h('i', { class:'rule' }) : null) : null,
    h('span', { class:'fl' }, 'fls. ' + fl));
  g.addEventListener('mousedown', e => e.preventDefault());
  return g;
}
function marcar(d){
  const pg = paginaEl(d.id); if(!pg) return;
  tirarVaos(pg);
  const q = M.quebras[d.id] || [], W = pg.clientWidth;
  const f = M.fls[d.id] || { ini:1 };
  const modo = modoTimbre(d.bras);
  const sel = guardarSel();
  const vaos = [];
  q.forEach((x, j) => {
    const g = novoVao(d, f.ini + j + 1, modo === 'todas');
    let posto = false;
    if(x.el && pg.contains(x.el)){
      if(x.el.tagName === 'TABLE'){
        const rows = Array.from(x.el.querySelectorAll('tr')).filter(tr => tr.closest('table') === x.el && tr.querySelector('td,th'));
        if(x.ri > 0 && rows[x.ri]){ /* dentro da tabela: marca fina em cima da linha */
          g.classList.add('fina'); g.style.top = (rows[x.ri].getBoundingClientRect().top - pg.getBoundingClientRect().top) + 'px'; pg.append(g); posto = true;
        } else { x.el.before(g); posto = true; }
      } else if(x.linhas > 0){
        const pt = inicioDaLinha(x.el, x.linhas);
        if(pt){ const resto = pt.node.splitText(pt.off); resto.before(g); posto = true; }
        else { x.el.after(g); posto = true; }
      } else { x.el.before(g); posto = true; }
    }
    if(!posto){ g.classList.add('fina'); g.style.top = Math.round((j + 1) * W * 1.4142) + 'px'; pg.append(g); }
    g.classList.toggle('bloco', !g.classList.contains('fina') && g.parentElement && !g.parentElement.matches('p,li,td,th,h1,h2,h3,blockquote,b,i,u,em,strong,span'));
    vaos.push(g);
  });
  /* alturas: fim da folha + faixa + topo da próxima */
  const Hp = W * 1.4142, cq = W / 100, tarjaMin = cq * 2.016 + 2;
  let topo = 0;
  vaos.forEach(g => {
    if(g.classList.contains('fina')) return;
    const th = g.querySelector('.pgTarja').offsetHeight || cq * 3;
    let pb = topo + Hp - g.offsetTop;
    pb = Math.max(pb, tarjaMin + th + 4);
    const ph = g.querySelector('.pgTimbre') ? cq * 23.809 : cq * 9.523;
    g.style.setProperty('--pb', pb + 'px'); g.style.setProperty('--gap', GAP_PX + 'px'); g.style.setProperty('--ph', ph + 'px');
    g.style.height = (pb + GAP_PX + ph) + 'px';
    g._ini = pb + GAP_PX;
    topo = g.offsetTop + pb + GAP_PX;
  });
  pg.style.minHeight = Math.round(topo + Hp) + 'px';
  voltarSel(sel);
  if(typeof pintarGiros === 'function') pintarGiros(d);
  if(M.p && M.p.avulsa && typeof pintarCarimbos === 'function') pintarCarimbos();
  if(typeof atualizarCaret === 'function') atualizarCaret();
}
function marcarTodos(){ if(M.p) M.p.docs.filter(d => d.linha && d.kind === 'texto').forEach(marcar); }

/* ---------- onde estou: documento e folha em vista ---------- */
function mapaPaginas(){
  const L = [], A = [];
  pagesEl.querySelectorAll('.page').forEach(pg => {
    const d = docById(pg.dataset.doc); if(!d) return;
    const top = pg.offsetTop, bot = top + pg.offsetHeight;
    L.push({ pg, d, top, bot });
    const lab = pg.previousElementSibling;
    A.push(lab && lab.classList.contains('dlabel') ? lab.offsetTop : top);
    if(d.kind === 'texto') pg.querySelectorAll('.brk').forEach(b => A.push(top + brkIni(b)));
  });
  M.pgList = L; M.anchors = A.sort((a, b) => a - b);
  /* espaço no fim só do tamanho necessário para o último documento também parar com o nome no topo */
  let esp = pagesEl.querySelector('.fimEsp'); if(!esp) esp = h('div', { class:'fimEsp', 'aria-hidden':'true' });
  pagesEl.append(esp); esp.style.height = '0px';
  const labs = pagesEl.querySelectorAll('.dlabel'), ult = labs[labs.length - 1];
  if(ult){ const falta = ult.offsetTop - 6 + docEl.clientHeight - docEl.scrollHeight; if(falta > 0) esp.style.height = Math.ceil(falta) + 'px'; }
  if(M.fsel) pintarSelecao();
  atualizarCaret();
}
/* âncora: o ponto do texto que está numa altura da tela, para voltar ao mesmo lugar depois de zoom ou giro */
function ancoraEm(yv){
  const y = docEl.scrollTop + yv; let alvo = null;
  for(const el of pagesEl.children){ if(el.offsetTop <= y) alvo = el; else break; }
  return alvo ? { el:alvo, frac:(y - alvo.offsetTop) / Math.max(1, alvo.offsetHeight), yv } : null;
}
function voltarAncora(a){ if(a && a.el.isConnected) docEl.scrollTop = a.el.offsetTop + a.frac * a.el.offsetHeight - a.yv; }
let _rolT = 0;
function aoRolar(){
  if(!M.p) return;
  if(!M.girando) M.ancTopo = ancoraEm(6);
  const y = docEl.scrollTop + docEl.clientHeight * 0.33;
  let it = null;
  for(const x of M.pgList){ if(x.top <= y) it = x; else break; }
  if(!it) it = M.pgList[0];
  const ant = M.cur && M.cur.pg;
  if(!it){ M.cur = null; atualizarTitulo(); return; }
  const f = M.fls[it.d.id] || { ini:1 };
  let fl = f.ini, e = null, idx = null;
  if(it.d.kind === 'pdf'){ idx = +it.pg.dataset.i; const antes = it.d.pl.slice(0, idx).filter(z => !z.d).length; fl = f.ini + antes; e = it.d.pl[idx]; }
  else { let n = 0; it.pg.querySelectorAll('.brk').forEach(b => { if(it.top + b.offsetTop <= y) n++; }); fl = f.ini + n; }
  const antD = M.cur && M.cur.d, antE = M.cur && M.cur.e;
  M.cur = { d:it.d, pg:it.pg, fl, e, idx };
  if(ant !== it.pg){ if(ant) ant.classList.remove('cur'); if(it.d.kind === 'pdf') it.pg.classList.add('cur'); }
  if(antD !== it.d || !antE !== !e){ mostrarAbaBtns(); if(DB.ui.doc !== it.d.id){ DB.ui.doc = it.d.id; saveDB(); } }
  atualizarTitulo();
  if(M.painel === 'dir' && M.rTab === 'pag'){ clearTimeout(_rolT); _rolT = setTimeout(renderPainel, 160); }
}
function atualizarTitulo(){
  const t = $('aTit'); if(!t || !M.p) return;
  if(M.split && M.cur && M.cur.d) marcarAberto(M.cur.d.id);
  const d = M.cur && M.cur.d, fl = M.cur && M.cur.fl, p = M.p;
  t.querySelector('b').textContent = d ? d.nome : (p.avulsa ? 'Mesa de PDF' : objetoProc(p));
  const num = p.avulsa ? 'Mesa de PDF' : p.avdoc ? (p.numint ? 'SEINFRA N. ' + p.numint : (TIPO_NOME[p.tipoAv] || 'Avulso')) : (p.ficha.num || 'Processo');
  t.querySelector('span').textContent = num + (fl ? ' · fls. ' + fl : '') + ' ▾';
  const s = $('aSig'); if(s) s.hidden = !(d && d.kind === 'texto');
}
let _raf = 0;
docEl.addEventListener('scroll', () => { if(_raf) return; _raf = requestAnimationFrame(() => { _raf = 0; aoRolar(); }); }, { passive:true });
function irParaDoc(id){ const l = pagesEl.querySelector('[data-lab="' + id + '"]'), pg = pagesEl.querySelector('.page[data-doc="' + id + '"]'); const alvo = l && l.offsetParent ? l : pg; if(alvo) docEl.scrollTop = Math.max(0, alvo.offsetTop - 10); aoRolar(); }
function irParaFolha(n){
  const F = M.fls;
  for(const d of M.p.docs){
    const f = F[d.id]; if(!f || n < f.ini || n > f.fim) continue;
    const k = n - f.ini;
    if(d.kind === 'pdf'){ const pgs = Array.from(pagesEl.querySelectorAll('.page.pdf[data-doc="' + d.id + '"]')); const pg = pgs[k]; if(pg) docEl.scrollTop = pg.offsetTop - 10; }
    else { const pg = paginaEl(d.id); if(pg){ const b = pg.querySelectorAll('.brk')[k - 1]; docEl.scrollTop = pg.offsetTop + (b ? brkIni(b) : 0) - 10; } }
    aoRolar(); return true;
  }
  return false;
}
function focarDoc(id){
  const pg = paginaEl(id); if(!pg) return;
  const body = pg.querySelector('.body'); body.focus();
  const c = body.querySelector('.campo,.fc.vazio');
  if(c) selecionarNo(c); else { const r = document.createRange(); r.selectNodeContents(body); r.collapse(false); const s = window.getSelection(); s.removeAllRanges(); s.addRange(r); }
}

/* ---------- zoom (88% ao abrir) e pinça ---------- */
let _zT = 0;
/* zoom só da letra: a folha continua em 88%, o texto cresce dentro dela */
const ZOOMS = [100, 125, 150, 180, 210, 250];
function hudZoom(){
  let hd = $('zHud'); if(!hd){ hd = h('div', { id:'zHud' }); screenEl.append(hd); }
  hd.textContent = M.zoom === 100 ? 'Texto no tamanho da folha' : 'Texto ' + M.zoom + '% · a folha continua em 88%';
  hd.hidden = false; clearTimeout(hd._t); hd._t = setTimeout(() => { hd.hidden = true; }, 1300);
}
function setZoom(z, silencioso){
  z = Math.round(clamp(z, 100, 260)); if(z < 104) z = 100;
  const a = ancoraEm(docEl.clientHeight * 0.33);
  M.zoom = z; pagesEl.style.setProperty('--tz', z / 100); pagesEl.classList.toggle('tzoom', z !== 100);
  voltarAncora(a);
  clearTimeout(_zT); _zT = setTimeout(() => { marcarTodos(); mapaPaginas(); aoRolar(); }, 260);
  if(!silencioso) hudZoom();
}
let pinca = null;
docEl.addEventListener('touchstart', ev => {
  ROL.toque = true;
  if(ev.touches.length === 2 && !M.editing){ const a = ev.touches[0], b = ev.touches[1]; pinca = { d0:Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY), z0:M.zoom }; }
}, { passive:true });
docEl.addEventListener('touchmove', ev => {
  if(!pinca || ev.touches.length !== 2) return;
  ev.preventDefault();
  const a = ev.touches[0], b = ev.touches[1], d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  setZoom(pinca.z0 * d / pinca.d0, true);
}, { passive:false });
docEl.addEventListener('touchend', ev => { if(!ev.touches.length){ ROL.toque = false; ROL.last = 0; } if(pinca && ev.touches.length < 2){ pinca = null; hudZoom(); } });
docEl.addEventListener('touchcancel', ev => { if(!ev.touches.length){ ROL.toque = false; ROL.last = 0; } });
docEl.addEventListener('wheel', ev => { if(ev.ctrlKey){ ev.preventDefault(); setZoom(M.zoom * (ev.deltaY < 0 ? 1.08 : 0.93), true); } }, { passive:false });
/* girar o celular: deitado vira modo leitura; em pé volta como estava, no mesmo trecho do texto */
function aplicarModo(d){
  M.deitado = d;
  if(d){ if(M.editing) fecharEditor(); $('fmt').hidden = true; }
  aplicarBarras(); aplicarLarguras(); renderLay(); mostrarAbaBtns();
  if(M.girando) voltarAncora(M.girando);
}
window.addEventListener('resize', () => {
  if(VIEW !== 'mesa' || !M.p) return;
  const W = screenEl.clientWidth;
  if(W !== M.lastW && !M.girando) M.girando = M.ancTopo || ancoraEm(6);
  const d = ehDeitado(); if(d !== !!M.deitado) aplicarModo(d);
  clearTimeout(window.__rz); window.__rz = setTimeout(() => {
    if(VIEW !== 'mesa') return;
    aplicarBarras(); aplicarLarguras(); renderLay(); marcarTodos(); mapaPaginas();
    if(M.girando){ voltarAncora(M.girando); M.girando = null; }
    M.lastW = screenEl.clientWidth; aoRolar(); redesenharVisiveis();
  }, 220);
});

/* ---------- rolagem automática (tipo PJe) ---------- */
const ROL = { on:false, last:0, acc:0, toque:false };
function passo(t){
  if(!ROL.on) return;
  if(ROL.toque || M.painel || pinca){ ROL.last = 0; requestAnimationFrame(passo); return; }   // pausa enquanto o dedo está na tela ou uma aba está aberta
  if(ROL.last){ ROL.acc += layRetrato().speed * (t - ROL.last) / 1000; const s = Math.floor(ROL.acc); if(s){ docEl.scrollTop += s; ROL.acc -= s; } }
  ROL.last = t;
  if(docEl.scrollTop + docEl.clientHeight >= docEl.scrollHeight - 1){ pararRolagem(); toast('Fim do processo.'); return; }
  requestAnimationFrame(passo);
}
function iniciarRolagem(){ ROL.on = true; ROL.last = 0; ROL.acc = 0; $('pill').hidden = false; $('spdV').textContent = layRetrato().speed + ' px/s'; atualizarIcones(); requestAnimationFrame(passo); }
function pararRolagem(){ if(!ROL.on) return; ROL.on = false; $('pill').hidden = true; atualizarIcones(); }
function velocidade(dv){ const L = layRetrato(); L.speed = clamp(L.speed + dv, 5, 400); $('spdV').textContent = L.speed + ' px/s'; salvarLay(); }
$('spdM').onclick = () => velocidade(layRetrato().speed > 60 ? -20 : -5);
$('spdP').onclick = () => velocidade(layRetrato().speed >= 60 ? 20 : 5);
$('spdStop').onclick = pararRolagem;

/* ---------- teclado: só abre quando você quer digitar ----------
   1º toque no texto: põe o cursor, sem teclado.
   2º toque no mesmo ponto: abre o teclado para digitar.
   Botões da barra e abas: nunca abrem o teclado e fecham o que estiver aberto. */
const TEC = { digitando:false, ultimo:null, dica:false };
const tecladoVisivel = () => !!(window.visualViewport && window.visualViewport.height < window.innerHeight - 140);
function modoTeclado(on){ TEC.digitando = !!on; pagesEl.querySelectorAll('.body').forEach(b => b.setAttribute('inputmode', on ? 'text' : 'none')); }
function guardarSel(){ const s = window.getSelection(); return s && s.rangeCount ? { an:s.anchorNode, ao:s.anchorOffset, fn:s.focusNode, fo:s.focusOffset } : null; }
function voltarSel(g){ if(!g) return; try{ window.getSelection().setBaseAndExtent(g.an, g.ao, g.fn, g.fo); }catch(e){} }
function fecharTeclado(){
  const a = document.activeElement, body = a && a.classList && a.classList.contains('body') ? a : null;
  const eraDigitando = TEC.digitando; modoTeclado(false); TEC.ultimo = null;
  if(!body || !(eraDigitando || tecladoVisivel())) return;
  const g = guardarSel(), st = docEl.scrollTop, sl = docEl.scrollLeft;
  body.blur(); body.focus({ preventScroll:true }); voltarSel(g);
  docEl.scrollTop = st; docEl.scrollLeft = sl;
}
function abrirTeclado(body){
  body = body || curBody() || bodyDoDoc(M.cur && M.cur.d);
  if(!body) return toast('Este documento é PDF: não tem texto para digitar.');
  const g = guardarSel(); modoTeclado(true);
  if(document.activeElement === body) body.blur();
  body.focus({ preventScroll:true });
  if(g && body.contains(g.fn)) voltarSel(g);
  else { const r = document.createRange(); r.selectNodeContents(body); r.collapse(false); const s = window.getSelection(); s.removeAllRanges(); s.addRange(r); }
}
docEl.addEventListener('pointerdown', ev => {
  const b = ev.target.closest && ev.target.closest('#pages .body');
  if(!b || ev.pointerType === 'mouse') return;
  if(TEC.digitando && (tecladoVisivel() || document.activeElement === b)) return;   // já está digitando: segue normal
  const t = TEC.ultimo, perto = t && t.b === b && document.activeElement === b && Date.now() - t.t < 8000 && Math.hypot(ev.clientX - t.x, ev.clientY - t.y) < 34;
  if(perto){ TEC.ultimo = null; modoTeclado(true); TEC.abrir = b; return; }
  modoTeclado(false); TEC.ultimo = { b, x:ev.clientX, y:ev.clientY, t:Date.now() };
  if(!TEC.dica){ TEC.dica = true; toast('Toque de novo no mesmo ponto para abrir o teclado.', { ms:2600 }); }
});
docEl.addEventListener('click', () => { const b = TEC.abrir; TEC.abrir = null; if(b) abrirTeclado(b); });
if(window.visualViewport){ let aberto = false; window.visualViewport.addEventListener('resize', () => { const v = tecladoVisivel(); if(aberto && !v && TEC.digitando) modoTeclado(false); aberto = v; }); }

/* ---------- seleção e edição ---------- */
const LETRA = /[\p{L}\p{N}_]/u;
function frente(s){ if(s.anchorNode === s.focusNode) return s.anchorOffset <= s.focusOffset; return !!(s.anchorNode.compareDocumentPosition(s.focusNode) & Node.DOCUMENT_POSITION_FOLLOWING); }
function meioDePalavra(s){ const n = s.focusNode, o = s.focusOffset; if(!n || n.nodeType !== 3) return false; return o > 0 && o < n.data.length && LETRA.test(n.data[o - 1]) && LETRA.test(n.data[o]); }
function aparar(s){ for(let i = 0; i < 4 && !s.isCollapsed && frente(s) && /\s$/.test(String(s)); i++) s.modify('extend', 'backward', 'character'); }
function verFoco(){
  const s = window.getSelection(); if(!s.rangeCount || !s.focusNode) return;
  let rc = null;
  try{ const r = document.createRange(); r.setStart(s.focusNode, s.focusOffset); r.collapse(true); rc = r.getBoundingClientRect(); }catch(e){}
  if(!rc || (!rc.height && !rc.top)){ const el = s.focusNode.nodeType === 1 ? s.focusNode : s.focusNode.parentElement; rc = el.getBoundingClientRect(); }
  const d = docEl.getBoundingClientRect(), m = 48;
  if(rc.top < d.top + m) docEl.scrollTop -= d.top + m - rc.top; else if(rc.bottom > d.bottom - m) docEl.scrollTop += rc.bottom - (d.bottom - m);
}
/* sem cursor ainda: põe o cursor no início da linha que está na altura de leitura da tela, sem teclado */
function cursorNaTela(){
  const r0 = docEl.getBoundingClientRect();
  for(const f of [0.33, 0.2, 0.5, 0.1, 0.7]){
    const y = r0.top + r0.height * f;
    for(const b of pagesEl.querySelectorAll('.page.txt .body')){
      const rb = b.getBoundingClientRect(); if(rb.top > y || rb.bottom < y) continue;
      const cr = document.caretRangeFromPoint ? document.caretRangeFromPoint(rb.left + 4, y) : null;
      if(!cr || !b.contains(cr.startContainer)) continue;
      modoTeclado(false); b.focus({ preventScroll:true });
      const s = window.getSelection(); s.removeAllRanges(); s.addRange(cr);
      try{ s.modify('move', 'backward', 'lineboundary'); }catch(e){}
      return s;
    }
  }
  return null;
}
/* o cursor precisa do texto em foco para aparecer; foca sem teclado e sem pular a tela */
function selComFoco(){
  let s = curSel();
  if(!s) return cursorNaTela();
  const b = curBody();
  if(b && document.activeElement !== b){ const g = guardarSel(), st = docEl.scrollTop; if(!TEC.digitando) b.setAttribute('inputmode', 'none'); b.focus({ preventScroll:true }); voltarSel(g); docEl.scrollTop = st; s = window.getSelection(); }
  return s;
}
function moverCursor(dir, unidade){
  if(M.selMode && curSel()) return estender(dir, unidade);
  const s = selComFoco(); if(!s) return toast('Toque no texto primeiro.');
  const n0 = s.focusNode, o0 = s.focusOffset;
  try{ s.modify('move', dir, unidade); }catch(e){}
  if(unidade === 'line' && s.focusNode === n0 && s.focusOffset === o0) pularDeDocumento(dir);   // fim do documento: segue para o próximo texto
  verFoco();
}
function pularDeDocumento(dir){
  const bodies = Array.from(pagesEl.querySelectorAll('.page.txt .body')), atual = curBody(), i = bodies.indexOf(atual);
  const alvo = bodies[dir === 'forward' ? i + 1 : i - 1];
  if(!alvo) return toast(dir === 'forward' ? 'Fim do último texto.' : 'Início do primeiro texto.', { ms:1200 });
  alvo.setAttribute('inputmode', TEC.digitando ? 'text' : 'none'); alvo.focus({ preventScroll:true });
  const r = document.createRange(); r.selectNodeContents(alvo); r.collapse(dir === 'forward');
  const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
}
/* S ligado: ◀ ▶ aumentam ou diminuem a seleção palavra inteira por palavra; ▲ ▼ linha por linha, sem cortar palavra */
function estender(dir, unidade){
  const s = selComFoco(); if(!s) return toast('Toque no texto primeiro.');
  try{
    s.modify('extend', dir, unidade);
    if(unidade === 'line' && meioDePalavra(s)) s.modify('extend', dir, 'word');
    aparar(s);
  }catch(e){ return toast('Este navegador não deixa selecionar assim.'); }
  verFoco();
}
function curSel(){ const s = window.getSelection(); if(!s || !s.rangeCount) return null; const r = s.getRangeAt(0); const n = r.startContainer, el = n.nodeType === 1 ? n : n.parentElement; if(!el || !el.closest('#pages .body')) return null; return s; }
function curBody(){ const s = curSel(); if(!s) return null; const n = s.anchorNode, el = n.nodeType === 1 ? n : n.parentElement; return el.closest('.body'); }
function selecionarNo(node){ const r = document.createRange(); r.selectNodeContents(node); const s = window.getSelection(); s.removeAllRanges(); s.addRange(r); }
function bodyDoDoc(d){ const pg = d && paginaEl(d.id); return pg ? pg.querySelector('.body') : null; }
function acao(a){
  let s;
  switch(a){
    case 'palavra':
      s = curSel(); if(!s) return toast('Toque no texto primeiro.');
      try{ s.collapseToStart(); s.modify('move', 'forward', 'character'); s.modify('move', 'backward', 'word'); s.modify('extend', 'forward', 'word'); aparar(s); }catch(e){ toast('Este navegador não deixa selecionar por palavra.'); }
      return;
    case 'paragrafo': {
      s = curSel(); if(!s) return toast('Toque no texto primeiro.');
      const n = s.anchorNode, el = n && (n.nodeType === 1 ? n : n.parentElement), p = el && el.closest('p,li,td,th,h1,h2,h3');
      return p ? selecionarNo(p) : toast('Toque dentro de um parágrafo.');
    }
    case 'tudo': {
      const b = curBody() || bodyDoDoc(M.cur && M.cur.d);
      if(!b) return toast('Este documento é PDF: não tem texto para selecionar.');
      b.focus(); selecionarNo(b); return toast('Documento inteiro selecionado.');
    }
    case 'copiar': {
      const t = String(window.getSelection() || '');
      if(!t) return toast('Selecione algo primeiro.');
      return copiarTexto(t, 'Copiado.');
    }
    case 'colar': {
      if(!curSel()) return toast('Toque no texto onde vai colar.');
      const falha = () => toast(PWA ? 'O celular não liberou a área de transferência. Segure o dedo no texto e toque em Colar.' : 'Aqui no Claude o colar direto é bloqueado. No app instalado ele cola; por enquanto, segure o dedo no texto e toque em Colar.');
      try{
        if(navigator.clipboard && navigator.clipboard.read){
          navigator.clipboard.read().then(async items => {
            const it = items[0]; let html = null;
            if(it && it.types.includes('text/html')) html = limparHTML(await (await it.getType('text/html')).text());
            else { const t = await navigator.clipboard.readText(); html = looksMarkdown(t) ? mdParaHTML(t) : null; if(html == null){ document.execCommand('insertText', false, t); return; } }
            document.execCommand('insertHTML', false, html);
          }).catch(falha);
        } else navigator.clipboard.readText().then(t => document.execCommand('insertText', false, t), falha);
      }catch(e){ falha(); }
      return;
    }
    case 'selecionar': {
      M.selMode = !M.selMode; atualizarIcones();
      s = M.selMode ? selComFoco() : null; if(s && s.isCollapsed) acao('palavra');
      atualizarCaret();
      return toast(M.selMode ? 'Selecionar ligado: ◀ ▶ palavra a palavra (dois toques: até o fim da frase) · ▼ até o fim do parágrafo.' : 'Selecionar desligado: ◀ ▶ vão de palavra em palavra · ▲ ▼ de parágrafo em parágrafo.', { ms:2600 });
    }
    case 'esq': case 'dir': return navPalavra(a === 'esq' ? -1 : 1);
    case 'marca': {
      s = curSel(); if(!s || s.isCollapsed) return toast('Selecione o trecho primeiro.');
      const an = s.anchorNode, ae = an.nodeType === 1 ? an : an.parentElement, marcado = ae && ae.closest('[style*="background"]');
      document.execCommand('styleWithCSS', false, true); document.execCommand('hiliteColor', false, marcado ? 'transparent' : '#fbe38e'); document.execCommand('styleWithCSS', false, false);
      return;
    }
    case 'formatar': $('fmt').hidden = !$('fmt').hidden; return atualizarIcones();
    case 'tabela': return abrirTabela();
    case 'proxima': {
      if(M.selMode && curSel()) return estender('forward', 'line');
      const ref = docEl.scrollTop + docEl.clientHeight * 0.33, nx = M.anchors.find(t => t > ref + 2);
      if(nx == null) return toast('Última folha.');
      docEl.scrollTop = nx - 6; aoRolar(); return toast('Folha ' + (M.cur ? M.cur.fl : ''), { ms:900 });
    }
    case 'anterior': {
      if(M.selMode && curSel()) return estender('backward', 'line');
      const y = docEl.scrollTop, pv = M.anchors.filter(t => t - 6 < y - 4).pop();
      docEl.scrollTop = pv == null ? 0 : pv - 6; aoRolar(); return toast('Folha ' + (M.cur ? M.cur.fl : ''), { ms:900 });
    }
    case 'rolar': return ROL.on ? pararRolagem() : iniciarRolagem();
    case 'revisar': return abrirRevisao();
    case 'notas': return M.painel === 'dir' && M.rTab === 'notas' ? fecharPainel() : abrirPainel('dir', 'notas');
    case 'compartilhar': return compartilharSheet();
    case 'zoom88': return setZoom(100);
    case 'home': return sairMesa();
    case 'abaEsq': return M.painel === 'esq' ? fecharPainel() : abrirPainel('esq');
    case 'abaDir': return M.painel === 'dir' ? fecharPainel() : abrirPainel('dir');
    case 'novodoc': return novoDocumento({ p:M.p, depois:M.cur && M.cur.d.id });
    case 'incluirpdf': return incluirPdfNaMesa();
    case 'ficha': return M.p.avulsa ? toast('A mesa avulsa não tem ficha.') : fichaSheet(M.p);
    case 'relatorio': return M.p.avulsa ? toast('A mesa avulsa não tem relatório.') : abrirRel(M.p);
    case 'buscar': return buscarNoProcesso();
    case 'teclado': return abrirTeclado();
    case 'cima': return navParagrafo(-1);
    case 'baixo': return navParagrafo(1);
    case 'selfolhas': return M.fsel ? sairSelecao() : entrarSelecao(false);
    case 'signatario': { const d = M.cur && M.cur.d; return d && d.kind === 'texto' ? sigSheet(d) : toast('Vá até um texto para escolher o signatário.'); }
    case 'zoomMais': { const z = M.zoom, n = ZOOMS.find(v => v > z + 0.5); return n ? setZoom(n) : toast('Letra no máximo.'); }
    case 'zoomMenos': { const z = M.zoom, n = ZOOMS.filter(v => v < z - 0.5).pop(); return n ? setZoom(n) : toast('Letra no tamanho da folha.'); }
    case 'campo': return proximoCampo();
    case 'ferramentas': return menuFerramentas($('aBot').querySelector('[data-a="ferramentas"]'));
    case 'mais': return menuTopo($('aMais'));
  }
}
$('fmt').addEventListener('pointerdown', e => { if(e.target.closest('button')) e.preventDefault(); });
$('fmt').addEventListener('click', e => {
  const b = e.target.closest('button'); if(!b) return;
  const f = b.dataset.f;
  if(f === 'fechar'){ $('fmt').hidden = true; return atualizarIcones(); }
  if(!curSel()) return toast('Toque no texto primeiro.');
  document.execCommand('styleWithCSS', false, false);
  if(f === 'h2' || f === 'p') document.execCommand('formatBlock', false, f === 'h2' ? 'h2' : 'p');
  else document.execCommand(f, false, null);
});
function buscarNoProcesso(){ buscaAbrir(); }

/* ---------- toques nos botões: usar ou editar ---------- */
let apertado = null;
screenEl.addEventListener('pointerdown', ev => {
  const n = ev.target.closest('.el');
  if(!M.editing){ if(n){ ev.preventDefault(); apertado = n; n.classList.add('press'); } return; }
  editorPointerDown(ev, n);
});
screenEl.addEventListener('pointermove', ev => { if(M.editing) editorPointerMove(ev); });
const soltar = ev => { if(apertado){ apertado.classList.remove('press'); apertado = null; } if(M.editing) editorPointerUp(ev); };
screenEl.addEventListener('pointerup', soltar);
screenEl.addEventListener('pointercancel', soltar);
screenEl.addEventListener('click', ev => {
  if(M.editing) return;
  const n = ev.target.closest('.el'); if(!n) return;
  const e = lay().els.find(x => x.id === n.dataset.id);
  if(!e) return;
  if(e.type === 'titulo'){ fecharTeclado(); return abrirPainel('esq'); }
  if(e.type !== 'icone') return;
  if(!e.acao) return toast((e.rot || e.code) + ': sem função. Escolha uma em Editar botões.');
  if(e.acao !== 'teclado') fecharTeclado();
  acao(e.acao);
});
for(const [id, q] of [['edgeL', 'esq'], ['edgeR', 'dir']]){
  $(id).addEventListener('pointerdown', ev => ev.preventDefault());   // não tira o cursor do texto nem abre teclado
  $(id).onclick = () => { if(M.editing) return; M.painel === q ? fecharPainel() : abrirPainel(q); };
}
$('scrim').onclick = () => fecharPainel();

/* ===== g_paineis.js ===== */
/* =====================================================================
   Abas laterais da mesa
   esquerda: processo, linha do processo, repositório, outros processos
   direita: página/documento, notas e pendências, ficha
   ===================================================================== */
function abrirPainel(qual, tab){
  fecharTeclado();
  M.painel = qual; if(tab) M.rTab = tab;
  $('pLeft').classList.toggle('open', qual === 'esq'); $('pRight').classList.toggle('open', qual === 'dir');
  $('scrim').hidden = false; mostrarAbaBtns();
  renderPainel(); atualizarIcones();
}
function fecharPainel(semAnim){
  M.painel = null;
  $('pLeft').classList.remove('open'); $('pRight').classList.remove('open');
  $('scrim').hidden = true; mostrarAbaBtns();
  if(!semAnim) atualizarIcones();
}
function renderPainel(){
  if(M.painel === 'esq') renderEsq(); else if(M.painel === 'dir') renderDir();
  /* botão de fechar dentro da aba, no mesmo lugar do botão que abriu */
  const box = M.painel === 'esq' ? $('pLeft') : M.painel === 'dir' ? $('pRight') : null; if(!box) return;
  const A = M.abaPos || { l:10, r:10, b:112 };
  const b = h('button', { class:'abaIn', 'aria-label':'Fechar a aba', html:M.painel === 'esq' ? I.side : I.sideR, onclick:() => fecharPainel() });
  b.addEventListener('pointerdown', ev => ev.preventDefault());
  if(M.painel === 'esq') b.style.left = A.l + 'px'; else b.style.right = A.r + 'px';
  b.style.bottom = A.b + 'px';
  box.append(b);
}
function cabPainel(titulo, extra){
  return h('div', { class:'ph', style:{ minHeight:lay().topH + 'px' } }, h('b', null, titulo), extra || null, h('button', { class:'ib', 'aria-label':'Fechar', html:I.x, onclick:() => fecharPainel() }));
}

/* ---------- esquerda ---------- */
M.onde = 'linha';
M.colap = M.colap || {};
function renderEsq(){
  const p = M.p, box = $('pLeft'); box.replaceChildren();
  const corpo = h('div', { class:'pbody' });
  box.append(cabPainel(p.avulsa ? 'Mesa avulsa' : p.avdoc ? (TIPO_NOME[p.tipoAv] || 'Documento avulso') : 'Processo'), corpo);
  if(!p.avulsa && !p.avdoc){
    const t = tramAtual(p);
    corpo.append(h('div', { class:'pcard' },
      h('b', null, p.ficha.num ? 'Processo ' + p.ficha.num : 'Processo sem número'), h('div', { class:'o' }, objetoProc(p)),
      h('div', { class:'row', style:{ marginTop:'4px', gap:'6px' } }, chipStatus(p.status), t ? h('span', { class:'chip' }, t.setor) : null, pendAbertas(p).length ? h('span', { class:'chip warn' }, plural(pendAbertas(p).length, 'pendência', 'pendências')) : null),
      h('div', { class:'pbub' },
        h('button', { onclick:() => fichaSheet(p) }, 'Ficha'),
        h('button', { onclick:() => { fecharPainel(); abrirRel(p); } }, 'Relatório'),
        h('button', { onclick:() => tramSheet(p) }, 'Tramitar'),
        h('button', { onclick:() => todosSigSheet() }, 'Signatários'))));
  } else if(p.avdoc){
    corpo.append(h('div', { class:'pcard' }, h('b', null, p.numint ? 'SEINFRA N. ' + p.numint : (TIPO_NOME[p.tipoAv] || 'Documento')), h('div', { class:'o' }, objetoProc(p)),
      h('div', { class:'pbub' }, h('button', { onclick:() => { const d = p.docs.find(x => x.kind === 'texto'); if(d) sigSheet(d); } }, 'Signatário'), h('button', { onclick:() => processoDeAvulso(p) }, 'Criar processo'))));
  } else corpo.append(h('p', { class:'muted', style:{ margin:'0 4px', fontSize:'13px' } }, 'Aqui ficam os PDFs e textos soltos. No ✎ de cada documento dá para mover para um processo.'));
  const F = M.fls, linha = p.docs.filter(d => d.linha), N = numeracaoLinha(p);
  corpo.append(h('div', { class:'row' }, h('span', { class:'lbl grow' }, p.avdoc ? 'Documento' : 'Linha do processo'), h('span', { class:'muted', style:{ fontSize:'12px' } }, F._total ? plural(F._total, 'folha', 'folhas') : '')));
  const lista = h('div');
  const cur = M.cur && M.cur.d && M.cur.d.id;
  linha.forEach(d => {
    const f = F[d.id], anexo = !!(d.pai && linha.some(x => x.id === d.pai));
    if(anexo && M.colap[d.pai]) return;
    const irm = anexo ? linha.filter(x => x.pai === d.pai) : linha.filter(x => !(x.pai && linha.some(y => y.id === x.pai)));
    const i = irm.indexOf(d), filhos = anexo ? [] : linha.filter(x => x.pai === d.id);
    lista.append(h('div', { class:'lrow' + (anexo ? ' anexo' : '') + (d.id === cur ? ' cur' : '') },
      h('span', { class:'nn' }, (N[d.id] ? N[d.id].n : ''), h('em', null, '···')),
      h('span', { class:'tx', onclick:() => { fecharPainel(); irParaDoc(d.id); } }, h('b', null, d.nome),
        h('span', null, (d.kind === 'pdf' ? 'PDF' : (TIPO_NOME[d.tipo] || 'Texto')) + (f ? ' · ' + (f.k === 0 ? 'sem páginas' : f.k > 1 ? 'fls. ' + f.ini + '–' + f.fim : 'fl. ' + f.ini) : '') + (filhos.length ? ' · ' + plural(filhos.length, 'anexo', 'anexos') : '') + (d.repo ? ' · repositório' : ''))),
      filhos.length ? h('button', { class:'tg', 'aria-label':M.colap[d.id] ? 'Mostrar anexos' : 'Esconder anexos', onclick:() => { M.colap[d.id] = !M.colap[d.id]; renderEsq(); renderPainel(); } }, M.colap[d.id] ? '▸' : '▾') : null,
      h('button', { class:'cb', 'aria-label':'Subir', html:I.up, disabled:i === 0, onclick:() => moverDoc(d, -1) }),
      h('button', { class:'cb', 'aria-label':'Descer', html:I.down, disabled:i === irm.length - 1, onclick:() => moverDoc(d, 1) }),
      h('button', { class:'cb', 'aria-label':'Opções', html:I.more, onclick:ev => menuDoc(d, ev.currentTarget) })));
  });
  if(!linha.length) lista.append(h('div', { class:'muted', style:{ padding:'8px 4px', fontSize:'13.5px' } }, 'Nenhum documento na linha ainda.'));
  corpo.append(lista);
  corpo.append(h('div', { class:'row' },
    p.avulsa ? null : h('button', { class:'btn acc sm grow', onclick:() => { fecharPainel(); novoDocumento({}); } }, h('span', { html:I.docplus }), 'Novo documento'),
    h('button', { class:'btn sm grow', onclick:() => incluirPdfNaMesa() }, h('span', { html:I.clip }), 'Incluir PDF')));
  if(!p.avulsa && !p.avdoc) corpo.append(h('div', { class:'row', style:{ gap:'6px' } }, h('span', { class:'muted', style:{ fontSize:'12.5px' } }, 'PDF entra em:'),
    h('div', { class:'seg grow' }, [['linha', 'Linha'], ['repo', 'Repositório'], ['ambos', 'Ambos']].map(o => h('button', { class:M.onde === o[0] ? 'on' : '', style:{ minHeight:'30px', fontSize:'12.5px' }, onclick:() => { M.onde = o[0]; renderEsq(); renderPainel(); } }, o[1])))));
  if(!p.avulsa && !p.avdoc){
    const repo = p.docs.filter(d => d.repo);
    corpo.append(h('div', { class:'row' }, h('span', { class:'lbl grow' }, 'Repositório do objeto'), repo.length ? h('button', { class:'btn sm soft', onclick:() => compartilharRepo(p) }, h('span', { html:I.folderShare }), 'Compartilhar pasta') : null));
    if(!repo.length) corpo.append(h('p', { class:'muted', style:{ margin:'0 4px', fontSize:'13px' } }, 'O repositório é a pasta que você disponibiliza para todo mundo. Marque “no repositório” no ✎ de um documento ou escolha “Repositório” ao incluir um PDF.'));
    repo.forEach(d => corpo.append(h('div', { class:'lrow' }, h('span', { class:'nn' }, h('em', null, '···')),
      h('span', { class:'tx', onclick:() => { if(d.linha){ fecharPainel(); irParaDoc(d.id); } else verDocSolto(d); } }, h('b', null, d.nome), h('span', null, (d.kind === 'pdf' ? 'PDF' : 'Texto') + (d.linha ? ' · também na linha' : ' · só no repositório'))),
      h('button', { class:'cb', 'aria-label':'Opções', html:I.more, onclick:() => menuDoc(d) }))));
  }
  const outros = procsReais().filter(x => x !== p).sort((a, b) => b.updated - a.updated).slice(0, 6);
  if(outros.length){
    corpo.append(h('span', { class:'lbl' }, 'Outros processos'));
    outros.forEach(q => corpo.append(h('div', { class:'lrow' }, h('span', { class:'tx', onclick:() => abrirMesa(q) }, h('b', null, q.ficha.objeto || tituloProc(q)), h('span', null, q.ficha.num ? 'nº ' + q.ficha.num : 'sem número')))));
  }
  corpo.append(h('div', { style:{ height:'60px' } }));
}
/* sobe/desce: o documento principal leva os anexos junto; anexo só troca de lugar com os irmãos */
function moverDoc(d, dir){
  salvarTudo(); moverDocEm(M.p, d, dir);
  touch(M.p); saveDB(); renderMesa(true); renderPainel();
}
function moverDocEm(p, d, dir){
  const linha = p.docs.filter(x => x.linha);
  const ehAnexo = x => !!(x.pai && p.docs.some(y => y.id === x.pai));
  if(ehAnexo(d)){
    const irm = p.docs.filter(x => x.pai === d.pai && x.linha), i = irm.indexOf(d), j = i + dir;
    if(j < 0 || j >= irm.length) return;
    const a = p.docs.indexOf(d), b = p.docs.indexOf(irm[j]); p.docs[a] = irm[j]; p.docs[b] = d;
  } else {
    const princ = linha.filter(x => !ehAnexo(x)), i = princ.indexOf(d), j = i + dir;
    if(j < 0 || j >= princ.length) return;
    const outro = princ[j];
    const bloco = x => [x].concat(p.docs.filter(y => y.pai === x.id));
    const A = bloco(d), B = bloco(outro), resto = p.docs.filter(x => !A.includes(x) && !B.includes(x));
    const primeiro = dir < 0 ? B[0] : A[0], pos = p.docs.indexOf(primeiro);
    const antes = p.docs.slice(0, pos).filter(x => resto.includes(x)), depois = p.docs.slice(pos).filter(x => resto.includes(x));
    p.docs.splice(0, p.docs.length, ...antes, ...(dir < 0 ? A.concat(B) : B.concat(A)), ...depois);
  }
}
function editarDoc(d){
  if(d.kind === 'texto'){ fecharPainel(); irParaDoc(d.id); focarDoc(d.id); }
  else { irParaDoc(d.id); abrirPainel('dir', 'pag'); }
}
function incluirPdfNaMesa(){
  const p = M.p, onde = p.avulsa ? 'linha' : M.onde;
  escolherArquivos(async l => {
    salvarTudo();
    const novos = await incluirArquivos(p, l, onde, onde !== 'repo' && M.cur ? M.cur.d.id : null);
    if(!novos.length) return;
    if(onde !== 'repo') fecharPainel();
    renderMesa(true); if(M.painel) renderPainel();
    if(onde !== 'repo') irParaDoc(novos[0].id);
    toast(novos.length === 1 ? 'PDF incluído' + (onde === 'repo' ? ' no repositório.' : onde === 'ambos' ? ' na linha e no repositório.' : '.') : novos.length + ' PDFs incluídos.');
  });
}
async function verDocSolto(d){
  const b = busy('Abrindo…');
  try{ const bytes = await bytesDoc(d); b.end(); previa(bytes, safeName(d.nome, '.pdf')); }catch(e){ b.end(); toast('Não foi possível abrir.'); }
}

/* ---------- direita ---------- */
function renderDir(){
  const box = $('pRight'); box.replaceChildren();
  const tabs = h('div', { class:'tabs' }, [['pag', 'Página'], ['notas', 'Notas'], ['ficha', 'Ficha']].map(t => h('button', { class:M.rTab === t[0] ? 'on' : '', onclick:() => { M.rTab = t[0]; renderDir(); atualizarIcones(); } }, t[1])));
  const corpo = h('div', { class:'pbody' });
  box.append(cabPainel(M.p.avulsa ? 'Mesa avulsa' : (M.p.ficha.num || 'Processo')), tabs, corpo);
  if(M.rTab === 'notas') painelNotas(corpo);
  else if(M.rTab === 'ficha') painelFicha(corpo);
  else painelPagina(corpo);
}
const ab = (rot, ic, fn, o = {}) => h('button', { class:'ab' + (o.on ? ' on' : ''), disabled:o.off, onclick:fn }, h('i', { html:I[ic] || ic }), rot);
function painelPagina(corpo){
  const c = M.cur;
  if(!c){ corpo.append(h('div', { class:'empty' }, 'Abra um documento para ver as ações.')); return; }
  const d = c.d, p = M.p;
  corpo.append(h('div', { class:'pcard' }, h('b', null, d.nome), h('div', { class:'o' }, (d.kind === 'pdf' ? 'PDF' : 'Texto') + ' · folha ' + c.fl + (d.kind === 'pdf' ? ' · página ' + (vivas(d).indexOf(c.e) + 1) + ' de ' + vivas(d).length : ' · ' + plural(paginasDoc(d), 'página', 'páginas')))));
  const re = (fn) => () => { fn(); salvarTudo(); touch(p); saveDB(); renderMesa(true); renderDir(); };
  if(d.kind === 'pdf' && c.e){
    const e = c.e;
    corpo.append(h('span', { class:'lbl' }, 'Esta página'));
    corpo.append(h('div', { class:'agrid' },
      ab('Girar', 'rot', re(() => { e.r = ((e.r || 0) + 90) % 360; })),
      ab('Brasão aqui', h('img', { src:BRAS_SRC, alt:'', style:{ width:'22px' } }).outerHTML, re(() => { e.b = !e.b; }), { on:e.b }),
      ab('Retirar', 'trash', () => { e.d = true; salvarTudo(); saveDB(); renderMesa(true); renderDir(); toast('Página retirada.', { acao:'Desfazer', fn:() => { e.d = false; saveDB(); renderMesa(true); renderPainel(); } }); }),
      ab('Branca depois', 'blank', re(() => { d.pl.splice(d.pl.indexOf(e) + 1, 0, { s:-1, r:0, b:false, d:false }); })),
      ab('Dividir aqui', 'split', () => dividirDoc(d, e), { off:vivas(d).indexOf(e) === 0 }),
      ab('Extrair', 'dup', () => extrairSheet(d)),
      ab('Buscar', 'search', () => buscarNoProcesso()),
      ab('Ir à folha', 'hash', async () => { const n = await perguntar('Ir à folha', 'Número da folha', '', 'Ir', { tipo:'number' }); if(n && !irParaFolha(parseInt(n, 10))) toast('Folha ' + n + ' não existe neste processo.'); })));
  }
  corpo.append(h('span', { class:'lbl' }, 'Documento'));
  const modoB = d.kind === 'pdf' ? modoBrasPdf(d) : d.bras;
  const itens = [
    ab(modoB === 'todas' ? 'Brasão: todas' : modoB === 'primeira' ? 'Brasão: 1ª' : modoB === 'misto' ? 'Brasão: algumas' : 'Sem brasão', h('img', { src:BRAS_SRC, alt:'', style:{ width:'22px', opacity:modoB === 'nenhum' ? '.35' : '1' } }).outerHTML, re(() => {
      const prox = modoB === 'todas' ? 'primeira' : modoB === 'primeira' ? 'nenhum' : 'todas';
      if(d.kind === 'pdf'){ let prim = true; d.pl.forEach(z => { if(z.d){ z.b = false; return; } z.b = prox === 'todas' || (prox === 'primeira' && prim); prim = false; }); }
      else d.bras = prox;
    }), { on:modoB !== 'nenhum' })
  ];
  if(d.kind === 'pdf'){
    itens.push(ab('Girar tudo', 'rot', re(() => vivas(d).forEach(z => z.r = ((z.r || 0) + 90) % 360))));
    if(d.pl.some(z => z.d)) itens.push(ab('Restaurar retiradas', 'undo', re(() => d.pl.forEach(z => z.d = false))));
  } else {
    itens.push(ab('Signatário', 'sig', () => sigSheet(d)));
    itens.push(ab('Revisar tudo', 'sparkle', () => { fecharPainel(); revisarTudo(d); }));
    itens.push(ab('Word', 'word', () => baixarWord(d)));
    itens.push(ab('Copiar texto', 'copy', () => { const b = bodyDoDoc(d); copiarTexto(textoPuro(b), 'Texto copiado sem formatação.'); }));
  }
  itens.push(ab('Prévia PDF', 'eye', () => previaDoc(d)));
  itens.push(ab('Baixar PDF', 'dl', () => baixarDoc(d)));
  itens.push(ab('Repositório', 'folderShare', () => { d.repo = !d.repo; saveDB(); renderDir(); toast(d.repo ? 'Documento no repositório do objeto.' : 'Documento fora do repositório.'); }, { on:d.repo }));
  itens.push(ab('Mais', 'more', () => menuDoc(d)));
  corpo.append(h('div', { class:'agrid' }, itens));
  corpo.append(h('span', { class:'lbl' }, 'Processo'));
  corpo.append(h('div', { class:'agrid' },
    ab('Juntar em PDF', 'layers', () => compartilharSheet()),
    ab('Novo documento', 'docplus', () => { fecharPainel(); novoDocumento({ p, depois:d.id }); }),
    ab('Incluir PDF', 'clip', () => incluirPdfNaMesa()),
    ab('Editar botões', 'gear', () => { fecharPainel(); abrirEditor(); })));
}
function modoBrasPdf(d){
  const lv = vivas(d); if(!lv.length) return 'nenhum';
  const on = lv.filter(e => e.b).length;
  if(!on) return 'nenhum';
  if(on === lv.length && lv.length > 1) return 'todas';
  if(on === 1 && lv[0].b) return lv.length === 1 ? 'todas' : 'primeira';
  return 'misto';
}
function menuDoc(d, ancora){
  const p = M.p;
  menu(d.nome, [
    { t:'Renomear', ic:'pen', fn:async () => { const n = await perguntar('Renomear', 'Nome do documento', d.nome); if(n){ d.nome = n; saveDB(); renderMesa(true); renderPainel(); } } },
    { t:'Duplicar', ic:'dup', fn:() => { salvarTudo(); const c = Object.assign(clone(d), { id:uid(), nome:d.nome + ' (cópia)' }); p.docs.splice(p.docs.indexOf(d) + 1, 0, c); saveDB(); renderMesa(true); renderPainel(); } },
    { t:d.linha ? 'Tirar da linha do processo' : 'Colocar na linha do processo', sub:d.linha ? 'Continua no repositório, se estiver lá' : '', ic:'layers', fn:() => { d.linha = !d.linha; if(!d.linha && !d.repo) d.repo = true; saveDB(); renderMesa(true); renderPainel(); } },
    { t:d.repo ? 'Tirar do repositório' : 'Colocar no repositório', ic:'folderShare', fn:() => { d.repo = !d.repo; saveDB(); renderPainel(); } },
    { t:'Mover para outro processo', ic:'folder', fn:() => moverParaProcesso(d) },
    d.pai ? { t:'Deixar de ser anexo', ic:'layers', fn:() => { salvarTudo(); d.pai = null; ordenarAnexos(p); saveDB(); renderMesa(true); renderPainel(); } }
      : { t:'Tornar anexo de outro documento', sub:'Passa a andar junto com ele (1.1, 1.2…)', ic:'clip', fn:() => tornarAnexo(d) },
    { t:'Prévia do PDF', ic:'eye', fn:() => previaDoc(d) },
    { t:'Baixar PDF', ic:'dl', fn:() => baixarDoc(d) },
    d.kind === 'texto' ? { t:'Baixar Word', ic:'word', fn:() => baixarWord(d) } : null,
    '-',
    { t:'Excluir documento', ic:'trash', danger:true, fn:() => excluirDoc(d) }
  ], ancora);
}
async function tornarAnexo(d){
  const p = M.p, ops = p.docs.filter(x => x.linha && x !== d && !x.pai).map(x => [x.id, x.nome]);
  if(!ops.length) return toast('Não há outro documento para anexar.');
  const id = await escolher('Anexo de qual documento?', ops, null); if(!id) return;
  salvarTudo();
  p.docs.filter(x => x.pai === d.id).forEach(x => x.pai = id);
  d.pai = id; ordenarAnexos(p); touch(p); saveDB(); renderMesa(true); renderPainel(); toast('Agora é anexo.');
}
async function excluirDoc(d){
  if(!await confirmar('Excluir documento', '“' + d.nome + '” será apagado deste processo.', 'Excluir', true)) return;
  const p = M.p; salvarTudo();
  p.docs = p.docs.filter(x => x !== d);
  p.docs.forEach(x => { if(x.pai === d.id) x.pai = null; });
  if(d.kind === 'pdf' && !DB.procs.some(q => q.docs.some(x => x.fileId === d.fileId))) await apagarBytes(d.fileId);
  touch(p); saveDB(true); renderMesa(true); renderPainel(); toast('Documento excluído.');
}
async function moverParaProcesso(d){
  const ops = [['avulsa', 'Mesa avulsa']].concat(procsReais().sort((a, b) => b.updated - a.updated).map(q => [q.id, tituloProc(q), q.ficha.objeto]));
  const id = await escolher('Mover para', ops.filter(o => o[0] !== M.p.id), null);
  if(!id) return;
  const q = id === 'avulsa' ? procAvulsa() : procPorId(id); if(!q) return;
  salvarTudo();
  const fonte = clone(M.p.ficha);
  const junto = [d].concat(M.p.docs.filter(x => x.pai === d.id));
  M.p.docs = M.p.docs.filter(x => !junto.includes(x)); junto.forEach(x => q.docs.push(x)); if(d.pai) d.pai = null; touch(q); touch(M.p);
  if(d.kind === 'texto'){ replicarFicha(q, fonte, [d]); recontar(q); }
  saveDB(true); renderMesa(true); renderPainel();
  toast('Documento movido.', { acao:'Abrir', fn:() => abrirMesa(q, { doc:d.id }) });
}
function dividirDoc(d, e){
  const i = d.pl.indexOf(e); if(i <= 0) return;
  salvarTudo();
  const novo = Object.assign(clone(d), { id:uid(), nome:d.nome + ' (parte 2)', pl:d.pl.slice(i) });
  d.pl = d.pl.slice(0, i);
  M.p.docs.splice(M.p.docs.indexOf(d) + 1, 0, novo);
  saveDB(); renderMesa(true); renderDir(); toast('Documento dividido em dois.');
}
function faixaPaginas(txt, total){
  const out = new Set();
  String(txt || '').split(/[,;\s]+/).forEach(pt => { const m = pt.match(/^(\d+)(?:-(\d+))?$/); if(!m) return; let a = +m[1], b = m[2] ? +m[2] : a; if(a > b) [a, b] = [b, a]; for(let k = a; k <= b; k++) if(k >= 1 && k <= total) out.add(k); });
  return Array.from(out).sort((a, b) => a - b);
}
function extrairSheet(d){
  const lv = vivas(d), atual = M.cur && M.cur.e ? lv.indexOf(M.cur.e) + 1 : 1;
  const inp = h('input', { class:'inp', value:String(atual), placeholder:'Ex.: 1-3, 5' });
  sheet({ titulo:'Extrair páginas', corpo:[h('label', { class:'fld' }, h('span', null, 'Páginas deste PDF (1 a ' + lv.length + ')'), inp), h('p', { class:'muted', style:{ margin:0, fontSize:'13px' } }, 'Use vírgula e hífen: 1-3, 5, 8-10.')],
    botoes:[
      { t:'Baixar', fn:async () => { const ks = faixaPaginas(inp.value, lv.length); if(!ks.length){ toast('Informe as páginas.'); return false; } const bytes = await PDFGen.fileBytes({ bytes:await bytesDe(d.fileId), pl:ks.map(k => lv[k - 1]), name:d.nome }); offer(bytes, safeName(d.nome + ' (págs. ' + inp.value.replace(/\s/g, '') + ')', '.pdf')); } },
      { t:'Novo documento', v:'pri', fn:() => { const ks = faixaPaginas(inp.value, lv.length); if(!ks.length){ toast('Informe as páginas.'); return false; } salvarTudo(); const c = Object.assign(clone(d), { id:uid(), nome:d.nome + ' (págs. ' + inp.value.replace(/\s/g, '') + ')', pl:ks.map(k => clone(lv[k - 1])) }); M.p.docs.splice(M.p.docs.indexOf(d) + 1, 0, c); saveDB(); renderMesa(true); renderPainel(); toast('Páginas extraídas para um novo documento.'); } }
    ] });
}
/* ---------- saídas de um documento ---------- */
function htmlDoc(d){ const b = bodyDoDoc(d); return b ? htmlDoBody(b) : d.html || ''; }
function textoPuro(b){
  if(!b) return '';
  const c = b.cloneNode(true);
  c.querySelectorAll('br').forEach(x => x.replaceWith('\n'));
  const linhas = [];
  c.childNodes.forEach(n => { if(n.nodeType === 1 && n.tagName === 'TABLE') n.querySelectorAll('tr').forEach(tr => linhas.push(Array.from(tr.children).map(x => x.textContent.trim()).join(' | '))); else if(n.nodeType === 1 && (n.tagName === 'UL' || n.tagName === 'OL')) n.querySelectorAll('li').forEach((li, i) => linhas.push((n.tagName === 'OL' ? (i + 1) + '. ' : '• ') + li.textContent.trim())); else { const t = n.textContent.replace(/ /g, ' ').trim(); if(t) linhas.push(t); } });
  return linhas.join('\n\n');
}
const procDoDoc = (d, p) => p || (M.p && M.p.docs.includes(d) ? M.p : DB.procs.find(q => q.docs.includes(d))) || null;
/* nome do arquivo: documento + signatário (para trocar, gere de novo com outro signatário) */
function nomeArquivo(d, ext){
  const s = d.sig || {}, pes = d.kind === 'texto' && s.pessoa ? pessoaPorId(s.pessoa) : null;
  let nm = d.nome;
  if(pes){ const pt = titleCase(pes.nome).split(/\s+/).filter(w => !CONECTIVOS.has(w.toLowerCase())); nm += ' - ' + (pt.length > 1 ? pt[0] + ' ' + pt[pt.length - 1] : pt[0] || ''); }
  return safeName(nm, ext);
}
async function bytesDoc(d, p){
  if(d.kind === 'texto'){ const t = await PDFGen.texto(htmlDoc(d), { doc:d, proc:procDoDoc(d, p), title:d.nome }); return t.bytes; }
  return PDFGen.fileBytes({ bytes:await bytesDe(d.fileId), pl:d.pl, name:d.nome });
}
async function previaDoc(d, p){ if(!precisaLibs()) return; const b = busy('Gerando prévia…'); try{ const bytes = await bytesDoc(d, p); b.end(); previa(bytes, nomeArquivo(d, '.pdf')); }catch(e){ b.end(); console.error(e); toast(e && e.message === 'vazio' ? 'O documento está vazio.' : 'Não foi possível gerar o PDF.'); } }
async function baixarDoc(d, p){ if(!precisaLibs()) return; const b = busy('Gerando PDF…'); try{ const bytes = await bytesDoc(d, p); b.end(); await offer(bytes, nomeArquivo(d, '.pdf')); aposExportar(d, p); }catch(e){ b.end(); console.error(e); toast(e && e.message === 'vazio' ? 'O documento está vazio.' : 'Não foi possível gerar o PDF.'); } }
async function baixarWord(d, p){ if(!precisaLibs()) return; const b = busy('Gerando Word…'); try{ const blob = await buildDocx(htmlDoc(d), d, procDoDoc(d, p)); b.end(); await offer(blob, nomeArquivo(d, '.docx')); aposExportar(d, p); }catch(e){ b.end(); console.error(e); toast('Não foi possível gerar o Word.'); } }
/* CI avulsa criada de dentro de um processo: depois de exportar, volta para o processo */
function aposExportar(d, p){
  const q = procDoDoc(d, p);
  if(q && q.avdoc && VIEW === 'mesa' && M.p === q && M.voltar && procPorId(M.voltar)) setTimeout(() => { if(!SHEETS.length) sairMesa(); }, 400);
}

/* ---------- compartilhar / gerar o processo ---------- */
function compartilharSheet(){
  if(!precisaLibs()) return;
  salvarTudo();
  const p = M.p, d = M.cur && M.cur.d, linha = p.docs.filter(x => x.linha);
  const num = h('input', { type:'checkbox', checked:settings.numerar });
  const ini = h('input', { class:'inp', inputmode:'numeric', value:String(p.fls0 || settings.inicial || 1), style:{ width:'90px' } });
  const dei = h('select', { class:'sel' }, [['esq', 'Vira para a esquerda (padrão)'], ['dir', 'Vira para a direita']].map(o => h('option', { value:o[0], selected:settings.deitada === o[0] }, o[1])));
  const ver = h('input', { type:'checkbox' });
  const opt = () => { settings.numerar = num.checked; settings.deitada = dei.value; saveSettings(); return { carimbo:'nenhum', numerar:num.checked, inicial:parseInt(ini.value, 10) || 1, deitada:dei.value, titulo:tituloProc(p) }; };
  const nomeProc = safeName((p.avulsa ? 'Documentos' : tituloProc(p)) + (p.ficha.objeto && !p.avulsa ? ' – ' + p.ficha.objeto.slice(0, 50) : ''), '.pdf');
  const juntar = async lista => {
    if(!lista.length) return toast('Nada para juntar.');
    const o = opt(), b = busy('Juntando…');
    try{
      const faltam = [];
      const items = await itensDe(lista, faltam);
      const r = await PDFGen.merge(items, o, t => b.txt(t));
      b.end();
      const fora = faltam.concat(r.falhas);
      if(fora.length) toast('Atenção: não entraram ' + fora.join(', ') + '. A numeração do PDF não bate com a mesa.', { ms:8000 });
      if(ver.checked) previa(r.bytes, nomeProc); else offer(r.bytes, nomeProc);
    }catch(e){ b.end(); console.error(e); toast('Não foi possível juntar: ' + (e.message || e)); }
  };
  const corpo = [h('label', { class:'opt' }, ver, h('span', null, 'Ver a prévia antes de compartilhar'))];
  if(d) corpo.push(h('span', { class:'lbl' }, 'Este documento · ' + d.nome), h('div', { class:'mgrid' },
    h('button', { class:'mopt', onclick:() => { s.fechar(); ver.checked ? previaDoc(d) : baixarDoc(d); } }, h('b', null, 'PDF'), h('span', null, d.kind === 'texto' ? 'Com brasão e o padrão do texto pronto' : 'Com os giros, retiradas e brasões que você fez')),
    d.kind === 'texto' ? h('button', { class:'mopt', onclick:() => { s.fechar(); baixarWord(d); } }, h('b', null, 'Word'), h('span', null, 'Arquivo .docx editável')) : null,
    d.kind === 'texto' ? h('button', { class:'mopt', onclick:() => { s.fechar(); copiarTexto(textoPuro(bodyDoDoc(d)), 'Texto puro copiado. Cole no blog ou no Gmail.'); } }, h('b', null, 'Texto puro'), h('span', null, 'Copia sem formatação, para blog e Gmail')) : null));
  corpo.push(h('span', { class:'lbl' }, 'Processo inteiro · ' + plural(linha.length, 'documento', 'documentos')));
  corpo.push(h('div', { class:'fgrp' }, h('label', { class:'fld' }, h('span', null, 'Folha inicial'), ini),
    h('label', { class:'opt w2', style:{ gridColumn:'1/-1' } }, num, h('span', null, 'Numerar as folhas')), h('label', { class:'fld w2', style:{ gridColumn:'1/-1' } }, h('span', null, 'Planilha deitada na impressão (só o número gira)'), dei)));
  corpo.push(h('div', { class:'mgrid' },
    h('button', { class:'mopt', onclick:() => { s.fechar(); juntar(linha); } }, h('b', null, 'Juntar em um PDF'), h('span', null, 'Toda a linha do processo, na ordem')),
    h('button', { class:'mopt', onclick:() => { s.fechar(); escolherParaUnir(p, juntar); } }, h('b', null, 'Unir documentos'), h('span', null, 'Escolher quais entram')),
    h('button', { class:'mopt', onclick:async () => { s.fechar(); const o = opt(), b = busy('Preparando…'); try{ const faltam = []; const blob = await PDFGen.separate(await itensDe(linha, faltam), o, t => b.txt(t)); if(faltam.length) toast('Não entraram: ' + faltam.join(', '), { ms:7000 }); b.end(); offer(blob, safeName(tituloProc(p) + ' – separados', '.zip')); }catch(e){ b.end(); toast('Não foi possível gerar.'); } } }, h('b', null, 'PDFs separados'), h('span', null, 'Um arquivo por documento, num ZIP, com numeração seguida')),
    !p.avulsa ? h('button', { class:'mopt', onclick:() => { s.fechar(); compartilharRepo(p); } }, h('b', null, 'Pasta do repositório'), h('span', null, 'ZIP com os documentos do repositório')) : null));
  const s = sheet({ titulo:'Compartilhar', cheio:true, corpo });
}
function escolherParaUnir(p, juntar){
  const docs = p.docs.filter(d => d.linha || d.repo);
  const cks = docs.map(d => h('input', { type:'checkbox', checked:d.linha }));
  sheet({ titulo:'Unir documentos', cheio:true, corpo:docs.map((d, i) => h('label', { class:'zitem' }, cks[i], h('span', { class:'grow' }, d.nome, h('small', { class:'muted', style:{ display:'block', fontSize:'12px' } }, (d.kind === 'pdf' ? 'PDF' : 'Texto') + (d.linha ? '' : ' · só no repositório'))))),
    botoes:[{ t:'Cancelar', v:'ghost' }, { t:'Juntar marcados', v:'pri', fn:() => juntar(docs.filter((_, i) => cks[i].checked)) }] });
}
async function itensDe(docs, faltam){
  const out = [];
  for(const d of docs){
    if(d.kind === 'texto') out.push({ kind:'texto', html:htmlDoc(d), bras:d.bras, doc:d, proc:M.p, name:nomeArquivo(d, '') });
    else {
      const bytes = await bytesDe(d.fileId);
      if(bytes && vivas(d).length) out.push({ kind:'file', name:d.nome, f:{ bytes, pl:d.pl, name:d.nome } });
      else if(faltam) faltam.push(d.nome + (bytes ? ' (sem páginas)' : ' (arquivo não encontrado)'));
    }
  }
  return out;
}
async function compartilharRepo(p){
  if(!precisaLibs()) return;
  const repo = p.docs.filter(d => d.repo);
  if(!repo.length) return toast('O repositório está vazio.');
  const b = busy('Montando a pasta…');
  try{
    const zip = new JSZip(), pasta = safeName(tituloProc(p) + (p.ficha.objeto ? ' – ' + p.ficha.objeto.slice(0, 40) : ''), '');
    let i = 1; const falhas = [];
    for(const d of repo){ b.txt('Preparando ' + d.nome + '…'); try{ const bytes = await bytesDoc(d); zip.file(pasta + '/' + String(i++).padStart(2, '0') + ' ' + safeName(d.nome, '.pdf'), bytes); }catch(e){ falhas.push(d.nome); } }
    if(i === 1){ b.end(); return toast('Nenhum documento do repositório pôde ser gerado.'); }
    const blob = await zip.generateAsync({ type:'blob', compression:'DEFLATE', compressionOptions:{ level:6 } });
    b.end(); if(falhas.length) toast('Não entraram: ' + falhas.join(', '), { ms:7000 }); offer(blob, safeName(pasta, '.zip'));
  }catch(e){ b.end(); toast('Não foi possível montar a pasta.'); }
}

/* ---------- notas, pendências e definições ---------- */
const TIPO_NOTA = { pend:'Pendência', def:'Definição', nota:'Nota' };
M.tipoNota = 'pend';
function painelNotas(corpo){
  const p = M.p;
  const ta = h('textarea', { placeholder:'Anote uma pendência, uma definição de reunião ou um lembrete… (dá para ditar pelo microfone do teclado)', rows:'3' });
  const resp = h('input', { class:'inp', placeholder:'Responsável', list:'dlResp', style:{ minHeight:'38px', padding:'6px 10px' } });
  const prazo = h('input', { class:'inp', type:'date', style:{ minHeight:'38px', padding:'6px 10px' } });
  const liga = h('input', { type:'checkbox', checked:true });
  const nomes = Array.from(new Set(DB.procs.flatMap(q => q.notas.map(n => n.resp)).filter(Boolean).concat(SETORES, settings.signatarios.map(s => s.nome))));
  const tipos = h('div', { class:'seg' }, Object.keys(TIPO_NOTA).map(k => h('button', { class:M.tipoNota === k ? 'on' : '', style:{ minHeight:'30px', fontSize:'13px' }, onclick:() => { M.tipoNota = k; renderDir(); } }, TIPO_NOTA[k])));
  const c = M.cur;
  const add = () => {
    const t = ta.value.trim(); if(!t) return ta.focus();
    p.notas.push({ id:uid(), tipo:M.tipoNota, t, resp:resp.value.trim(), prazo:prazo.value, ok:false, criado:Date.now(), doc:liga.checked && c ? c.d.id : '', fl:liga.checked && c ? c.fl : '' });
    touch(p); saveDB(true); renderDir(); toast(TIPO_NOTA[M.tipoNota] + ' anotada.');
  };
  corpo.append(h('div', { class:'nadd' }, tipos, ta, M.tipoNota !== 'nota' ? h('div', { class:'row', style:{ flexWrap:'nowrap' } }, resp, prazo) : null,
    h('datalist', { id:'dlResp' }, nomes.map(n => h('option', { value:n }))),
    h('div', { class:'row' }, c ? h('label', { class:'row grow', style:{ gap:'6px', fontSize:'12.5px', color:'var(--muted)' } }, liga, 'Ligar à folha ' + c.fl + ' · ' + c.d.nome.slice(0, 28)) : h('span', { class:'grow' }), h('button', { class:'btn acc sm', onclick:add }, 'Anotar'))));
  const grupos = [['pend', 'Pendências', n => n.tipo === 'pend' && !n.ok], ['def', 'Definições', n => n.tipo === 'def'], ['nota', 'Notas', n => n.tipo === 'nota'], ['ok', 'Pendências resolvidas', n => n.tipo === 'pend' && n.ok]];
  let algum = false;
  for(const [k, t, f] of grupos){
    const ns = p.notas.filter(f); if(!ns.length) continue; algum = true;
    const lista = h('div', null, ns.map(n => itemNota(p, n)));
    if(k === 'ok') corpo.append(h('details', null, h('summary', { class:'lbl', style:{ cursor:'pointer' } }, t + ' (' + ns.length + ')'), lista));
    else corpo.append(h('span', { class:'lbl' }, t + ' (' + ns.length + ')'), lista);
  }
  if(!algum) corpo.append(h('div', { class:'empty', style:{ padding:'16px' } }, 'Nada anotado ainda. O que você anotar aqui entra no relatório do processo.'));
  corpo.append(h('button', { class:'btn sm soft', onclick:() => { fecharPainel(); abrirRel(p); } }, h('span', { html:I.report }), 'Ver no relatório'));
}
function itemNota(p, n){
  const venc = n.prazo && !n.ok && n.prazo < hojeISO();
  const d = n.doc ? p.docs.find(x => x.id === n.doc) : null;
  const meta = [];
  if(n.resp) meta.push(h('span', null, n.resp));
  if(n.prazo) meta.push(h('span', { style:venc ? { color:'var(--danger)', fontWeight:'600' } : null }, (venc ? 'venceu ' : 'até ') + dataBR(n.prazo)));
  if(d || n.fl) meta.push(h('a', { href:'#', onclick:e => { e.preventDefault(); if(VIEW === 'mesa' && M.p === p){ fecharPainel(); if(n.fl && irParaFolha(+n.fl)) return; if(d) irParaDoc(d.id); } else abrirMesa(p, { doc:d && d.id }); } }, (n.fl ? 'fls. ' + n.fl : '') + (d ? ' · ' + d.nome.slice(0, 26) : '')));
  meta.push(h('span', null, dataCurta(n.criado)));
  const ck = n.tipo === 'pend' ? h('input', { type:'checkbox', checked:n.ok, 'aria-label':'Resolvida', onchange:e => { n.ok = e.target.checked; n.feito = n.ok ? Date.now() : null; touch(p); saveDB(); if(VIEW === 'mesa') renderDir(); else renderRel(); } }) : h('span', { class:'tipo ' + n.tipo });
  return h('div', { class:'nitem' + (n.ok ? ' ok' : '') }, ck, h('div', { class:'nt', onclick:() => editarNota(p, n) }, h('span', null, n.t), h('small', null, meta)));
}
function editarNota(p, n){
  const ta = h('textarea', { class:'txa' }, n.t);
  const tipo = h('select', { class:'sel' }, Object.keys(TIPO_NOTA).map(k => h('option', { value:k, selected:n.tipo === k }, TIPO_NOTA[k])));
  const resp = h('input', { class:'inp', value:n.resp || '' }), prazo = h('input', { class:'inp', type:'date', value:n.prazo || '' });
  const rer = () => { if(VIEW === 'mesa' && M.painel === 'dir') renderDir(); if(VIEW === 'rel') renderRel(); };
  sheet({ titulo:TIPO_NOTA[n.tipo], corpo:[ta, h('div', { class:'fgrp' }, h('label', { class:'fld' }, h('span', null, 'Tipo'), tipo), h('label', { class:'fld' }, h('span', null, 'Prazo'), prazo), h('label', { class:'fld w2' }, h('span', null, 'Responsável'), resp))],
    botoes:[{ t:'Apagar', v:'danger', fn:() => { p.notas = p.notas.filter(x => x !== n); saveDB(); rer(); } }, { t:'Salvar', v:'pri', fn:() => { n.t = ta.value.trim() || n.t; n.tipo = tipo.value; n.resp = resp.value.trim(); n.prazo = prazo.value; touch(p); saveDB(); rer(); } }] });
}

/* ---------- ficha resumida ---------- */
function painelFicha(corpo){
  const p = M.p;
  if(p.avulsa){ corpo.append(h('div', { class:'empty' }, 'A mesa avulsa não tem ficha. Mova os documentos para um processo para usar a ficha.')); return; }
  const kv = h('dl', { class:'kv' });
  FICHA.forEach(([k, rot]) => { const v = k === 'objeto' ? '' : fichaValor(p, k); if(v) kv.append(h('dt', null, rot), h('dd', null, v)); });
  (p.ficha.extras || []).forEach(e => { if(e.v) kv.append(h('dt', null, e.k), h('dd', null, e.v)); });
  const t = tramAtual(p);
  corpo.append(h('div', { class:'pcard' }, h('b', null, tituloProc(p)), h('div', { class:'o' }, objetoProc(p)), h('div', { class:'row', style:{ marginTop:'4px' } }, chipStatus(p.status))));
  corpo.append(h('span', { class:'lbl' }, 'Onde está'));
  corpo.append(t ? h('div', { class:'rbox' }, h('b', null, t.setor), h('div', { class:'muted', style:{ fontSize:'13px' } }, (t.acao ? t.acao + ' · ' : '') + 'chegou em ' + dataBR(t.chegada) + (t.saida ? ' · saiu em ' + dataBR(t.saida) : ''))) : h('p', { class:'muted', style:{ margin:0 } }, 'Sem tramitação registrada.'));
  corpo.append(h('button', { class:'btn sm', onclick:() => tramSheet(p) }, h('span', { html:I.route }), 'Registrar tramitação'));
  corpo.append(h('span', { class:'lbl' }, 'Ficha central'));
  corpo.append(kv.children.length ? h('div', { class:'rbox' }, kv) : h('p', { class:'muted', style:{ margin:0 } }, 'Ficha ainda vazia.'));
  corpo.append(h('div', { class:'row' }, h('button', { class:'btn sm pri grow', onclick:() => fichaSheet(p) }, h('span', { html:I.pen }), 'Editar ficha'), h('button', { class:'btn sm grow', onclick:() => { fecharPainel(); abrirRel(p); } }, h('span', { html:I.report }), 'Relatório')));
}

/* =====================================================================
   Tabela: criar, preencher e importar
   ===================================================================== */
const TAB = { dados:[['', '', ''], ['', '', ''], ['', '', '']], r:3, c:3, hdr:true, range:null };
function abrirTabela(){
  const s0 = curSel();
  TAB.range = s0 ? s0.getRangeAt(0).cloneRange() : null;
  const st = h('div', { class:'muted', style:{ fontSize:'13px', minHeight:'16px' } }, TAB.range ? '' : 'Dica: toque no texto onde a tabela vai entrar antes de abrir. Sem isso ela entra no fim do documento na tela.');
  const grid = h('div', { class:'tgrid' });
  const rv = h('b'), cv = h('b');
  const hdr = h('input', { type:'checkbox', checked:TAB.hdr });
  const fit = () => { while(TAB.dados.length < TAB.r) TAB.dados.push([]); TAB.dados.forEach(r => { while(r.length < TAB.c) r.push(''); }); };
  const desenhar = () => {
    fit(); rv.textContent = TAB.r; cv.textContent = TAB.c; TAB.hdr = hdr.checked;
    const t = h('table');
    for(let i = 0; i < TAB.r; i++){
      const tr = h('tr', { class:TAB.hdr && i === 0 ? 'h' : '' });
      for(let j = 0; j < TAB.c; j++){ const inp = h('input', { value:TAB.dados[i][j] || '', placeholder:TAB.hdr && i === 0 ? 'Título ' + (j + 1) : '', 'aria-label':'Linha ' + (i + 1) + ', coluna ' + (j + 1) }); inp.oninput = () => { TAB.dados[i][j] = inp.value; }; tr.append(h('td', null, inp)); }
      t.append(tr);
    }
    grid.replaceChildren(t);
  };
  hdr.onchange = desenhar;
  const stp = (rot, el, f) => h('span', { class:'stp' }, rot, h('button', { class:'ib sm round', onclick:() => { f(-1); desenhar(); } }, '−'), el, h('button', { class:'ib sm round', onclick:() => { f(1); desenhar(); } }, '+'));
  const colar = h('textarea', { class:'txa', style:{ minHeight:'54px' }, placeholder:'Segure aqui e toque em Colar (Excel, Planilhas, Word, PDF ou texto)' });
  const carregar = (rows, de) => {
    if(!rows || !rows.length){ st.textContent = 'Não encontrei uma tabela no que foi colado.'; return; }
    let mc = 0; rows.forEach(r => mc = Math.max(mc, r.length));
    TAB.dados = rows.map(r => r.slice()); TAB.r = clamp(rows.length, 1, 60); TAB.c = clamp(mc, 1, 12); desenhar();
    st.textContent = 'Tabela importada ' + de + ': ' + TAB.r + ' linhas × ' + TAB.c + ' colunas. Confira e toque em Inserir.';
  };
  colar.addEventListener('paste', ev => { const cd = ev.clipboardData; if(!cd) return; ev.preventDefault(); const html = cd.getData('text/html'); let rows = html ? lerTabelaHTML(html) : null; if(!rows) rows = lerTabelaTexto(cd.getData('text/plain') || ''); carregar(rows, 'do que você colou'); colar.value = ''; });
  const doClip = () => {
    const falha = () => { st.textContent = PWA ? 'O celular não liberou o que você copiou. Segure no campo acima e toque em Colar.' : 'Aqui no Claude o app não pode ler o que você copiou. Segure no campo acima e toque em Colar. No app instalado este botão puxa direto.'; };
    try{
      if(navigator.clipboard && navigator.clipboard.read) navigator.clipboard.read().then(async items => { const it = items[0]; if(it && it.types.includes('text/html')){ carregar(lerTabelaHTML(await (await it.getType('text/html')).text()), 'da área de transferência'); return; } carregar(lerTabelaTexto(await navigator.clipboard.readText()), 'da área de transferência'); }).catch(falha);
      else falha();
    }catch(e){ falha(); }
  };
  desenhar();
  sheet({ titulo:'Tabela', cheio:true, corpo:[
    h('div', { class:'row' }, stp('Linhas', rv, d => TAB.r = clamp(TAB.r + d, 1, 60)), stp('Colunas', cv, d => TAB.c = clamp(TAB.c + d, 1, 12))),
    h('label', { class:'opt' }, hdr, h('span', null, '1ª linha é o cabeçalho')), grid,
    h('span', { class:'lbl' }, 'Importar tabela copiada'), colar,
    h('div', { class:'row' }, h('button', { class:'btn sm', onclick:doClip }, h('span', { html:I.paste }), 'Importar do que copiei'), h('button', { class:'btn sm ghost', onclick:() => { TAB.dados = []; desenhar(); } }, 'Limpar')), st],
    botoes:[{ t:'Cancelar', v:'ghost' }, { t:'Inserir no texto', v:'pri', fn:inserirTabela }] });
}
function lerTabelaHTML(html){ const d = new DOMParser().parseFromString(html, 'text/html'), t = d.querySelector('table'); if(!t) return null; const rows = []; t.querySelectorAll('tr').forEach(tr => { const r = []; tr.querySelectorAll('th,td').forEach(c => r.push(c.textContent.replace(/\s+/g, ' ').trim())); if(r.length) rows.push(r); }); return rows.length ? rows : null; }
function lerTabelaTexto(t){
  let ls = String(t || '').replace(/\r/g, '').split('\n').filter(l => l.trim()); if(!ls.length) return null;
  if(ls.every(l => l.trim().charAt(0) === '|')){ ls = ls.filter(l => !/^\s*\|?\s*:?-{2,}/.test(l)); return ls.map(l => l.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim())); }
  const sep = ls[0].includes('\t') ? '\t' : ls[0].includes(';') ? ';' : null;
  if(!sep) return ls.map(l => l.trim().split(/\s{2,}/));
  return ls.map(l => l.split(sep).map(c => c.trim()));
}
function inserirTabela(){
  const num = v => /\d/.test(v) && /^[-+R$\s\d.,%()]+$/.test(v);
  let html = '<table class="tbl"><tbody>';
  for(let i = 0; i < TAB.r; i++){
    html += '<tr>';
    for(let j = 0; j < TAB.c; j++){ const v = (TAB.dados[i] && TAB.dados[i][j]) || '', th = TAB.hdr && i === 0; html += '<' + (th ? 'th' : 'td') + (!th && num(v) ? ' class="n"' : '') + '>' + (v ? esc(v) : '<br>') + '</' + (th ? 'th' : 'td') + '>'; }
    html += '</tr>';
  }
  html += '</tbody></table>';
  let body = null, blk = null;
  if(TAB.range){ const n = TAB.range.startContainer, el = n.nodeType === 1 ? n : n.parentElement; body = el && el.closest('.body'); blk = el && el.closest('.body > *'); }
  if(!body){ body = bodyDoDoc(M.cur && M.cur.d) || pagesEl.querySelector('.body'); if(!body){ toast('Não há texto aberto para receber a tabela.'); return false; } blk = body.lastElementChild; }
  if(blk && blk.parentElement === body){ blk.insertAdjacentHTML('afterend', html + '<p><br></p>'); }
  else body.insertAdjacentHTML('beforeend', html + '<p><br></p>');
  body.dispatchEvent(new Event('input'));
  toast('Tabela inserida.');
}

/* =====================================================================
   Revisão de português com IA
   ===================================================================== */
const MARCA_MUD = '---MUDANÇAS---';
function abrirRevisao(){
  pararRolagem();
  const s0 = curSel(); let range = null, texto = '';
  if(s0 && !s0.isCollapsed){ range = s0.getRangeAt(0).cloneRange(); texto = s0.toString(); }
  else {
    /* sem seleção: revisa o texto inteiro, parágrafo por parágrafo */
    const b = curBody(), d = b ? docById(b.parentElement.dataset.doc) : (M.cur && M.cur.d);
    if(d && d.kind === 'texto') return revisarTudo(d);
    return toast('Vá até um texto para revisar.');
  }
  if(!range || !texto.trim()) return toast('Selecione um trecho antes de revisar.');
  const body = (range.startContainer.nodeType === 1 ? range.startContainer : range.startContainer.parentElement).closest('.body');
  /* seleção com vários parágrafos: revisa e devolve parágrafo por parágrafo, sem perder títulos e tabelas */
  const blocos = body ? Array.from(body.querySelectorAll('p,h1,h2,h3,li,td,th')).filter(b => !b.querySelector('p,li,td,th') && b.textContent.trim() && range.intersectsNode(b)) : [];
  const multi = blocos.length > 1;
  if(multi) texto = blocos.map(b => b.innerText.replace(/\s*\n\s*/g, ' ').trim()).join('\n\n');
  const orig = texto.trim();
  const out = h('div', { id:'rvOut', contenteditable:'true', spellcheck:'true' }, orig);
  const st = h('div', { class:'muted', style:{ fontSize:'13px', minHeight:'18px' } });
  const mud = h('details', { hidden:true }, h('summary', { style:{ cursor:'pointer', fontWeight:'600' } }, 'O que mudou'), h('ul', { style:{ margin:'6px 0 0', paddingLeft:'18px' } }));
  const msgs = h('div', { style:{ display:'flex', flexDirection:'column', gap:'8px' } });
  const pedido = h('textarea', { class:'txa', style:{ minHeight:'48px' }, placeholder:'Peça um ajuste: deixe mais curto, acrescente a base legal…' });
  const conversa = h('div', { hidden:true, style:{ display:'flex', flexDirection:'column', gap:'8px' } }, msgs, h('div', { class:'row', style:{ flexWrap:'nowrap', alignItems:'flex-end' } }, pedido, h('button', { class:'btn acc', onclick:enviar }, 'Enviar')));
  let ctl = null, turns = [];
  const split = t => { const i = t.indexOf(MARCA_MUD); return i < 0 ? { txt:t, mud:'' } : { txt:t.slice(0, i), mud:t.slice(i + MARCA_MUD.length) }; };
  const contexto = () => 'Estou desenvolvendo um trecho de documento oficial da Prefeitura de Ilhéus.\n\nOriginal:\n' + orig.slice(0, 2500) + '\n\nVersão revisada:\n' + out.innerText.slice(0, 2500) + '\n\nQuero continuar desenvolvendo este texto.';
  const levar = (url, qParam) => h('a', { class:'btn sm', href:url, target:'_blank', rel:'noopener', onclick:function(){ if(qParam) this.href = url + '?q=' + encodeURIComponent(contexto()); copiarTexto(out.innerText, 'Texto copiado. Se preferir uma conversa que você já tem, é só colar lá.'); } }, url.includes('gemini') ? 'Levar ao Gemini ↗' : 'Levar ao Claude ↗');
  const s = sheet({ titulo:'Revisão de português', cheio:true, aoFechar:() => { if(ctl) ctl.abort(); }, corpo:[st, out, mud,
    h('div', { class:'row' }, h('button', { class:'btn sm', onclick:() => copiarTexto(out.innerText, 'Texto copiado.') }, h('span', { html:I.copy }), 'Copiar'), h('button', { class:'btn sm', onclick:() => { out.focus(); selecionarNo(out); } }, 'Selecionar tudo'),
      h('button', { class:'btn sm', onclick:() => { conversa.hidden = !conversa.hidden; if(!conversa.hidden) pedido.focus(); } }, h('span', { html:I.sparkle }), 'Desenvolver aqui')),
    h('div', { class:'row' }, levar('https://claude.ai/new', true), levar('https://gemini.google.com/app', false)), conversa],
    botoes:[{ t:'Parar', v:'ghost', fica:true, fn:() => { if(ctl) ctl.abort(); } }, { t:'Substituir no documento', v:'pri', fn:() => {
      const t = out.innerText.replace(/\n+$/, '');
      if(multi){
        const novos = t.split(/\n+/).map(x => x.trim()).filter(Boolean);
        if(novos.length === blocos.length){ blocos.forEach((b, i) => { if(b.innerText.replace(/\s*\n\s*/g, ' ').trim() !== novos[i]) b.textContent = novos[i]; }); }
        else {
          const r2 = document.createRange(); r2.setStartBefore(blocos[0].closest('.body > *') || blocos[0]); r2.setEndAfter(blocos[blocos.length - 1].closest('.body > *') || blocos[blocos.length - 1]);
          r2.deleteContents(); const frag = document.createDocumentFragment(); novos.forEach(x => frag.append(h('p', null, x))); r2.insertNode(frag);
          toast('A revisão mudou a quantidade de parágrafos; o trecho entrou como parágrafos simples.', { ms:6000 });
        }
        body.dispatchEvent(new Event('input')); toast('Trecho revisado substituído.'); return;
      }
      if(body) body.focus();
      const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
      let ok = false; try{ ok = document.execCommand('insertText', false, t); }catch(e){}
      if(!ok){ range.deleteContents(); range.insertNode(document.createTextNode(t)); }
      if(body) body.dispatchEvent(new Event('input'));
      toast('Trecho substituído.');
    } }] });
  (async () => {
    st.textContent = 'Revisando…';
    ctl = new AbortController();
    try{
      const r = await iaPedir([{ role:'user', content:(settings.ia.prompt || REV_PROMPT) + '\n\nTEXTO:\n' + orig }], { signal:ctl.signal, onText:t => { st.textContent = 'Escrevendo…'; out.textContent = split(t).txt.trim() || orig; } });
      const pt = split(r); out.textContent = pt.txt.trim() || orig;
      const itens = pt.mud.split('\n').map(l => l.replace(/^\s*[-•*]\s*/, '').trim()).filter(Boolean);
      const ul = mud.querySelector('ul'); ul.replaceChildren(...itens.map(t => h('li', null, t))); mud.hidden = !itens.length;
      st.textContent = 'Pronto. Dá para editar aqui dentro antes de usar.';
    }catch(e){ st.textContent = iaErro(e); if(e && e.text) out.textContent = split(e.text).txt.trim() || orig; }
  })();
  async function enviar(){
    const q = pedido.value.trim(); if(!q) return; pedido.value = '';
    turns.push({ role:'user', content:q }); msgs.append(h('div', { class:'msg u' }, q));
    const bolha = h('div', { class:'msg a' }, 'Pensando…'); msgs.append(bolha);
    ctl = new AbortController();
    const regras = 'Você está me ajudando a desenvolver um trecho de documento oficial (nota técnica, despacho, CI, ofício) da Secretaria de Infraestrutura e Defesa Civil de Ilhéus. Português do Brasil, formal e impessoal. Nunca use a palavra "tratativa(s)". Quando eu pedir uma nova versão, responda só com o texto da nova versão, sem comentários.\n\nTexto original:\n' + orig.slice(0, 6000) + '\n\nVersão atual:\n' + out.innerText.slice(0, 6000);
    try{
      const r = await iaPedir([{ role:'user', content:regras }].concat(turns.slice(-12)), { forte:true, cache:false, signal:ctl.signal, onText:t => { bolha.textContent = t; } });
      turns.push({ role:'assistant', content:r }); bolha.textContent = r;
      bolha.append(h('div', null, h('button', { class:'btn sm soft', style:{ marginTop:'6px' }, onclick:() => { out.textContent = r.trim(); st.textContent = 'Caixa atualizada com esta versão.'; } }, 'Usar esta versão')));
    }catch(e){ turns.pop(); bolha.textContent = iaErro(e); }
  }
}

/* =====================================================================
   Editor dos botões da mesa (códigos, posição, função)
   ===================================================================== */
const ACOES = [['', 'Nenhuma (só desenho)'], ['home', 'Voltar ao início'], ['selfolhas', 'Selecionar folhas (PDF, imprimir, compartilhar)'], ['signatario', 'Signatário do documento'], ['revisar', 'Revisar texto com IA'], ['palavra', 'Selecionar palavra'], ['paragrafo', 'Selecionar parágrafo'], ['tudo', 'Selecionar texto inteiro'],
  ['copiar', 'Copiar'], ['colar', 'Colar'], ['selecionar', 'Modo selecionar (liga/desliga)'], ['esq', '◀ Palavra anterior (ou seleção)'], ['dir', '▶ Próxima palavra (ou seleção)'], ['marca', 'Marca-texto'],
  ['tabela', 'Criar ou importar tabela'], ['formatar', 'Formatar texto (Aa)'], ['cima', '▲ Parágrafo anterior (ou seleção)'], ['baixo', '▼ Próximo parágrafo (ou seleção)'], ['proxima', 'Próxima folha'], ['anterior', 'Folha anterior'], ['zoomMais', 'Aumentar zoom (lupa +)'], ['zoomMenos', 'Diminuir zoom (lupa −)'], ['rolar', 'Rolar sozinho (tipo PJe)'], ['zoom88', 'Voltar ao zoom padrão'],
  ['notas', 'Notas e pendências'], ['compartilhar', 'Compartilhar e gerar PDF'], ['novodoc', 'Novo documento'], ['incluirpdf', 'Incluir PDF'], ['ficha', 'Ficha central'], ['relatorio', 'Relatório do processo'],
  ['buscar', 'Buscar no processo'], ['teclado', 'Abrir o teclado para digitar'], ['abaEsq', 'Abrir aba esquerda'], ['abaDir', 'Abrir aba direita']];
const acaoNome = k => (ACOES.find(a => a[0] === k) || [, ''])[1];
const ED = { sel:null, drag:null, undo:[], pos:'t' };
function salvarLay(){ settings.lay = M.lay; saveSettings(); }
function abrirEditor(){ if(M.deitado) return toast('Para editar os botões, volte o celular para a vertical.'); M.editing = true; ED.sel = null; screenEl.classList.add('editing'); renderLay(); renderTools(); }
function fecharEditor(){ M.editing = false; ED.sel = null; screenEl.classList.remove('editing'); $('tools').hidden = true; salvarLay(); renderLay(); }
function edPush(){ ED.undo.push(JSON.stringify(M.lay)); if(ED.undo.length > 60) ED.undo.shift(); }
function editorPointerDown(ev, n){
  if(ev.target.closest('.abaBtn') || ev.target.closest('.panel')) return;
  if(!n){ if(ED.sel){ ED.sel = null; renderLay(); renderTools(); } return; }
  ev.preventDefault();
  const e = lay().els.find(x => x.id === n.dataset.id); if(!e) return;
  if(ED.sel !== e.id){ ED.sel = e.id; renderLay(); renderTools(); }
  const node = $('L-tela').querySelector('[data-id="' + e.id + '"]');
  ED.drag = { id:e.id, knob:!!ev.target.closest('.knob'), sx:ev.clientX, sy:ev.clientY, o:clone(e), W:screenEl.clientWidth, H:screenEl.clientHeight, node, antes:JSON.stringify(M.lay), mov:false, pid:ev.pointerId };
  try{ screenEl.setPointerCapture(ev.pointerId); }catch(err){}
}
function editorPointerMove(ev){
  const g = ED.drag; if(!g || ev.pointerId !== g.pid) return;
  const dx = ev.clientX - g.sx, dy = ev.clientY - g.sy;
  if(!g.mov && Math.abs(dx) + Math.abs(dy) < 4) return;
  g.mov = true;
  const e = lay().els.find(x => x.id === g.id), o = g.o;
  if(!g.knob){
    e.x = Math.round(clamp(o.x + dx / faixaBotoes(g.W) * 1000, 0, 1000)) / 10;
    const yAbs = clamp(layY(o, g.H) + dy, 0, g.H);
    if(yAbs > g.H / 2){ e.ay = 'bottom'; e.dy = Math.round(g.H - yAbs); } else { e.ay = 'top'; e.dy = Math.round(yAbs); }
  } else if(e.type === 'icone') e.size = clamp(Math.round(o.size + (dx + dy)), 16, 140);
  else { e.w = Math.round(clamp(o.w + dx * 2 / faixaBotoes(g.W) * 100, 3, 100) * 10) / 10; e.h = clamp(Math.round(o.h + dy * 2), 2, 400); }
  aplicarEl(g.node, e);
}
function editorPointerUp(ev){ const g = ED.drag; if(!g || (ev && ev.pointerId !== g.pid)) return; if(g.mov){ ED.undo.push(g.antes); renderTools(); } ED.drag = null; }
function proxCodigo(y){ const H = screenEl.clientHeight, p = y < H * .15 ? 'T' : y > H * .8 ? 'R' : 'F'; let mx = 0; lay().els.forEach(e => { const m = /^([A-Z]+)(\d+)$/.exec(e.code || ''); if(m && m[1] === p) mx = Math.max(mx, +m[2]); }); return p + (mx + 1); }
function renderTools(){
  const t = $('tools'), L = lay();
  t.hidden = !M.editing; t.className = ED.pos;
  if(!M.editing) return;
  const e = ED.sel ? L.els.find(x => x.id === ED.sel) : null;
  const B = (rot, fn, on, cls) => h('button', { class:'btn sm ' + (on ? 'pri' : cls || ''), onclick:fn }, rot);
  const rng = (rot, k, min, max, un) => { const i = h('input', { type:'range', min, max, value:L[k] }), v = h('em', null, L[k] + un); let p0 = false; i.oninput = () => { if(!p0){ edPush(); p0 = true; } L[k] = +i.value; v.textContent = i.value + un; aplicarBarras(); renderLay(); }; i.onchange = () => { p0 = false; }; return h('label', { class:'rg' }, h('span', null, rot), i, v); };
  const corpo = h('div', { class:'bd' });
  if(e){
    const tipo = e.type === 'icone' ? 'Botão' : e.type === 'titulo' ? 'Título' : e.type === 'traco' ? 'Tracinho' : 'Texto';
    const code = h('input', { class:'inp', style:{ width:'70px', minHeight:'36px', fontWeight:'700', textTransform:'uppercase' }, value:e.code });
    code.oninput = () => { e.code = code.value.toUpperCase(); renderLay(); };
    const linha = [h('span', { class:'lbl', style:{ width:'100%' } }, 'Selecionado · ' + tipo), code];
    if(e.type === 'icone'){
      const rot = h('input', { class:'inp grow', style:{ minHeight:'36px' }, value:e.rot || '', placeholder:'Letra ou nome curto' }); rot.oninput = () => { e.rot = rot.value; renderLay(); };
      const acs = h('select', { class:'sel', style:{ minHeight:'38px' } }, ACOES.map(a => h('option', { value:a[0], selected:e.acao === a[0] }, a[1]))); acs.onchange = () => { edPush(); e.acao = acs.value; renderLay(); };
      const nota = h('input', { class:'inp', style:{ minHeight:'36px' }, value:e.nota || '', placeholder:'Anotação livre (como abre, como fecha…)' }); nota.oninput = () => { e.nota = nota.value; };
      linha.push(rot);
      const ICP = { home:'home', notas:'note', compartilhar:'share', buscar:'search', incluirpdf:'clip', novodoc:'docplus', ficha:'pen', relatorio:'report', revisar:'sparkle', copiar:'copy', colar:'paste' };
      corpo.append(h('div', { class:'row' }, linha), acs, nota,
        h('div', { class:'row' }, B('Bolinha', () => { edPush(); e.shape = 'bola'; L.iconMode = 'misto'; renderLay(); renderTools(); }, e.shape === 'bola'), B('Quadradinho', () => { edPush(); e.shape = 'quad'; L.iconMode = 'misto'; renderLay(); renderTools(); }, e.shape === 'quad'),
          ['branco', 'preto', 'vidro'].map(c => B(c[0].toUpperCase() + c.slice(1), () => { edPush(); e.cor = c; renderLay(); renderTools(); }, e.cor === c)),
          B('Menor', () => { edPush(); e.size = clamp(e.size - 4, 16, 140); renderLay(); }), B('Maior', () => { edPush(); e.size = clamp(e.size + 4, 16, 140); renderLay(); }),
          e.ic ? B('Mostrar letra/nome', () => { edPush(); e.ic = ''; renderLay(); renderTools(); }) : ICP[e.acao] ? B('Mostrar ícone', () => { edPush(); e.ic = ICP[e.acao]; renderLay(); renderTools(); }) : null));
    } else {
      if(e.type === 'texto'){ const tx = h('input', { class:'inp grow', style:{ minHeight:'36px' }, value:e.text || '' }); tx.oninput = () => { e.text = tx.value; renderLay(); }; linha.push(tx); }
      corpo.append(h('div', { class:'row' }, linha), h('div', { class:'row' }, B('Mais estreito', () => { edPush(); e.w = clamp(e.w - 4, 3, 100); renderLay(); }), B('Mais largo', () => { edPush(); e.w = clamp(e.w + 4, 3, 100); renderLay(); }),
        e.type === 'texto' ? [B('Sem borda', () => { e.box = 'nenhuma'; renderLay(); }), B('Tracejado', () => { e.box = 'linha'; renderLay(); }), B('Caixinha', () => { e.box = 'caixa'; renderLay(); }), B(e.neg ? 'Tirar negrito' : 'Negrito', () => { e.neg = !e.neg; renderLay(); renderTools(); })] : null));
    }
    corpo.append(h('div', { class:'row' }, B('Duplicar', () => { edPush(); const c = Object.assign(clone(e), { id:uid(), x:clamp(e.x + 6, 0, 100) }); c.code = proxCodigo(layY(c, screenEl.clientHeight)); L.els.push(c); ED.sel = c.id; renderLay(); renderTools(); }),
      e.type !== 'titulo' ? B('Apagar', () => { edPush(); L.els = L.els.filter(x => x !== e); ED.sel = null; renderLay(); renderTools(); }, false, 'danger') : null));
  } else corpo.append(h('p', { class:'muted', style:{ margin:0 } }, 'Toque num botão para mudar. Arraste para mover; puxe a bolinha azul para mudar o tamanho. Escolha a função de cada botão na lista. Toque em Pronto para usar.'));
  const add = k => { edPush(); const H = screenEl.clientHeight, y = H * .45; const e2 = { id:uid(), x:50, ay:'top', dy:Math.round(y) }; if(k === 'bola' || k === 'quad') Object.assign(e2, { type:'icone', shape:k, size:38, cor:'branco', rot:'', acao:'', nota:'' }); else if(k === 'traco') Object.assign(e2, { type:'traco', w:12, h:3 }); else Object.assign(e2, { type:'texto', w:40, h:28, text:'Texto', box:'nenhuma' }); e2.code = proxCodigo(y); L.els.push(e2); ED.sel = e2.id; renderLay(); renderTools(); };
  corpo.append(h('span', { class:'lbl' }, 'Adicionar'), h('div', { class:'row' }, B('● Bolinha', () => add('bola')), B('■ Quadradinho', () => add('quad')), B('— Tracinho', () => add('traco')), B('T Texto', () => add('texto'))));
  corpo.append(h('span', { class:'lbl' }, 'Todos os botões'), h('div', { class:'row' }, B('Tudo bolinha', () => { edPush(); L.iconMode = 'bola'; renderLay(); renderTools(); }, L.iconMode === 'bola'), B('Tudo quadradinho', () => { edPush(); L.iconMode = 'quad'; renderLay(); renderTools(); }, L.iconMode === 'quad'), B('Cada um do seu jeito', () => { edPush(); L.iconMode = 'misto'; renderLay(); renderTools(); }, L.iconMode === 'misto')));
  corpo.append(h('div', { class:'row' }, B('Letras e nomes', () => { L.labelMode = 'nome'; renderLay(); renderTools(); }, L.labelMode === 'nome'), B('Códigos', () => { L.labelMode = 'codigo'; renderLay(); renderTools(); }, L.labelMode === 'codigo'), B('Nada', () => { L.labelMode = 'nada'; renderLay(); renderTools(); }, L.labelMode === 'nada')));
  corpo.append(h('details', null, h('summary', { style:{ fontWeight:'600', cursor:'pointer' } }, 'Barras, abas e rolagem'), h('div', { style:{ display:'flex', flexDirection:'column', gap:'8px', marginTop:'8px' } },
    rng('Barra de cima', 'topH', 0, 140, 'px'), rng('Barra de baixo', 'botH', 0, 220, 'px'), rng('Botões das abas: altura acima da barra', 'abaY', 0, 400, 'px'),
    rng('Largura aba esquerda', 'leftW', 40, 100, '%'), rng('Largura aba direita', 'rightW', 40, 100, '%'), rng('Velocidade da rolagem', 'speed', 5, 400, ' px/s'))));
  corpo.append(h('div', { class:'row' }, B('Copiar lista de códigos', () => copiarTexto(listaCodigos(), 'Lista copiada. Cole no chat ou no Gemini.')), B('Voltar ao padrão', async () => { if(await confirmar('Voltar ao padrão', 'Os botões voltam para o desenho original.', 'Voltar')){ edPush(); M.lay = layPadrao(); aplicarBarras(); renderLay(); renderTools(); } }, false, 'danger')));
  t.replaceChildren(h('div', { class:'hd' }, h('b', null, 'Editar botões'), h('button', { class:'btn sm', onclick:() => { if(!ED.undo.length) return toast('Nada para desfazer.'); M.lay = JSON.parse(ED.undo.pop()); ED.sel = null; aplicarBarras(); renderLay(); renderTools(); } }, 'Desfazer'),
    h('button', { class:'btn sm', onclick:() => { ED.pos = ED.pos === 'b' ? 't' : 'b'; renderTools(); } }, ED.pos === 'b' ? 'Subir painel' : 'Descer painel'), h('button', { class:'btn sm acc', onclick:fecharEditor }, 'Pronto')), corpo);
}
function listaCodigos(){
  const L = lay(), H = screenEl.clientHeight, W = screenEl.clientWidth;
  const out = ['PANDA · BOTÕES DA MESA', 'Tela: ' + W + ' × ' + H + ' px · Barra de cima ' + L.topH + ' px · Barra de baixo ' + L.botH + ' px', 'Aba esquerda ' + L.leftW + '% · Aba direita ' + L.rightW + '% · Botões das abas ' + (L.abaY == null ? 12 : L.abaY) + ' px acima da barra', ''];
  L.els.slice().sort((a, b) => layY(a, H) - layY(b, H) || a.x - b.x).forEach(e => out.push(e.code + ' · ' + (e.type === 'icone' ? (e.rot ? '“' + e.rot + '” ' : '') + (e.cor || '') + ' ' + e.size + 'px' : e.type) + ' · x ' + Math.round(e.x) + '% · ' + (e.ay === 'bottom' ? e.dy + ' px do rodapé' : e.dy + ' px do topo') + (e.acao ? ' · ' + acaoNome(e.acao) : '') + (e.nota ? ' · ' + e.nota : '')));
  return out.join('\n');
}

/* ===== fz_mesa2.js ===== */
/* =====================================================================
   Mesa (Panda v1): fecho e tarja na folha, cursor fixo, navegação por
   palavra, frase e parágrafo, folha nova, seleção de folhas, tela de PDF,
   signatário e revisão do texto inteiro
   ===================================================================== */

/* ---------- fecho, data do ofício, notas e tarja na tela ---------- */
function runsHTML(runs){
  return (runs || []).map(r => { let t = esc(r.t || ''); if(r.i) t = '<i>' + t + '</i>'; if(r.b) t = '<b>' + t + '</b>'; return t; }).join('');
}
function fechoEl(d){
  if(!fechoAtivo(d)) return h('div', { class:'fecho sem' });
  const s = d.sig || {}, pes = s.pessoa ? pessoaPorId(s.pessoa) : null;
  const box = h('div', { class:'fecho', title:'Toque para escolher o signatário' });
  box.addEventListener('click', ev => tocarFecho(d, ev));
  if(!docTemDataNoTopo(d)) box.append(h('div', { class:'loc', html:runsHTML(runsDataTopo(d)) }));
  box.append(h('div', { class:'n1' + (pes ? '' : ' vazio') }, pes ? titleCase(pes.nome) : '[Signatário: toque para escolher]'));
  if(pes && pes.cargo) box.append(h('div', { class:'n2' }, pes.cargo));
  if(pes && pes.reg) box.append(h('div', { class:'n2 n3' }, pes.reg));
  return box;
}
function tarjaEl(d){
  const runs = tarjaRuns(d, M.p);
  return h('div', { class:'tarjaV', hidden:!runs, html:runs ? runsHTML(runs) : '' });
}
/* data do ofício no topo, recuo dos parágrafos numerados e restos da folha provisória */
function prepararCorpo(body, d){
  body.querySelectorAll('p.dt').forEach(p => { p.setAttribute('contenteditable', 'false'); const hh = runsHTML(runsDataTopo(d)); if(p.innerHTML !== hh) p.innerHTML = hh; });
  body.querySelectorAll(':scope > p').forEach(p => {
    if(p.classList.contains('bl') || p.classList.contains('id') || p.classList.contains('dt') || p.classList.contains('alin')) return;
    const ni = semRecuo(p.textContent);
    if(ni !== p.classList.contains('ni')) p.classList.toggle('ni', ni);
  });
  if(!body.contains(document.activeElement) && !body.matches(':focus')) body.querySelectorAll('p.tmpP').forEach(p => { if(!p.textContent.trim()){ const hr = p.previousElementSibling; if(hr && hr.matches('hr.tmp')) hr.remove(); p.remove(); } });
}
function mostrarNotas(pg, notas){
  const box = pg.querySelector('.notasV'); if(!box) return;
  box.replaceChildren(...(notas || []).map((t, i) => h('div', null, h('sup', null, String(i + 1)), ' ', t)));
  box.hidden = !(notas && notas.length);
}
/* signatário mudou: redesenha só o que depende dele */
function atualizarFecho(d){
  const pg = paginaEl(d.id); if(!pg) return;
  const f = pg.querySelector('.fecho'); if(f) f.replaceWith(fechoEl(d));
  const t = pg.querySelector('.tarjaV'); if(t) t.replaceWith(tarjaEl(d));
  prepararCorpo(pg.querySelector('.body'), d);
  diagramar(d);
}

/* ---------- cursor fixo (sem piscar) com bolinha vermelha ---------- */
function caretEl(){ let c = $('caret'); if(!c || !pagesEl.contains(c)){ if(c) c.remove(); const bola = h('i', { class:'bola' }, h('img', { src:PANDA_SRC, alt:'' })); c = h('div', { id:'caret', 'aria-hidden':'true' }, bola); pagesEl.append(c); if(typeof ligarBola === 'function') ligarBola(bola); } return c; }
function esconderCaret(){ const c = $('caret'); if(c) c.hidden = true; }
function rectDoCursor(s){
  let n = s.focusNode, o = s.focusOffset;
  if(n.nodeType === 1){
    const ch = n.childNodes[o] || null, ant = n.childNodes[o - 1] || null;
    if(ch && ch.nodeType === 3){ n = ch; o = 0; }
    else if(ant && ant.nodeType === 3){ n = ant; o = ant.data.length; }
  }
  if(n.nodeType === 3 && n.data.length){
    const r = document.createRange();
    r.setStart(n, Math.min(o, n.data.length)); r.collapse(true);
    const rs = r.getClientRects(); let rc = rs.length ? rs[rs.length - 1] : null;
    if(!rc || (!rc.height && !rc.top)){ const r2 = document.createRange(); const a = Math.max(0, o - 1); r2.setStart(n, a); r2.setEnd(n, Math.min(n.data.length, a + 1)); const q = r2.getClientRects(); if(q.length){ const x = q[q.length - 1]; rc = { left:o > 0 ? x.right : x.left, top:x.top, height:x.height }; } }
    if(rc && rc.height) return rc;
  }
  const el = (n.nodeType === 1 ? n : n.parentElement), blk = el.closest('p,li,h1,h2,h3,h4,td,th,blockquote') || el;
  const b = blk.getBoundingClientRect(), cs = getComputedStyle(blk), fs = parseFloat(cs.fontSize) || 12;
  let left = b.left + (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.textIndent) || 0);
  if(cs.textAlign === 'center') left = b.left + b.width / 2; else if(cs.textAlign === 'right') left = b.right - (parseFloat(cs.paddingRight) || 0);
  return { left, top:b.top + (parseFloat(cs.paddingTop) || 0), height:fs * 1.15 };
}
function atualizarCaret(){
  if(DRAG) return;   /* arrastando o pandinho: o cursor fica quieto */
  if(VIEW !== 'mesa' || !M.p) return esconderCaret();
  const s = window.getSelection();
  if(M.fsel || !s || !s.rangeCount || !s.isCollapsed || !s.focusNode) return esconderCaret();
  const el = s.focusNode.nodeType === 1 ? s.focusNode : s.focusNode.parentElement;
  if(!el || !el.closest('#pages .body')) return esconderCaret();
  let rc; try{ rc = rectDoCursor(s); }catch(e){ return esconderCaret(); }
  const c = caretEl(), p0 = pagesEl.getBoundingClientRect();
  c.style.left = Math.round(rc.left - p0.left - 1) + 'px'; c.style.top = Math.round(rc.top - p0.top) + 'px'; c.style.height = Math.max(8, Math.round(rc.height)) + 'px';
  c.hidden = false;
}
let _caretRaf = 0;
document.addEventListener('selectionchange', () => {
  if(_caretRaf) return;
  _caretRaf = requestAnimationFrame(() => { _caretRaf = 0; atualizarCaret(); limparFolhaTmp(false); });
});

/* ---------- mapa do texto: posições lineares para andar por palavra e frase ---------- */
const BLOCOS = 'p,li,h1,h2,h3,h4,td,th';
function mapaTexto(body){
  const segs = []; let str = '', ultBlk = null;
  const w = document.createTreeWalker(body, NodeFilter.SHOW_TEXT, { acceptNode:n => n.parentElement.closest('sup.nr,p.dt,.naoimp') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
  let t;
  while((t = w.nextNode())){
    const blk = t.parentElement.closest(BLOCOS) || t.parentElement;
    if(ultBlk && blk !== ultBlk){ str += '\n'; }
    ultBlk = blk;
    segs.push({ node:t, start:str.length, len:t.data.length, blk });
    str += t.data;
  }
  return { str, segs, body };
}
function posDeDom(M_, node, off){
  const { segs } = M_;
  for(const sg of segs) if(sg.node === node) return sg.start + Math.min(off, sg.len);
  const r = document.createRange();
  try{ r.setStart(node, off); }catch(e){ return 0; }
  for(const sg of segs){ if(r.comparePoint(sg.node, 0) >= 0) return sg.start; }
  const u = segs[segs.length - 1]; return u ? u.start + u.len : 0;
}
function domDePos(M_, i){
  const { segs } = M_;
  if(!segs.length) return { node:M_.body, off:0 };
  let ant = null;
  for(const sg of segs){ if(i >= sg.start && i < sg.start + sg.len) return { node:sg.node, off:i - sg.start }; if(i < sg.start) return ant ? { node:ant.node, off:ant.len } : { node:sg.node, off:0 }; ant = sg; }
  const u = segs[segs.length - 1]; return { node:u.node, off:u.len };
}
const ESP = c => c == null || /[\s ]/.test(c);
function inicioProxPalavra(S, i){ const L = S.length; while(i < L && !ESP(S[i])) i++; while(i < L && ESP(S[i])) i++; return i; }
function fimProxPalavra(S, i){ const L = S.length; while(i < L && ESP(S[i])) i++; while(i < L && !ESP(S[i])) i++; return i; }
function inicioPalavraAnt(S, i){ i--; while(i >= 0 && ESP(S[i])) i--; while(i > 0 && !ESP(S[i - 1])) i--; return Math.max(0, i); }
/* frase: termina só em . ? ! : (vírgula, parênteses, travessão e números não contam; abreviações também não) */
const ABREV = new Set(['sr', 'sra', 'srs', 'dr', 'dra', 'art', 'arts', 'inc', 'incs', 'n', 'nº', 'no', 'fls', 'fl', 'p', 'pp', 'pág', 'págs', 'ex', 'exa', 'exmo', 'exma', 'etc', 'obs', 'prof', 'profa', 'eng', 'av', 'r', 'tel', 'cf', 'id', 'ib', 'op', 'cit', 'séc', 'v', 'vs', 'ltda', 'sa', 'cia', 'min', 'máx', 'aprox', 'ref', 'proc', 'adm', 'sec', 'mun', 'gov', 'jr', 'lc', 'ss', 'inc', 'al', 'dec', 'res', 'port', 'arq', 'cód', 'nº.', 'item', 'itens', 'anexo']);
function fimDeFrase(S, i){
  const ch = S[i];
  if(!'.?!:;…'.includes(ch)) return false;
  const nx = S[i + 1];
  if(!(nx == null || ESP(nx) || /["”')\]]/.test(nx))) return false;
  if(ch === '.' && S[i - 1] === '.') return true;   /* reticências */
  if(ch === '.'){
    let k = i - 1, w = ''; while(k >= 0 && /[\p{L}º°ª]/u.test(S[k])){ w = S[k] + w; k--; }
    if(w && (ABREV.has(w.toLowerCase()) || (w.length === 1 && /[A-ZÀ-Ý]/.test(w)))) return false;
    let m = i + 1; while(m < S.length && (S[m] === ' ' || S[m] === ' ')) m++;
    if(m < S.length && /[a-zà-ÿ]/.test(S[m])) return false;
  }
  return true;
}
function fimDaFrase(S, i){
  const L = S.length;
  while(i < L && ESP(S[i]) && S[i] !== '\n') i++;
  for(; i < L; i++){
    if(S[i] === '\n') return i;
    if(fimDeFrase(S, i)){ let e = i + 1; while(e < L && /["”')\]]/.test(S[e])) e++; return e; }
  }
  return L;
}
function inicioDaFrase(S, i){
  let k = i - 1;
  while(k >= 0 && ESP(S[k]) && S[k] !== '\n') k--;
  if(k >= 0 && (S[k] === '\n' || fimDeFrase(S, k) || /["”')\]]/.test(S[k]))) k--;   // já está no início: volta para a frase anterior
  for(; k >= 0; k--){ if(S[k] === '\n' || fimDeFrase(S, k)) break; }
  let st = k + 1; while(st < S.length && ESP(S[st])) st++;
  return st;
}

/* ---------- ◀ ▶ : palavra a palavra (S ligado: seleciona; dois toques: até o fim ou início da frase) ---------- */
const NAV = { ult:null };
function navPalavra(dir){
  const s = selComFoco(); if(!s) return toast('Toque no texto primeiro.');
  const body = curBody(); if(!body) return;
  const agora = Date.now(), dup = M.selMode && NAV.ult && NAV.ult.dir === dir && agora - NAV.ult.t < 360 && NAV.ult.body === body;
  const antes = guardarSel();
  const T = mapaTexto(body), S = T.str;
  if(dup){ voltarSel(NAV.ult.antes); NAV.ult = null; }
  const s2 = window.getSelection();
  const f = posDeDom(T, s2.focusNode, s2.focusOffset), a = posDeDom(T, s2.anchorNode, s2.anchorOffset);
  let nf;
  if(dup) nf = dir > 0 ? fimDaFrase(S, f) : inicioDaFrase(S, f);
  else if(M.selMode) nf = dir > 0 ? fimProxPalavra(S, f) : inicioPalavraAnt(S, f);
  else {
    nf = dir > 0 ? inicioProxPalavra(S, f) : inicioPalavraAnt(S, f);
    if(dir > 0 && nf >= S.length && f >= S.length - 1 || dir < 0 && f === 0){ pularDeDocumento(dir > 0 ? 'forward' : 'backward'); verFoco(); return; }
  }
  if(M.selMode){
    if(nf > a) while(nf > a && ESP(S[nf - 1])) nf--;
    else if(nf < a) while(nf < a && ESP(S[nf])) nf++;
    const an = domDePos(T, a), fo = domDePos(T, nf);
    try{ s2.setBaseAndExtent(an.node, an.off, fo.node, fo.off); }catch(e){}
    if(!dup) NAV.ult = { dir, t:agora, antes, body };
  } else {
    const fo = domDePos(T, nf);
    try{ s2.collapse(fo.node, fo.off); }catch(e){}
  }
  verFoco(); atualizarCaret();
}

/* ---------- ▲ ▼ : parágrafo a parágrafo (S ligado: estende até o fim do parágrafo) ---------- */
function blocosDe(body){ return Array.from(body.querySelectorAll(BLOCOS)).filter(b => !b.querySelector(BLOCOS) && !b.matches('p.dt') && !b.closest('p.dt')); }
const SEM_VAO = { acceptNode:n => n.parentElement && n.parentElement.closest('.pgap') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT };
function primeiroPonto(b){ const w = document.createTreeWalker(b, NodeFilter.SHOW_TEXT, SEM_VAO); const t = w.nextNode(); return t ? { node:t, off:0 } : { node:b, off:0 }; }
function ultimoPonto(b){ const w = document.createTreeWalker(b, NodeFilter.SHOW_TEXT, SEM_VAO); let t, u = null; while((t = w.nextNode())) u = t; if(!u) return { node:b, off:b.childNodes.length && b.lastChild.nodeName === 'BR' ? b.childNodes.length - 1 : b.childNodes.length }; let o = u.data.length; while(o > 0 && /\s/.test(u.data[o - 1])) o--; return { node:u, off:o }; }
function blocoDoPonto(bls, node, off){
  const el = node.nodeType === 1 ? node : node.parentElement;
  const b = el.closest(BLOCOS); if(b && bls.includes(b)) return b;
  const r = document.createRange(); try{ r.setStart(node, off); }catch(e){ return bls[0]; }
  for(const x of bls) if(r.comparePoint(x, 0) >= 0) return x;
  return bls[bls.length - 1];
}
const vazioEntre = (n1, o1, n2, o2) => { const r = document.createRange(); try{ r.setStart(n1, o1); r.setEnd(n2, o2); }catch(e){ return true; } return !r.toString().trim(); };
function navParagrafo(dir){
  const s = selComFoco(); if(!s) return toast('Toque no texto primeiro.');
  const body = curBody(); if(!body) return;
  const bls = blocosDe(body); if(!bls.length) return;
  const B = blocoDoPonto(bls, s.focusNode, s.focusOffset), i = bls.indexOf(B);
  const ini = primeiroPonto(B), fim = ultimoPonto(B);
  if(M.selMode){
    let alvo;
    if(dir > 0){ alvo = vazioEntre(s.focusNode, s.focusOffset, fim.node, fim.off) && bls[i + 1] ? ultimoPonto(bls[i + 1]) : fim; }
    else { alvo = vazioEntre(ini.node, ini.off, s.focusNode, s.focusOffset) && bls[i - 1] ? primeiroPonto(bls[i - 1]) : ini; }
    try{ s.extend(alvo.node, alvo.off); }catch(e){}
    verFoco(); atualizarCaret(); return;
  }
  if(dir > 0){
    if(B.classList.contains('tmpP') && !B.textContent.trim()){ limparFolhaTmp(true); return pularDeDocumento('forward'); }
    if(!bls[i + 1]) return abrirFolhaTmp(body);
    const p = primeiroPonto(bls[i + 1]); s.collapse(p.node, p.off);
  } else {
    if(B.classList.contains('tmpP') && !B.textContent.trim()){
      limparFolhaTmp(true);
      const b2 = blocosDe(body), u = b2[b2.length - 1]; if(u){ const p = ultimoPonto(u); s.collapse(p.node, p.off); }
      verFoco(); atualizarCaret(); diagramar(docById(body.parentElement.dataset.doc)); return;
    }
    const noInicio = vazioEntre(ini.node, ini.off, s.focusNode, s.focusOffset) && s.isCollapsed;
    if(!noInicio){ s.collapse(ini.node, ini.off); }
    else if(bls[i - 1]){ const p = primeiroPonto(bls[i - 1]); s.collapse(p.node, p.off); }
    else { pularDeDocumento('backward'); const b2 = curBody(); if(b2){ const l = blocosDe(b2); if(l.length){ const p = primeiroPonto(l[l.length - 1]); window.getSelection().collapse(p.node, p.off); } } }
  }
  verFoco(); atualizarCaret();
}

/* ---------- folha nova no fim do documento (some se ficar vazia) ---------- */
function abrirFolhaTmp(body, depoisDe){
  limparFolhaTmp(true);
  const hr = h('hr', { class:'qp tmp' }), p = h('p', { class:'tmpP' }, h('br'));
  if(depoisDe && depoisDe.parentElement === body) depoisDe.after(hr, p); else body.append(hr, p);
  const s = window.getSelection(); s.collapse(p, 0);
  const pg = body.parentElement, d = docById(pg.dataset.doc);
  const chip = h('button', { class:'tmpNovo', onclick:ev => { ev.preventDefault(); limparFolhaTmp(true); novoDocumento({}); } }, '+ Novo documento');
  chip.addEventListener('pointerdown', ev => ev.preventDefault());
  pg.append(chip);
  const pos = () => { if(chip.isConnected && hr.isConnected) chip.style.top = Math.round(hr.offsetTop - 13) + 'px'; };
  pos(); setTimeout(pos, 60);
  if(d) diagramar(d).then(pos);
  verFoco(); atualizarCaret();
  toast('Folha nova. Se você não escrever nada, ela some.', { ms:2200 });
}
function limparFolhaTmp(forcar){
  const tmp = pagesEl.querySelectorAll('p.tmpP'); if(!tmp.length){ pagesEl.querySelectorAll('.tmpNovo').forEach(c => c.remove()); return; }
  const s = window.getSelection(), fn = s && s.focusNode;
  tmp.forEach(p => {
    const hr = p.previousElementSibling && p.previousElementSibling.matches('hr.tmp') ? p.previousElementSibling : null;
    const vazio = !p.textContent.trim(), dentro = fn && p.contains(fn);
    if(!vazio){ p.classList.remove('tmpP'); if(hr) hr.classList.remove('tmp'); const c = p.closest('.page').querySelector('.tmpNovo'); if(c) c.remove(); return; }
    if(forcar || !dentro){
      const pg = p.closest('.page'); if(hr) hr.remove(); p.remove();
      if(pg){ const c = pg.querySelector('.tmpNovo'); if(c) c.remove(); const d = docById(pg.dataset.doc); if(d) diagramar(d); }
    }
  });
}
/* "Nova página" da caixa de novo documento: folha nova logo depois do parágrafo atual */
function novaPaginaNaMesa(){
  const s = curSel(); let body = curBody();
  if(!body){ body = bodyDoDoc(M.cur && M.cur.d); }
  if(!body) return toast('Vá até um texto para abrir uma folha nova.');
  body.focus({ preventScroll:true });
  let blk = null;
  if(s){ const n = s.focusNode, el = n.nodeType === 1 ? n : n.parentElement; blk = el.closest('.body > *'); }
  abrirFolhaTmp(body, blk);
}

/* =====================================================================
   Seleção de folhas (processo) e tela de PDF (mesa avulsa)
   ===================================================================== */
function folhasTela(){
  const out = [], F = M.fls || {};
  pagesEl.querySelectorAll('.page').forEach(pg => {
    const d = docById(pg.dataset.doc); if(!d) return;
    const f = F[d.id] || { ini:1 };
    if(pg.classList.contains('pdf')){
      const idx = +pg.dataset.i, e = d.pl[idx], k = vivas(d).indexOf(e);
      out.push({ key:d.id + ':' + idx, d, pg, top:0, h:pg.offsetHeight, fl:f.ini + k, e });
    } else if(pg.classList.contains('txt')){
      const tops = [0].concat(Array.from(pg.querySelectorAll('.brk')).map(b => brkIni(b)));
      tops.forEach((t, j) => out.push({ key:d.id + '#' + j, d, pg, top:t, h:(tops[j + 1] != null ? tops[j + 1] : pg.offsetHeight) - t, fl:f.ini + j, j }));
    }
  });
  return out;
}
function entrarSelecao(tudo, modo){
  if(!M.p) return;
  salvarTudo(); fecharTeclado(); fecharPainel(true); pararRolagem(); $('fmt').hidden = true;
  const s = window.getSelection(); if(s) s.removeAllRanges();
  M.fsel = { modo:modo || (M.p.avulsa ? 'pdf' : 'folhas'), sel:new Set(), ult:null, escopo:'pagina' };
  if(tudo) folhasTela().forEach(f => M.fsel.sel.add(f.key));
  if(M.fsel.sel.size) M.fsel.escopo = 'sel';
  screenEl.classList.add('modoSel');
  pintarSelecao(); atualizarIcones(); esconderCaret();
  if(!tudo && M.fsel.modo === 'folhas') toast('Toque nas folhas para marcar. Toque no nome do documento para marcar ele inteiro; segure para marcar um intervalo.', { ms:3800 });
}
function sairSelecao(silencioso){
  if(!M.fsel) return;
  M.fsel = null; screenEl.classList.remove('modoSel');
  pagesEl.querySelectorAll('.fsel').forEach(x => x.remove());
  $('selBar').hidden = true; $('selBar').replaceChildren(); pagesEl.style.paddingBottom = '';
  aplicarBarras();
  if(!silencioso){ atualizarIcones(); mapaPaginas(); }
}
function pintarSelecao(){
  if(!M.fsel) return;
  pagesEl.querySelectorAll('.fsel').forEach(x => x.remove());
  const lista = folhasTela(), vivos = new Set(lista.map(f => f.key));
  M.fsel.sel.forEach(k => { if(!vivos.has(k)) M.fsel.sel.delete(k); });
  if(M.fsel.modo === 'pdf'){ renderSelBar(); return; }   /* mesa de PDF: sem marcar folhas */
  lista.forEach(f => {
    const ov = h('div', { class:'fsel' + (M.fsel.sel.has(f.key) ? ' on' : ''), style:{ top:f.top + 'px', height:Math.max(20, f.h) + 'px' }, dataset:{ k:f.key } }, h('i'));
    f.pg.append(ov);
  });
  renderSelBar();
}
function marcarFolhas(keys, on){ keys.forEach(k => on ? M.fsel.sel.add(k) : M.fsel.sel.delete(k)); if(M.fsel.sel.size) M.fsel.escopo = 'sel'; pagesEl.querySelectorAll('.fsel').forEach(o => o.classList.toggle('on', M.fsel.sel.has(o.dataset.k))); renderSelBar(); }
(function(){
  let t = null, longo = false, alvo = null;
  pagesEl.addEventListener('pointerdown', ev => {
    if(!M.fsel) return;
    const ov = ev.target.closest('.fsel'); if(!ov) return;
    alvo = ov; longo = false; clearTimeout(t);
    t = setTimeout(() => {
      longo = true;
      const lista = folhasTela().map(f => f.key), a = M.fsel.ult != null ? lista.indexOf(M.fsel.ult) : -1, b = lista.indexOf(ov.dataset.k);
      if(a < 0 || b < 0){ marcarFolhas([ov.dataset.k], true); M.fsel.ult = ov.dataset.k; return; }
      marcarFolhas(lista.slice(Math.min(a, b), Math.max(a, b) + 1), true);
      if(navigator.vibrate) try{ navigator.vibrate(18); }catch(e){}
      toast('Intervalo marcado.', { ms:1100 });
    }, 520);
  });
  const fim = () => clearTimeout(t);
  pagesEl.addEventListener('pointerup', fim); pagesEl.addEventListener('pointercancel', fim);
  pagesEl.addEventListener('scroll', fim, true);
  docEl.addEventListener('scroll', fim, { passive:true });
  pagesEl.addEventListener('click', ev => {
    if(!M.fsel) return;
    const lab = ev.target.closest('.dlabel');
    if(lab){ const ks = folhasTela().filter(f => f.d.id === lab.dataset.lab).map(f => f.key); const todos = ks.every(k => M.fsel.sel.has(k)); marcarFolhas(ks, !todos); return; }
    const ov = ev.target.closest('.fsel'); if(!ov) return;
    ev.preventDefault();
    if(longo){ longo = false; return; }
    const k = ov.dataset.k; marcarFolhas([k], !M.fsel.sel.has(k)); M.fsel.ult = k;
  });
})();
function selecionadas(){ const S = M.fsel.sel; return folhasTela().filter(f => S.has(f.key)); }
/* folhas que a ferramenta vai usar (tela de PDF: só a página / selecionadas / arquivo todo) */
function alvos(){
  const F = M.fsel;
  if(F.modo === 'folhas' || F.escopo === 'sel'){ const l = selecionadas(); if(!l.length) toast('Marque as folhas primeiro.'); return l; }
  const lista = folhasTela(), c = M.cur;
  if(!c) return [];
  if(F.escopo === 'tudo') return lista.filter(f => f.d === c.d);
  const y = docEl.scrollTop + docEl.clientHeight * 0.33;
  let atual = null; for(const f of lista){ if(f.pg.offsetTop + f.top <= y) atual = f; }
  return atual ? [atual] : lista.slice(0, 1);
}
/* carimbo e numeração: licitação e aditivo saem com o Carimbo Licitação numerado; os demais, carimbo SEINFRA sem número */
const procReal = p => !!(p && !p.avulsa && !p.avdoc);
const ehLicAdt = p => !!(p && (p.cat === 'licitacoes' || p.cat === 'aditivos'));
function carimboAtual(p){ p = p || M.p; if(!procReal(p)) return settings.carimboPdf || 'nenhum'; return p.carimbo || (ehLicAdt(p) ? 'licitacao' : 'seinfra'); }
function numerarAtual(p){ p = p || M.p; if(!procReal(p)) return !!settings.numerar; return p.numerar != null ? !!p.numerar : ehLicAdt(p); }
function renderSelBar(){
  const F = M.fsel, bar = $('selBar'); if(!F){ pintarCarimbos(); if(typeof pintarCapsula === 'function') pintarCapsula(); return; }
  const n = F.sel.size, pdfM = F.modo === 'pdf', car = carimboAtual();
  const tb = (rot, ic, fn, cls) => h('button', { class:'tbtn' + (cls ? ' ' + cls : ''), onclick:fn }, h('i', { html:I[ic] || ic }), rot);
  const icCarimbo = h('img', { src:'data:image/png;base64,' + (car === 'licitacao' ? B64_CARIMBO_LIC : B64_CARIMBO_SEINFRA), alt:'', style:{ width:'24px', opacity:car === 'nenhum' ? '.45' : '1' } }).outerHTML;
  const nomeCar = car === 'seinfra' ? 'Carimbo SEINFRA' : car === 'licitacao' ? 'Carimbo Licitação' : 'Carimbar';
  const kids = [];
  if(pdfM){
    /* Mesa de PDF: só girar, carimbar, numerar e enviar */
    const tot = folhasTela().length;
    kids.push(h('div', { class:'l' }, h('b', null, tot ? plural(tot, 'folha', 'folhas') : 'Mesa de PDF'),
      h('button', { class:'btn sm ghost', onclick:() => incluirPdfNaMesa() }, h('span', { html:I.plus }), 'PDF ou foto'),
      h('button', { class:'btn sm ghost', onclick:() => textoPronto({}) }, h('span', { html:I.plus }), 'Texto pronto'),
      h('button', { class:'hbtn', html:I.x, 'aria-label':'Fechar a mesa de PDF', onclick:() => { sairSelecao(true); sairMesa(); } })));
    kids.push(h('div', { class:'g' },
      tb('Girar', 'rotR', ev => menuGirar(ev.currentTarget)),
      tb(nomeCar, icCarimbo, ev => menuCarimbo(ev.currentTarget), car !== 'nenhum' ? 'on' : ''),
      tb(numerarAtual() ? 'Numeradas' : 'Numerar', 'hash', () => numerarSheet(), numerarAtual() ? 'on' : ''),
      tb('Enviar', 'share', ev => enviarMesa(ev.currentTarget), 'pri')));
  } else {
    kids.push(h('div', { class:'l' }, h('b', null, n ? plural(n, 'folha marcada', 'folhas marcadas') : 'Folhas'),
      h('button', { class:'btn sm ghost', onclick:() => { if(n){ F.sel.clear(); F.escopo = 'pagina'; pintarSelecao(); } else marcarFolhas(folhasTela().map(f => f.key), true); } }, n ? 'Nenhuma' : 'Todas'),
      h('button', { class:'hbtn', html:I.x, 'aria-label':'Sair', onclick:() => sairSelecao() })));
    kids.push(h('div', { class:'g' },
      tb('Girar', 'rotL', () => { const l = selecionadas(); if(!l.length) return toast('Marque as folhas primeiro.'); girarFolhas(l); }),
      tb('Carimbar', icCarimbo, ev => menuCarimbo(ev.currentTarget), car !== 'nenhum' ? 'on' : ''),
      tb(numerarAtual() ? 'Numeradas' : 'Numerar', 'hash', () => numerarSheet(), numerarAtual() ? 'on' : ''),
      tb('Ver PDF', 'pdf', () => exportarFolhas(alvos(), 'previa')),
      tb('Enviar', 'share', () => exportarFolhas(alvos(), 'compartilhar'), 'pri')));
  }
  bar.replaceChildren(...kids); bar.hidden = false;
  pintarCarimbos();
  requestAnimationFrame(() => { if(M.fsel) pagesEl.style.paddingBottom = (bar.offsetHeight + 30) + 'px'; });
}
/* a folha que está na tela agora */
function folhaAtual(){ const l = folhasTela(); const y = docEl.scrollTop + docEl.clientHeight * 0.33; let a = null; for(const f of l) if(f.pg.offsetTop + f.top <= y) a = f; return a || l[0] || null; }
function menuGirar(ancora){
  const f = folhaAtual();
  const girar = (lista, g) => { const ps = lista.filter(x => x.e); if(!ps.length) return toast('Não há página de PDF para girar.'); ps.forEach(x => { x.e.r = (((x.e.r || 0) + g) % 360 + 360) % 360; }); depoisDeMudar(plural(ps.length, 'página girada', 'páginas giradas') + '.'); };
  popMenu(ancora, [
    { t:'Girar esta página para a direita', sub:f ? 'a folha ' + f.fl + ', que está na tela' : '', ic:'rotR', fn:() => f && girar([f], 90) },
    { t:'Girar esta página para a esquerda', ic:'rotL', fn:() => f && girar([f], 270) },
    '-',
    { t:'Girar todas as páginas', sub:'para a direita', ic:'rot', fn:() => girar(folhasTela(), 90) }
  ]);
}
function menuCarimbo(ancora){
  const car = carimboAtual();
  const por = k => () => { if(procReal(M.p)){ M.p.carimbo = k; touch(M.p); saveDB(); } else { settings.carimboPdf = k; saveSettings(); } renderSelBar(); toast(k === 'nenhum' ? 'Sem carimbo.' : k === 'seinfra' ? 'Carimbo SEINFRA em todas as folhas.' : 'Carimbo Licitação em todas as folhas.', { ms:1500 }); };
  popMenu(ancora, [
    { t:'Carimbo SEINFRA', sub:'no canto de cima, à direita', on:car === 'seinfra', fn:por('seinfra') },
    { t:'Carimbo Licitação (P.M.I.)', sub:'no canto de cima, à direita', on:car === 'licitacao', fn:por('licitacao') },
    { t:'Sem carimbo', on:car === 'nenhum', fn:por('nenhum') }
  ]);
}
function numerarSheet(){
  const p = M.p, liga = h('input', { type:'checkbox', checked:numerarAtual(p) });
  const ini = h('input', { class:'inp', type:'number', min:'1', inputmode:'numeric', value:String(parseInt(p.fls0, 10) || 1) });
  sheet({ titulo:'Numerar as folhas', corpo:[
    h('div', { class:'sgGrp' }, h('label', { class:'sgRow' }, h('span', null, 'Numerar'), liga)),
    h('div', { class:'sgGrp', style:{ padding:'10px' } }, h('label', { class:'fld' }, h('span', null, 'Começa na folha nº'), ini)),
    h('p', { class:'sgNota' }, 'Com carimbo, o número vai dentro dele. Sem carimbo, sai "Fls. 12" no canto de cima, à direita.')],
    botoes:[{ t:'Cancelar', v:'ghost' }, { t:'OK', v:'acc', fn:() => { if(procReal(p)){ p.numerar = liga.checked; touch(p); saveDB(); } else { settings.numerar = liga.checked; saveSettings(); } const n = parseInt(ini.value, 10); if(n > 0 && n !== (parseInt(p.fls0, 10) || 1)){ p.fls0 = n; touch(p); saveDB(); } renderMesa(true); renderSelBar(); } }] });
}
function enviarMesa(ancora){
  const l = folhasTela(); if(!l.length) return toast('Inclua um PDF ou uma foto primeiro.');
  const mk = temMarcasPdf(l);
  popMenu(ancora, [
    { t:'Salvar ou compartilhar o PDF', sub:plural(l.length, 'folha', 'folhas') + (mk ? ', sem as marcações' : ', do jeito que está na tela'), ic:'share', fn:() => exportarFolhas(folhasTela(), 'compartilhar') },
    mk ? { t:'Com as marcações', sub:'o marca-texto sai no arquivo', ic:'highlighter', fn:() => exportarFolhas(folhasTela(), 'compartilhar', { marcas:true }) } : null,
    { t:'Ver o PDF antes', ic:'eye', fn:() => exportarFolhas(folhasTela(), 'previa', mk ? { marcas:true } : null) },
    { t:'Dividir para enviar', sub:'partes que cabem no limite', ic:'dividir', fn:() => dividirSheet() },
    '-',
    { t:'Esvaziar a mesa', sub:'para começar outro arquivo', ic:'trash', danger:true, fn:() => esvaziarMesa() }
  ]);
}
async function esvaziarMesa(){
  const p = M.p; if(!p || !p.avulsa) return;
  if(!await confirmar('Esvaziar a mesa', 'Os arquivos saem da mesa de PDF. O que você já enviou ou salvou continua com você.', 'Esvaziar', true)) return;
  const velhos = p.docs.slice(); p.docs = [];
  for(const d of velhos) if(d.kind === 'pdf' && d.fileId && !fileEmUso(d.fileId)) await apagarBytes(d.fileId);
  p.fls0 = 1; touch(p); saveDB(true); sairSelecao(true); renderMesa(); toast('Mesa vazia.');
}
/* o carimbo e o número aparecem na tela, do jeito que vão sair no PDF */
function pintarCarimbos(){
  pagesEl.querySelectorAll('.carV').forEach(x => x.remove());
  if(!M.p || !(M.fsel || M.p.avulsa)) return;
  const car = carimboAtual(), num = numerarAtual();
  if(car === 'nenhum' && !num) return;
  const src = car === 'nenhum' ? null : 'data:image/png;base64,' + (car === 'licitacao' ? B64_CARIMBO_LIC : B64_CARIMBO_SEINFRA);
  folhasTela().forEach(f => {
    /* mesma regra do PDF: folha em pé → canto de cima à direita; folha deitada → o carimbo gira junto com a folha de pé */
    const [pw, ph] = f.e ? tamanhoPagina(f.d, f.e) : [595.28, 841.89], w = f.pg.clientWidth, k = w / pw, alt = f.e ? ph * k : f.h;
    const deitada = pw > ph * 1.02, modo = settings.deitada || 'esq';
    const el = h('div', { class:'carV' });
    const cw = src ? 66.3 : 0, chh = src ? 67.7 : 0;
    if(src){
      el.style.width = (cw * k) + 'px'; el.style.height = (chh * k) + 'px';
      el.append(h('img', { src, alt:'' }));
      if(num) el.append(h('b', { style:{ top:(car === 'licitacao' ? 47 * k : 26 * k) + 'px', left:(car === 'licitacao' ? 38.15 * k : 33.4 * k) + 'px', fontSize:(15 * k) + 'px' } }, String(f.fl)));
    } else { el.classList.add('so'); el.style.fontSize = (10 * k) + 'px'; el.textContent = 'Fls. ' + f.fl; }
    if(!deitada){
      el.style.top = (f.top + (src ? 14.1 : 21) * k) + 'px'; el.style.right = (19.4 * k) + 'px';
    } else if(modo === 'dir'){
      el.style.transformOrigin = '0 0'; el.style.transform = 'rotate(90deg)';
      el.style.left = ((src ? 14.1 + chh : 21 + 10) * k) + 'px'; el.style.top = (f.top + 19.4 * k) + 'px';
      if(!src) el.style.top = (f.top + 19.4 * k) + 'px';
    } else {
      el.style.transformOrigin = '0 0'; el.style.transform = 'rotate(-90deg)';
      el.style.right = ((src ? 14.1 : 21) * k) + 'px'; el.style.top = (f.top + alt - 19.4 * k) + 'px';
      if(src){ el.style.right = ''; el.style.left = (w - (14.1 + chh) * k) + 'px'; }
      else { el.style.right = ''; el.style.left = (w - 21 * k - 10 * k) + 'px'; }
    }
    f.pg.append(el);
  });
}
function alvosSilenciosos(){ const F = M.fsel; if(!F) return []; if(F.escopo === 'sel' || F.modo === 'folhas') return selecionadas(); const c = M.cur; if(!c) return []; const l = folhasTela(); if(F.escopo === 'tudo') return l.filter(f => f.d === c.d); const y = docEl.scrollTop + docEl.clientHeight * 0.33; let a = null; for(const f of l) if(f.pg.offsetTop + f.top <= y) a = f; return a ? [a] : []; }
const soPdf = l => { const r = l.filter(f => f.e); if(l.length && !r.length) toast('Essas ferramentas valem para páginas de PDF. Textos se ajustam no próprio texto.'); return r; };
function depoisDeMudar(msg){ salvarTudo(); touch(M.p); saveDB(); renderMesa(true); if(msg) toast(msg, { ms:1400 }); }
function pdfGirar(g){ const l = soPdf(alvos()); if(!l.length) return; l.forEach(f => f.e.r = (((f.e.r || 0) + g) % 360 + 360) % 360); depoisDeMudar(plural(l.length, 'página girada', 'páginas giradas') + '.'); }
function pdfBrasao(){ const l = soPdf(alvos()); if(!l.length) return; const todas = l.every(f => f.e.b); l.forEach(f => f.e.b = !todas); depoisDeMudar(todas ? 'Brasão retirado.' : 'Brasão colocado.'); }
function pdfRetirar(){ const l = soPdf(alvos()); if(!l.length) return; l.forEach(f => f.e.d = true); depoisDeMudar(); toast(plural(l.length, 'página retirada', 'páginas retiradas') + '.', { acao:'Desfazer', fn:() => { l.forEach(f => f.e.d = false); depoisDeMudar(); } }); }
/* separar: as páginas marcadas saem do arquivo e viram um documento próprio (sem refazer o arquivo) */
function pdfSeparar(){
  const l = soPdf(alvos()); if(!l.length) return;
  const porDoc = new Map(); l.forEach(f => { if(!porDoc.has(f.d)) porDoc.set(f.d, []); porDoc.get(f.d).push(f.e); });
  salvarTudo();
  let n = 0;
  porDoc.forEach((es, d) => {
    if(es.length === vivas(d).length && porDoc.size === 1 && M.fsel.escopo !== 'pagina') return toast('Isso já é o arquivo inteiro.');
    const novo = Object.assign(clone(d), { id:uid(), nome:d.nome + ' (separado)', pl:es.map(e => clone(e)), pai:null });
    es.forEach(e => e.d = true);
    M.p.docs.splice(M.p.docs.indexOf(d) + 1, 0, novo); n++;
  });
  if(n){ M.fsel.sel.clear(); depoisDeMudar(n === 1 ? 'Páginas separadas num arquivo próprio.' : n + ' arquivos separados.'); }
}
async function pdfJuntar(){
  const l = alvos(); if(!l.length) return;
  if(M.fsel.escopo !== 'sel' && M.fsel.modo === 'pdf'){
    /* sem marcação: junta todos os arquivos da mesa, na ordem */
    const todos = folhasTela(); if(todos.length < 2) return toast('Precisa de pelo menos duas páginas.');
    return juntarEmArquivo(todos);
  }
  juntarEmArquivo(l);
}
async function juntarEmArquivo(l){
  const docs = Array.from(new Set(l.map(f => f.d)));
  const op = await escolher('Juntar ' + plural(l.length, 'folha', 'folhas') + ' num arquivo só', [['tirar', 'Juntar e tirar os originais', 'O arquivo novo fica no lugar deles'], ['manter', 'Juntar e manter os originais']], 'tirar');
  if(!op) return;
  const b = busy('Juntando…');
  try{
    const bytes = await pdfDasFolhas(l, {});
    const nome = await Promise.resolve(docs.length === 1 ? docs[0].nome + ' (junto)' : 'PDF juntado ' + dataBR(hojeISO()));
    const d = await novoDocPdf(M.p, nome, bytes, 'linha');
    M.p.docs = M.p.docs.filter(x => x !== d);
    const i = M.p.docs.indexOf(docs[0]); M.p.docs.splice(i < 0 ? M.p.docs.length : i, 0, d);
    if(op === 'tirar'){
      const usadas = new Set(l.map(f => f.e).filter(Boolean));
      for(const x of docs){
        if(x.kind === 'pdf'){ x.pl.forEach(e => { if(usadas.has(e)) e.d = true; }); if(!vivas(x).length){ M.p.docs = M.p.docs.filter(y => y !== x); if(!fileEmUso(x.fileId, x)) await apagarBytes(x.fileId); } }
      }
    }
    b.end(); M.fsel.sel.clear(); M.fsel.escopo = 'pagina';
    depoisDeMudar('Arquivo juntado: ' + d.nome + '.');
  }catch(e){ b.end(); console.error(e); toast('Não foi possível juntar: ' + (e.message || e)); }
}
async function pdfIncluirEmProcesso(lista){
  const l = lista || alvos(); if(!l.length) return;
  const ps = procsReais().filter(q => q !== M.p).sort((a, b) => b.updated - a.updated);
  if(!ps.length) return toast('Ainda não há processo para receber. Crie um em Novo processo.');
  const id = await optSheet('Incluir em qual processo?', [{ itens:ps.map(q => ({ v:q.id, t:q.ficha.objeto || tituloProc(q), sub:q.ficha.num || '' })) }], null);
  if(!id) return;
  const q = procPorId(id);
  const onde = await escolher('Onde entra', [['linha', 'Na linha do processo'], ['repo', 'No repositório'], ['ambos', 'Nos dois']], 'linha');
  if(!onde) return;
  const docs = Array.from(new Set(l.map(f => f.d)));
  const nome = await perguntar('Nome do documento', 'Como vai aparecer no processo', docs.length === 1 ? docs[0].nome : 'Documentos ' + dataBR(hojeISO()), 'Incluir');
  if(!nome) return;
  const b = busy('Preparando…');
  try{
    const bytes = await pdfDasFolhas(l, {});
    const d = await novoDocPdf(q, nome, bytes, onde);
    marcarUltimo(q); saveDB(true); b.end();
    toast('Incluído em ' + (q.ficha.num || tituloProc(q)) + '.', { acao:'Abrir', fn:() => abrirMesa(q, { doc:d.id }), ms:6000 });
  }catch(e){ b.end(); console.error(e); toast('Não foi possível incluir: ' + (e.message || e)); }
}
/* monta um PDF com as folhas escolhidas, na ordem da mesa; o carimbo mantém o número original da folha */
async function pdfDasFolhas(lista, opt){
  opt = opt || {};
  const out = await PDFLib.PDFDocument.create();
  const R = await recursos(out, { brasao:lista.some(f => f.e && f.e.b), carimbo:opt.carimbo });
  const txt = {}, byt = {};
  for(let i = 0; i < lista.length;){
    const f = lista[i];
    if(f.e){
      let j = i; const es = []; while(j < lista.length && lista[j].d === f.d && lista[j].e){ es.push(lista[j].e); j++; }
      const bytes = byt[f.d.fileId] || (byt[f.d.fileId] = await bytesDe(f.d.fileId));
      if(!bytes) throw new Error('arquivo de ' + f.d.nome + ' não encontrado');
      await PDFGen.appendFile(out, { bytes, pl:f.d.pl, name:f.d.nome }, R, es);
      i = j;
    } else {
      if(!txt[f.d.id]){ const t = await PDFGen.texto(htmlDoc(f.d), { doc:f.d, proc:M.p, title:f.d.nome }); txt[f.d.id] = await PDFLib.PDFDocument.load(t.bytes); }
      const src = txt[f.d.id], k = Math.min(f.j, src.getPageCount() - 1);
      const [pg] = await out.copyPages(src, [k]); out.addPage(pg);
      i++;
    }
  }
  if(opt.marcas || PDF_MARCAS) desenharMarcas(out, lista.map((f, i) => [i, f.e]));
  if((opt.carimbo && opt.carimbo !== 'nenhum') || opt.numerar) carimbar(out, R, { carimbo:opt.carimbo || 'nenhum', numerar:opt.numerar, numeros:lista.map(f => f.fl), deitada:settings.deitada });
  out.setTitle(opt.titulo || ''); out.setCreator('Panda'); out.setProducer('Panda');
  return out.save();
}
function optCarimbo(){ return { carimbo:carimboAtual(), numerar:numerarAtual() }; }
function exportarSheet(ancora){
  const l = alvos(); if(!l.length) return;
  menu('Exportar ' + plural(l.length, 'folha', 'folhas'), [
    { t:'Compartilhar PDF', sub:'WhatsApp, Gmail, Drive…', ic:'share', fn:() => exportarFolhas(l, 'compartilhar') },
    { t:'Imprimir', ic:'print', fn:() => exportarFolhas(l, 'imprimir') },
    { t:'Ver o PDF', ic:'eye', fn:() => exportarFolhas(l, 'previa') },
  ], ancora);
}
async function exportarFolhas(l, como, extra){
  if(!l || !l.length) return;
  if(!precisaLibs()) return;
  const b = busy(l.length > 40 ? 'Montando o PDF (' + l.length + ' folhas)… aguarde' : 'Montando o PDF…');
  try{
    const o = Object.assign(optCarimbo(), extra || {});
    const bytes = await pdfDasFolhas(l, Object.assign({ titulo:tituloProc(M.p) }, o));
    b.end();
    if(como !== 'imprimir') avisoGrande(bytes, l);
    const docs = Array.from(new Set(l.map(f => f.d)));
    const nome = safeName((docs.length === 1 ? docs[0].nome : (M.p.avulsa ? 'Documentos' : tituloProc(M.p))) + (l.length < folhasTela().length && docs.length > 1 ? ' (fls. ' + faixaTexto(l.map(f => f.fl)) + ')' : ''), '.pdf');
    if(como === 'imprimir') return imprimirBytes(bytes, nome);
    if(como === 'previa') return previa(bytes, nome);
    offer(bytes, nome);
  }catch(e){ b.end(); console.error(e); toast('Não foi possível montar o PDF: ' + (e.message || e)); }
}
function faixaTexto(ns){ ns = ns.slice().sort((a, b) => a - b); const out = []; let a = ns[0], p = ns[0]; for(let i = 1; i <= ns.length; i++){ if(ns[i] === p + 1){ p = ns[i]; continue; } out.push(a === p ? String(a) : a + '-' + p); a = p = ns[i]; } return out.join(', '); }
/* imprimir: no app instalado vai direto para as impressoras do Android (Brother, Xerox…) */
async function imprimirBytes(bytes, nome){
  if(!PWA || !temPdfjs()){ previa(bytes, nome); toast('Para imprimir, use Compartilhar na prévia e escolha a impressora. No app instalado este botão imprime direto.', { ms:6000 }); return; }
  const b = busy('Preparando a impressão…');
  try{
    const pdf = await pdfjsLib.getDocument(Object.assign({ data:bytes.slice(), isEvalSupported:false }, window.PDFJS_OPTS || {})).promise;
    const area = $('printArea'); area.replaceChildren();
    for(let i = 1; i <= pdf.numPages; i++){
      b.txt('Página ' + i + ' de ' + pdf.numPages + '…');
      const pg = await pdf.getPage(i), v1 = pg.getViewport({ scale:1 }), k = 1240 / Math.max(v1.width, 1);
      const vp = pg.getViewport({ scale:k }), cv = document.createElement('canvas'); cv.width = Math.floor(vp.width); cv.height = Math.floor(vp.height);
      const ctx = cv.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
      await pg.render({ canvasContext:ctx, viewport:vp }).promise;
      area.append(h('img', { src:cv.toDataURL('image/jpeg', 0.9), alt:'' }));
    }
    pdf.destroy(); b.end();
    setTimeout(() => { window.print(); setTimeout(() => area.replaceChildren(), 1500); }, 120);
  }catch(e){ b.end(); console.error(e); previa(bytes, nome); }
}

/* ---------- bolinha do PDF (página de PDF em vista) ---------- */
function menuPdfPagina(){
  const c = M.cur; if(!c || !c.e) return;
  const e = c.e, d = c.d;
  const mud = fn => () => { fn(); depoisDeMudar(); };
  menu(d.nome + ' · fls. ' + c.fl, [
    { t:'Girar para a direita', ic:'rotR', fn:mud(() => { e.r = ((e.r || 0) + 90) % 360; }) },
    { t:'Girar para a esquerda', ic:'rotL', fn:mud(() => { e.r = ((e.r || 0) + 270) % 360; }) },
    { t:'Girar o arquivo todo', sub:'Página deitada: gira todas as páginas deste arquivo', ic:'rot', fn:mud(() => vivas(d).forEach(z => z.r = ((z.r || 0) + 90) % 360)) },
    { t:e.b ? 'Tirar o brasão desta página' : 'Brasão nesta página', ic:'pdf', fn:mud(() => { e.b = !e.b; }) },
    { t:'Retirar esta página', ic:'trash', fn:() => { e.d = true; depoisDeMudar(); toast('Página retirada.', { acao:'Desfazer', fn:() => { e.d = false; depoisDeMudar(); } }); } },
    '-',
    { t:'Selecionar folhas', sub:'Juntar, separar, carimbar, exportar', ic:'selpg', fn:() => entrarSelecao(false, 'folhas') }
  ]);
}
for(const [id, fn] of [['bSig', () => { const d = M.cur && M.cur.d; if(d && d.kind === 'texto') sigSheet(d); }], ['bNovo', () => novoDocumento({})], ['bPdf', menuPdfPagina]]){
  $(id).addEventListener('pointerdown', ev => ev.preventDefault());
  $(id).addEventListener('click', () => { if(M.editing) return; fecharTeclado(); fn(); });
}
$('bSig').innerHTML = I.sig; $('bPdf').innerHTML = I.rotR;

/* ---------- barras da mesa (visual iOS): em cima ‹ Início · documento · signatário · + ; embaixo a cápsula de navegação ---------- */
$('aHome').innerHTML = I.chevL + '<span>Início</span>'; $('aSig').innerHTML = I.personPlus; $('aMais').innerHTML = I.plusBold;
[['selecionar', '<b class="sBtn">S</b>'], ['esq', 'chevL'], ['cima', 'chevU'], ['baixo', 'chevD'], ['dir', 'chevR'], ['campo', 'campo'], ['ferramentas', 'plusCircle']].forEach(([a, ic]) => { const b = $('aBot').querySelector('[data-a="' + a + '"]'); if(b) b.innerHTML = I[ic] || ic; });
[$('aTop'), $('aBot')].forEach(bar => bar.addEventListener('pointerdown', ev => { if(ev.target.closest('button')) ev.preventDefault(); }));   // não tira o cursor do texto
$('aHome').onclick = () => { fecharTeclado(); sairMesa(); };
$('aTit').onclick = () => { fecharTeclado(); sairMesa(); };
$('aSig').onclick = () => { fecharTeclado(); const d = M.cur && M.cur.d; if(d && d.kind === 'texto') sigSheet(d); else toast('Vá até um texto para escolher o signatário.'); };
$('aMais').onclick = () => { fecharTeclado(); menuTopo($('aMais')); };
$('aBot').addEventListener('click', ev => {
  const b = ev.target.closest('button[data-a]'); if(!b || M.editing) return;
  if(b.dataset.a === 'selecionar') return abrirBolhasS(b);
  if(b.dataset.a === 'expandir') return capsula(!CAP.aberta);
  if(b.dataset.a === 'pginteira') return pgInteira(false);
  if(['esq', 'dir', 'cima', 'baixo'].includes(b.dataset.a) && navFolha(b.dataset.a)) return;
  if(b.dataset.a !== 'ferramentas') fecharTeclado();
  acao(b.dataset.a);
});
/* botão S: escolher o que selecionar */
function menuS(ancora){
  popMenu(ancora, [
    { t:'Palavra', ic:'selbox', fn:() => acao('palavra') },
    { t:'Parágrafo', ic:'selbox', fn:() => acao('paragrafo') },
    { t:'Texto inteiro', ic:'selbox', fn:() => acao('tudo') },
    '-',
    { t:'Ir estendendo com as setas', sub:'◀ ▶ palavra a palavra · ▼ até o fim do parágrafo', ic:'selbox', fn:() => acao('selecionar') }
  ], { chave:'menuS' });
}
function menuTopo(ancora){
  const d = M.cur && M.cur.d, txt = d && d.kind === 'texto', p = M.p, proc = !p.avulsa && !p.avdoc;
  popMenu(ancora, [
    d ? { k:'gerar', t:'Gerar PDF', sub:d.nome, ic:'pdf', fn:() => previaDoc(d) } : null,
    d ? { t:'Compartilhar', ic:'share', fn:() => baixarDoc(d) } : null,
    txt ? { t:'Word', ic:'word', fn:() => baixarWord(d) } : null,
    '-',
    p.avulsa ? null : { t:'Novo documento', ic:'docplus', fn:() => novoDocumento({}) },
    txt ? { t:'Nova página', ic:'blank', fn:() => novaPaginaNaMesa() } : null,
    { t:'Incluir PDF', ic:'clip', fn:() => incluirPdfNaMesa() },
    p.avulsa ? { t:'Fotografar', ic:'camera', fn:() => fotografar() } : null,
    p.avulsa ? { t:'Texto pronto', sub:'vira folha de PDF na mesa', ic:'paste', fn:() => textoPronto({}) } : null,
    '-',
    txt ? { t:'Revisar o texto', ic:'sparkle', fn:() => revisarTudo(d) } : null,
    { t:'Selecionar folhas', ic:'selpg', fn:() => entrarSelecao(false, 'folhas') },
    txt ? { t:'Ferramentas de texto', sub:'formatar, tabela, letra maior, teclado', ic:'textsize', fn:() => setTimeout(() => menuFerramentas($('aMais')), 40) } : null,
    { k:'rolar', t:ROL.on ? 'Parar a rolagem' : 'Rolar sozinho', ic:'chevD', on:ROL.on, fn:() => acao('rolar') },
    { t:'Buscar no texto', ic:'search', fn:() => buscarNoProcesso() },
    '-',
    { t:'Documentos', ic:'layers', fn:() => abrirPainel('esq') },
    proc ? { t:'Ficha do processo', ic:'pen', fn:() => fichaSheet(p) } : null,
    proc ? { t:'Notas e pendências', ic:'note', fn:() => abrirPainel('dir', 'notas') } : null,
    { t:'Esta página', ic:'doc', fn:() => abrirPainel('dir', 'pag') }
  ], { chave:'topo' });
}
function menuFerramentas(ancora){
  popMenu(ancora, [
    { t:'Copiar', ic:'copy', fn:() => acao('copiar') },
    { t:'Colar', ic:'paste', fn:() => acao('colar') },
    '-',
    { t:'Próximo campo', sub:'o próximo [campo] a preencher', ic:'campo', fn:() => acao('campo') },
    '-',
    { t:'Marca-texto', ic:'highlighter', fn:() => acao('marca') },
    { t:'Formatar (negrito, lista…)', ic:'textsize', fn:() => acao('formatar') },
    { t:'Tabela', ic:'table', fn:() => acao('tabela') },
    { t:'Revisar este trecho', ic:'sparkle', fn:() => acao('revisar') },
    '-',
    M.zoom === 100 ? { k:'letra', t:'Letra maior', ic:'zoomIn', fn:() => setZoom(150) } : { k:'letra', t:'Letra no tamanho da folha', ic:'zoomOut', fn:() => setZoom(100) },
    { t:'Abrir o teclado', ic:'keyboard', fn:() => acao('teclado') }
  ], { chave:'ferramentas' });
}


/* =====================================================================
   Signatário: um por documento, escolhido por você
   ===================================================================== */
function sigSheet(d){
  if(!d || d.kind !== 'texto') return;
  d.sig = d.sig || novoSig(null);
  const s0 = d.sig, p = procDoDoc(d);
  const st = { pessoa:s0.sem ? '__sem' : (s0.pessoa || ''), modo:s0.modo || 'eletronica', data:s0.data || hojeISO(), revit:!!s0.revit,
    vinculo:typeof s0.vinculo === 'string' ? s0.vinculo : s0.vinculo === false ? 'nenhum' : (p && !p.avulsa && !p.avdoc ? p.id : 'nenhum') };
  const grp = h('div', { class:'sgGrp' }), prev = h('div', { class:'sgPrev' });
  const val = (t, fn, ph) => { const b = h('button', { class:'sgRow', onclick:() => fn(b) }, h('span', null, t), h('span', { class:'v' }, h('span', null, ph), h('i', { html:I.chevD, style:{ display:'flex' } }))); return b; };
  const tmp = () => ({ pessoa:st.pessoa && st.pessoa !== '__sem' ? st.pessoa : null, sem:st.pessoa === '__sem', modo:st.modo, data:st.data, vinculo:st.vinculo === 'nenhum' ? false : st.vinculo, revit:st.revit });
  function pinta(){
    const pes = pessoaPorId(st.pessoa), q = st.vinculo !== 'nenhum' ? procPorId(st.vinculo) : null, temRevit = !!(q && revitTexto(q));
    const data = h('input', { type:'date', value:st.data, onchange:e => { st.data = e.target.value || hojeISO(); pinta(); } });
    const sw = h('label', { class:'sw' }, h('input', { type:'checkbox', checked:st.revit && temRevit, disabled:!temRevit, 'aria-label':'Usar o REVIT', onchange:e => { st.revit = e.target.checked; pinta(); } }), h('i'));
    grp.replaceChildren(
      val('Signatário', b => menuSignatario(b, st.pessoa, id => { st.pessoa = id; pinta(); }, { sem:true }),
        st.pessoa === '__sem' ? 'Sem assinatura' : pes ? titleCase(pes.nome) : 'Escolher'),
      h('div', { class:'sgRow' }, h('span', null, 'Data'), data),
      val('Assinatura', b => popMenu(b, [['eletronica', 'Eletrônica'], ['fisica', 'Física (caneta)']].map(([k, t]) => ({ t, on:st.modo === k, fn:() => { st.modo = k; pinta(); } }))), st.modo === 'fisica' ? 'Física' : 'Eletrônica'),
      val('Processo', b => escolherProcTarja(b, st, pinta), q ? (q.ficha.num || 'sem número') : 'Nenhum'),
      h('div', { class:'sgRow' }, h('span', { style:{ color:temRevit ? '#000' : 'var(--faint)' } }, 'REVIT'), sw));
    const runs = st.pessoa === '__sem' ? null : tarjaRuns(Object.assign({}, d, { sig:tmp() }), p);
    prev.innerHTML = runs ? runsHTML(runs) : '<i>Sem tarja.</i>';
  }
  pinta();
  const s = sheet({ titulo:'Signatário', corpo:[grp, h('div', { class:'lbl', style:{ marginTop:'4px' } }, 'Tarja no pé do PDF'), prev,
    p && !p.avulsa && !p.avdoc ? h('div', { class:'sgGrp', style:{ marginTop:'6px' } }, h('button', { class:'sgRow', onclick:() => { s.fechar(); setTimeout(todosSigSheet, 60); } }, h('span', { style:{ color:'var(--accent)' } }, 'Todos os documentos'), h('span', { class:'v', html:I.chevR }))) : null],
    botoes:[{ t:'OK', v:'acc', fn:() => { d.sig = Object.assign({}, d.sig, tmp()); delete d.sig.carimbo; if(p) touch(p); saveDB(); if(VIEW === 'mesa') atualizarFecho(d); } }] });
}
/* processo citado na tarja: nenhum, o deste documento ou outro */
function escolherProcTarja(ancora, st, pinta){
  const todos = procsReais().sort((a, b) => b.updated - a.updated);
  const it = [{ t:'Nenhum', on:st.vinculo === 'nenhum', fn:() => { st.vinculo = 'nenhum'; st.revit = false; pinta(); } }, '-'];
  todos.slice(0, 6).forEach(q => it.push({ t:q.ficha.num || 'sem número', sub:(q.ficha.objeto || '').slice(0, 40), on:st.vinculo === q.id, fn:() => { st.vinculo = q.id; pinta(); } }));
  if(todos.length > 6) it.push('-', { t:'Outro processo…', fn:async () => { const v = await optSheet('Processo', [{ itens:todos.map(q => ({ v:q.id, t:q.ficha.num || 'sem número', sub:(q.ficha.objeto || '').slice(0, 50) })) }], st.vinculo); if(v){ st.vinculo = v; pinta(); } } });
  popMenu(ancora, it);
}
function todosSigSheet(){
  const p = M.p; if(!p) return;
  salvarTudo();
  const docs = p.docs.filter(d => d.linha && d.kind === 'texto'), N = numeracaoLinha(p);
  if(!docs.length) return toast('Este processo ainda não tem textos.');
  const sels = docs.map(d => h('select', { class:'sel', style:{ minHeight:'38px', padding:'6px 30px 6px 10px' } },
    h('option', { value:'' }, '— escolher —'), settings.signatarios.map(x => h('option', { value:x.id, selected:d.sig && d.sig.pessoa === x.id && !d.sig.sem }, titleCase(x.nome))), h('option', { value:'__sem', selected:!!(d.sig && d.sig.sem) }, 'Sem fecho')));
  const modos = docs.map(d => h('select', { class:'sel', style:{ minHeight:'38px', padding:'6px 30px 6px 10px', width:'auto' } }, h('option', { value:'eletronica', selected:!d.sig || d.sig.modo !== 'fisica' }, 'Eletrônica'), h('option', { value:'fisica', selected:!!(d.sig && d.sig.modo === 'fisica') }, 'Física')));
  const todos = h('select', { class:'sel' }, h('option', { value:'' }, 'Aplicar um signatário a todos…'), settings.signatarios.map(x => h('option', { value:x.id }, titleCase(x.nome))));
  todos.onchange = () => { if(todos.value) sels.forEach((s, i) => { if(!(docs[i].sig && docs[i].sig.sem)) s.value = todos.value; }); };
  sheet({ titulo:'Signatários do processo', cheio:true, corpo:[todos].concat(docs.map((d, i) => h('div', { class:'lrow', style:{ flexWrap:'wrap' } },
    h('span', { class:'nn' }, N[d.id] ? N[d.id].n : ''), h('span', { class:'tx' }, h('b', null, d.nome), h('span', null, TIPO_NOME[d.tipo] || 'Texto')),
    h('div', { class:'row', style:{ width:'100%', flexWrap:'nowrap' } }, sels[i], modos[i])))),
    botoes:[{ t:'Cancelar', v:'ghost' }, { t:'Aplicar', v:'acc', fn:() => {
      docs.forEach((d, i) => { const v = sels[i].value; d.sig = d.sig || novoSig(null); d.sig.sem = v === '__sem'; if(v && v !== '__sem') d.sig.pessoa = v; if(v === '') d.sig.pessoa = null; d.sig.modo = modos[i].value; if(d.sig.modo === 'fisica' && !d.sig.data) d.sig.data = hojeISO(); });
      touch(p); saveDB(); if(VIEW === 'mesa' && M.p === p) renderMesa(true); toast('Signatários aplicados.');
    } }] });
}

/* =====================================================================
   Revisão do texto inteiro: Atual × Revisado, parágrafo por parágrafo
   ===================================================================== */
const REV_TUDO = 'Você é revisor de documentos oficiais da Secretaria Municipal de Infraestrutura e Defesa Civil de Ilhéus (Bahia). Revise os parágrafos numerados abaixo: ortografia, acentuação, concordância, regência, crase, pontuação e clareza, em português do Brasil formal e impessoal. Não mude o sentido, os números, as datas, os nomes, os valores nem os marcadores entre colchetes como [^1]. Nunca use a palavra "tratativa(s)". Responda SOMENTE com os parágrafos que precisam de alguma mudança, cada um numa linha no formato [n] texto revisado completo. Se nada precisar mudar, responda apenas: SEM MUDANÇAS.';
function textoParaRevisao(b){
  const partes = [], map = [];
  const w = document.createTreeWalker(b, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, { acceptNode:n => n.nodeType === 1 ? (n.matches('sup.nr') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP) : n.parentElement.closest('sup.nr,.pgap') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
  let n, k = 0;
  while((n = w.nextNode())){
    if(n.nodeType === 1){ k++; const t = '[^' + k + ']'; for(let i = 0; i < t.length; i++) map.push(null); partes.push(t); continue; }
    for(let i = 0; i < n.data.length; i++) map.push({ node:n, off:i });
    partes.push(n.data);
  }
  return { t:partes.join(''), map };
}
function tokens(s){ return s.split(/(\s+)/).filter(x => x !== ''); }
function difPalavras(a, b){
  const A = tokens(a), B = tokens(b), n = A.length, m = B.length;
  if(n * m > 250000) return [{ tipo:'troca', a:a, b:b, ia:0, ja:a.length }];
  const L = Array.from({ length:n + 1 }, () => new Uint16Array(m + 1));
  for(let i = n - 1; i >= 0; i--) for(let j = m - 1; j >= 0; j--) L[i][j] = A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const ops = []; let i = 0, j = 0, pos = 0;
  const push = (tipo, ta, tb) => { const u = ops[ops.length - 1]; if(u && u.tipo !== 'igual' && tipo !== 'igual'){ u.a += ta; u.b += tb; u.ja += ta.length; u.tipo = 'troca'; return; } ops.push({ tipo, a:ta, b:tb, ia:pos, ja:pos + ta.length }); };
  while(i < n || j < m){
    if(i < n && j < m && A[i] === B[j]){ push('igual', A[i], A[i]); pos += A[i].length; i++; j++; }
    else if(j < m && (i === n || L[i][j + 1] >= L[i + 1][j])){ push('troca', '', B[j]); j++; }
    else { push('troca', A[i], ''); pos += A[i].length; i++; }
  }
  return ops;
}
function difHTML(ops){ return ops.map(o => o.tipo === 'igual' ? esc(o.a) : (o.a ? '<del>' + esc(o.a) + '</del>' : '') + (o.b ? '<ins>' + esc(o.b) + '</ins>' : '')).join(''); }
/* aplica as trocas direto nos pedaços de texto, preservando negrito, itálico e notas */
function aplicarRevisao(item){
  const ops = item.ops.filter(o => o.tipo !== 'igual'), map = item.map;
  for(let k = ops.length - 1; k >= 0; k--){
    const o = ops[k];
    if(map.slice(o.ia, o.ja).some(x => x === null)) continue;
    const r = document.createRange();
    if(o.ja > o.ia){ const a = map[o.ia], z = map[o.ja - 1]; if(!a || !z) continue; r.setStart(a.node, a.off); r.setEnd(z.node, z.off + 1); }
    else { const a = map[o.ia] || null, z = o.ia > 0 ? map[o.ia - 1] : null; if(a) r.setStart(a.node, a.off); else if(z) r.setStart(z.node, z.off + 1); else continue; r.collapse(true); }
    r.deleteContents();
    if(o.b) r.insertNode(document.createTextNode(o.b));
  }
  item.b.normalize();
}
async function revisarTudo(d){
  if(!d || d.kind !== 'texto') return toast('Vá até um texto para revisar.');
  const body = bodyDoDoc(d); if(!body) return;
  pararRolagem(); fecharTeclado();
  const bls = blocosDe(body).filter(b => !b.matches('p.bl,p.id,h1,.tmpP') && b.textContent.trim().length > 2);
  if(!bls.length) return toast('Não há parágrafos para revisar.');
  const itens = bls.map((b, i) => Object.assign({ b, n:i + 1 }, textoParaRevisao(b)));
  const st = h('div', { class:'muted', style:{ fontSize:'13px', minHeight:'18px' } }, 'Revisando ' + plural(itens.length, 'parágrafo', 'parágrafos') + '…');
  const lista = h('div', { style:{ display:'flex', flexDirection:'column', gap:'10px' } });
  let ctl = new AbortController(), achados = [];
  const s = sheet({ titulo:'Revisar o texto inteiro', cheio:true, aoFechar:() => ctl.abort(), corpo:[st, lista],
    botoes:[{ t:'Parar', v:'ghost', fica:true, fn:() => ctl.abort() }, { t:'Substituir todos', v:'acc', fica:true, fn:() => { let n = 0; achados.forEach(a => { if(!a.feito){ aplicarRevisao(a); a.feito = true; a.el.classList.add('feito'); n++; } }); fim(n); } }] });
  const fim = n => { if(!n) return toast('Nada para substituir.'); body.dispatchEvent(new Event('input')); toast(plural(n, 'parágrafo substituído', 'parágrafos substituídos') + '.'); if(achados.every(a => a.feito || a.ign)) s.fechar(); };
  /* manda em lotes de ~5.000 caracteres */
  const lotes = []; let cur = [], tam = 0;
  itens.forEach(it => { if(tam + it.t.length > 5000 && cur.length){ lotes.push(cur); cur = []; tam = 0; } cur.push(it); tam += it.t.length; });
  if(cur.length) lotes.push(cur);
  try{
    for(let k = 0; k < lotes.length; k++){
      st.textContent = 'Revisando' + (lotes.length > 1 ? ' parte ' + (k + 1) + ' de ' + lotes.length : '') + '…';
      const txt = lotes[k].map(it => '[' + it.n + '] ' + it.t.replace(/\s*\n\s*/g, ' ')).join('\n\n');
      const r = await iaPedir([{ role:'user', content:REV_TUDO + '\n\nPARÁGRAFOS:\n' + txt }], { signal:ctl.signal });
      const re = /\[(\d+)\]\s*([\s\S]*?)(?=\n\s*\[\d+\]|$)/g; let m;
      while((m = re.exec(r))){
        const it = itens[+m[1] - 1], nv = m[2].replace(/\s*\n\s*/g, ' ').trim();
        if(!it || !nv || nv === it.t.trim()) continue;
        const lead = it.t.match(/^\s*/)[0].length, orig = it.t.slice(lead).replace(/\s+$/, '');
        const ops = difPalavras(orig, nv).map(o => Object.assign(o, { ia:o.ia + lead, ja:o.ja + lead }));
        if(!ops.some(o => o.tipo !== 'igual')) continue;
        const item = Object.assign({}, it, { ops, nv });
        const el = h('div', { class:'rvItem' },
          h('div', { class:'lb' }, 'Parágrafo ' + it.n + ' · atual'), h('div', { class:'at', html:difHTML(ops.map(o => Object.assign({}, o, { b:'' }))) }),
          h('div', { class:'lb' }, 'Revisado'), h('div', { class:'nv', html:difHTML(ops.map(o => Object.assign({}, o, { a:o.tipo === 'igual' ? o.a : '' }))) }),
          h('div', { class:'row' },
            h('button', { class:'btn sm acc', onclick:() => { if(item.feito) return; aplicarRevisao(item); item.feito = true; el.classList.add('feito'); fim(1); } }, 'Substituir'),
            h('button', { class:'btn sm ghost', onclick:() => { item.ign = true; el.remove(); if(achados.every(a => a.feito || a.ign)) st.textContent = 'Pronto.'; } }, 'Ignorar'),
            h('button', { class:'btn sm ghost', onclick:() => { s.fechar(); const p = primeiroPonto(it.b); it.b.closest('.body').focus({ preventScroll:true }); window.getSelection().collapse(p.node, p.off); verFoco(); } }, 'Ver no texto')));
        item.el = el; achados.push(item); lista.append(el);
      }
    }
    st.textContent = achados.length ? plural(achados.length, 'parágrafo com sugestão', 'parágrafos com sugestão') + '. Vermelho sai, verde entra.' : 'Nenhuma mudança sugerida. O texto está bom.';
  }catch(e){ st.textContent = iaErro(e); }
}


/* ---------- pular campo: vai direto ao próximo [campo] a preencher, com o teclado aberto ---------- */
function camposNaMesa(){ return Array.from(pagesEl.querySelectorAll('.page.txt .body')).flatMap(b => Array.from(b.querySelectorAll('.campo, .fc.vazio'))); }
function proximoCampo(){
  const cs = camposNaMesa();
  if(!cs.length) return toast('Nenhum campo para preencher. Tudo preenchido.', { ms:1800 });
  const s = window.getSelection(); let alvo = null;
  if(s && s.rangeCount && curSel()){
    const r = s.getRangeAt(0);
    alvo = cs.find(c => { try{ return r.comparePoint(c, 0) === 1; }catch(e){ return false; } });
  } else {
    const y = docEl.getBoundingClientRect().top + 8;
    alvo = cs.find(c => c.getBoundingClientRect().top >= y);
  }
  if(!alvo){ alvo = cs[0]; toast('Voltei ao primeiro campo.', { ms:1100 }); }
  const body = alvo.closest('.body');
  body.focus({ preventScroll:true }); selecionarNo(alvo);
  modoTeclado(true); abrirTeclado(body);
  selecionarNo(alvo); verFoco();
  const rest = cs.length; toast(plural(rest, 'campo', 'campos') + ' para preencher.', { ms:1000 });
}
/* a cápsula de baixo sobe junto com o teclado */
if(window.visualViewport){
  const sobe = () => { const vv = window.visualViewport, k = Math.max(0, window.innerHeight - vv.height - vv.offsetTop); $('aBot').style.bottom = k > 60 ? (k + 10) + 'px' : ''; };
  window.visualViewport.addEventListener('resize', sobe); window.visualViewport.addEventListener('scroll', sobe);
}

/* ===== l_layout.js ===== */
/* =====================================================================
   Editar o app: o MAPA com todas as telas em níveis (esquerda → direita),
   páginas e pastas novas encaixadas onde você escolher, bolinhas com
   função, notas para o Claude e um código fixo em cada peça (P = página
   ou pasta, B = botão/bolinha). Fica em settings.layUI.
   ===================================================================== */
const NOMES_LAY = {
  hRapido:'Acesso rápido', homeTabs:'Título do início', hAjustes:'Ajustes', hMais:'+ (novo)', pandaLogo:'Panda e versão', busca:'Busca',
  pandaMesa:'Panda (mesa)', aHome:'‹ Voltar (mesa)', aTit:'Título do documento', aSig:'Signatário', aMais:'+ de cima', aBot:'Cápsula de baixo (inteira)',
  'bot-selecionar':'Selecionar (S)', 'bot-esq':'◀ palavra', 'bot-cima':'▲ parágrafo', 'bot-baixo':'▼ parágrafo', 'bot-dir':'▶ palavra', 'bot-campo':'Pular campo', 'bot-ferramentas':'+ ferramentas de texto',
  navVolta:'‹ Voltar (pastas e processo)', pastaMais:'+ da pasta', pandaPg:'Panda (pastas e processo)', procMais:'+ do processo', procNovoDoc:'Novo documento (processo)', procAnexo:'Incluir anexo (processo)'
};
const naMesa = fn => () => { if(VIEW !== 'mesa' || !M.p) return toast('Essa função é da mesa (dentro de um documento).'); fn(); };
const ACOES_UI = [
  ['novoDoc', 'Novo documento', () => novoDocumento(VIEW === 'proc' && procPorId(NAVP.proc) ? { p:procPorId(NAVP.proc) } : {})],
  ['novoProc', 'Novo processo', () => { const n = VIEW === 'pasta' && noPorId(NAVP.no); fichaSheet(null, n ? { cat:catDoNo(n) || 'diversos', pasta:n.tipo === 'pasta' ? n.id : null } : {}); }],
  ['abrirPdf', 'Abrir PDF', () => escolherArquivos(l => receberArquivos(l))],
  ['fotografar', 'Fotografar', () => fotografar()],
  ['mesaPdf', 'Mesa de PDF', () => abrirMesaPdf()],
  ['calc', 'Calculadora', () => calcSheet()],
  ['rapido', 'Acesso rápido', () => { if(VIEW !== 'home') irInicio(); abrirRapido(); }],
  ['busca', 'Buscar', () => buscaSheet()],
  ['ajustes', 'Ajustes', () => abrirAjustes()],
  ['inicio', 'Voltar ao início', () => irInicio()],
  ['signatario', 'Signatário', naMesa(() => acao('signatario'))],
  ['maisTopo', 'Menu + de cima', naMesa(() => menuTopo($('aMais')))],
  ['ferramentas', 'Menu de ferramentas de texto', naMesa(() => acao('ferramentas'))],
  ['selecionar', 'Selecionar (S)', naMesa(() => acao('selecionar'))],
  ['esq', '◀ palavra anterior', naMesa(() => acao('esq'))],
  ['dir', '▶ próxima palavra', naMesa(() => acao('dir'))],
  ['cima', '▲ parágrafo anterior', naMesa(() => acao('cima'))],
  ['baixo', '▼ próximo parágrafo', naMesa(() => acao('baixo'))],
  ['campo', 'Pular campo', naMesa(() => acao('campo'))],
  ['copiar', 'Copiar', naMesa(() => acao('copiar'))],
  ['colar', 'Colar', naMesa(() => acao('colar'))],
  ['marca', 'Marca-texto', naMesa(() => acao('marca'))],
  ['formatar', 'Formatar texto', naMesa(() => acao('formatar'))],
  ['tabela', 'Tabela', naMesa(() => acao('tabela'))],
  ['revisar', 'Revisar com IA', naMesa(() => acao('revisar'))],
  ['palavra', 'Selecionar palavra', naMesa(() => acao('palavra'))],
  ['paragrafo', 'Selecionar parágrafo', naMesa(() => acao('paragrafo'))],
  ['tudo', 'Selecionar tudo', naMesa(() => acao('tudo'))],
  ['teclado', 'Abrir o teclado', naMesa(() => acao('teclado'))],
  ['zoomMais', 'Letra maior', naMesa(() => acao('zoomMais'))],
  ['zoomMenos', 'Letra menor', naMesa(() => acao('zoomMenos'))],
  ['novaPagina', 'Nova página', naMesa(() => novaPaginaNaMesa())],
  ['gerarPdf', 'Gerar PDF do documento', naMesa(() => { const d = M.cur && M.cur.d; if(d) previaDoc(d); })],
  ['compartilhar', 'Compartilhar o documento', naMesa(() => { const d = M.cur && M.cur.d; if(d) baixarDoc(d); })],
  ['word', 'Word', naMesa(() => { const d = M.cur && M.cur.d; if(d && d.kind === 'texto') baixarWord(d); })],
  ['selfolhas', 'Selecionar folhas', naMesa(() => acao('selfolhas'))],
  ['rolar', 'Rolar sozinho', naMesa(() => acao('rolar'))],
  ['docs', 'Documentos do processo (lista)', naMesa(() => sairMesa())],
  ['notas', 'Notas e pendências', naMesa(() => abrirPainel('dir', 'notas'))],
  ['ficha', 'Ficha do processo', naMesa(() => { if(!M.p.avulsa && !M.p.avdoc) fichaSheet(M.p); })],
  ['buscarTexto', 'Buscar no texto', naMesa(() => acao('buscar'))]
];
const N_GERAL = 10;
function acaoUI(k){
  if(k && k.startsWith('pag:')){ const n = noPorId(k.slice(4)); return n ? [k, 'Abrir "' + n.nome + '"', () => abrirNo(n.id)] : null; }
  return ACOES_UI.find(a => a[0] === k);
}
const nosAbriveis = () => Object.values(arvore().nos).filter(n => n.tipo !== 'raiz');
const opcoesAcao = sel => ACOES_UI.map(a => h('option', { value:a[0], selected:sel === a[0] }, a[1])).concat(nosAbriveis().map(n => h('option', { value:'pag:' + n.id, selected:sel === 'pag:' + n.id }, 'Abrir "' + n.nome + '" (' + n.cod + ')')));
const LAY_TXT = ['hRapido', 'hAjustes', 'hMais', 'aHome', 'aSig', 'aMais', 'bot-selecionar', 'bot-esq', 'bot-cima', 'bot-baixo', 'bot-dir', 'bot-campo', 'bot-ferramentas', 'pastaMais', 'procMais'];
const MENU_DE = { hMais:['homeMais', () => menuMais($('hMais'))], aMais:['topo', () => menuTopo($('aMais'))], 'bot-ferramentas':['ferramentas', () => menuFerramentas($('aBot').querySelector('[data-a="ferramentas"]'))],
  pastaMais:['pastaMais', () => { const n = noPorId(NAVP.no), a = $('vPasta').querySelector('[data-lay="pastaMais"]'); if(n && a) menuPasta(n, a); }],
  procMais:['procMais', () => { const p = procPorId(NAVP.proc), a = $('vProc').querySelector('[data-lay="procMais"]'); if(p && a) menuProcTela(p, a); }] };
const NOME_MENU = { homeMais:'Menu + do início', topo:'Menu + de cima (mesa)', ferramentas:'Menu de ferramentas de texto', pastaMais:'Menu + da pasta', procMais:'Menu + do processo' };
function alternarEdicao(){ if(LAY.editando) sairEdicaoTela(); else entrarEdicaoTela(); }
const LAY = { editando:false, arr:null, k:1, mapa:false, sel:[], inserir:null, colocar:null };
function layUI(){ if(!settings.layUI || typeof settings.layUI !== 'object') settings.layUI = { els:{}, extras:[] }; settings.layUI.els = settings.layUI.els || {}; settings.layUI.extras = settings.layUI.extras || []; return settings.layUI; }
function cfgLay(id){ const L = layUI(); return L.els[id] || (L.els[id] = {}); }
function salvarLay2(){ const L = layUI(); for(const k in L.els){ const c = L.els[k]; if(!c.dx && !c.dy && !c.oculto && !c.nome && !c.acao && !c.nota) delete L.els[k]; } saveSettings(); }
const telaAtual = () => VIEW === 'pasta' && NAVP.no ? 'pag:' + NAVP.no : VIEW === 'proc' ? 'proc' : VIEW === 'mesa' ? 'mesa' : 'home';
const boxTela = () => ({ pasta:$('vPasta'), proc:$('vProc'), mesa:$('mScreen'), home:$('vHome') })[VIEW] || null;
function codDe(id){ const L = layUI(); L.cods = L.cods || {}; if(!L.cods[id]){ L.cods[id] = proxCod('B'); LAY.codNovo = true; } return L.cods[id]; }
function nomeTela(t){ if(t === 'home') return 'Início'; if(t === 'proc') return 'Tela do processo'; if(t === 'mesa') return 'Mesa (documento)'; const n = noPorId(String(t).slice(4)); return n ? n.nome : t; }

/* aplica posições, ocultos, marcas de nota e (no modo de edição) os códigos */
function aplicarLayUI(){
  const L = layUI(); LAY.codNovo = false;
  document.querySelectorAll('[data-lay]').forEach(el => {
    const id = el.dataset.lay, c = L.els[id] || {};
    el.style.translate = c.dx || c.dy ? (c.dx || 0) + 'px ' + (c.dy || 0) + 'px' : '';
    el.classList.toggle('layOculto', !!c.oculto);
    el.classList.toggle('layNota', !!(c.nota || c.nome || c.acao));
    if(c.nome) el.setAttribute('aria-label', c.nome);
    const txt = !!(c.nome && c.mostrarNome && LAY_TXT.includes(id));
    if(txt){ if(el._orig == null) el._orig = el.innerHTML; el.innerHTML = '<span class="layTxt">' + esc(c.nome) + '</span>'; el.classList.add('layComTxt'); }
    else if(el._orig != null){ el.innerHTML = el._orig; el._orig = null; el.classList.remove('layComTxt'); }
    if(LAY.editando && el.offsetParent !== null){ el.dataset.cod = codDe(id); if(getComputedStyle(el).position === 'static') el.classList.add('codRel'); }
  });
  if(LAY.codNovo) saveSettings();
  document.querySelectorAll('.noRow[data-no]').forEach(r => { const n = noPorId(r.dataset.no); if(n) r.dataset.cod = n.cod; });
  renderExtras();
}
function renderExtras(){
  document.querySelectorAll('.xBub').forEach(x => x.remove());
  const tela = telaAtual(), box = boxTela();
  if(!box) return;
  layUI().extras.filter(x => x.tela === tela).forEach(x => {
    if(!x.cod) x.cod = proxCod('B');
    const b = h('button', { class:'xBub' + (x.nota ? ' layNota' : ''), dataset:{ xid:x.id, cod:x.cod }, 'aria-label':x.rot || 'Bolinha nova', style:{ left:x.x + 'px', top:x.y + 'px' } }, x.rot ? x.rot.slice(0, 14) : '+');
    box.append(b);
  });
}
/* fora do modo de edição: função trocada ou bolinha nova */
document.addEventListener('click', ev => {
  if(ev.target.closest('#layBar, #mapa, #layFab')) return;
  const el = ev.target.closest('[data-lay], .xBub'); if(!el) return;
  if(el.classList.contains('pandaLogo') || el.classList.contains('pandaMini')){ ev.preventDefault(); ev.stopImmediatePropagation(); if(!LAY.movido) alternarEdicao(); LAY.movido = false; return; }
  if(LAY.editando){ ev.preventDefault(); ev.stopImmediatePropagation(); return; }
  if(el.classList.contains('xBub')){
    ev.preventDefault(); ev.stopImmediatePropagation();
    const x = layUI().extras.find(y => y.id === el.dataset.xid); if(!x) return;
    const a = acaoUI(x.acao); if(a) return a[2]();
    return toast((x.rot ? x.rot + ': ' : '') + (x.nota || 'Bolinha nova, ainda sem função.'), { ms:3200 });
  }
  const c = layUI().els[el.dataset.lay]; const a = c && acaoUI(c.acao);
  if(a && el === ev.target.closest('[data-lay]')){ ev.preventDefault(); ev.stopImmediatePropagation(); fecharTeclado(); a[2](); }
}, true);

/* ---------- modo de edição: mapa + tela reduzida ---------- */
function caminhoAtual(){
  if(VIEW === 'pasta' && NAVP.no) return caminhoNos(NAVP.no).slice(1).map(n => n.id);
  const p = VIEW === 'proc' ? procPorId(NAVP.proc) : VIEW === 'mesa' ? M.p : null;
  if(p && !p.avulsa && !p.avdoc){
    const base = caminhoNos(lugarDoProc(p).id).slice(1).map(n => n.id).concat('proc:' + p.id);
    return VIEW === 'mesa' && M.cur && M.cur.d ? base.concat('doc:' + p.id + '/' + M.cur.d.id) : base;
  }
  return [];
}
function entrarEdicaoTela(){
  while(SHEETS.length) SHEETS[SHEETS.length - 1].fechar();
  arvore();
  layHistIniciar();
  LAY.editando = true; LAY.k = 0.8; LAY.inserir = null; LAY.colocar = null; document.body.classList.add('layEdit');
  if(VIEW === 'mesa' && M.fsel) sairSelecao(true);
  if(VIEW === 'mesa') fecharTeclado();
  LAY.sel = caminhoAtual();
  if(!$('layFab')) document.body.append(h('button', { id:'layFab', 'aria-label':'Todas as funções', html:I.plusBold, onclick:painelFuncoes }));
  abrirMapa();
  toast('Toque para ver os níveis · segure para a nota · + para as funções.', { ms:3600 });
}
function sairEdicaoTela(){
  LAY.editando = false; LAY.k = 1; LAY.mapa = false; LAY.inserir = null; LAY.colocar = null;
  document.body.classList.remove('layEdit', 'layMapa');
  ['layBar', 'mapa', 'layFab', 'layBan'].forEach(id => { const b = $(id); if(b) b.remove(); });
  document.querySelectorAll('[data-cod]').forEach(el => { if(!el.classList.contains('xBub') && !el.classList.contains('noRow')) delete el.dataset.cod; });
  salvarLay2(); redesenharNav(); aplicarLayUI(); toast('Tudo salvo do seu jeito.');
}
function voltarEdicao(){
  if(LAY.colocar){ cancelarColocar(); return; }
  if(LAY.inserir){ cancelarInsercao(); return; }
  if(!LAY.mapa){ LAY.sel = caminhoAtual(); abrirMapa(); return; }
  sairEdicaoTela();
}
function renderLayBar(){
  let bar = $('layBar'); if(!bar){ bar = h('div', { id:'layBar' }); document.body.append(bar); }
  const bt = (ic, rot, fn, cls) => h('button', { class:'lbB' + (cls ? ' ' + cls : ''), onclick:fn }, h('i', { html:I[ic] || ic }), h('span', null, rot));
  bar.replaceChildren(
    bt('layers', 'Mapa', () => { LAY.sel = LAY.mapa ? LAY.sel : caminhoAtual(); abrirMapa(); }, LAY.mapa ? 'on' : ''),
    bt('eye', LAY.mapa ? 'Ver a tela' : nomeTela(telaAtual()), () => { if(LAY.mapa) abrirTelaDe(LAY.sel[LAY.sel.length - 1] || RAIZ); }, LAY.mapa ? '' : 'on'),
    bt('docplus', 'Página', () => novaPaginaSheet({})),
    bt('note', 'Lista', listaLayout),
    bt('undo', 'Desfazer', desfazerLayout),
    bt('check', 'Pronto', sairEdicaoTela, 'ok'));
}
function abrirMapa(){
  LAY.mapa = true; document.body.classList.add('layMapa');
  renderMapa(); renderLayBar();
}
function abrirTelaDe(k){
  const inf = chaveInfo(k) || chaveInfo(RAIZ);
  LAY.inserir = null;
  LAY.mapa = false; document.body.classList.remove('layMapa'); const m = $('mapa'); if(m) m.remove();
  if(inf.tipo === 'no'){ if(inf.n.tipo === 'raiz') irInicio(); else abrirNo(inf.n.id); }
  else if(inf.tipo === 'proc') abrirProcTela(inf.p);
  else if(inf.tipo === 'doc') abrirMesa(inf.p, { doc:inf.d.id });
  else if(inf.tipo === 'bol'){ const t = inf.x.tela; if(t === 'home') irInicio(); else if(t.startsWith('pag:')) abrirNo(t.slice(4)); else if(t === 'proc' || t === 'mesa'){ const p = procPorId(DB.ui.proc) || procsReais()[0]; if(p){ if(t === 'proc') abrirProcTela(p); else abrirMesa(p); } } }
  renderLayBar(); aplicarLayUI();
}

/* ---------- o mapa: colunas da esquerda para a direita ---------- */
const bolinhasDe = tela => layUI().extras.filter(x => x.tela === tela).map(x => 'bol:' + x.id);
function chaveInfo(k){
  if(!k) return null;
  if(k.startsWith('proc:')){ const p = procPorId(k.slice(5)); return p && { k, tipo:'proc', p, nome:tituloItem(p), sub:p.ficha.num ? 'nº ' + p.ficha.num : 'processo', ic:I.doc, abre:true }; }
  if(k.startsWith('doc:')){ const [pid, did] = k.slice(4).split('/'), p = procPorId(pid), d = p && p.docs.find(x => x.id === did); return d && { k, tipo:'doc', p, d, nome:d.nome, sub:d.kind === 'pdf' ? 'PDF' : (TIPO_NOME[d.tipo] || 'Texto'), ic:d.kind === 'pdf' ? I.pdf : I.doc }; }
  if(k.startsWith('bol:')){ const x = layUI().extras.find(y => y.id === k.slice(4)); return x && { k, tipo:'bol', x, nome:x.rot || 'bolinha', sub:x.acao && acaoUI(x.acao) ? acaoUI(x.acao)[1] : (x.nota ? 'nota' : 'sem função'), cod:x.cod, ic:I.plusCircle, nota:!!x.nota }; }
  const n = noPorId(k); return n && { k, tipo:'no', n, nome:n.nome, sub:n.tipo === 'raiz' ? '' : ehConteiner(n) ? subNo(n) : TIPO_NO[n.tipo], cod:n.cod, ic:iconeNo(n), abre:true, nota:!!n.nota };
}
function colunaDe(k){
  const inf = chaveInfo(k); if(!inf) return null;
  if(inf.tipo === 'no'){ const n = inf.n; return ehConteiner(n) ? { k, n, cont:true, itens:n.filhos.filter(noPorId).concat(procsDoNo(n).map(p => 'proc:' + p.id), bolinhasDe(telaDoNo(n))) } : { k, n, itens:bolinhasDe(telaDoNo(n)) }; }
  if(inf.tipo === 'proc') return { k, p:inf.p, itens:inf.p.docs.filter(d => d.linha).map(d => 'doc:' + inf.p.id + '/' + d.id) };
  return null;
}
function renderMapa(){
  if(!LAY.editando || !LAY.mapa) return;
  let m = $('mapa'); if(!m){ m = h('div', { id:'mapa' }); document.body.append(m); }
  const cols = [colunaDe(RAIZ)];
  for(let i = 0; i < LAY.sel.length; i++){
    if(!cols[i] || !cols[i].itens.includes(LAY.sel[i])){ LAY.sel = LAY.sel.slice(0, i); break; }
    const c = colunaDe(LAY.sel[i]); if(c) cols.push(c);
  }
  const wrap = h('div', { class:'mpCols' });
  cols.forEach((c, ci) => {
    const nomeC = c.n ? c.n.nome : tituloItem(c.p);
    const head = h('button', { class:'mpHead' + (ci === LAY.sel.length ? ' on' : ''), dataset:{ k:c.k }, onclick:() => { if(LAY.inserir) return; LAY.sel = LAY.sel.slice(0, ci); renderMapa(); } },
      h('small', null, 'Nível ' + (ci + 1)), h('b', null, (c.n ? c.n.cod + ' · ' : '') + nomeC));
    if(c.n) toqueLongo(head, () => notaNo(c.n, renderMapa));
    const lista = h('div', { class:'mpLista' });
    const nNos = c.cont ? c.n.filhos.filter(noPorId).length : 0;
    if(LAY.inserir && c.cont) lista.append(slotMapa(c.n, 0));
    c.itens.forEach((k, i) => {
      const inf = chaveInfo(k); if(!inf) return;
      const row = h('button', { class:'mpRow t-' + inf.tipo + (LAY.sel[ci] === k ? ' on' : '') + (inf.nota ? ' nota' : '') + (LAY.inserir && LAY.inserir.mover === k ? ' movendo' : ''), dataset:{ k }, onclick:() => tocarMapa(ci, k, row) },
        h('span', { class:'mpIc', html:inf.ic }), h('span', { class:'mpTx' }, h('b', null, inf.nome), inf.sub ? h('span', null, inf.sub) : null),
        inf.cod ? h('em', null, inf.cod) : null, inf.abre ? h('span', { class:'mpCh', html:I.chevR }) : null);
      toqueLongo(row, () => segurarMapa(k));
      lista.append(row);
      if(LAY.inserir && c.cont && i < nNos) lista.append(slotMapa(c.n, i + 1));
    });
    if(!c.itens.length && !(LAY.inserir && c.cont)) lista.append(h('div', { class:'mpVazio' }, c.cont ? 'vazia' : c.p ? 'sem documentos' : 'sem botões ainda — "Ver a tela" e + para pôr'));
    const pe = c.cont && !LAY.inserir ? h('button', { class:'mpNova', onclick:() => novaPaginaSheet({ pai:c.n.id }) }, '+ Nova aqui') : null;
    wrap.append(h('div', { class:'mpCol' + (ci === cols.length - 1 ? ' ult' : '') }, head, lista, pe));
  });
  const x0 = m.querySelector('.mpCols'), antes = x0 ? x0.scrollLeft : 0;
  m.replaceChildren(wrap, barraMapa());
  wrap.scrollLeft = antes;
  requestAnimationFrame(() => { const alvo = wrap.scrollWidth - wrap.clientWidth; if(alvo > wrap.scrollLeft) wrap.scrollTo({ left:alvo, behavior:'smooth' }); });
}
function slotMapa(cont, idx){ return h('button', { class:'mpSlot', 'aria-label':'Encaixar aqui', onclick:() => concluirInsercao(cont.id, idx) }, h('span', null, '＋ encaixar aqui')); }
function tocarMapa(ci, k, row){
  if(LAY.inserir) return alvoInsercao(ci, k, row);
  if(LAY.sel[ci] === k && LAY.sel.length === ci + 1){ const inf = chaveInfo(k); if(inf && !inf.abre) return abrirTelaDe(k); }
  LAY.sel = LAY.sel.slice(0, ci).concat(k); renderMapa();
}
function segurarMapa(k){
  const inf = chaveInfo(k); if(!inf) return;
  if(inf.tipo === 'no') return notaNo(inf.n, renderMapa);
  if(inf.tipo === 'bol') return editarItemLay(null, inf.x, renderMapa);
  if(inf.tipo === 'proc') return fichaSheet(inf.p);
  toast(inf.nome);
}
function barraMapa(){
  if(LAY.inserir){
    const I2 = LAY.inserir, nome = I2.mover ? (noPorId(I2.mover) || {}).nome : I2.novo.nome;
    return h('div', { class:'mpBarra ins' }, h('span', { class:'mpMsg' }, h('b', null, (I2.mover ? 'Mover ' : 'Encaixar ') + '"' + nome + '"'), 'Toque numa linha azul (fica entre duas, no mesmo nível) ou numa pasta (entra dentro dela, um nível abaixo).'),
      h('button', { class:'mpB', onclick:cancelarInsercao }, 'Cancelar'));
  }
  const k = LAY.sel[LAY.sel.length - 1] || RAIZ, inf = chaveInfo(k); if(!inf) return h('div');
  const b = (t, fn, cls) => h('button', { class:'mpB' + (cls ? ' ' + cls : ''), onclick:fn }, t);
  const tipo = inf.tipo === 'no' ? TIPO_NO[inf.n.tipo] : inf.tipo === 'proc' ? 'processo' : inf.tipo === 'doc' ? 'documento' : 'bolinha · ' + nomeTela(inf.x.tela);
  const bts = inf.tipo === 'no' ? [b('Ver a tela', () => abrirTelaDe(k), 'pri'), b('Nota', () => notaNo(inf.n, renderMapa)), inf.n.tipo === 'raiz' ? null : b('Mover', () => iniciarInsercao({ mover:inf.n.id }))]
    : inf.tipo === 'proc' ? [b('Ver a tela', () => abrirTelaDe(k), 'pri'), b('Ficha', () => fichaSheet(inf.p)), b('Pasta', () => moverProcPasta(inf.p))]
    : inf.tipo === 'doc' ? [b('Abrir na mesa', () => abrirTelaDe(k), 'pri')]
    : [b('Editar', () => editarItemLay(null, inf.x, renderMapa), 'pri'), b('Ver na tela', () => abrirTelaDe(k))];
  return h('div', { class:'mpBarra' }, h('span', { class:'mpSel' }, h('b', null, (inf.cod ? inf.cod + ' · ' : '') + inf.nome), h('span', null, tipo)), h('span', { class:'mpBts' }, bts));
}

/* ---------- página ou pasta nova: nome, tipo e onde encaixar ---------- */
function novaPaginaSheet(o){
  let tipo = o.tipo || 'pagina';
  const nome = h('input', { class:'inp', placeholder:'Nome (ex.: Agenda, Contratos, Reuniões)' });
  const nota = h('textarea', { class:'txa', rows:3, placeholder:'Nota para o Claude: o que deve ter aqui (opcional)' });
  const seg = h('div', { class:'seg lSeg' });
  const desc = h('p', { class:'sgNota' });
  const pinta = () => { seg.replaceChildren(...[['pasta', 'Pasta'], ['pagina', 'Página']].map(([k, t]) => h('button', { class:tipo === k ? 'on' : '', onclick:() => { tipo = k; pinta(); } }, t))); desc.textContent = tipo === 'pasta' ? 'Pasta: guarda outras pastas, páginas e processos (um nível a mais).' : 'Página: uma tela nova, onde você põe bolinhas e escreve o que ela deve fazer.'; };
  pinta();
  const pai = o.pai && noPorId(o.pai);
  sheet({ titulo:pai ? 'Nova em ' + pai.nome : 'Nova página ou pasta', corpo:[h('div', { class:'sgGrp', style:{ padding:'10px', display:'flex', flexDirection:'column', gap:'8px' } }, seg, h('label', { class:'fld' }, h('span', null, 'Nome'), nome), h('label', { class:'fld' }, h('span', null, 'Nota'), nota)), desc,
    pai ? null : h('p', { class:'sgNota' }, 'Depois de OK, você toca no mapa onde ela se encaixa.')],
    botoes:[{ t:'Cancelar', v:'ghost' }, { t:pai ? 'Criar' : 'Escolher o lugar', v:'acc', fn:() => {
      const dados = { nome:nome.value.trim() || (tipo === 'pasta' ? 'Pasta nova' : 'Página nova'), tipo, nota:nota.value.trim() };
      if(pai){ const n = novoNo(pai.id, null, dados); if(LAY.editando){ LAY.sel = caminhoNos(n.id).slice(1).map(x => x.id); renderMapa(); } else redesenharNav(); toast(n.cod + ' "' + n.nome + '" criada em ' + pai.nome + '.'); }
      else setTimeout(() => iniciarInsercao({ novo:dados }), 60);
    } }] });
  setTimeout(() => nome.focus(), 250);
}
function iniciarInsercao(ins){
  if(!LAY.editando) entrarEdicaoTela();
  LAY.inserir = ins;
  if(ins.mover){ const pai = paiDe(ins.mover); LAY.sel = pai ? caminhoNos(pai.id).slice(1).map(n => n.id) : []; }
  abrirMapa();
}
function cancelarInsercao(){ LAY.inserir = null; renderMapa(); }
function alvoInsercao(ci, k, row){
  const inf = chaveInfo(k); if(!inf || inf.tipo !== 'no') return toast('Toque numa linha azul ou numa pasta.');
  const n = inf.n, pai = paiDe(n.id);
  if(LAY.inserir.mover === n.id) return toast('Essa é a que você está movendo. Toque em outro lugar.');
  if(ehConteiner(n)){
    menu('Onde encaixar?', [
      { t:'Dentro de "' + n.nome + '"', sub:'Um nível abaixo (vira subpasta dela)', ic:'folder', fn:() => concluirInsercao(n.id, null) },
      pai ? { t:'Ao lado de "' + n.nome + '"', sub:'Mesmo nível, logo abaixo dela', ic:'layers', fn:() => concluirInsercao(pai.id, pai.filhos.indexOf(n.id) + 1) } : null,
      n.filhos.length ? { t:'Abrir "' + n.nome + '" para escolher lá dentro', ic:'eye', fn:() => { LAY.sel = LAY.sel.slice(0, ci).concat(k); renderMapa(); } } : null
    ]);
    return;
  }
  if(pai) concluirInsercao(pai.id, pai.filhos.indexOf(n.id) + 1);
}
function concluirInsercao(paiId, idx){
  const ins = LAY.inserir; if(!ins) return;
  let n;
  if(ins.mover){ if(!moverNo(ins.mover, paiId, idx)) return toast('Não dá para pôr uma pasta dentro dela mesma.'); n = noPorId(ins.mover); }
  else n = novoNo(paiId, idx, ins.novo);
  LAY.inserir = null;
  if(!n) return renderMapa();
  LAY.sel = caminhoNos(n.id).slice(1).map(x => x.id);
  renderMapa(); toast(n.cod + ' "' + n.nome + '" ' + (ins.mover ? 'agora está em ' : 'criada em ') + noPorId(paiId).nome + '.', { ms:2600 });
}

/* ---------- o + das funções: tocar põe na tela; segurar e arrastar solta no lugar exato ---------- */
function painelFuncoes(){
  const grupos = [
    ['Bolinha', [['', 'Bolinha só com nota']]],
    ['Geral', ACOES_UI.slice(0, N_GERAL)],
    ['Mesa (dentro do documento)', ACOES_UI.slice(N_GERAL)],
    ['Abrir uma pasta ou página', nosAbriveis().map(n => ['pag:' + n.id, n.nome + ' (' + n.cod + ')'])]
  ];
  const onde = LAY.mapa ? 'na pasta ou página selecionada no mapa' : 'no meio da tela aberta';
  const corpo = [h('p', { class:'sgNota', style:{ marginTop:0 } }, 'Toque: põe ' + onde + '. Segure e arraste: some daqui e você solta no lugar exato' + (LAY.mapa ? ' (em cima de uma pasta ou página).' : '.'))];
  grupos.forEach(([t, L]) => { if(L.length) corpo.push(h('div', { class:'fnSec' }, t), h('div', { class:'sgGrp' }, L.map(a => fnRow(a[0], a[1])))); });
  sheet({ titulo:'Funções', corpo });
}
function fnRow(acaoK, nome){
  const r = h('button', { class:'sgRow fnRow' }, h('span', null, nome), h('span', { class:'v', html:I.plusCircle }));
  let t = null, x0 = 0, y0 = 0, segurou = false;
  r.addEventListener('pointerdown', ev => { segurou = false; x0 = ev.clientX; y0 = ev.clientY; clearTimeout(t); t = setTimeout(() => { t = null; segurou = true; pegarFuncao(acaoK, nome, x0, y0); }, 320); });
  r.addEventListener('pointermove', ev => { if(t && Math.abs(ev.clientX - x0) + Math.abs(ev.clientY - y0) > 10){ clearTimeout(t); t = null; } });
  ['pointerup', 'pointercancel'].forEach(e => r.addEventListener(e, () => { clearTimeout(t); t = null; }));
  r.addEventListener('contextmenu', ev => ev.preventDefault());
  r.addEventListener('click', ev => { if(segurou){ ev.preventDefault(); return; } fecharFolhaTopo(); colocarPadrao(acaoK, nome); });
  return r;
}
const nomeBolinha = (acaoK, nome) => acaoK ? nome.replace(/\s*\(P\d+\)$/, '').replace(/^Abrir "(.*)"$/, '$1') : '';
function pegarFuncao(acaoK, nome, x, y){
  fecharFolhaTopo();
  if(navigator.vibrate) try{ navigator.vibrate(14); }catch(e){}
  const g = h('div', { id:'fnGhost' }, nomeBolinha(acaoK, nome).slice(0, 10) || '+');
  document.body.append(g);
  LAY.colocar = { acao:acaoK, nome, g, x0:x, y0:y, mov:false, dedo:true };
  moverGhost(x, y);
  banner('Solte no lugar exato' + (LAY.mapa ? ' (em cima de uma pasta ou página)' : '') + ', ou levante o dedo e toque onde quer.');
}
function moverGhost(x, y){ const c = LAY.colocar; if(!c) return; c.g.style.left = (x - 26) + 'px'; c.g.style.top = (y - 26) + 'px'; c.x = x; c.y = y; }
function banner(txt){ let b = $('layBan'); if(!b){ b = h('div', { id:'layBan' }); document.body.append(b); } b.replaceChildren(h('span', null, txt), h('button', { onclick:cancelarColocar }, 'Cancelar')); }
function cancelarColocar(){ const c = LAY.colocar; if(c && c.g) c.g.remove(); LAY.colocar = null; const b = $('layBan'); if(b) b.remove(); }
window.addEventListener('pointermove', ev => {
  const c = LAY.colocar; if(!c || !c.dedo) return;
  if(Math.abs(ev.clientX - c.x0) + Math.abs(ev.clientY - c.y0) > 12) c.mov = true;
  moverGhost(ev.clientX, ev.clientY);
  /* perto da borda, o mapa corre para mostrar as outras colunas */
  const cols = LAY.mapa && document.querySelector('.mpCols');
  if(cols){ if(ev.clientX < 36) cols.scrollLeft -= 14; else if(ev.clientX > window.innerWidth - 36) cols.scrollLeft += 14; }
  if(LAY.mapa){ const el = document.elementFromPoint(ev.clientX, ev.clientY), row = el && el.closest('.mpRow, .mpHead'); document.querySelectorAll('.alvo').forEach(x => { if(x !== row) x.classList.remove('alvo'); }); if(row) row.classList.add('alvo'); }
}, { passive:true });
document.addEventListener('touchmove', ev => { if(LAY.colocar && LAY.colocar.dedo) ev.preventDefault(); }, { passive:false });
window.addEventListener('pointerup', ev => { const c = LAY.colocar; if(!c || !c.dedo) return; c.dedo = false; if(c.mov) soltarFuncao(ev.clientX, ev.clientY); });
window.addEventListener('pointercancel', () => { const c = LAY.colocar; if(c) c.dedo = false; });
/* dedo levantado sem arrastar: o próximo toque escolhe o lugar */
document.addEventListener('pointerdown', ev => {
  const c = LAY.colocar; if(!c || c.dedo || ev.target.closest('#layBan, #layBar')) return;
  ev.preventDefault(); ev.stopPropagation(); moverGhost(ev.clientX, ev.clientY); soltarFuncao(ev.clientX, ev.clientY);
}, true);
function soltarFuncao(cx, cy){
  const c = LAY.colocar; if(!c) return;
  c.g.style.display = 'none';
  const ban = $('layBan'); if(ban) ban.style.visibility = 'hidden';
  const alvo = document.elementFromPoint(cx, cy);
  if(ban) ban.style.visibility = '';
  document.querySelectorAll('.alvo').forEach(x => x.classList.remove('alvo'));
  if(LAY.mapa){
    const row = alvo && alvo.closest('.mpRow, .mpHead');
    const inf = row && chaveInfo(row.dataset.k);
    const tela = !inf ? null : inf.tipo === 'no' ? telaDoNo(inf.n) : inf.tipo === 'proc' ? 'proc' : inf.tipo === 'doc' ? 'mesa' : inf.x.tela;
    if(!tela){ c.g.style.display = ''; toast('Solte em cima de uma pasta, página ou processo do mapa.'); c.dedo = false; return; }
    cancelarColocar(); criarBolinha(tela, null, null, c.acao, c.nome);
    return;
  }
  const box = boxTela(), ra = $('app').getBoundingClientRect();
  if(!box || cx < ra.left || cx > ra.right || cy < ra.top || cy > ra.bottom){ c.g.style.display = ''; toast('Solte dentro da tela do app.'); c.dedo = false; return; }
  const r = box.getBoundingClientRect();
  cancelarColocar(); criarBolinha(telaAtual(), (cx - r.left) / LAY.k - 26, (cy - r.top) / LAY.k - 22, c.acao, c.nome);
}
function colocarPadrao(acaoK, nome){
  if(LAY.mapa){ const k = LAY.sel[LAY.sel.length - 1] || RAIZ, inf = chaveInfo(k); const tela = !inf ? 'home' : inf.tipo === 'no' ? telaDoNo(inf.n) : inf.tipo === 'proc' ? 'proc' : inf.tipo === 'doc' ? 'mesa' : inf.x.tela; return criarBolinha(tela, null, null, acaoK, nome); }
  const W = window.innerWidth, H = window.innerHeight;
  criarBolinha(telaAtual(), W / 2 - 26, H / 2 - 22, acaoK, nome);
}
function criarBolinha(tela, x, y, acaoK, nome){
  const L = layUI(), W = window.innerWidth, H = window.innerHeight;
  if(x == null){ const n = L.extras.filter(e => e.tela === tela).length; x = Math.round(W / 2 - 26); y = Math.round(150 + 56 * (n % 8)); }
  const b = { id:uid(), cod:proxCod('B'), tela, x:Math.round(Math.max(0, Math.min(W - 60, x))), y:Math.round(Math.max(40, Math.min(H - 80, y))), rot:nomeBolinha(acaoK, nome), acao:acaoK, nota:'' };
  L.extras.push(b); saveSettings();
  if(LAY.mapa){ renderMapa(); } else renderExtras();
  toast(b.cod + (b.rot ? ' "' + b.rot + '"' : ' (bolinha de nota)') + ' posta em ' + nomeTela(tela) + '. Segure para a nota.', { ms:2600 });
  if(!acaoK) setTimeout(() => editarItemLay(null, b, LAY.mapa ? renderMapa : null), 200);
}

/* arrastar e segurar os botões da tela reduzida */
document.addEventListener('pointerdown', ev => {
  if(!LAY.editando || LAY.mapa || LAY.colocar || ev.target.closest('#layBar, #layFab, #layBan, .sh, .pm, #sheets')) return;
  const el = ev.target.closest('.xBub') || ev.target.closest('[data-lay]'); if(!el) return;
  ev.preventDefault(); ev.stopPropagation(); LAY.movido = false;
  const ext = el.classList.contains('xBub') ? layUI().extras.find(y => y.id === el.dataset.xid) : null;
  const c = ext ? null : cfgLay(el.dataset.lay);
  LAY.arr = { el, ext, c, x0:ev.clientX, y0:ev.clientY, bx:ext ? ext.x : (c.dx || 0), by:ext ? ext.y : (c.dy || 0), mov:false,
    t:setTimeout(() => { if(LAY.arr && !LAY.arr.mov){ const a = LAY.arr; LAY.arr = null; LAY.movido = true; if(navigator.vibrate) try{ navigator.vibrate(12); }catch(e){} editarItemLay(a.el.dataset.lay, a.ext); } }, 520) };
  el.classList.add('layArrasta');
}, true);
window.addEventListener('pointermove', ev => {
  const a = LAY.arr; if(!a) return;
  const dx = (ev.clientX - a.x0) / LAY.k, dy = (ev.clientY - a.y0) / LAY.k;
  if(!a.mov && Math.abs(dx) + Math.abs(dy) < 8) return;
  if(!a.mov){ a.mov = true; LAY.movido = true; clearTimeout(a.t); }
  ev.preventDefault();
  if(a.ext){ a.ext.x = Math.round(a.bx + dx); a.ext.y = Math.round(a.by + dy); a.el.style.left = a.ext.x + 'px'; a.el.style.top = a.ext.y + 'px'; }
  else { a.c.dx = Math.round(a.bx + dx); a.c.dy = Math.round(a.by + dy); a.el.style.translate = a.c.dx + 'px ' + a.c.dy + 'px'; }
}, { passive:false });
const soltarLay = () => { const a = LAY.arr; if(!a) return; clearTimeout(a.t); a.el.classList.remove('layArrasta'); LAY.arr = null; if(a.mov) salvarLay2(); };
window.addEventListener('pointerup', soltarLay); window.addEventListener('pointercancel', soltarLay);

/* nome, função e nota de um item (ou de uma bolinha nova) */
function editarItemLay(id, ext, depois){
  const c = ext || cfgLay(id);
  const fimOk = () => { if(depois) depois(); };
  const nome = h('input', { class:'inp', value:ext ? (ext.rot || '') : (c.nome || ''), placeholder:ext ? 'Nome curto (aparece na bolinha)' : (NOMES_LAY[id] || id) });
  const fn = h('select', { class:'sel' }, h('option', { value:'' }, ext ? '— sem função (só a nota) —' : '— a função de hoje —'), opcoesAcao(c.acao));
  const mostra = h('input', { type:'checkbox', checked:!!c.mostrarNome });
  const temMenu = !ext && MENU_DE[id];
  const nota = h('textarea', { class:'txa', rows:4, placeholder:'Explique o que você quer aqui: dividir a função, mudar o nome, o que fazer quando tocar…' }, c.nota || '');
  const cod = ext ? ext.cod : codDe(id);
  const corpo = [h('div', { class:'sgGrp', style:{ padding:'10px', display:'flex', flexDirection:'column', gap:'8px' } },
    h('label', { class:'fld' }, h('span', null, 'Nota para o Claude'), nota),
    h('label', { class:'fld' }, h('span', null, 'Nome'), nome),
    !ext && LAY_TXT.includes(id) ? h('label', { class:'chk' }, mostra, h('span', null, 'Mostrar o nome no botão, no lugar do ícone')) : null,
    h('label', { class:'fld' }, h('span', null, 'Função ao tocar'), fn)),
    ext ? h('p', { class:'sgNota' }, 'Fica em: ' + nomeTela(ext.tela) + '.') : null,
    temMenu ? h('div', { class:'sgGrp' }, h('button', { class:'sgRow', onclick:() => { c.nome = nome.value.trim(); c.mostrarNome = mostra.checked; c.acao = fn.value; c.nota = nota.value.trim(); salvarLay2(); aplicarLayUI(); SHEETS[SHEETS.length - 1].fechar(); setTimeout(temMenu[1], 80); } }, h('span', { style:{ color:'var(--accent)' } }, 'Editar os itens do menu deste botão'), h('span', { class:'v', html:I.chevR }))) : null];
  sheet({ titulo:cod + ' · ' + (ext ? (ext.rot || 'Bolinha') : (NOMES_LAY[id] || 'Botão')), corpo, botoes:[
    ext ? { t:'Apagar', v:'danger', fn:() => { const L = layUI(); L.extras = L.extras.filter(y => y !== ext); saveSettings(); renderExtras(); fimOk(); } }
      : { t:c.oculto ? 'Mostrar' : 'Esconder', v:'ghost', fn:() => { c.oculto = !c.oculto; salvarLay2(); aplicarLayUI(); } },
    ext ? null : { t:'Voltar ao lugar', v:'ghost', fn:() => { c.dx = 0; c.dy = 0; salvarLay2(); aplicarLayUI(); } },
    { t:'OK', v:'acc', fn:() => { if(ext){ ext.rot = nome.value.trim(); } else { c.nome = nome.value.trim(); c.mostrarNome = mostra.checked; } c.acao = fn.value; c.nota = nota.value.trim(); ext ? saveSettings() : salvarLay2(); aplicarLayUI(); fimOk(); } }] });
  setTimeout(() => nota.focus(), 250);
}
/* lista para mandar ao Claude: o mapa inteiro, com códigos e notas */
function linhaBol(x, W, H){ return x.cod + ' bolinha "' + (x.rot || 'sem nome') + '" em ' + Math.round(x.x / W * 100) + '% da largura, ' + Math.round(x.y / H * 100) + '% da altura' + (x.acao && acaoUI(x.acao) ? ' · função: ' + acaoUI(x.acao)[1] : '') + (x.nota ? ' · nota: ' + x.nota : ''); }
function textoLayout(){
  const L = layUI(), W = window.innerWidth, H = window.innerHeight;
  const out = [(typeof APP_NOME !== 'undefined' ? APP_NOME : 'Panda').toUpperCase() + ' · MAPA DAS TELAS (' + dataBR(hojeISO()) + ')', 'Celular: ' + W + ' × ' + H + ' px', '', 'MAPA (níveis; cada recuo é um nível abaixo):'];
  const anda = (n, nivel) => {
    const pad = '   '.repeat(nivel);
    const ps = ehConteiner(n) ? procsDoNo(n).length : 0;
    out.push(pad + n.cod + ' ' + n.nome + ' [' + TIPO_NO[n.tipo] + ']' + (ps ? ' · ' + plural(ps, 'processo', 'processos') : '') + (n.nota ? ' — nota: ' + n.nota : ''));
    L.extras.filter(x => x.tela === telaDoNo(n)).forEach(x => out.push(pad + '   · ' + linhaBol(x, W, H)));
    n.filhos.map(noPorId).filter(Boolean).forEach(f => anda(f, nivel + 1));
  };
  anda(noPorId(RAIZ), 0);
  out.push('');
  const grupos = [['home', 'Tela inicial', ['hRapido', 'homeTabs', 'hAjustes', 'busca', 'pandaLogo', 'hMais']], ['pag:', 'Telas de pasta e página', ['navVolta', 'pastaMais', 'pandaPg']], ['proc', 'Tela do processo', ['procMais', 'procNovoDoc', 'procAnexo']], ['mesa', 'Mesa (documento)', ['pandaMesa', 'aHome', 'aTit', 'aSig', 'aMais', 'aBot', 'bot-selecionar', 'bot-esq', 'bot-cima', 'bot-baixo', 'bot-dir', 'bot-campo', 'bot-ferramentas']]];
  for(const [tela, titulo, ids] of grupos){
    const linhas = [];
    ids.forEach(id => {
      const c = L.els[id]; if(!c) return;
      const p = [];
      if(c.dx || c.dy) p.push('movido ' + (c.dx > 0 ? c.dx + ' px para a direita' : c.dx < 0 ? -c.dx + ' px para a esquerda' : '') + (c.dx && c.dy ? ' e ' : '') + (c.dy > 0 ? c.dy + ' px para baixo' : c.dy < 0 ? -c.dy + ' px para cima' : ''));
      if(c.oculto) p.push('ESCONDIDO');
      if(c.nome) p.push('nome: "' + c.nome + '"');
      if(c.acao && acaoUI(c.acao)) p.push('função: ' + acaoUI(c.acao)[1]);
      if(c.nota) p.push('nota: ' + c.nota);
      if(p.length) linhas.push('• ' + ((L.cods || {})[id] ? L.cods[id] + ' ' : '') + (NOMES_LAY[id] || id) + ' — ' + p.join(' · '));
    });
    if(tela === 'proc' || tela === 'mesa') L.extras.filter(x => x.tela === tela).forEach(x => linhas.push('• ' + linhaBol(x, W, H)));
    if(linhas.length) out.push(titulo + ':', ...linhas, '');
  }
  const ms = L.menus || {};
  for(const ch in ms){
    const m = ms[ch], linhas = [];
    for(const k in (m.itens || {})){ const c = m.itens[k], p = []; if(c.nome) p.push('novo nome: "' + c.nome + '"'); if(c.oculto) p.push('ESCONDIDO'); if(c.acao && acaoUI(c.acao)) p.push('função: ' + acaoUI(c.acao)[1]); if(c.nota) p.push('nota: ' + c.nota); if(p.length) linhas.push('• "' + k + '" — ' + p.join(' · ')); }
    (m.extras || []).forEach(x => linhas.push('• ITEM NOVO "' + (x.nome || 'sem nome') + '"' + (x.acao && acaoUI(x.acao) ? ' · função: ' + acaoUI(x.acao)[1] : '') + (x.nota ? ' · nota: ' + x.nota : '')));
    if(m.ordem && m.ordem.length) linhas.push('• ordem: ' + m.ordem.join(' › '));
    if(linhas.length) out.push((NOME_MENU[ch] || ch) + ':', ...linhas, '');
  }
  return out.join('\n');
}
function listaLayout(){
  const t = textoLayout();
  sheet({ titulo:'Lista para o Claude', corpo:[h('div', { class:'sgPrev', style:{ whiteSpace:'pre-wrap', fontFamily:'var(--ui)', fontSize:'12.5px' } }, t),
    h('p', { class:'sgNota' }, 'Copie e cole na conversa com o Claude. Print só quando a aparência importar.')],
    botoes:[{ t:'Desfazer botões', v:'danger', fn:async () => { if(!await confirmar('Desfazer botões', 'Os botões voltam ao lugar e as bolinhas somem. As pastas e páginas do mapa ficam.', 'Desfazer', true)) return false; const L = layUI(); settings.layUI = { els:{}, extras:[], arvore:L.arvore, seq:L.seq, cods:L.cods }; saveSettings(); aplicarLayUI(); if(LAY.mapa) renderMapa(); } },
      { t:'Copiar', v:'acc', fn:() => { copiarTexto(t, 'Lista copiada. Cole na conversa com o Claude.'); } }] });
}

/* ---------- itens dos menus "+": renomear, esconder, reordenar, trocar a função, incluir ---------- */
function cfgMenu(chave){ const L = layUI(); L.menus = L.menus || {}; const m = L.menus[chave] || (L.menus[chave] = {}); m.itens = m.itens || {}; m.extras = m.extras || []; m.ordem = m.ordem || []; return m; }
function personalizarMenu(chave, itens){
  const m = (layUI().menus || {})[chave];
  let lista = itens.filter(Boolean).map(it => it === '-' ? it : Object.assign({}, it, { k:it.k || it.t }));
  if(m){
    lista = lista.map(it => {
      if(it === '-') return it;
      const c = m.itens && m.itens[it.k]; if(!c) return it;
      const n = Object.assign({}, it);
      if(c.nome) n.t = c.nome;
      if(c.acao){ const a = acaoUI(c.acao); if(a){ n.fn = a[2]; n.off = false; } }
      n.oculto = !!c.oculto; return n;
    });
    (m.extras || []).forEach(x => { const a = acaoUI(x.acao); lista.push({ k:'x:' + x.id, t:x.nome || (a ? a[1] : 'Item novo'), ic:'plusCircle', fn:a ? a[2] : () => toast(x.nota || 'Item novo, ainda sem função.'), extra:x }); });
    if(m.ordem && m.ordem.length){ const pos = k => { const i = m.ordem.indexOf(k); return i < 0 ? 900 : i; }; lista = lista.filter(i => i !== '-').map((it, i) => Object.assign(it, { _i:i })).sort((a, b) => pos(a.k) - pos(b.k) || a._i - b._i); }
  }
  if(!LAY.editando) lista = lista.filter(i => i === '-' || !i.oculto);
  return lista;
}
function editarItemMenu(chave, it, lista){
  const m = cfgMenu(chave), c = it.extra ? it.extra : (m.itens[it.k] = m.itens[it.k] || {});
  const keys = lista.filter(i => i !== '-').map(i => i.k);
  const nome = h('input', { class:'inp', value:it.extra ? (c.nome || '') : (c.nome || ''), placeholder:it.t });
  const fn = h('select', { class:'sel' }, h('option', { value:'' }, it.extra ? '— sem função (só a nota) —' : '— a função de hoje —'), opcoesAcao(c.acao));
  const nota = h('textarea', { class:'txa', rows:3, placeholder:'Nota para o Claude (opcional)' }, c.nota || '');
  const mover = dir => { const i = keys.indexOf(it.k), j = i + dir; if(i < 0 || j < 0 || j >= keys.length) return; [keys[i], keys[j]] = [keys[j], keys[i]]; m.ordem = keys; saveSettings(); };
  const volta = () => setTimeout(() => LAY.reabrir && LAY.reabrir(), 80);
  sheet({ titulo:(NOME_MENU[chave] || 'Menu') + ' · ' + it.t, aoFechar:volta, corpo:[h('div', { class:'sgGrp', style:{ padding:'10px', display:'flex', flexDirection:'column', gap:'8px' } },
      h('label', { class:'fld' }, h('span', null, 'Nome'), nome), h('label', { class:'fld' }, h('span', null, 'Função'), fn), h('label', { class:'fld' }, h('span', null, 'Nota'), nota)),
    h('div', { class:'row' }, h('button', { class:'btn sm', onclick:() => { mover(-1); toast('Subiu.', { ms:800 }); } }, h('span', { html:I.chevU }), 'Subir'), h('button', { class:'btn sm', onclick:() => { mover(1); toast('Desceu.', { ms:800 }); } }, h('span', { html:I.chevD }), 'Descer'))],
    botoes:[
      it.extra ? { t:'Apagar', v:'danger', fn:() => { m.extras = m.extras.filter(x => x !== c); saveSettings(); } } : { t:c.oculto ? 'Mostrar' : 'Esconder', v:'ghost', fn:() => { c.oculto = !c.oculto; saveSettings(); } },
      { t:'OK', v:'acc', fn:() => { c.nome = nome.value.trim(); c.acao = fn.value; c.nota = nota.value.trim(); saveSettings(); } }] });
}
function adicionarItemMenu(chave){
  const m = cfgMenu(chave), x = { id:uid(), nome:'', acao:'', nota:'' };
  m.extras.push(x); saveSettings();
  editarItemMenu(chave, { k:'x:' + x.id, t:'Item novo', extra:x }, [{ k:'x:' + x.id }]);
}

/* ===== k_pastas.js ===== */
/* =====================================================================
   Pastas (níveis) e tela do processo
   O app funciona como as pastas do computador: Início › Processos ›
   Licitações › processo › documentos. A árvore fica em
   settings.layUI.arvore.nos = { id:{ id, cod, nome, tipo, nota, cat, ref, filhos:[ids] } }
   tipos: raiz (Início) · pasta · cat (categoria de processos) ·
          pagina (tela nova com bolinhas) · tela (Relatórios, Avulsos, Mesa de PDF, Ajustes)
   ===================================================================== */
const RAIZ = 'inicio';
const TELAS_REF = { rel:['Relatórios', 'report'], avulsos:['Documentos avulsos', 'side'], mesaPdf:['Mesa de PDF', 'layers'], ajustes:['Ajustes', 'gear'] };
const TIPO_NO = { raiz:'início', pasta:'pasta', cat:'categoria de processos', pagina:'página', tela:'tela do app' };
function proxCod(t){ const L = layUI(); L.seq = L.seq || { P:0, B:0 }; L.seq[t] = (L.seq[t] || 0) + 1; return t + L.seq[t]; }
function arvore(){
  const L = layUI();
  if(!L.arvore || !L.arvore.nos || !L.arvore.nos[RAIZ]){
    const nos = {};
    const no = (id, nome, tipo, x) => (nos[id] = Object.assign({ id, cod:id === RAIZ ? 'P0' : proxCod('P'), nome, tipo, nota:'', filhos:[] }, x || {}));
    no(RAIZ, 'Início', 'raiz');
    no('procs', 'Processos', 'pasta');
    [['licitacoes', 'Licitações'], ['aditivos', 'Aditivos'], ['mp', 'MP'], ['diversos', 'Outras demandas'], ['autorizacoes', 'Autorizações']].forEach(([c, n]) => { no('cat-' + c, n, 'cat', { cat:c }); nos.procs.filhos.push('cat-' + c); });
    nos[RAIZ].filhos.push('procs');
    ['rel', 'avulsos', 'mesaPdf', 'ajustes'].forEach(r => { no('t-' + r, TELAS_REF[r][0], 'tela', { ref:r }); nos[RAIZ].filhos.push('t-' + r); });
    /* páginas criadas antes (Etapa 1) entram no Início, com o mesmo id */
    (L.paginas || []).forEach(pg => { no(pg.id, pg.nome || 'Página nova', 'pagina', { nota:pg.nota || '' }); nos[RAIZ].filhos.push(pg.id); });
    delete L.paginas;
    L.arvore = { nos };
    L.extras.forEach(x => { if(!x.cod) x.cod = proxCod('B'); });
    saveSettings();
  }
  return L.arvore;
}
const noPorId = id => (id && arvore().nos[id]) || null;
function paiDe(id){ const nos = arvore().nos; for(const k in nos) if(nos[k].filhos.includes(id)) return nos[k]; return null; }
const ehConteiner = n => !!n && (n.tipo === 'raiz' || n.tipo === 'pasta' || n.tipo === 'cat');
const telaDoNo = n => n.tipo === 'raiz' ? 'home' : 'pag:' + n.id;
function catDoNo(n){ while(n){ if(n.tipo === 'cat') return n.cat; n = paiDe(n.id); } return null; }
function descendentes(id){ const n = noPorId(id), out = []; if(!n) return out; n.filhos.forEach(f => { out.push(f); out.push(...descendentes(f)); }); return out; }
function caminhoNos(id){ const out = []; let n = noPorId(id); while(n){ out.unshift(n); n = paiDe(n.id); } return out; }
const caminhoNome = id => caminhoNos(id).map(n => n.nome).join(' › ');
function lugarDoProc(p){
  const A = arvore().nos;
  if(p.pasta && ehConteiner(A[p.pasta])) return A[p.pasta];
  const cats = Object.values(A).filter(n => n.tipo === 'cat');
  return cats.find(n => n.cat === p.cat) || cats.find(n => n.cat === 'diversos') || A.procs || A[RAIZ];
}
const procsDoNo = n => procsReais().filter(p => lugarDoProc(p) === n).sort((a, b) => b.updated - a.updated);
function contaProcs(n){ let c = procsDoNo(n).length; n.filhos.forEach(f => { const x = noPorId(f); if(ehConteiner(x)) c += contaProcs(x); }); return c; }
function iconeNo(n){ return n.tipo === 'raiz' ? I.home : n.tipo === 'tela' ? I[(TELAS_REF[n.ref] || [])[1] || 'doc'] : n.tipo === 'pagina' ? I.note : I.folder; }
function subNo(n){
  if(ehConteiner(n)){ const f = n.filhos.length, c = contaProcs(n); return [f ? plural(f, 'item', 'itens') : '', c ? plural(c, 'processo', 'processos') : ''].filter(Boolean).join(' · ') || 'vazia'; }
  return n.nota ? n.nota : '';
}
function novoNo(paiId, idx, dados){
  const pai = noPorId(paiId); if(!ehConteiner(pai)) return null;
  const n = { id:uid(), cod:proxCod('P'), nome:dados.nome || 'Sem nome', tipo:dados.tipo || 'pasta', nota:dados.nota || '', filhos:[] };
  arvore().nos[n.id] = n;
  pai.filhos.splice(idx == null ? pai.filhos.length : Math.max(0, Math.min(idx, pai.filhos.length)), 0, n.id);
  saveSettings(); return n;
}
function moverNo(id, paiId, idx){
  const n = noPorId(id), novo = noPorId(paiId), velho = paiDe(id);
  if(!n || !ehConteiner(novo) || id === paiId || descendentes(id).includes(paiId)) return false;
  if(velho){ const i = velho.filhos.indexOf(id); velho.filhos.splice(i, 1); if(velho === novo && idx != null && i < idx) idx--; }
  novo.filhos.splice(idx == null ? novo.filhos.length : Math.max(0, Math.min(idx, novo.filhos.length)), 0, id);
  saveSettings(); return true;
}
async function apagarNo(n){
  if(!n || n.tipo === 'raiz') return false;
  const temDentro = n.filhos.length || procsDoNo(n).length;
  if(!await confirmar('Apagar "' + n.nome + '"', temDentro ? 'O que está dentro não se perde: sobe um nível, para "' + (paiDe(n.id) || {}).nome + '".' : 'A página e as bolinhas dela somem.', 'Apagar', true)) return false;
  const pai = paiDe(n.id), i = pai.filhos.indexOf(n.id);
  pai.filhos.splice(i, 1, ...n.filhos);
  DB.procs.forEach(p => { if(p.pasta === n.id) p.pasta = pai.tipo === 'pasta' ? pai.id : null; });
  delete arvore().nos[n.id];
  const L = layUI(); L.extras = L.extras.filter(x => x.tela !== 'pag:' + n.id);
  saveSettings(); saveDB();
  if(NAVP.no === n.id) NAVP.no = pai.id;
  return true;
}
/* nome e nota de uma pasta ou página (segurar abre isto) */
function notaNo(n, depois){
  const nome = h('input', { class:'inp', value:n.nome, placeholder:'Nome' });
  const nota = h('textarea', { class:'txa', rows:4, placeholder:'Nota para o Claude: o que esta ' + (TIPO_NO[n.tipo] || 'tela') + ' deve ter ou fazer' }, n.nota || '');
  const fim = () => { if(depois) depois(); else redesenharNav(); };
  sheet({ titulo:n.cod + ' · ' + n.nome, corpo:[h('div', { class:'sgGrp', style:{ padding:'10px', display:'flex', flexDirection:'column', gap:'8px' } },
      h('label', { class:'fld' }, h('span', null, 'Nome'), nome), h('label', { class:'fld' }, h('span', null, 'Nota'), nota)),
    h('p', { class:'sgNota' }, 'É ' + (TIPO_NO[n.tipo] || 'tela') + ' · fica em ' + (caminhoNome((paiDe(n.id) || {}).id) || 'lugar nenhum') + '.')],
    botoes:[
      n.tipo === 'raiz' ? null : { t:'Apagar', v:'danger', fn:async () => { if(!await apagarNo(n)) return false; fim(); } },
      n.tipo === 'raiz' ? null : { t:'Mover', v:'ghost', fn:() => { n.nome = nome.value.trim() || n.nome; n.nota = nota.value.trim(); saveSettings(); setTimeout(() => iniciarInsercao({ mover:n.id }), 120); } },
      { t:'OK', v:'acc', fn:() => { n.nome = nome.value.trim() || n.nome; n.nota = nota.value.trim(); saveSettings(); fim(); } }] });
}

/* ---------- navegação ---------- */
const NAVP = { no:null, proc:null };
function irInicio(){ if(VIEW === 'mesa') largarMesa(); NAVP.no = null; mostrar('home'); renderHome(); }
function abrirNo(id){
  const n = noPorId(id); if(!n) return;
  if(n.tipo === 'raiz') return irInicio();
  if(n.tipo === 'tela' && n.ref !== 'rel'){
    if(n.ref === 'avulsos'){ irInicio(); abrirRapido(); }
    else if(n.ref === 'mesaPdf') abrirMesaPdf();
    else if(n.ref === 'ajustes') abrirAjustes();
    return;
  }
  if(VIEW === 'mesa') largarMesa();
  NAVP.no = id; DB.ui.no = id; mostrar('pasta'); renderPasta();
  const sc = $('vPasta').querySelector('.scroll'); if(sc) sc.scrollTop = 0;
}
function voltarNo(){ const n = noPorId(NAVP.no), pai = n && paiDe(n.id); if(!pai || pai.tipo === 'raiz') irInicio(); else abrirNo(pai.id); }
function redesenharNav(){
  if(VIEW === 'pasta') renderPasta(); else if(VIEW === 'proc') renderProcTela(); else if(VIEW === 'home') renderHome();
  if(LAY.editando && LAY.mapa) renderMapa();
}
const pandaPg = () => h('button', { class:'pandaMini pandaPg', 'data-lay':'pandaPg', 'aria-label':'Panda: editar a tela' }, h('img', { src:PANDA_SRC, alt:'' }));
function topoNav(voltaTxt, voltaFn, titulo, sub, mais, tituloFn){
  const tit = h('button', { class:'aTit', onclick:tituloFn || null }, h('b', null, titulo), h('span', null, sub || ''));
  return h('header', { class:'aTopo pTopo' }, h('button', { class:'aVolta', 'data-lay':'navVolta', onclick:voltaFn }, h('span', { html:I.chevL }), h('span', { class:'vt' }, voltaTxt)), tit, mais || h('span', { style:{ width:'30px' } }));
}
function linhaNo(n){
  const bt = h('button', { class:'aRow noRow', dataset:{ no:n.id }, onclick:() => abrirNo(n.id) },
    h('span', { class:'noIc t-' + n.tipo, html:iconeNo(n) }),
    h('span', { class:'tx' }, h('b', null, n.nome), h('span', null, subNo(n))),
    h('span', { class:'chev', html:I.chevR }));
  if(n.nota) bt.classList.add('temNota');
  toqueLongo(bt, () => notaNo(n));
  return bt;
}
function renderPasta(){
  const n = noPorId(NAVP.no), v = $('vPasta'); if(!n) return irInicio();
  const pai = paiDe(n.id);
  const mais = ehConteiner(n) ? h('button', { class:'aBola', 'data-lay':'pastaMais', 'aria-label':'Novo nesta pasta', html:I.plusBold, onclick:ev => menuPasta(n, ev.currentTarget) }) : null;
  const tit = topoNav(!pai || pai.tipo === 'raiz' ? 'Início' : pai.nome, voltarNo, n.nome, ehConteiner(n) ? subNo(n) : (n.tipo === 'tela' ? '' : 'página'), mais, () => { if(n.nota && !LAY.editando) toast(n.nota, { ms:3500 }); else notaNo(n); });
  toqueLongo(tit.querySelector('.aTit'), () => notaNo(n));
  const corpo = h('div', { class:'wrap' });
  v.replaceChildren(tit, h('div', { class:'scroll' }, corpo), pandaPg());
  if(n.tipo === 'tela' && n.ref === 'rel') homeRelatorios(corpo);
  else if(n.tipo === 'pagina') corpo.append(h('div', { class:'pagVazia' }, n.nota ? n.nota : 'Página nova. Toque no panda para pôr botões aqui.'));
  else {
    const fs = n.filhos.map(noPorId).filter(Boolean);
    if(fs.length) corpo.append(h('div', { class:'aGrp', style:{ marginTop:'14px' } }, fs.map(linhaNo)));
    const ps = procsDoNo(n);
    if(ps.length || n.tipo === 'cat') corpo.append(h('div', { class:'aSec' }, 'Processos'), ps.length ? h('div', { class:'aGrp' }, ps.map(p => linhaItem(p))) : h('div', { class:'aGrp' }, h('div', { class:'aVazio' }, 'Nenhum processo aqui. Toque no + para criar.')));
    if(!fs.length && !ps.length && n.tipo !== 'cat') corpo.append(h('div', { class:'aVazio', style:{ textAlign:'center', marginTop:'30px' } }, 'Pasta vazia. Toque no + para criar algo aqui.'));
  }
  aplicarLayUI();
}
function menuPasta(n, ancora){
  const cat = catDoNo(n);
  popMenu(ancora, [
    { t:'Novo processo aqui', ic:'folderPlus', fn:() => fichaSheet(null, { cat:cat || 'diversos', pasta:n.tipo === 'cat' ? null : n.id }) },
    '-',
    { t:'Nova pasta aqui', ic:'folder', fn:() => criarNoAqui(n, 'pasta') },
    { t:'Nova página aqui', ic:'note', fn:() => criarNoAqui(n, 'pagina') },
    '-',
    { t:'Nome e nota desta pasta', ic:'pen', fn:() => notaNo(n) }
  ], { chave:'pastaMais' });
}
async function criarNoAqui(pai, tipo){
  const nome = await perguntar(tipo === 'pasta' ? 'Nova pasta' : 'Nova página', 'Nome', '', 'Criar'); if(!nome) return;
  const n = novoNo(pai.id, null, { nome, tipo }); if(!n) return;
  redesenharNav(); toast((tipo === 'pasta' ? 'Pasta ' : 'Página ') + n.cod + ' criada em ' + pai.nome + '.');
}

/* ---------- tela do processo: a lista dos documentos, limpa ---------- */
function abrirProcTela(p){
  if(!p) return;
  if(p.avulsa || p.avdoc) return abrirItem(p);
  if(VIEW === 'mesa') largarMesa();
  NAVP.proc = p.id; DB.ui.proc = p.id; marcarUltimo(p);
  mostrar('proc'); renderProcTela();
  const sc = $('vProc').querySelector('.scroll'); if(sc) sc.scrollTop = 0;
}
function voltarDoProc(){ const p = procPorId(NAVP.proc), l = p && lugarDoProc(p); if(!l || l.tipo === 'raiz') irInicio(); else abrirNo(l.id); }
const ehAnexoEm = (p, d) => !!(d.pai && p.docs.some(y => y.id === d.pai && y.linha));
function renderProcTela(){
  const p = procPorId(NAVP.proc), v = $('vProc'); if(!p) return irInicio();
  const l = lugarDoProc(p);
  let F = {}; try{ F = folhas(p); }catch(e){}
  const linha = p.docs.filter(d => d.linha), N = numeracaoLinha(p);
  const topo = topoNav(l.tipo === 'raiz' ? 'Início' : l.nome, voltarDoProc, tituloItem(p), [p.ficha.num ? 'nº ' + p.ficha.num : 'sem número', F._total ? plural(F._total, 'folha', 'folhas') : ''].filter(Boolean).join(' · '),
    h('button', { class:'aBola', 'data-lay':'procMais', 'aria-label':'Mais', html:I.plusBold, onclick:ev => menuProcTela(p, ev.currentTarget) }), () => fichaSheet(p));
  const corpo = h('div', { class:'wrap' });
  const grp = h('div', { class:'aGrp dList' });
  /* anexos ficam escondidos: o retângulo com o clipe mostra ou esconde os de cada documento */
  const A = anexosAbertos(), docAb = emSplit(p) ? p.docs.find(x => x.id === M.docAberto) : null;
  if(docAb && docAb.pai) A[docAb.pai] = true;
  const linhaDoc = d => {
    const f = F[d.id], an = ehAnexoEm(p, d);
    const tipo = d.kind === 'pdf' ? 'PDF' : (TIPO_NOME[d.tipo] || 'Texto');
    const fl = f ? (f.k === 0 ? 'sem páginas' : f.k > 1 ? 'fls. ' + f.ini + '–' + f.fim : 'fl. ' + f.ini) : '';
    const main = h('button', { class:'dMain', onclick:() => tocarDoc(p, d) },
      h('span', { class:'dN' }, N[d.id] ? N[d.id].n : ''),
      h('span', { class:'tx' }, h('b', null, d.nome), h('span', null, [tipo, fl].filter(Boolean).join(' · '))));
    const filhos = an ? [] : p.docs.filter(x => x.pai === d.id && (x.linha || x.kind === 'vaga'));
    const cheios = filhos.filter(x => x.kind !== 'vaga').length;
    const chip = filhos.length ? h('button', { class:'dAnx' + (A[d.id] ? ' on' : '') + (cheios < filhos.length ? ' falta' : ''), 'aria-label':(A[d.id] ? 'Esconder' : 'Mostrar') + ' os anexos', onclick:ev => { ev.stopPropagation(); alternarAnexos(p, d); } },
      h('i', { html:I.clip }), cheios < filhos.length ? cheios + '/' + filhos.length : String(cheios)) : null;
    const maisAnexo = h('button', { class:'dMaisA', 'aria-label':'Anexar arquivo a este documento', html:I.plus, onclick:ev => { ev.stopPropagation(); anexosAbertos()[an ? d.pai : d.id] = true; incluirNoProc(p, an ? (p.docs.find(x => x.id === d.pai) || d) : d); } });
    const row = h('div', { class:'dRow' + (an ? ' anexo' : '') + (d.tipo === 'capa' ? ' capa' : '') + (emSplit(p) && M.docAberto === d.id ? ' aberto' : ''), dataset:{ id:d.id } }, main, chip, maisAnexo, h('span', { class:'dGrip', role:'button', 'aria-label':'Segure e arraste para mudar a ordem', html:I.menu }));
    toqueLongo(main, () => menuDocTela(p, d, main));
    ligarArrastoDoc(row, p, d);
    return row;
  };
  const linhaVaga = v => {
    const main = h('button', { class:'dMain', onclick:() => preencherVaga(p, v) },
      h('span', { class:'dN', html:I.plus }),
      h('span', { class:'tx' }, h('b', null, v.nome), h('span', null, 'toque para anexar o PDF')));
    const row = h('div', { class:'dRow anexo vaga', dataset:{ id:v.id } }, main);
    toqueLongo(main, () => menuVaga(p, v, main));
    return row;
  };
  linha.filter(d => !ehAnexoEm(p, d)).forEach(d => {
    grp.append(linhaDoc(d));
    if(A[d.id]) p.docs.filter(x => x.pai === d.id && (x.linha || x.kind === 'vaga')).forEach(x => grp.append(x.kind === 'vaga' ? linhaVaga(x) : linhaDoc(x)));
  });
  if(!linha.length) grp.append(h('div', { class:'aVazio' }, 'Nenhum documento ainda.'));
  corpo.append(h('div', { class:'aSec' }, h('span', null, 'Documentos'), linha.length > 1 ? h('span', { class:'dDica' }, 'arraste ≡ para mudar a ordem') : null), grp,
    h('div', { class:'dAcoes' },
      h('button', { class:'dAc', 'data-lay':'procNovoDoc', onclick:() => novoDocumento({ p }) }, h('span', { html:I.docplus }), 'Novo documento'),
      h('button', { class:'dAc', 'data-lay':'procAnexo', onclick:() => incluirNoProc(p, null) }, h('span', { html:I.clip }), 'Incluir anexo')));
  const repo = p.docs.filter(d => d.repo && !d.linha);
  if(repo.length) corpo.append(h('div', { class:'aSec repoSec' }, 'Só no repositório'), h('div', { class:'aGrp repoSec' }, repo.map(d => h('button', { class:'aRow', onclick:() => verDocSolto(d) }, h('span', { class:'tx' }, h('b', null, d.nome), h('span', null, d.kind === 'pdf' ? 'PDF' : 'Texto')), h('span', { class:'chev', html:I.chevR })))));
  v.replaceChildren(topo, h('div', { class:'scroll' }, corpo), pandaPg());
  aplicarLayUI();
  ajustarSplit();
  if(VIEW === 'proc' && typeof recontarLista === 'function') recontarLista(p);
  const ab = v.querySelector('.dRow.aberto'); if(ab) ab.scrollIntoView({ block:'nearest' });
}
/* documento aberto embaixo, lista em cima; tocar no rótulo do aberto fecha */
const emSplit = p => VIEW === 'mesa' && M.split && M.p === p;
function tocarDoc(p, d){
  if(!emSplit(p)) return abrirMesa(p, { doc:d.id });
  if(M.docAberto === d.id) return sairMesa();
  irParaDoc(d.id); marcarAberto(d.id);
}
function marcarAberto(id){
  if(M.docAberto === id && $('vProc').querySelector('.dRow.aberto[data-id="' + id + '"]')) return;
  M.docAberto = id;
  $('vProc').querySelectorAll('.dRow').forEach(r => r.classList.toggle('aberto', r.dataset.id === id));
  const ab = $('vProc').querySelector('.dRow.aberto'); if(ab) ab.scrollIntoView({ block:'nearest' });
  if(document.body.classList.contains('splitMin')) ajustarSplit();
}
function ajustarSplit(){
  const on = VIEW === 'mesa' && !!M.split;
  document.body.classList.toggle('split', on);
  if(!on){ document.body.classList.remove('splitMin'); return; }
  /* só a caixinha do documento aberto fica em cima; tocar nela fecha e volta à lista inteira */
  const min = true;
  document.body.classList.toggle('splitMin', min);
  const v = $('vProc');
  let alt;
  if(min){ const r = v.querySelector('.dRow.aberto'); alt = (r ? r.offsetHeight : 48) + 1; }
  else { const hd = v.querySelector('.pTopo'), w = v.querySelector('.wrap'); alt = Math.min((hd ? hd.offsetHeight : 56) + (w ? w.scrollHeight : 0) + 10, Math.round(window.innerHeight * 0.42)); }
  document.body.style.setProperty('--splitH', alt + 'px');
}
if(window.visualViewport) window.visualViewport.addEventListener('resize', () => { if(document.body.classList.contains('split')) ajustarSplit(); });
function menuProcTela(p, ancora){
  const fx = estaFixado(p);
  popMenu(ancora, [
    { t:'Novo documento', ic:'docplus', fn:() => novoDocumento({ p }) },
    { t:'Incluir anexo (PDF, foto, ZIP)', ic:'clip', fn:() => incluirNoProc(p, null) },
    { t:'Colar o inteiro teor', sub:'cada documento entra no lugar certo', ic:'paste', fn:() => textoPronto({ p, teor:true }) },
    SEQ[p.cat] ? { t:'Montar a sequência padrão', sub:p.cat === 'aditivos' ? 'documentos do aditivo, capas e anexos' : 'documentos da licitação, capas e anexos', ic:'layers', fn:async () => {
      if(temEsqueleto(p) && !await confirmar('Sequência padrão', 'Este processo já tem a sequência. Montar de novo acrescenta outra no fim.', 'Montar', false)) return;
      montarSequencia(p); renderProcTela(); toast('Sequência montada.'); } } : null,
    '-',
    { t:'Inteiro teor em PDF', sub:'o processo inteiro num PDF só', ic:'pdf', fn:() => inteiroTeorPdf(p) },
    ehLicAdt(p) ? { t:'Módulo pré-minuta', sub:'do 1º documento até o despacho pré-minuta', ic:'pdf', fn:() => preMinutaPdf(p) } : null,
    { t:'Ficha central', ic:'pen', fn:() => fichaSheet(p) },
    { t:'Relatório e prontuário', ic:'report', fn:() => abrirRel(p) },
    { t:'Registrar tramitação', ic:'route', fn:() => tramSheet(p) },
    { t:'Montar PDF para imprimir ou exportar', ic:'layers', fn:() => exportarProcesso(p) },
    '-',
    { t:'Mover para outra pasta', ic:'folder', fn:() => moverProcPasta(p) },
    { t:fx ? 'Desafixar do início' : 'Fixar no início', ic:'pin', fn:() => { fixar(p, !fx); saveDB(); toast(fx ? 'Desafixado.' : 'Fixado no início.'); } },
    { t:'Excluir processo', ic:'trash', danger:true, fn:() => excluirProc(p) }
  ], { chave:'procMais' });
}
async function moverProcPasta(p){
  const ops = Object.values(arvore().nos).filter(n => ehConteiner(n)).map(n => [n.id, caminhoNome(n.id), n.cod + (n.tipo === 'cat' ? ' · categoria' : '')]);
  const id = await escolher('Mover para qual pasta?', ops, lugarDoProc(p).id); if(!id) return;
  const n = noPorId(id);
  if(n.tipo === 'cat'){ p.pasta = null; p.cat = n.cat; } else { p.pasta = n.id; const c = catDoNo(n); if(c) p.cat = c; }
  touch(p); saveDB(); redesenharNav(); toast('Processo agora está em ' + n.nome + '.');
}
function incluirNoProc(p, anexoDe){
  escolherArquivos(async l => {
    const novos = await incluirArquivos(p, l, 'linha', anexoDe ? (p.docs.filter(x => x.pai === anexoDe.id).pop() || anexoDe).id : null);
    if(!novos.length) return;
    if(anexoDe){ novos.forEach(d => d.pai = anexoDe.id); ordenarAnexos(p); }
    touch(p); saveDB(true); renderProcTela(); if(emSplit(p)) renderMesa(true);
    toast(novos.length === 1 ? (anexoDe ? 'Anexo incluído.' : 'PDF incluído.') : novos.length + ' arquivos incluídos.');
  });
}
function menuDocTela(p, d, ancora){
  const re = () => { touch(p); saveDB(); renderProcTela(); if(emSplit(p)) renderMesa(true); };
  menu(d.nome, [
    { t:'Abrir', ic:'doc', fn:() => abrirMesa(p, { doc:d.id }) },
    { t:'Renomear', ic:'pen', fn:async () => { const n = await perguntar('Renomear', 'Nome do documento', d.nome); if(n){ d.nome = n; re(); } } },
    ehAnexoEm(p, d) ? null : { t:'Anexar arquivo a este documento', sub:'Entra como ' + ((numeracaoLinha(p)[d.id] || {}).n || '') + '.1, .2…', ic:'clip', fn:() => { anexosAbertos()[d.id] = true; incluirNoProc(p, d); } },
    ehAnexoEm(p, d) ? null : { t:'Nova caixinha de anexo', sub:'fica esperando o PDF', ic:'plus', fn:() => novaCaixinha(p, d) },
    d.pai ? { t:'Deixar de ser anexo', ic:'layers', fn:() => { d.pai = null; ordenarAnexos(p); re(); } }
      : { t:'Tornar anexo de outro documento', ic:'clip', fn:async () => { const ops = p.docs.filter(x => x.linha && x !== d && !x.pai).map(x => [x.id, x.nome]); if(!ops.length) return toast('Não há outro documento.'); const id = await escolher('Anexo de qual documento?', ops, null); if(!id) return; p.docs.filter(x => x.pai === d.id).forEach(x => x.pai = id); d.pai = id; ordenarAnexos(p); re(); } },
    { t:'Prévia do PDF', ic:'eye', fn:() => previaDoc(d, p) },
    { t:'Baixar PDF', ic:'dl', fn:() => baixarDoc(d, p) },
    '-',
    { t:'Excluir documento', ic:'trash', danger:true, fn:async () => {
      if(!await confirmar('Excluir documento', '“' + d.nome + '” será apagado deste processo.', 'Excluir', true)) return;
      voltarVaga(p, d);
      p.docs = p.docs.filter(x => x !== d && !(x.kind === 'vaga' && x.pai === d.id)); p.docs.forEach(x => { if(x.pai === d.id) x.pai = null; });
      if(d.kind === 'pdf' && !DB.procs.some(q => q.docs.some(x => x.fileId === d.fileId))) await apagarBytes(d.fileId);
      if(emSplit(p) && M.docAberto === d.id){ largarMesa(); mostrar('proc'); }
      touch(p); saveDB(true); renderProcTela(); if(emSplit(p)) renderMesa(true); toast('Documento excluído.'); } }
  ], ancora);
}
/* arrastar ≡ para subir ou descer (o principal leva os anexos junto) */
function irmaosDoc(p, d){ const linha = p.docs.filter(x => x.linha); return ehAnexoEm(p, d) ? linha.filter(x => x.pai === d.pai) : linha.filter(x => !ehAnexoEm(p, x)); }
function reordenarDoc(p, d, alvo){
  let i = irmaosDoc(p, d).indexOf(d); if(i < 0) return;
  while(i < alvo){ moverDocEm(p, d, 1); i++; }
  while(i > alvo){ moverDocEm(p, d, -1); i--; }
}
function ligarArrastoDoc(row, p, d){
  const grip = row.querySelector('.dGrip');
  let A = null;
  grip.addEventListener('pointerdown', ev => {
    ev.preventDefault(); ev.stopPropagation();
    try{ grip.setPointerCapture(ev.pointerId); }catch(e){}
    const irm = irmaosDoc(p, d), rows = irm.map(x => row.parentElement.querySelector('.dRow[data-id="' + x.id + '"]')).filter(Boolean);
    A = { y0:ev.clientY, rows, i0:irm.indexOf(d), alvo:irm.indexOf(d), linha:h('div', { class:'dLinha' }) };
    row.classList.add('dLift'); row.parentElement.classList.add('arrastando'); row.parentElement.append(A.linha);
    if(navigator.vibrate) try{ navigator.vibrate(10); }catch(e){}
  });
  grip.addEventListener('pointermove', ev => {
    if(!A) return; ev.preventDefault();
    const dy = ev.clientY - A.y0; row.style.transform = 'translateY(' + dy + 'px)';
    const outros = A.rows.filter(r => r !== row);
    let k = 0; outros.forEach(r => { const b = r.getBoundingClientRect(); if(ev.clientY > b.top + b.height / 2) k++; });
    A.alvo = k;
    const box = row.parentElement.getBoundingClientRect();
    const y = k < outros.length ? outros[k].getBoundingClientRect().top : (outros.length ? outros[k - 1].getBoundingClientRect().bottom : 0);
    A.linha.style.top = (y - box.top - 1) + 'px';
    A.linha.hidden = k === A.i0;
  });
  const fim = () => {
    if(!A) return; const a = A; A = null;
    row.classList.remove('dLift'); row.style.transform = ''; a.linha.remove(); if(row.parentElement) row.parentElement.classList.remove('arrastando');
    if(a.alvo !== a.i0){ if(emSplit(p)) salvarTudo(); reordenarDoc(p, d, a.alvo); touch(p); saveDB(); renderProcTela(); if(emSplit(p)) renderMesa(true); toast('Ordem mudada. As folhas foram renumeradas.', { ms:1600 }); }
  };
  grip.addEventListener('pointerup', fim); grip.addEventListener('pointercancel', fim);
}

/* ===== m_seq.js ===== */
/* =====================================================================
   Sequências padrão (licitação e aditivo), folhas-marcador (capas),
   caixinhas de anexo e o inteiro teor colado de uma vez
   ===================================================================== */

/* ---------- secretarias demandantes: cada uma tem a sua autoridade ---------- */
const SECRETARIAS_PADRAO = () => [
  { id:'seinfra', nome:'Secretaria Municipal de Infraestrutura e Defesa Civil', curto:'SEINFRA' },
  { id:'educacao', nome:'Secretaria Municipal de Educação', curto:'Educação' },
  { id:'saude', nome:'Secretaria Municipal de Saúde', curto:'Saúde' }
];
const secretarias = () => Array.isArray(settings.secretarias) && settings.secretarias.length ? settings.secretarias : SECRETARIAS_PADRAO();
const secretariaPorId = id => secretarias().find(s => s.id === id) || null;
const secretariaDoProc = p => secretariaPorId(p && p.ficha && p.ficha.secretaria) || secretariaPorId('seinfra') || secretarias()[0];
const autoridadeDaSec = id => (settings.signatarios || []).find(s => s.sec === id) || null;
function autoridadeDe(p){ const s = secretariaDoProc(p); return (s && autoridadeDaSec(s.id)) || autoridade(); }

/* signatário por apelido: autoridade (SEINFRA), demandante (da ficha), superintendente, nenhum, ou o nome */
function pessoaDoRef(ref, p){
  const r = norm(ref).trim();
  if(!r) return undefined;
  if(r === 'nenhum' || r === 'sem') return '__sem';
  if(r === 'autoridade' || r === 'secretario') return (autoridade() || {}).id || null;
  if(r === 'demandante') return (autoridadeDe(p) || {}).id || null;
  if(r === 'superintendente') return pessoaPorId('s2') ? 's2' : null;
  if(pessoaPorId(ref)) return ref;
  const achou = (settings.signatarios || []).find(s => norm(s.nome) === r) || (settings.signatarios || []).find(s => norm(s.nome).startsWith(r));
  return achou ? achou.id : null;
}

/* ---------- signatários da SEINFRA e das secretarias (versão 2) ---------- */
const SIG_V = 2;
function migrarSignatarios(){
  if((settings.sigV || 0) >= SIG_V) return false;
  const L = settings.signatarios = Array.isArray(settings.signatarios) ? settings.signatarios : [];
  for(const x of SETTINGS_PADRAO().signatarios){
    const ja = L.find(s => norm(s.nome) === norm(x.nome));
    if(ja){ ['reg', 'sec'].forEach(k => { if(x[k] && !ja[k]) ja[k] = x[k]; }); continue; }
    L.push(Object.assign({}, x, { id:L.some(s => s.id === x.id) ? uid() : x.id }));
  }
  const g = L.find(s => s.autoridade); if(g && !g.sec && !L.some(s => s.sec === 'seinfra')) g.sec = 'seinfra';
  ordenarSignatarios();
  if(!Array.isArray(settings.secretarias) || !settings.secretarias.length) settings.secretarias = SECRETARIAS_PADRAO();
  settings.sigV = SIG_V;
  return true;
}
function ordenarSignatarios(){ (settings.signatarios || []).sort((a, b) => norm(a.nome).localeCompare(norm(b.nome), 'pt-BR')); }

/* ---------- a sequência de cada tipo de processo ---------- */
const SEQ = {
  licitacoes: [
    { slot:'capa', capa:'CAPA', nome:'Capa', anexos:['Capa em PDF'] },
    { slot:'desp-ini', tipo:'desp', nome:'Despacho inicial', sig:'demandante', dica:'Despacho inicial da secretaria demandante. Se o pedido nasceu na SEINFRA, apague este documento.' },
    { slot:'dfd', tipo:'dfd', nome:'DFD', sig:'superintendente', anexos:['Planilha orçamentária preliminar sintética (POPS)', 'Outros documentos'] },
    { slot:'desp-dfd', tipo:'desp', nome:'Despacho: acolhe o DFD', sig:'autoridade', dica:'Recepciona e acolhe o DFD; designa o signatário do DFD como responsável pela elaboração do ETP; submete os autos à contabilidade para confirmação da disponibilidade orçamentária e, ato contínuo, determina a remessa à Secretaria Municipal de Infraestrutura e Defesa Civil de Ilhéus.' },
    { slot:'contabil', capa:'PARECER CONTÁBIL', nome:'Parecer contábil' },
    { slot:'etp', tipo:'etp', nome:'ETP', sig:'superintendente', anexos:['Matriz de riscos preliminar', 'Planilha orçamentária analítica'] },
    { slot:'pbtr', tipo:'pb', nome:'Projeto básico / Termo de referência', sig:'superintendente', anexos:['Planilha orçamentária consolidada', 'Memorial descritivo e especificações técnicas', 'Projetos técnicos', 'ART – Anotação de Responsabilidade Técnica', 'Critério de qualificação técnica', 'Matriz de riscos'] },
    { slot:'desp-etp', tipo:'desp', nome:'Despacho: acolhe o ETP e o PB/TR', sig:'autoridade', dica:'Acolhe o ETP e o Projeto básico/Termo de referência; confirma a disponibilidade orçamentária conforme Parecer Contábil acostado aos autos; encaminha à Diretoria do Núcleo de Licitações e Contratos da Secretaria de Gestão para elaboração da minuta.' },
    { slot:'minuta', capa:'MINUTA', nome:'Minuta' },
    { slot:'juridico', capa:'PARECER JURÍDICO', nome:'Parecer jurídico' },
    { slot:'nt-sup', tipo:'nt', nome:'Nota técnica suplementar', sig:'superintendente', anexos:['DFD definitivo', 'ETP definitivo', 'Projeto básico definitivo', 'Termo de referência definitivo'] },
    { slot:'aviso', capa:'AVISO DE PUBLICAÇÃO DA LICITAÇÃO', nome:'Aviso de publicação da licitação' },
    { slot:'edital', capa:'EDITAL DE LICITAÇÃO', nome:'Edital de licitação' },
    { slot:'nt-prop', tipo:'nt', nome:'Nota técnica de análise de proposta', sig:'superintendente' }
  ],
  aditivos: [
    { slot:'capa', capa:'CAPA', nome:'Capa', anexos:['Capa em PDF'] },
    { slot:'sol', tipo:'sol', nome:'Solicitação de demanda', sig:'superintendente' },
    { slot:'nt', tipo:'nt', nome:'Nota técnica', sig:'superintendente', anexos:['Planilha do aditivo'] },
    { slot:'decl', tipo:'decl', nome:'Pesquisa de preço (declaração de vantajosidade)', sig:'superintendente', anexos:['Planilha de pesquisa de preço'] },
    { slot:'contratuais', capa:'DOCUMENTOS CONTRATUAIS', nome:'Documentos contratuais', anexos:['Documentos contratuais'] },
    { slot:'contratada', capa:'DOCUMENTOS DA CONTRATADA', nome:'Documentos da contratada', anexos:['Documentos da contratada'] },
    { slot:'desp-aut', tipo:'desp', nome:'Despacho: acolhe a nota técnica', sig:'autoridade', dica:'Acolhe a nota técnica e encaminha à Secretaria de Gestão para elaboração da minuta do termo aditivo, com posterior encaminhamento para parecer contábil e parecer jurídico.' },
    { slot:'minuta', capa:'MINUTA', nome:'Minuta', anexos:['Minuta do termo aditivo'] },
    { slot:'contabil', capa:'PARECER CONTÁBIL', nome:'Parecer contábil' },
    { slot:'juridico', capa:'PARECER JURÍDICO', nome:'Parecer jurídico' }
  ]
};
/* anexos de fábrica quando o documento entra fora da sequência */
const ANEXOS_TIPO = {
  dfd:['Planilha orçamentária preliminar sintética (POPS)', 'Outros documentos'],
  etp:['Matriz de riscos preliminar', 'Planilha orçamentária analítica'],
  pb:['Planilha orçamentária consolidada', 'Memorial descritivo e especificações técnicas', 'Projetos técnicos', 'ART – Anotação de Responsabilidade Técnica', 'Critério de qualificação técnica', 'Matriz de riscos'],
  decl:['Planilha de pesquisa de preço']
};
ANEXOS_TIPO.tr = ANEXOS_TIPO.pb;
const TITULO_TIPO = { desp:'DESPACHO', dfd:'DOCUMENTO DE FORMALIZAÇÃO DE DEMANDA', etp:'ESTUDO TÉCNICO PRELIMINAR', pb:'PROJETO BÁSICO', tr:'TERMO DE REFERÊNCIA', nt:'NOTA TÉCNICA', sol:'SOLICITAÇÃO DE DEMANDA', decl:'DECLARAÇÃO DE VANTAJOSIDADE' };
const PCA_NAO_CONSTA = 'Foi verificado que a presente contratação não consta da versão atual do Plano de Contratações Anual (PCA), de modo que se solicita ao Setor de Contabilidade a análise da disponibilidade orçamentária.';

/* ---------- folha-marcador (capa): brasão e só o título no meio da folha ---------- */
const htmlCapa = t => '<h1 class="capa">' + esc(String(t || '').toLocaleUpperCase('pt-BR')) + '</h1>';
function novaCapa(titulo, nome, extra){
  return Object.assign({ id:uid(), kind:'texto', nome:nome || nomeBonito(titulo), tipo:'capa', modelo:'capa', sig:novoSig(null, { sem:true }), html:htmlCapa(titulo),
    bras:'todas', linha:true, repo:false, criado:Date.now(), mpi:true }, extra || {});
}
/* caixinha de anexo vazia: não ocupa folha; tocar nela anexa o PDF no lugar dela */
const novaVaga = (pai, nome) => ({ id:uid(), kind:'vaga', nome, pai:pai.id, linha:false, repo:false, criado:Date.now() });

/* texto de partida de cada documento da sequência */
function esqueletoTexto(it){
  const t = TITULO_TIPO[it.tipo] || String(it.nome || '').toLocaleUpperCase('pt-BR');
  const L = ['# ' + t, '= PROCESSO ADMINISTRATIVO Nº {{processo}}'];
  if(it.tipo === 'dfd'){ L.push('[Cole o texto do DFD ou escreva aqui.]', '## Plano de Contratações Anual', '{{pca}}'); }
  else L.push('[' + (it.dica || 'Cole o texto ou escreva aqui.') + ']');
  return L.join('\n');
}
/* texto puro sem os dados da ficha: serve para saber se o documento ainda está como nasceu */
function textoBase(html){
  const b = document.createElement('div'); b.innerHTML = html || '';
  b.querySelectorAll('.fc').forEach(x => x.remove());
  return b.textContent.replace(/\s+/g, ' ').trim();
}
const estaVazio = d => !!(d.slot && d.base != null && textoBase(d.html) === d.base);

function docDoItem(p, it){
  if(it.capa) return novaCapa(it.capa, it.nome, { slot:it.slot, slotTipo:'capa' });
  const pes = pessoaDoRef(it.sig, p);
  const html = tplParaHTML(esqueletoTexto(it), p);
  return { id:uid(), kind:'texto', nome:it.nome, tipo:it.tipo, modelo:'livre', sig:novoSig(pes && pes !== '__sem' ? pes : null), html,
    bras:settings.brasTexto || 'todas', linha:true, repo:false, criado:Date.now(), mpi:true, slot:it.slot, slotTipo:it.tipo, base:textoBase(html) };
}
function montarSequencia(p, cat){
  const seq = SEQ[cat || p.cat]; if(!seq) return 0;
  for(const it of seq){
    const d = docDoItem(p, it); p.docs.push(d);
    (it.anexos || []).forEach(a => p.docs.push(novaVaga(d, a)));
  }
  ordenarAnexos(p); touch(p); saveDB(true);
  return seq.length;
}
const temEsqueleto = p => !!(p && p.docs.some(d => d.slot));

/* ---------- inteiro teor: separar os documentos de um texto colado ---------- */
const TITULOS_DOC = [
  [/^despacho/, 'desp'], [/^(documento de formalizacao|dfd\b)/, 'dfd'], [/^(estudo tecnico preliminar|etp\b)/, 'etp'],
  [/^projeto basico/, 'pb'], [/^termo de referencia/, 'tr'], [/^nota tecnica/, 'nt'], [/^comunicacao interna/, 'ci'], [/^oficio\b/, 'of'],
  [/^solicitacao de demanda/, 'sol'], [/^(declaracao de vantajosidade|pesquisa de preco)/, 'decl'], [/^portaria/, 'livre'],
  [/^(capa\b|parecer contabil|parecer juridico|minuta\b|aviso de (publicacao|licitacao)|edital\b|documentos contratuais|documentos da contratada|anexo\b)/, 'capa']
];
function tipoDoTitulo(t){
  const n = norm(String(t || '').replace(/^#\s+/, '').replace(/\*\*/g, '')).replace(/\s+/g, ' ').trim();
  for(const [rx, tp] of TITULOS_DOC) if(rx.test(n)) return tp;
  return null;
}
const CAPA_CHAVES = ['capa', 'contabil', 'juridico', 'minuta', 'aviso', 'edital', 'contratuais', 'contratada'];
const capaChave = t => { const n = norm(t); return CAPA_CHAVES.find(k => n.includes(k)) || n.trim(); };
function ehLinhaTitulo(l){
  const t = l.trim();
  if(!t || t.startsWith('## ') || t.length > 140) return false;
  if(t.startsWith('# ')) return true;
  const letras = t.replace(/[^A-Za-zÀ-ÿ]/g, '');
  return letras.length >= 3 && t === t.toLocaleUpperCase('pt-BR');
}
const SIGLAS = ['DFD', 'ETP', 'TR', 'PB', 'NT', 'POPS', 'SEINFRA', 'ART', 'PCA', 'CI', 'PMI', 'P.M.I.'];
function nomeBonito(s){
  s = String(s || '').replace(/^#\s+/, '').replace(/\*\*/g, '').trim();
  if(!s) return 'Documento';
  if(s !== s.toLocaleUpperCase('pt-BR')) return s;
  const baixo = s.toLocaleLowerCase('pt-BR');
  return baixo.split(' ').map((w, i) => { const up = w.toLocaleUpperCase('pt-BR'); if(SIGLAS.includes(up.replace(/[(),.:;]/g, ''))) return up; return i === 0 ? w.charAt(0).toLocaleUpperCase('pt-BR') + w.slice(1) : w; }).join(' ');
}
/* fecho solto no fim (Ilhéus, data / nome / cargo): sai do texto e vira o signatário */
function tirarFechoLinhas(linhas){
  const idx = []; linhas.forEach((l, i) => { if(l.trim()) idx.push(i); });
  const ult = idx.slice(-5);
  for(let k = ult.length - 1; k >= 0; k--){
    const i = ult[k], t = norm(linhas[i].replace(/\*\*/g, '')).trim();
    const pes = (settings.signatarios || []).find(s => norm(s.nome) === t);
    if(!pes) continue;
    let ini = i;
    const ant = ult[k - 1] != null ? ult[k - 1] : -1;
    if(ant >= 0 && /^ilh[eé]us\b|data da assinatura/i.test(linhas[ant].trim())) ini = ant;
    return { linhas:linhas.slice(0, ini), pessoa:pes.id };
  }
  /* "Ilhéus, …" seguido de até 3 linhas curtas (nome, cargo, registro): fecho de alguém fora do cadastro */
  const LOCAL = /^ilh[eé]us,?\s.*(data da assinatura( eletr[oô]nica)?|\d{4})[^A-Za-zÀ-ÿ]*$/i;
  for(let k = ult.length - 1; k >= 0 && k >= ult.length - 4; k--){
    const i = ult[k];
    if(!LOCAL.test(linhas[i].replace(/\*\*|_/g, '').trim())) continue;
    const depois = ult.slice(k + 1).map(j => linhas[j].replace(/\*\*/g, '').trim());
    if(depois.some(t => t.length > 90)) break;
    return { linhas:linhas.slice(0, i), pessoa:undefined, novo:pessoaSolta(depois) };
  }
  return { linhas, pessoa:undefined };
}
/* nome e cargo soltos no fim → signatário novo (só se parecer um nome de verdade) */
function pessoaSolta(l){
  const nome = (l[0] || '').replace(/[.;,]$/, '').trim();
  if(!nome || /\d|\[|signat[aá]rio|assinatura|^nome\b/i.test(nome) || nome.split(/\s+/).length < 2 || nome.length > 70) return null;
  const reg = l.slice(1).find(t => /\b(CREA|CAU|OAB|CRC|matr[ií]cula)\b/i.test(t)) || '';
  const cargo = l.slice(1).find(t => t !== reg) || '';
  return { nome:titleCase(nome), cargo:cargo.replace(/[.;]$/, ''), reg };
}
function dividirTeor(texto){
  const L = String(texto || '').replace(/\r/g, '').split('\n');
  const temSep = L.some(l => /^\s*={3,}\s*DOCUMENTO\s*:/i.test(l));
  const partes = []; let cur = null;
  const abre = (nome, sep) => { cur = { nome:nome || '', linhas:[], sep:!!sep }; partes.push(cur); };
  const cheias = c => c.linhas.filter(x => x.trim()).length;
  for(const l of L){
    const m = /^\s*={3,}\s*DOCUMENTO\s*:\s*(.*?)\s*=*\s*$/i.exec(l);
    if(m){ abre(m[1], true); continue; }
    if(!temSep && ehLinhaTitulo(l) && tipoDoTitulo(l)){
      const prim = cur && cur.linhas.find(x => x.trim());
      if(!cur || cheias(cur) >= 2 || (prim && tipoDoTitulo(prim) === 'capa') || !prim) abre('', false);
    }
    if(!cur){ if(!l.trim()) continue; abre('', false); }
    cur.linhas.push(l);
  }
  return partes.map(parteFinal).filter(Boolean);
}
function parteFinal(pt){
  let ref;
  let linhas = pt.linhas.filter(l => { const m = /^\s*@signat[aá]rio\s*:\s*(.+)$/i.exec(l); if(m){ ref = m[1].trim(); return false; } return true; });
  while(linhas.length && !linhas[0].trim()) linhas.shift();
  while(linhas.length && !linhas[linhas.length - 1].trim()) linhas.pop();
  if(!linhas.length && !pt.nome) return null;
  const fecho = tirarFechoLinhas(linhas); linhas = fecho.linhas;
  const cheias = linhas.filter(l => l.trim());
  const titulo = (cheias[0] || pt.nome || '').replace(/^#\s+/, '').replace(/\*\*/g, '').trim();
  let tipo = tipoDoTitulo(pt.nome) || tipoDoTitulo(titulo) || 'livre';
  const capa = tipo === 'capa' && cheias.length <= 1;
  if(tipo === 'capa' && !capa) tipo = 'livre';
  let pessoa = fecho.pessoa;
  if(ref){ const r = pessoaDoRef(ref, null); if(r !== undefined) pessoa = r; }
  return { nome:pt.nome ? nomeBonito(pt.nome) : ({ dfd:'DFD', etp:'ETP' }[tipo] || nomeBonito(titulo)), titulo:titulo || pt.nome, tipo, capa, texto:linhas.join('\n'), pessoa, ref:ref || null, novo:pessoa === undefined ? fecho.novo || null : null };
}
function htmlDaParte(pt, p){
  if(pt.capa) return htmlCapa(pt.titulo || pt.nome);
  const pronto = htmlDoTexto(pt.texto); if(pronto) return pronto;
  if(/^\s*(# |## |= |\| |> )/m.test(pt.texto)) return tplParaHTML(pt.texto, p);
  return tplParaHTML(mpiParaLinhas(pt.texto), p);
}
function pessoaPadrao(tipo, p){
  if(tipo === 'capa' || tipo === 'anexo') return '__sem';
  if(tipo === 'desp') return (autoridade() || {}).id || null;
  if(['dfd', 'etp', 'pb', 'tr', 'nt', 'sol', 'decl'].includes(tipo)) return pessoaPorId('s2') ? 's2' : null;
  const m = modelos().find(x => x.tipo === tipo);
  return m ? sigDoModelo(m).pessoa : null;
}

/* ---------- encaixar os documentos colados na sequência do processo ---------- */
const PISTAS = {
  'desp-ini':[/despacho inicial/, /secretaria demandante|encaminh\w* (a|à|para a) (secretaria municipal de infraestrutura|seinfra)/],
  'desp-dfd':[/formalizacao d[ae] demanda|\bdfd\b/, /designa|responsavel pela elaboracao/, /disponibilidade orcamentaria|contabil/],
  'desp-etp':[/estudo tecnico preliminar|\betp\b/, /minuta/, /nucleo de licitac|secretaria de gestao/],
  'desp-aut':[/nota tecnica/, /minuta|termo aditivo/],
  'nt-sup':[/suplementar/], 'nt-prop':[/proposta/], 'nt':[/aditivo|pedido/]
};
function combina(d, pt){
  const st = d.slotTipo || d.tipo;
  if(st === 'capa') return !!pt.capa && capaChave(d.nome) === capaChave(pt.titulo || pt.nome);
  if(pt.capa) return false;
  if(st === 'pb') return pt.tipo === 'pb' || pt.tipo === 'tr';
  return st === pt.tipo;
}
function preencher(d, pt, p, sigManual){
  if(pt.capa){ return; }
  d.html = htmlDaParte(pt, p); d.pags = null; d.base = null;
  if(d.slotTipo === 'pb'){ d.tipo = pt.tipo; d.nome = pt.tipo === 'tr' ? 'Termo de referência' : 'Projeto básico'; }
  const pes = sigManual !== undefined ? sigManual : pt.pessoa;
  if(pes !== undefined){ d.sig = d.sig || novoSig(null); d.sig.sem = pes === '__sem'; d.sig.pessoa = pes && pes !== '__sem' ? pes : null; }
}
function docDaParte(pt, p, sigManual){
  const pes = sigManual !== undefined ? sigManual : pt.pessoa !== undefined ? pt.pessoa : pessoaPadrao(pt.tipo, p);
  if(pt.capa) return novaCapa(pt.titulo || pt.nome, pt.nome);
  return { id:uid(), kind:'texto', nome:pt.nome, tipo:pt.tipo, modelo:'livre', sig:novoSig(pes && pes !== '__sem' ? pes : null, { sem:pes === '__sem', vinculo:!!(p && !p.avulsa && !p.avdoc) }),
    html:htmlDaParte(pt, p), bras:settings.brasTexto || 'todas', linha:true, repo:false, criado:Date.now(), mpi:true };
}
/* põe o documento logo antes de "antesDe" (ou no fim) */
function inserirAntes(p, d, antesDe){
  const i = antesDe ? p.docs.indexOf(antesDe) : -1;
  if(i >= 0) p.docs.splice(i, 0, d); else p.docs.push(d);
}
/* partes: resultado de dividirTeor · o.depois: id do documento depois do qual começam · o.sig: signatário escolhido na tela (só para 1 documento) */
function encaixarTeor(p, partes, o){
  o = o || {};
  const out = [];
  /* com a mesa aberta neste processo: grava a digitação antes e, no fim, redesenha a mesa;
     senão o corpo velho da tela voltava por cima do texto encaixado (defeito da v5) */
  const naMesa = VIEW === 'mesa' && M.p === p && pagesEl.dataset.proc === p.id;
  if(naMesa) salvarTudo();
  const principais = () => p.docs.filter(d => d.linha && !(d.pai && p.docs.some(y => y.id === d.pai && y.linha)));
  /* ptr = de onde procurar a vaga da sequência; ins = onde entra o documento que não tem vaga
     (com documento aberto: logo depois dele, mesmo com a sequência montada — antes ia parar antes da Capa) */
  let ptr = 0, ultimo = null, ins = null;
  if(o.depois){ const L = principais(), a = p.docs.find(x => x.id === o.depois); const pai = a && a.pai ? p.docs.find(x => x.id === a.pai) : a; const i = L.indexOf(pai); if(i >= 0){ ins = i + 1; if(!temEsqueleto(p)){ ptr = i + 1; ultimo = pai; } } }
  for(const pt of partes){
    if(pt.ref){ const r = pessoaDoRef(pt.ref, p); if(r !== undefined) pt.pessoa = r; }
    if(pt.pessoa === undefined && pt.novo) pt.pessoa = garantirSignatario(pt.novo);
    const L = principais();
    const txt = norm(pt.texto.slice(0, 1500));
    let alvo = null, melhor = -1;
    if(temEsqueleto(p)){
      for(let k = ptr; k < L.length; k++){
        const d = L[k];
        if(!d.slot || !combina(d, pt)) continue;
        if(!(d.tipo === 'capa' || estaVazio(d))) continue;
        const nota = (PISTAS[d.slot] || []).reduce((a, rx) => a + (rx.test(txt) ? 1 : 0), 0);
        if(nota > melhor){ melhor = nota; alvo = d; }
        if(pt.capa) break;
      }
    }
    if(alvo){
      preencher(alvo, pt, p, partes.length === 1 ? o.sig : undefined);
      ptr = principais().indexOf(alvo) + 1; ins = ptr; ultimo = alvo; out.push({ d:alvo, novo:false });
      continue;
    }
    const d = docDaParte(pt, p, partes.length === 1 ? o.sig : undefined);
    const L2 = principais();
    const antesDe = L2[ins != null ? ins : ptr] || null;
    inserirAntes(p, d, antesDe);
    (ANEXOS_TIPO[d.tipo] || []).forEach(a => p.docs.push(novaVaga(d, a)));
    ordenarAnexos(p);
    ptr = principais().indexOf(d) + 1; ins = ptr; ultimo = d; out.push({ d, novo:true });
  }
  touch(p); saveDB(true);
  if(naMesa) renderMesa(true);
  return out;
}
function avisoEncaixe(res){
  const nov = res.filter(r => r.novo).length, enc = res.length - nov;
  const partes = [];
  if(enc) partes.push(plural(enc, 'documento entrou', 'documentos entraram') + ' no lugar da sequência');
  if(nov) partes.push(plural(nov, 'documento novo', 'documentos novos') + ' na ordem colada');
  return partes.join(' · ') + '.';
}
/* recalcula as folhas depois de montar (a diagramação real) */
async function depoisDeMontar(p, res){
  marcarUltimo(p);
  if(VIEW === 'proc' && NAVP.proc === p.id) renderProcTela(); else abrirProcTela(p);
  toast(avisoEncaixe(res), { ms:3200 });
  try{ if(window.PDFLib && await recontar(p, false) && VIEW === 'proc' && NAVP.proc === p.id) renderProcTela(); }catch(e){}
}

/* ---------- caixinhas de anexo ---------- */
const anexosAbertos = () => { DB.ui.anx = DB.ui.anx || {}; return DB.ui.anx; };
function alternarAnexos(p, d){ const A = anexosAbertos(); if(A[d.id]) delete A[d.id]; else A[d.id] = true; saveDB(); renderProcTela(); }
function preencherVaga(p, v){
  escolherArquivos(async l => {
    if(!p.docs.includes(v)) return;
    const novos = await incluirArquivos(p, l, 'linha', v.id);
    if(!novos.length) return;
    novos.forEach((d, i) => { d.pai = v.pai; d.nome = novos.length > 1 ? v.nome + ' (' + (i + 1) + ')' : v.nome; d.vagaNome = v.nome; });
    p.docs = p.docs.filter(x => x !== v); ordenarAnexos(p);
    touch(p); saveDB(true); renderProcTela(); if(emSplit(p)) renderMesa(true);
    toast('Anexado: ' + v.nome + '.');
  });
}
function menuVaga(p, v, ancora){
  menu(v.nome, [
    { t:'Anexar o PDF', ic:'clip', fn:() => preencherVaga(p, v) },
    { t:'Renomear a caixinha', ic:'pen', fn:async () => { const n = await perguntar('Renomear', 'Nome do anexo', v.nome); if(n){ v.nome = n; touch(p); saveDB(); renderProcTela(); } } },
    '-',
    { t:'Tirar esta caixinha', sub:'não vai ter este anexo', ic:'trash', danger:true, fn:() => { p.docs = p.docs.filter(x => x !== v); touch(p); saveDB(); renderProcTela(); } }
  ], ancora);
}
async function novaCaixinha(p, d){
  const n = await perguntar('Nova caixinha de anexo', 'Nome do anexo', '', 'Criar', { dica:'Ela fica esperando o PDF, embaixo de "' + d.nome + '".' });
  if(!n) return;
  const filhos = p.docs.filter(x => x.pai === d.id), ult = filhos[filhos.length - 1] || d;
  p.docs.splice(p.docs.indexOf(ult) + 1, 0, novaVaga(d, n));
  anexosAbertos()[d.id] = true; touch(p); saveDB(); renderProcTela();
}
/* apagou um anexo que veio de uma caixinha: a caixinha volta vazia */
function voltarVaga(p, d){
  if(!d.vagaNome || !d.pai || d.kind !== 'pdf') return;
  if(p.docs.some(x => x !== d && x.pai === d.pai && (x.vagaNome === d.vagaNome || (x.kind === 'vaga' && x.nome === d.vagaNome)))) return;
  const i = p.docs.indexOf(d); if(i < 0) return;
  p.docs.splice(i, 0, { id:uid(), kind:'vaga', nome:d.vagaNome, pai:d.pai, linha:false, repo:false, criado:Date.now() });
}

/* ---------- inteiro teor do processo num PDF só ---------- */
async function inteiroTeorPdf(p){
  if(!precisaLibs()) return;
  abrirMesa(p);
  const b = busy('Montando o inteiro teor…');
  try{
    await new Promise(r => setTimeout(r, 300));
    try{ await diagFila; }catch(e){}
    await new Promise(r => setTimeout(r, 150));
    try{ await diagFila; }catch(e){}
  } finally { b.end(); }
  entrarSelecao(true);
  exportarFolhas(folhasTela(), 'previa');
}

/* ---------- novo processo: ficha de abertura e como começar ---------- */
function aberturaSheet(o){
  o = o || {};
  const tipoIni = o.cat === 'aditivos' ? 'aditivos' : (!o.cat || o.cat === 'licitacoes') ? 'licitacoes' : 'outro';
  const st = { tipo:tipoIni, modalidade:'Concorrência Eletrônica', srp:false, sec:'seinfra' };
  const inp = (ph, extra) => h('input', Object.assign({ class:'abInp', placeholder:ph || '' }, extra || {}));
  const f = { num:inp('opcional', { inputmode:'text' }), contratada:inp('nome da empresa'), contrato:inp('000/2026'), licNum:inp('000/2026') };
  const obj = h('textarea', { class:'abObj', rows:2, placeholder:'Ex.: reforma da Escola Municipal …' });
  const seg = h('div', { class:'seg abSeg' });
  const grp = h('div', { class:'sgGrp abGrp' });
  const inicio = h('div');
  const linhaCampo = (rot, el) => h('label', { class:'sgRow abRow' }, h('span', null, rot), el);
  const val = (t, v, fn) => { const b = h('button', { class:'sgRow', onclick:() => fn(b) }, h('span', null, t), h('span', { class:'v' }, h('span', null, v), h('i', { html:I.chevD, style:{ display:'flex' } }))); return b; };
  const MODS_AB = ['Concorrência Eletrônica', 'Pregão Eletrônico', 'Dispensa de Licitação', 'Inexigibilidade', 'Adesão a Ata', 'Outra'];
  function escolherSec(b){
    popMenu(b, secretarias().map(s => ({ t:s.curto || s.nome, sub:(autoridadeDaSec(s.id) ? titleCase(autoridadeDaSec(s.id).nome) : 'sem autoridade definida'), on:st.sec === s.id, fn:() => { st.sec = s.id; pinta(); } }))
      .concat(['-', { t:'+ Incluir nova', cls:'novo', fn:() => incluirSecretaria(id => { st.sec = id; pinta(); }) }]));
  }
  function pinta(){
    seg.replaceChildren(...[['licitacoes', 'Licitação'], ['aditivos', 'Aditivo'], ['outro', 'Outro']].map(([k, t]) => h('button', { class:st.tipo === k ? 'on' : '', onclick:() => { st.tipo = k; pinta(); } }, t)));
    const sec = secretariaPorId(st.sec) || secretarias()[0];
    const rows = [linhaCampo('Nº do processo', f.num), h('div', { class:'sgRow abRow abObjRow' }, h('span', null, 'Objeto'), obj)];
    if(st.tipo === 'licitacoes'){
      rows.push(val('Modalidade', st.modalidade, b => popMenu(b, MODS_AB.map(m => ({ t:m, on:st.modalidade === m, fn:() => { st.modalidade = m; pinta(); } })))));
      const sw = h('span', { class:'sw' }, h('input', { type:'checkbox', checked:st.srp, onchange:e => { st.srp = e.target.checked; } }), h('i'));
      rows.push(h('label', { class:'sgRow' }, h('span', null, 'Registro de preços'), sw));
    }
    if(st.tipo === 'aditivos') rows.push(linhaCampo('Contratada', f.contratada), linhaCampo('Nº do contrato', f.contrato), linhaCampo('Nº da concorrência', f.licNum));
    if(st.tipo !== 'outro') rows.push(val('Secretaria demandante', sec ? sec.curto || sec.nome : '—', escolherSec));
    grp.replaceChildren(...rows);
    const opc = (ic, t, sub, fn, lay) => h('button', { class:'aRow abOp', 'data-lay':lay, onclick:() => { const q = criar(); if(!q) return; s.fechar(); setTimeout(() => fn(q), 40); } },
      h('span', { class:'abIc', html:I[ic] }), h('span', { class:'tx' }, h('b', null, t), h('span', null, sub)), h('span', { class:'chev', html:I.chevR }));
    const lista = [];
    if(st.tipo !== 'outro') lista.push(opc('layers', 'Sequência padrão', st.tipo === 'aditivos' ? 'Todos os documentos do aditivo, com capas e caixinhas de anexo' : 'Todos os documentos da licitação, com capas e caixinhas de anexo', q => { montarSequencia(q); abrirProcTela(q); toast('Sequência montada.'); }, 'abSeq'));
    lista.push(opc('paste', 'Texto pronto', st.tipo === 'outro' ? 'Colar os documentos; o app reconhece cada um' : 'Colar o inteiro teor ou os documentos; cada um entra no lugar certo', q => { if(st.tipo !== 'outro') montarSequencia(q); abrirProcTela(q); setTimeout(() => textoPronto({ p:q, teor:true }), 120); }, 'abTexto'));
    lista.push(opc('doc', 'Em branco', 'Só a ficha; os documentos entram depois', q => abrirProcTela(q), 'abVazio'));
    inicio.replaceChildren(h('div', { class:'aSec' }, 'Como começar'), h('div', { class:'aGrp' }, lista));
  }
  function criar(){
    const objeto = obj.value.trim();
    const cat = st.tipo === 'outro' ? (o.cat && o.cat !== 'licitacoes' && o.cat !== 'aditivos' ? o.cat : 'diversos') : st.tipo;
    const ficha = { extras:[], num:f.num.value.trim(), objeto, setor:settings.setor || '' };
    if(st.tipo === 'licitacoes'){ ficha.modalidade = st.modalidade; ficha.srp = st.srp ? 'Sim' : 'Não'; ficha.tipoObj = 'Licitação'; }
    if(st.tipo === 'aditivos'){ ficha.contratada = f.contratada.value.trim(); if(ficha.contratada){ const c = garantirContratada({ nome:ficha.contratada }); if(c){ ficha.cnpj = c.cnpj || ''; ficha.contratadaEnd = c.end || ''; ficha.contratadaResp = c.resp || ''; } } ficha.contrato = f.contrato.value.trim(); ficha.licNum = f.licNum.value.trim(); ficha.tipoObj = 'Aditivo'; }
    if(st.tipo !== 'outro') ficha.secretaria = st.sec;
    const n = o.pasta && noPorId(o.pasta), pasta = n && catDoNo(n) === cat ? o.pasta : null;
    const q = novoProc({ cat, status:'Em elaboração', fls0:1, ficha, pasta });
    DB.procs.push(q); marcarUltimo(q); saveDB(true);
    if(VIEW === 'home') renderHome(); else redesenharNav();
    return q;
  }
  pinta();
  const s = sheet({ titulo:'Novo processo', cheio:true, corpo:[seg, grp, h('p', { class:'sgNota' }, 'O resto da ficha fica no + do processo. O que você puser aqui já entra nos documentos.'), inicio] });
  setTimeout(() => obj.focus(), 150);
}
async function incluirSecretaria(depois){
  const nome = await perguntar('Nova secretaria', 'Nome', 'Secretaria Municipal de ', 'Continuar'); if(!nome) return;
  const pes = await escolher('Quem é a autoridade?', (settings.signatarios || []).map(x => [x.id, titleCase(x.nome), x.cargo]), null);
  const id = 'sec' + uid();
  const L = settings.secretarias = secretarias().slice();
  L.push({ id, nome, curto:nome.replace(/^secretaria (municipal )?(de |da |do )?/i, '') });
  const x = pes && pessoaPorId(pes); if(x) x.sec = id;
  saveSettings(); if(depois) depois(id);
}

/* ===== n_capsula.js ===== */
/* =====================================================================
   Etapa 2 (28/09): cápsula fechada e aberta, botão S com bolinhas,
   pandinho (seleção com o dedo e ímã), Copiar · Colar · Marca-texto com
   comentário, selo do documento inteiro, Página inteira, Desfazer e
   Novo documento em branco. Desenhos aprovados: manual-aprovado/01 a 07.
   ===================================================================== */

Object.assign(I, {
  chevUU:P_('<path d="M6 12.5l6-6 6 6"/><path d="M6 18.5l6-6 6 6"/>', ' stroke-width="2.1"'),
  todas:P_('<rect x="8" y="3" width="12" height="14" rx="2"/><path d="M5 7v11a3 3 0 0 0 3 3h8"/><path d="M11 10.2l2 2 3.8-4.2"/>'),
  pgInt:P_('<rect x="5.5" y="3" width="13" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h3.5"/>'),
  selo:P_('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/>')
});

/* ---------- Desfazer: fotos do processo antes de cada mudança ---------- */
const HIST = { pilhas:{}, ultT:0, max:30 };
function sincronizar(){
  if(!M.p || VIEW !== 'mesa' || pagesEl.dataset.proc !== M.p.id) return;
  pagesEl.querySelectorAll('.page.txt .body').forEach(b => { const d = docById(b.parentElement.dataset.doc); if(d) d.html = htmlDoBody(b); });
}
const histFoto = p => JSON.stringify({ docs:p.docs, carimbo:p.carimbo, numerar:p.numerar, fls0:p.fls0, ficha:p.ficha });
function histPush(rot){
  const p = M.p; if(!p) return;
  sincronizar();
  const L = HIST.pilhas[p.id] = HIST.pilhas[p.id] || [], f = histFoto(p);
  if(L.length && L[L.length - 1].f === f) return;
  L.push({ f, rot:rot || '' }); if(L.length > HIST.max) L.shift();
}
function desfazer(){
  const p = M.p; if(!p) return;
  const L = HIST.pilhas[p.id] || [];
  sincronizar();
  const agora = histFoto(p);
  while(L.length && L[L.length - 1].f === agora) L.pop();
  const u = L.pop();
  if(!u) return toast('Nada para desfazer.', { ms:1300 });
  const o = JSON.parse(u.f);
  for(const k in salvarT){ clearTimeout(salvarT[k]); salvarT[k] = 0; }
  for(const k in diagT) clearTimeout(diagT[k]);
  p.docs = o.docs; p.carimbo = o.carimbo; p.numerar = o.numerar; p.fls0 = o.fls0; if(o.ficha) p.ficha = o.ficha;
  touch(p); saveDB(true);
  fecharSelo(); esconderAcoes();
  renderMesa(true);
  if(M.split && typeof renderProcTela === 'function') renderProcTela();
  if(PGI.on) pgiMostrar();
  toast(u.rot ? 'Desfeito: ' + u.rot + '.' : 'Desfeito.', { ms:1400 });
}
/* digitação: uma foto no começo de cada rajada */
pagesEl.addEventListener('beforeinput', ev => {
  if(!ev.target.closest || !ev.target.closest('.body')) return;
  const t = Date.now(); if(t - HIST.ultT > 1500) histPush('digitação'); HIST.ultT = t;
}, true);

/* ---------- a cápsula ---------- */
const CAP = { aberta:false };
const CAP_ITENS = [['girar', 'Girar', 'rotL'], ['todas', 'Todas', 'todas'], ['pginteira', 'Pág. inteira', 'pgInt'], ['desfazer', 'Desfazer', 'undo'],
  ['novodoc', 'Novo doc.', 'docplus'], ['carimbar', 'Carimbar', 'selo'], ['numerar', 'Numerar', 'hash'], ['exportar', 'Exportar', 'share']];
(function montarCapsula(){
  const bot = $('aBot');
  const alca = h('button', { class:'capAlca', 'aria-label':'Fechar as ferramentas' }, h('i'));
  const grade = h('div', { class:'capGrade' }, alca, CAP_ITENS.map(([a, t, ic]) => h('button', { class:'capB' + (a === 'exportar' ? ' pri' : ''), dataset:{ cap:a }, 'aria-label':t }, h('span', { class:'bola', html:I[ic] }), h('small', null, t))));
  bot.prepend(grade);
  const ex = bot.querySelector('[data-a="expandir"]'); if(ex) ex.innerHTML = I.chevUU;
  const pi = bot.querySelector('[data-a="pginteira"]'); if(pi) pi.innerHTML = I.pgInt;
  bot.addEventListener('click', ev => {
    const b = ev.target.closest('button[data-cap]'); if(b){ if(!M.editing) capAcao(b.dataset.cap, b); return; }
    if(ev.target.closest('.capAlca')) capsula(false);
  });
  /* puxar a alcinha (ou a grade) para baixo fecha */
  let y0 = null;
  grade.addEventListener('pointerdown', ev => { y0 = ev.clientY; });
  grade.addEventListener('pointerup', ev => { if(y0 != null && ev.clientY - y0 > 28) capsula(false); y0 = null; });
})();
function capsula(on){
  CAP.aberta = !!on;
  $('aBot').classList.toggle('aberta', CAP.aberta);
  if(CAP.aberta){ fecharBolhasS(true); esconderAcoes(); pintarCapsula(); }
}
function pintarCapsula(){
  const car = M.p ? carimboAtual() : 'nenhum', num = M.p ? numerarAtual() : false;
  const set = (a, on) => { const b = $('aBot').querySelector('[data-cap="' + a + '"]'); if(b) b.classList.toggle('liga', !!on); };
  $('aBot').classList.toggle('mesaPdf', !!(M.p && M.p.avulsa));
  set('carimbar', car !== 'nenhum'); set('numerar', num); set('pginteira', PGI.on);
}
/* tocar no documento fecha a cápsula aberta */
docEl.addEventListener('click', () => { if(CAP.aberta) capsula(false); });
function capAcao(a, b){
  if(!M.p) return;
  switch(a){
    case 'girar': {
      const l = M.fsel && M.fsel.sel.size ? selecionadas() : [PGI.on ? PGI.lista[PGI.i] : folhaAtual()].filter(Boolean);
      return girarFolhas(l);
    }
    case 'todas': return capTodas();
    case 'pginteira': return pgInteira();
    case 'desfazer': return desfazer();
    case 'novodoc': return novoDocBranco();
    case 'carimbar': return menuCarimbo(b);
    case 'numerar': return numerarSheet();
    case 'exportar': return capExportar(b);
  }
}
function girarFolhas(l, g){
  l = (l || []).filter(Boolean);
  if(!l.length) return toast('Nenhuma folha na tela.');
  g = g == null ? 270 : g;   /* 1 toque = 90° para a esquerda */
  histPush('girar');
  l.forEach(f => {
    if(f.e){ f.e.r = (((f.e.r || 0) + g) % 360 + 360) % 360; return; }
    const d = f.d; d.rotF = d.rotF || {};
    const r = (((d.rotF[f.j] || 0) + g) % 360 + 360) % 360;
    if(r) d.rotF[f.j] = r; else delete d.rotF[f.j];
  });
  depoisDeMudar(l.length === 1 ? 'Folha ' + l[0].fl + ' girada.' : plural(l.length, 'folha girada', 'folhas giradas') + '.');
  if(PGI.on) pgiMostrar();
}
function capTodas(){
  const d = M.cur && M.cur.d;
  capsula(false); pgInteira(false);
  entrarSelecao(false, 'folhas');
  const ks = folhasTela().filter(f => !d || f.d === d || f.d.pai === d.id).map(f => f.key);
  marcarFolhas(ks, true);
}
function capExportar(b){
  if(M.p.avulsa) return enviarMesa(b);
  const d = M.cur && M.cur.d;
  if(d && typeof exportarDocSheet === 'function') return exportarDocSheet(d);
  compartilharSheet();
}
/* ◀ ▲ ▼ ▶ sem texto na tela (PDF) ou na Página inteira: andam de folha em folha */
function navFolha(a){
  const passo = a === 'esq' || a === 'cima' ? -1 : 1;
  if(PGI.on){ pgiIr(PGI.i + passo); return true; }
  const d = M.cur && M.cur.d;
  if(!curSel() && d && d.kind === 'pdf'){ acao(passo < 0 ? 'anterior' : 'proxima'); return true; }
  return false;
}
/* folha de texto girada: aviso discreto (a folha sai girada no PDF) */
function pintarGiros(d){
  const pg = paginaEl(d.id); if(!pg) return;
  pg.querySelectorAll('.giroV').forEach(x => x.remove());
  const R = d.rotF || {}; if(!Object.keys(R).length) return;
  const tops = [0].concat(Array.from(pg.querySelectorAll('.brk')).map(b => brkIni(b)));
  tops.forEach((t, j) => { if(R[j]) pg.append(h('span', { class:'giroV', style:{ top:(t + 6) + 'px' } }, h('i', { html:I.rotL }), 'girada ' + (360 - R[j]) + '° no PDF')); });
}

/* ---------- Página inteira (o "Ctrl+0"): a folha como sai no PDF ---------- */
const PGI = { on:false, i:0, lista:[], ger:0, el:null };
function pgInteira(on){
  if(on === undefined) on = !PGI.on;
  if(!on){
    if(!PGI.on) return;
    const f = PGI.lista[PGI.i];
    PGI.on = false; if(PGI.el) PGI.el.remove(); PGI.el = null;
    document.body.classList.remove('pgInt'); pintarCapsula();
    if(f) irParaFolha(f.fl);
    return;
  }
  if(!precisaLibs()) return;
  if(!temPdfjs()) return toast('O leitor de PDF ainda está carregando. Tente de novo em instantes.');
  salvarTudo(); capsula(false); fecharBolhasS(true); fecharSelo(); esconderAcoes(); fecharTeclado();
  PGI.lista = folhasTela(); if(!PGI.lista.length) return toast('Não há folhas neste processo.');
  const f = folhaAtual(); PGI.i = Math.max(0, PGI.lista.findIndex(x => f && x.key === f.key));
  PGI.on = true; document.body.classList.add('pgInt'); pintarCapsula();
  const r = docEl.getBoundingClientRect();
  const leg = h('div', { class:'pgiLeg' });
  const folha = h('div', { class:'pgiFolha' }, h('canvas'));
  PGI.el = h('div', { id:'pgIntV', style:{ top:r.top + 'px', height:r.height + 'px' } }, h('div', { class:'pgiArea' }, folha), leg);
  screenEl.append(PGI.el);
  let x0 = null, y0 = 0;
  PGI.el.addEventListener('pointerdown', ev => { x0 = ev.clientX; y0 = ev.clientY; });
  PGI.el.addEventListener('pointerup', ev => { if(x0 == null) return; const dx = ev.clientX - x0, dy = ev.clientY - y0; x0 = null; if(Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) pgiIr(PGI.i + (dx < 0 ? 1 : -1)); });
  pgiMostrar();
}
function pgiIr(i){
  if(i < 0) return toast('Primeira folha.', { ms:900 });
  if(i >= PGI.lista.length) return toast('Última folha.', { ms:900 });
  PGI.i = i; pgiMostrar();
}
async function pgiMostrar(){
  if(!PGI.on || !PGI.el) return;
  const antiga = PGI.lista[PGI.i];
  PGI.lista = folhasTela();
  if(antiga){ const k = PGI.lista.findIndex(x => x.key === antiga.key); if(k >= 0) PGI.i = k; }
  PGI.i = Math.min(PGI.i, PGI.lista.length - 1);
  const f = PGI.lista[PGI.i]; if(!f) return;
  const g = ++PGI.ger, leg = PGI.el.querySelector('.pgiLeg'), area = PGI.el.querySelector('.pgiArea'), folha = PGI.el.querySelector('.pgiFolha'), cv = folha.querySelector('canvas');
  const ult = PGI.lista[PGI.lista.length - 1];
  leg.textContent = 'folha ' + f.fl + ' de ' + ult.fl + ' · deslize para os lados';
  folha.classList.add('carregando');
  try{
    const bytes = await pdfDasFolhas([f], Object.assign({ titulo:'' }, optCarimbo()));
    if(g !== PGI.ger) return;
    const pdf = await pdfjsLib.getDocument(Object.assign({ data:bytes, isEvalSupported:false }, window.PDFJS_OPTS || {})).promise;
    const pg = await pdf.getPage(1), v = pg.getViewport({ scale:1 });
    const W = area.clientWidth - 40, H = area.clientHeight - 16, k = Math.min(W / v.width, H / v.height);
    if(g !== PGI.ger) return;
    folha.style.width = Math.round(v.width * k) + 'px'; folha.style.height = Math.round(v.height * k) + 'px';
    await desenharPaginaPdf(cv, pdf, { s:0, r:0 }, Math.round(v.width * k));
    try{ pdf.destroy(); }catch(e){}
  }catch(e){ console.warn('página inteira', e); if(g === PGI.ger) leg.textContent = 'Não consegui mostrar esta folha.'; }
  if(g === PGI.ger) folha.classList.remove('carregando');
}

/* ---------- botão S: as bolinhas de seleção ---------- */
const SB = { aberto:false, modo:null, n:0, ini:0, fim:0, c:0, body:null, el:null };
const SB_ITENS = [['a', 'a', 'Palavra'], ['S', 'S', 'Sentença'], ['P', '¶', 'Parágrafo'], ['i', 'i', 'Inteiro teor']];
const SELX = { nossa:false };
function inicioSentenca(S, c){
  let k = c - 1;
  if(k >= 0 && fimDeFrase(S, k)) k--;   /* cursor logo depois do ponto: é a frase que acabou ali */
  for(; k >= 0; k--) if(S[k] === '\n' || fimDeFrase(S, k)) break;
  let st = k + 1; while(st < S.length && ESP(S[st]) && S[st] !== '\n') st++;
  return st;
}
const PONT_FIM = /[.,;:!?…)\]"”'»]/, PONT_INI = /[("“'«\[]/;
function palavraEm(S, c){
  const L = S.length; let i = c;
  if(i >= L || ESP(S[i])){ while(i < L && ESP(S[i])) i++; if(i >= L){ i = c; while(i > 0 && ESP(S[i - 1])) i--; i = Math.max(0, i - 1); } }
  let a = i; while(a > 0 && !ESP(S[a - 1])) a--;
  let b = i; while(b < L && !ESP(S[b])) b++;
  while(a < b && PONT_INI.test(S[a])) a++;
  while(b > a && PONT_FIM.test(S[b - 1])) b--;
  return [a, b];
}
function proxPalavra(S, fim){
  const L = S.length; let i = fim;
  while(i < L && !ESP(S[i])) i++;          /* resto da pontuação colada */
  while(i < L && ESP(S[i])) i++;
  if(i >= L) return fim;
  let b = i; while(b < L && !ESP(S[b])) b++;
  while(b > i && PONT_FIM.test(S[b - 1])) b--;
  return b;
}
function paragrafoEm(S, c){ const a = S.lastIndexOf('\n', c - 1) + 1; let b = S.indexOf('\n', c); if(b < 0) b = S.length; return [a, b]; }
function aplicarSel(MT, a, b){
  const body = MT.body, A = domDePos(MT, a), B = domDePos(MT, b);
  if(document.activeElement !== body){ body.setAttribute('inputmode', TEC.digitando ? 'text' : 'none'); body.focus({ preventScroll:true }); }
  try{ window.getSelection().setBaseAndExtent(A.node, A.off, B.node, B.off); }catch(e){}
  SELX.nossa = true;
  /* o fim da seleção precisa ficar à vista, acima das bolinhas */
  try{
    const r = document.createRange(); r.setStart(B.node, B.off); r.collapse(true);
    const rc = r.getClientRects()[0] || (B.node.nodeType === 1 ? B.node : B.node.parentElement).getBoundingClientRect(), d = docEl.getBoundingClientRect();
    const baixo = SB.aberto ? d.top + d.height * 0.45 : d.bottom - 90;
    if(rc.bottom > baixo) docEl.scrollTop += rc.bottom - baixo; else if(rc.top < d.top + 30) docEl.scrollTop -= d.top + 30 - rc.top;
  }catch(e){}
}
function abrirBolhasS(btn){
  if(SB.aberto) return fecharBolhasS();
  capsula(false); fecharSelo(); esconderAcoes(); pgInteira(false);
  let s = curSel(); if(!s) s = cursorNaTela();
  if(!s){ const d = M.cur && M.cur.d; return toast(d && d.kind === 'pdf' ? 'Nesta folha de PDF ainda não dá para selecionar o texto.' : 'Toque no texto primeiro.'); }
  const body = curBody(); if(!body) return toast('Toque no texto primeiro.');
  const MT = mapaTexto(body), r = s.getRangeAt(0);
  SB.body = body; SB.modo = null; SB.n = 0; SB.c = posDeDom(MT, r.startContainer, r.startOffset);
  SB.aberto = true;
  const rb = btn.getBoundingClientRect();
  const veu = h('div', { class:'sVeu' });
  const col = h('div', { class:'sCol', style:{ left:(rb.left + rb.width / 2 - 28) + 'px', bottom:(window.innerHeight - rb.top + 16) + 'px' } },
    SB_ITENS.map(([k, letra, rot]) => h('div', { class:'sLin', dataset:{ k } }, h('button', { class:'sBol' + (k === 'i' ? ' it' : ''), dataset:{ k }, 'aria-label':rot }, letra), h('span', { class:'sRot' }, rot), h('b', { class:'sVez', hidden:true }))));
  const sAz = h('button', { class:'sAz', style:{ left:(rb.left + rb.width / 2 - 26) + 'px', top:(rb.top + rb.height / 2 - 26) + 'px' }, 'aria-label':'Fechar as bolinhas' }, 'S');
  SB.el = h('div', { id:'sCamada' }, veu, col, sAz);
  SB.el.addEventListener('pointerdown', ev => ev.preventDefault());   /* não tira o foco do texto */
  SB.el.addEventListener('mousedown', ev => ev.preventDefault());
  SB.el.addEventListener('click', ev => {
    const b = ev.target.closest('.sBol'); if(b) return tocarBolha(b.dataset.k);
    fecharBolhasS();
  });
  document.body.append(SB.el);
  document.body.classList.add('sAberto');
}
function tocarBolha(k){
  const body = SB.body; if(!body || !body.isConnected) return fecharBolhasS(true);
  const MT = mapaTexto(body), S = MT.str, L = S.length;
  if(k === 'i'){ SB.modo = 'i'; SB.n = 1; SB.ini = 0; SB.fim = L; }
  else if(k !== SB.modo){
    SB.modo = k; SB.n = 1;
    const c = Math.min(SB.c, L);
    if(k === 'a') [SB.ini, SB.fim] = palavraEm(S, c);
    else if(k === 'S'){ SB.ini = inicioSentenca(S, c); SB.fim = fimDaFrase(S, SB.ini); }
    else [SB.ini, SB.fim] = paragrafoEm(S, c);
  } else {
    let nf = SB.fim;
    if(k === 'a') nf = proxPalavra(S, SB.fim);
    else if(k === 'S'){ let i = SB.fim; while(i < L && (ESP(S[i]))) i++; nf = i < L ? fimDaFrase(S, i) : SB.fim; }
    else { let i = SB.fim; if(S[i] === '\n') i++; if(i < L){ const b = S.indexOf('\n', i); nf = b < 0 ? L : b; } }
    if(nf <= SB.fim) return toast('Fim do documento.', { ms:1000 });
    SB.fim = nf; SB.n++;
  }
  while(SB.fim > SB.ini && ESP(S[SB.fim - 1])) SB.fim--;
  aplicarSel(MT, SB.ini, SB.fim);
  SB.el.querySelectorAll('.sLin').forEach(l => {
    const on = l.dataset.k === SB.modo;
    l.querySelector('.sBol').classList.toggle('on', on);
    const v = l.querySelector('.sVez'); v.hidden = !(on && SB.n > 1); v.textContent = '×' + SB.n;
  });
}
function fecharBolhasS(silencioso){
  if(!SB.aberto) return;
  SB.aberto = false; if(SB.el) SB.el.remove(); SB.el = null;
  document.body.classList.remove('sAberto');
  if(!silencioso) setTimeout(mostrarAcoes, 30);
}

/* ---------- pandinho: tocar na bolinha vermelha do cursor e arrastar ---------- */
let DRAG = null;
function pandinhoEl(){ let p = $('pandinho'); if(!p){ p = h('div', { id:'pandinho', hidden:true }, h('img', { src:PANDA_SRC, alt:'' })); document.body.append(p); } return p; }
function travaEl(){ let t = $('travaAqui'); if(!t){ t = h('div', { id:'travaAqui', hidden:true }, h('i'), h('span', null, 'trava aqui')); document.body.append(t); } return t; }
/* o ímã: gruda no fim (ou começo) da sentença quando o dedo passa perto; senão, na palavra inteira */
function ima(S, pos, dir){
  const L = S.length;
  if(dir > 0){
    let melhor = null;
    for(let k = Math.max(0, pos - 7); k < Math.min(L, pos + 6); k++){
      if(S[k] === '\n' || fimDeFrase(S, k)){ let e = S[k] === '\n' ? k : k + 1; while(e < L && /["”')\]]/.test(S[e])) e++; if(melhor == null || Math.abs(e - pos) < Math.abs(melhor - pos)) melhor = e; }
    }
    if(melhor != null) return { pos:melhor, trava:true };
    let i = pos;
    if(i > 0 && !ESP(S[i - 1])) while(i < L && !ESP(S[i])) i++;
    else while(i > 0 && ESP(S[i - 1])) i--;
    return { pos:i, trava:false };
  }
  let melhor = null;
  for(let k = Math.max(0, pos - 8); k < Math.min(L, pos + 6); k++){
    if(k === 0 || S[k - 1] === '\n' || (k > 1 && ESP(S[k - 1]) && fimDeFrase(S, k - 2))){ if(ESP(S[k])) continue; if(melhor == null || Math.abs(k - pos) < Math.abs(melhor - pos)) melhor = k; }
  }
  if(melhor != null) return { pos:melhor, trava:true };
  let i = pos; while(i > 0 && !ESP(S[i - 1])) i--;
  return { pos:i, trava:false };
}
function ligarBola(bola){
  if(bola._ligada) return; bola._ligada = true;
  bola.addEventListener('pointerdown', ev => {
    ev.preventDefault(); ev.stopPropagation();
    const s = window.getSelection(), body = curBody(); if(!s || !s.rangeCount || !body) return;
    const MT = mapaTexto(body);
    DRAG = { id:ev.pointerId, x0:ev.clientX, y0:ev.clientY, moveu:false, body, MT, ancora:posDeDom(MT, s.focusNode, s.focusOffset), trava:null };
    $('caret').classList.add('panda');
    try{ bola.setPointerCapture(ev.pointerId); }catch(e){}
  });
  bola.addEventListener('click', ev => { ev.preventDefault(); ev.stopPropagation(); });
}
window.addEventListener('pointermove', ev => {
  if(!DRAG || ev.pointerId !== DRAG.id) return;
  const dx = ev.clientX - DRAG.x0, dy = ev.clientY - DRAG.y0;
  if(!DRAG.moveu){ if(Math.hypot(dx, dy) < 6) return; DRAG.moveu = true; const c = $('caret'); if(c) c.classList.add('arrasto'); esconderAcoes(); }
  const pd = pandinhoEl(); pd.hidden = false; pd.style.left = (ev.clientX - 20) + 'px'; pd.style.top = (ev.clientY - 20) + 'px';
  const dr = docEl.getBoundingClientRect();
  if(ev.clientY > dr.bottom - 70) docEl.scrollTop += 14; else if(ev.clientY < dr.top + 60) docEl.scrollTop -= 14;
  const cr = document.caretRangeFromPoint ? document.caretRangeFromPoint(ev.clientX, ev.clientY - 34) : null;
  if(!cr || !DRAG.body.contains(cr.startContainer)) return;
  const el = cr.startContainer.nodeType === 1 ? cr.startContainer : cr.startContainer.parentElement;
  if(el && el.closest('.pgap')) return;
  const S = DRAG.MT.str, p0 = posDeDom(DRAG.MT, cr.startContainer, cr.startOffset);
  const dir = p0 >= DRAG.ancora ? 1 : -1, m = ima(S, p0, dir);
  const A = domDePos(DRAG.MT, DRAG.ancora), B = domDePos(DRAG.MT, m.pos);
  try{ window.getSelection().setBaseAndExtent(A.node, A.off, B.node, B.off); }catch(e){}
  const t = travaEl();
  if(m.trava){
    if(DRAG.trava !== m.pos){ DRAG.trava = m.pos; if(navigator.vibrate) try{ navigator.vibrate(8); }catch(e){} }
    try{ const r = document.createRange(); r.setStart(B.node, B.off); r.collapse(true); const rc = r.getClientRects()[0]; if(rc){ t.hidden = false; t.style.left = (rc.left - 1) + 'px'; t.style.top = rc.top + 'px'; t.querySelector('i').style.height = rc.height + 'px'; } }catch(e){}
  } else { DRAG.trava = null; t.hidden = true; }
});
function fimDrag(ev){
  if(!DRAG || (ev && ev.pointerId !== DRAG.id)) return;
  const d = DRAG; DRAG = null;
  pandinhoEl().hidden = true; travaEl().hidden = true;
  const c = $('caret'); if(c) c.classList.remove('arrasto');
  if(!d.moveu) return;   /* só tocou: a bolinha virou o panda e espera o dedo */
  if(c) c.classList.remove('panda');
  SELX.nossa = true; atualizarCaret(); mostrarAcoes();
}
window.addEventListener('pointerup', fimDrag); window.addEventListener('pointercancel', fimDrag);
/* tocar em outro lugar: o panda volta a ser a bolinha vermelha */
document.addEventListener('pointerdown', ev => {
  if(ev.target.closest && ev.target.closest('#caret .bola, #selAcoes, #mtCom, #sCamada')) return;
  const c = $('caret'); if(c) c.classList.remove('panda');
  if(ev.target.closest && ev.target.closest('#pages .body')){ SELX.nossa = false; esconderAcoes(); }
}, true);

/* ---------- Copiar · Colar · Marca-texto ---------- */
let CLIP = null;
function trechoDaSel(){
  const s = window.getSelection(); if(!s || !s.rangeCount || s.isCollapsed) return null;
  const r = s.getRangeAt(0), el = r.commonAncestorContainer.nodeType === 1 ? r.commonAncestorContainer : r.commonAncestorContainer.parentElement;
  const body = el && el.closest('#pages .body'); if(!body) return null;
  const MT = mapaTexto(body), a = posDeDom(MT, r.startContainer, r.startOffset), b = posDeDom(MT, r.endContainer, r.endOffset);
  const div = document.createElement('div'); div.append(r.cloneContents());
  div.querySelectorAll('.pgap,.naoimp,#caret').forEach(x => x.remove());
  return { text:MT.str.slice(Math.min(a, b), Math.max(a, b)), html:div.innerHTML, body };
}
pagesEl.addEventListener('copy', ev => {
  const t = trechoDaSel(); if(!t || !ev.clipboardData) return;
  ev.clipboardData.setData('text/plain', t.text); ev.clipboardData.setData('text/html', t.html); ev.preventDefault();
  CLIP = { text:t.text, html:t.html };
});
function copiarSel(){
  const t = trechoDaSel(); if(!t) return toast('Selecione algo primeiro.');
  CLIP = { text:t.text, html:t.html };
  copiarTexto(t.text, 'Copiado.');
  esconderAcoes();
}
async function colarAqui(){
  if(!curSel()) return toast('Toque no texto onde vai colar.');
  histPush('colar');
  let t = null;
  if(PWA){ try{ if(navigator.clipboard && navigator.clipboard.readText) t = await navigator.clipboard.readText(); }catch(e){} }
  esconderAcoes();
  if(t != null && t.trim() && (!CLIP || t.trim() !== CLIP.text.trim())) return acao('colar');   /* veio de fora do app */
  if(CLIP){ document.execCommand('insertHTML', false, CLIP.html); return; }
  acao('colar');
}
function textosDaSel(r, body){
  const out = [], w = document.createTreeWalker(body, NodeFilter.SHOW_TEXT, SEM_VAO);
  let n;
  while((n = w.nextNode())){
    if(!r.intersectsNode(n)) continue;
    const a = n === r.startContainer ? r.startOffset : 0, b = n === r.endContainer ? r.endOffset : n.data.length;
    if(b > a && n.data.slice(a, b).length) out.push({ n, a, b });
  }
  return out;
}
function marcaTexto(){
  const s = window.getSelection(); if(!s || !s.rangeCount || s.isCollapsed) return toast('Selecione o trecho primeiro.');
  const r = s.getRangeAt(0), body = curBody(); if(!body) return;
  const lista = textosDaSel(r, body); if(!lista.length) return;
  histPush('marca-texto');
  const tudoMarcado = lista.every(x => x.n.parentElement.closest('mark.mt'));
  if(tudoMarcado){
    new Set(lista.map(x => x.n.parentElement.closest('mark.mt'))).forEach(m => m.replaceWith(...m.childNodes));
    toast('Marca-texto tirado.', { ms:1300 });
  } else {
    lista.forEach(({ n, a, b }) => {
      if(n.parentElement.closest('mark.mt')) return;
      if(b < n.data.length) n.splitText(b);
      const alvo = a > 0 ? n.splitText(a) : n;
      if(!alvo.data.trim() && !alvo.parentElement.closest('p,li,td,th,h1,h2,h3,blockquote')) return;
      const m = document.createElement('mark'); m.className = 'mt'; alvo.before(m); m.append(alvo);
    });
    body.querySelectorAll('mark.mt').forEach(m => { let nx = m.nextSibling; while(nx && nx.nodeType === 1 && nx.matches('mark.mt') && !nx.dataset.c && !m.dataset.c){ m.append(...nx.childNodes); const z = nx; nx = nx.nextSibling; z.remove(); } });
    toast('Marcado. Toque no trecho para escrever um comentário.', { ms:2200 });
  }
  body.normalize();
  const f = document.createRange(); f.selectNodeContents(body); f.collapse(false);
  try{ const e = r.endContainer.isConnected ? r : null; if(e){ s.collapseToEnd(); } else { s.removeAllRanges(); s.addRange(f); } }catch(e){}
  esconderAcoes();
  body.dispatchEvent(new Event('input'));
}
function mostrarAcoes(){
  esconderAcoes();
  if(!SELX.nossa || SB.aberto || DRAG) return;
  const s = window.getSelection(); if(!s || !s.rangeCount || s.isCollapsed) return;
  const r = s.getRangeAt(0), el = r.commonAncestorContainer.nodeType === 1 ? r.commonAncestorContainer : r.commonAncestorContainer.parentElement;
  if(!el || !el.closest('#pages .body')) return;
  const marcado = textosDaSel(r, el.closest('.body')).every(x => x.n.parentElement.closest('mark.mt'));
  const box = h('div', { id:'selAcoes' },
    h('button', { class:'saB', onclick:copiarSel }, h('i', { html:I.copy }), 'Copiar'),
    (CLIP || PWA) ? h('button', { class:'saB', onclick:colarAqui }, h('i', { html:I.paste }), 'Colar') : null,
    h('button', { class:'saB mt', onclick:marcaTexto }, h('i', { html:I.highlighter }), marcado ? 'Tirar marca' : 'Marca-texto'));
  box.addEventListener('pointerdown', ev => ev.preventDefault());
  document.body.append(box);
  posAcoes();
}
function posAcoes(){
  const box = $('selAcoes'); if(!box) return;
  const s = window.getSelection(); if(!s || !s.rangeCount || s.isCollapsed) return esconderAcoes();
  const rs = s.getRangeAt(0).getClientRects(); if(!rs.length) return;
  const a = rs[0], z = rs[rs.length - 1], d = docEl.getBoundingClientRect(), W = window.innerWidth, bw = box.offsetWidth, bh = box.offsetHeight;
  let y = a.top - bh - 12; if(y < d.top + 6) y = z.bottom + 14;
  y = Math.min(y, d.bottom - bh - 80);
  const x = Math.max(8, Math.min(W - bw - 8, (a.left + z.right) / 2 - bw / 2));
  box.style.left = x + 'px'; box.style.top = y + 'px';
}
function esconderAcoes(){ const b = $('selAcoes'); if(b) b.remove(); }
docEl.addEventListener('scroll', () => { if($('selAcoes')) requestAnimationFrame(posAcoes); }, { passive:true });
document.addEventListener('selectionchange', () => { const s = window.getSelection(); if($('selAcoes') && (!s || s.isCollapsed)) esconderAcoes(); });

/* comentário do marca-texto: tocar no trecho marcado abre a caixinha (pode ficar vazia) */
pagesEl.addEventListener('click', ev => {
  const m = ev.target.closest && ev.target.closest('.body mark.mt');
  if(!m || DRAG || M.fsel || M.editing) return;
  const s = window.getSelection(); if(s && !s.isCollapsed) return;
  abrirComentario(m);
});
function abrirComentario(m){
  fecharComentario();
  const body = m.closest('.body');
  const txa = h('textarea', { class:'txa', rows:'3', placeholder:'Comentário (pode ficar vazio)' }); txa.value = m.dataset.c || '';
  const guardar = () => { const v = txa.value.trim(); if(v) m.dataset.c = v; else delete m.dataset.c; m.classList.toggle('com', !!v); if(body) body.dispatchEvent(new Event('input')); };
  const box = h('div', { id:'mtCom' }, h('b', null, 'Comentário'), txa,
    h('div', { class:'row' },
      h('button', { class:'btn sm ghost danger', onclick:() => { histPush('marca-texto'); fecharComentario(true); m.replaceWith(...m.childNodes); if(body){ body.normalize(); body.dispatchEvent(new Event('input')); } } }, 'Tirar marca'),
      h('button', { class:'btn sm acc', onclick:() => fecharComentario() }, 'Pronto')));
  box._guardar = guardar;
  document.body.append(box);
  const r = m.getClientRects()[0] || m.getBoundingClientRect(), W = window.innerWidth, bw = Math.min(320, W - 24);
  box.style.width = bw + 'px'; box.style.left = Math.max(12, Math.min(W - bw - 12, r.left)) + 'px';
  const bh = box.offsetHeight, d = docEl.getBoundingClientRect();
  box.style.top = (r.bottom + 10 + bh < d.bottom - 70 ? r.bottom + 10 : Math.max(d.top + 6, r.top - bh - 10)) + 'px';
  setTimeout(() => document.addEventListener('pointerdown', foraComentario, true), 0);
}
function foraComentario(ev){ if(ev.target.closest && ev.target.closest('#mtCom')) return; fecharComentario(); }
function fecharComentario(semGuardar){
  const b = $('mtCom'); document.removeEventListener('pointerdown', foraComentario, true);
  if(!b) return; if(!semGuardar && b._guardar) b._guardar(); b.remove();
}

/* ---------- selo do documento inteiro ---------- */
const SELO = { d:null };
function pintarSelos(){
  if(!M.p) return;
  pagesEl.querySelectorAll('.seloB,.seloI,.ndBola').forEach(x => x.remove());
  M.p.docs.filter(d => d.linha).forEach(d => {
    const pg = pagesEl.querySelector('.page[data-doc="' + d.id + '"]'); if(!pg) return;
    if(d.vazio){ pg.append(h('button', { class:'ndBola', 'aria-label':'Escolher o que entra neste documento', html:I.plusBold, onclick:ev => { ev.stopPropagation(); menuNovoVazio(d, ev.currentTarget); } })); return; }
    const b = h('button', { class:'seloB' + (SELO.d === d.id ? ' on' : ''), 'aria-label':'Selecionar o documento inteiro', html:I.selo });
    b.addEventListener('pointerdown', ev => { ev.preventDefault(); ev.stopPropagation(); });
    b.addEventListener('click', ev => { ev.stopPropagation(); SELO.d === d.id ? fecharSelo() : abrirSelo(d); });
    pg.append(b);
  });
  if(SELO.d) pintarFosco();
  if(M.p.avulsa) pintarCarimbos();
}
function pintarFosco(){
  pagesEl.querySelectorAll('.page.inteiro').forEach(p => p.classList.remove('inteiro'));
  const d = SELO.d && docById(SELO.d); if(!d) return;
  pagesEl.querySelectorAll('.page').forEach(pg => { const x = docById(pg.dataset.doc); if(x && (x === d || x.pai === d.id)) pg.classList.add('inteiro'); });
}
function abrirSelo(d){
  fecharSelo(); capsula(false); fecharBolhasS(true); esconderAcoes();
  SELO.d = d.id; pintarFosco();
  const pg = pagesEl.querySelector('.page[data-doc="' + d.id + '"]'); if(!pg) return;
  const selo = pg.querySelector('.seloB'); if(selo) selo.classList.add('on');
  const bi = h('button', { class:'seloI', 'aria-label':'Opções do documento inteiro' }, 'i');
  bi.addEventListener('pointerdown', ev => { ev.preventDefault(); ev.stopPropagation(); });
  bi.addEventListener('click', ev => { ev.stopPropagation(); menuSelo(d, bi); });
  pg.append(bi);
  menuSelo(d, bi);
}
function menuSelo(d, ancora){
  const txt = d.kind === 'texto', n = M.p.docs.filter(x => x.pai === d.id && x.linha).length;
  popMenu(ancora, [
    { t:'Exportar tudo num PDF só', sub:n ? 'este documento e ' + plural(n, 'o PDF anexado', 'os PDFs anexados') + ', na ordem' : 'este documento, como sai no PDF', ic:'share', fn:() => pdfDoSelo(d, 'compartilhar') },
    txt ? { t:'Substituir: colar texto novo', sub:'entra no padrão, venha como vier', ic:'paste', fn:() => colarSheet(d) } : null,
    txt ? { t:'Copiar o documento inteiro', ic:'copy', fn:() => { const b = bodyDoDoc(d); if(!b) return; const MT = mapaTexto(b); CLIP = { text:MT.str, html:htmlDoBody(b) }; copiarTexto(MT.str, 'Documento copiado.'); } } : null,
    { t:'Imprimir', ic:'print', fn:() => pdfDoSelo(d, 'imprimir') }
  ]);
}
async function pdfDoSelo(d, como){
  if(!precisaLibs()) return;
  salvarTudo();
  const l = folhasTela().filter(f => f.d === d || f.d.pai === d.id);
  if(!l.length) return toast('Este documento não tem folhas.');
  const b = busy('Montando o PDF…');
  try{
    const bytes = await pdfDasFolhas(l, Object.assign({ titulo:d.nome }, optCarimbo()));
    b.end();
    const nome = safeName(d.nome + (l.some(f => f.d !== d) ? ' (com anexos)' : ''), '.pdf');
    if(como === 'imprimir') return imprimirBytes(bytes, nome);
    offer(bytes, nome);
  }catch(e){ b.end(); console.error(e); toast('Não foi possível montar o PDF: ' + (e.message || e)); }
}
function fecharSelo(){
  if(!SELO.d) return;
  SELO.d = null;
  pagesEl.querySelectorAll('.page.inteiro').forEach(p => p.classList.remove('inteiro'));
  pagesEl.querySelectorAll('.seloB.on').forEach(b => b.classList.remove('on'));
  pagesEl.querySelectorAll('.seloI').forEach(b => b.remove());
}
pagesEl.addEventListener('pointerdown', ev => { if(SELO.d && !(ev.target.closest && ev.target.closest('.seloB,.seloI'))) fecharSelo(); });

/* ---------- colar texto novo: sai no padrão, venha como vier ---------- */
function colarSheet(d, o){
  o = o || {};
  const txa = h('textarea', { class:'txa tpTxa', placeholder:'Cole aqui o texto.\n\nA primeira linha vira o título; "De:", "Para:" e "Assunto:" ficam no bloco de cima; o resto vira parágrafos. "Ilhéus, …" e o nome do signatário no fim viram o fecho.' });
  const colar = async () => {
    try{ const t = navigator.clipboard && navigator.clipboard.readText ? await navigator.clipboard.readText() : ''; if(!t) throw 0; txa.value = t; }
    catch(e){ txa.focus(); toast('Toque e segure dentro da caixa e escolha Colar.'); }
  };
  sheet({ titulo:o.titulo || (d.vazio ? 'Colar texto' : 'Substituir o texto'), cheio:true, corpo:[
    h('div', { class:'tpBar' }, h('button', { class:'btn sm', onclick:colar }, h('span', { html:I.paste }), 'Colar'), h('span', { class:'tpConta' }), h('button', { class:'btn sm ghost', onclick:() => { txa.value = ''; txa.focus(); } }, 'Limpar')),
    txa, h('p', { class:'ndOnde' }, d.vazio ? 'Entra no lugar do documento novo, no padrão.' : 'O texto de "' + d.nome + '" é trocado por este, no padrão. Dá para desfazer na cápsula.')],
    botoes:[{ t:'Cancelar', v:'ghost' }, { t:d.vazio ? 'Pôr no documento' : 'Substituir', v:'acc', fn:() => { if(!txa.value.trim()){ toast('Cole o texto primeiro.'); return false; } substituirTexto(d, txa.value); } }] });
}
function substituirTexto(d, texto){
  const p = M.p; if(!p || !d) return;
  const partes = dividirTeor(texto);
  if(!partes.length) return;
  histPush(d.vazio ? 'colar texto' : 'substituir');
  if(d.vazio && partes.length > 1){
    /* inteiro teor com vários documentos: cada um entra no lugar dele */
    const i = p.docs.indexOf(d), antes = i > 0 ? p.docs[i - 1].id : null;
    p.docs.splice(i, 1);
    const res = encaixarTeor(p, partes, { depois:antes });
    saveDB(true); renderMesa(true);
    if(typeof depoisDeMontar === 'function') depoisDeMontar(p, res);
    return;
  }
  const pt = partes.length > 1 ? parteFinal({ nome:'', linhas:String(texto).replace(/\r/g, '').split('\n') }) : partes[0];
  if(!pt) return;
  if(pt.pessoa === undefined && pt.novo) pt.pessoa = garantirSignatario(pt.novo);
  d.html = htmlDaParte(pt, p); d.pags = null; d.base = null;
  if(d.vazio){
    delete d.vazio; d.tipo = pt.capa ? 'capa' : pt.tipo; d.nome = pt.nome || titleOf(d.html);
    const pes = pt.pessoa !== undefined ? pt.pessoa : pessoaPadrao(pt.tipo, p);
    d.sig = novoSig(pes && pes !== '__sem' ? pes : null, { sem:pes === '__sem' || !!pt.capa, vinculo:procReal(p) });
  } else if(pt.pessoa !== undefined){ d.sig = d.sig || novoSig(null); d.sig.sem = pt.pessoa === '__sem'; d.sig.pessoa = pt.pessoa && pt.pessoa !== '__sem' ? pt.pessoa : null; }
  touch(p); saveDB(true); fecharSelo();
  renderMesa(true); setTimeout(() => irParaDoc(d.id), 60);
  if(M.split && typeof renderProcTela === 'function') renderProcTela();
  toast('Texto no padrão.', { ms:1400 });
}

/* ---------- Novo doc.: folha em branco logo depois deste, com uma bolinha no meio ---------- */
const NDV = { id:null, p:null, t:0 };
function novoDocBranco(){
  const p = M.p; if(!p) return;
  histPush('novo documento'); salvarTudo(); capsula(false); pgInteira(false);
  const atual = M.cur && M.cur.d;
  const d = { id:uid(), kind:'texto', nome:'Documento novo', tipo:'livre', modelo:'livre', vazio:true, sig:novoSig(null, { sem:true, vinculo:procReal(p) }),
    html:'<p><br></p>', bras:settings.brasTexto || 'todas', linha:true, repo:false, criado:Date.now(), mpi:true };
  porNaLinha(p, d, atual ? (atual.pai || atual.id) : null);
  depoisDeIncluir(p, d);
}
function menuNovoVazio(d, ancora){
  const p = M.p;
  popMenu(ancora, [
    { t:'Colar texto', sub:'sai no padrão sozinho', ic:'paste', fn:() => colarNoVazio(d) },
    p.avulsa ? null : { t:'Modelo', sub:'despacho, DFD, ETP, CI, ofício, nota técnica…', ic:'doc', fn:() => { NDV.id = d.id; NDV.p = p.id; NDV.t = Date.now(); irParaDoc(d.id); novoDocumentoModelo({}); } },
    { t:'Anexar PDF ou foto', ic:'clip', fn:() => anexarNoVazio(d) }
  ]);
}
async function colarNoVazio(d){
  let t = '';
  try{ if(navigator.clipboard && navigator.clipboard.readText) t = await navigator.clipboard.readText(); }catch(e){}
  if(t && t.trim()) return substituirTexto(d, t);
  colarSheet(d);
}
function anexarNoVazio(d){
  const p = M.p;
  escolherArquivos(async l => {
    const novos = await incluirArquivos(p, l, 'linha', d.id);
    if(!novos.length) return;
    histPush('anexar');
    const k = p.docs.indexOf(d); if(k >= 0) p.docs.splice(k, 1);
    touch(p); saveDB(true);
    depoisDeIncluir(p, novos[0]);
    toast(novos.length === 1 ? 'PDF no lugar do documento novo.' : novos.length + ' arquivos no lugar do documento novo.');
  });
}
/* documento criado por modelo a partir da folha em branco: a folha em branco sai */
function tirarVazio(p, novo){
  if(!NDV.id || !p || NDV.p !== p.id || Date.now() - NDV.t > 20 * 60000){ return; }
  const i = p.docs.findIndex(x => x.id === NDV.id && x.vazio);
  if(i >= 0 && (!novo || novo.id !== NDV.id)) p.docs.splice(i, 1);
  NDV.id = null;
}
/* folha em branco que ficou vazia some ao sair */
function limparVazios(p){
  if(!p) return;
  const antes = p.docs.length;
  p.docs = p.docs.filter(d => !(d.vazio && !String(d.html || '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim()));
  if(p.docs.length !== antes){ touch(p); saveDB(true); }
}
/* digitou na folha em branco: vira documento de verdade */
pagesEl.addEventListener('input', ev => {
  const b = ev.target.closest && ev.target.closest('.page.txt .body'); if(!b) return;
  const d = docById(b.parentElement.dataset.doc); if(!d || !d.vazio || !b.textContent.trim()) return;
  delete d.vazio; d.sig = d.sig || novoSig(null); d.sig.sem = false;
  const bo = b.parentElement.querySelector('.ndBola'); if(bo) bo.remove();
  setTimeout(() => { d.nome = titleOf(htmlDoBody(b)) || 'Documento novo'; const l = pagesEl.querySelector('[data-lab="' + d.id + '"] .dn'); if(l) l.textContent = d.nome; atualizarFecho(d); saveDB(); }, 500);
});

/* ---------- modo de edição da tela: Desfazer ---------- */
const LAYH = { pilha:[], ult:null };
function layHistIniciar(){ LAYH.pilha = []; LAYH.ult = JSON.stringify(layUI()); }
function layHistGuardar(){
  const agora = JSON.stringify(settings.layUI || {});
  if(LAYH.ult != null && agora !== LAYH.ult){ LAYH.pilha.push(LAYH.ult); if(LAYH.pilha.length > 60) LAYH.pilha.shift(); }
  LAYH.ult = agora;
}
function desfazerLayout(){
  const v = LAYH.pilha.pop();
  if(v == null) return toast('Nada para desfazer.', { ms:1200 });
  settings.layUI = JSON.parse(v); LAYH.ult = v;
  lsSet('settings', settings); kvSet('settings', settings);
  aplicarLayUI();
  if(LAY.mapa && typeof renderMapa === 'function') renderMapa();
  toast('Desfeito.', { ms:1100 });
}

/* ===== o_campos.js ===== */
/* =====================================================================
   Etapa 3 (28/09): campos de tocar no documento, "+ Incluir novo" nas
   listas e cadastro de signatários. Desenho aprovado: manual-aprovado/08.
   ===================================================================== */

/* ---------- signatários: cadastro único, em ordem alfabética ---------- */
function garantirSignatario(novo, silencioso){
  if(!novo || !novo.nome) return null;
  const L = settings.signatarios = settings.signatarios || [];
  const ja = L.find(s => norm(s.nome) === norm(novo.nome));
  if(ja){ if(novo.cargo && !ja.cargo){ ja.cargo = novo.cargo; saveSettings(); } return ja.id; }
  const x = { id:uid(), nome:titleCase(String(novo.nome).trim()), cargo:String(novo.cargo || '').trim() };
  if(novo.reg && String(novo.reg).trim()) x.reg = String(novo.reg).trim();
  L.push(x); ordenarSignatarios(); saveSettings();
  if(!silencioso) toast(x.nome + ' entrou na lista de signatários.', { ms:2200 });
  return x.id;
}
/* lista suspensa de signatários, com "+ Incluir novo" (vale para o app inteiro) */
function menuSignatario(ancora, atual, fn, o){
  o = o || {};
  ordenarSignatarios();
  const itens = (settings.signatarios || []).map(x => ({ t:titleCase(x.nome), sub:x.cargo, on:atual === x.id, fn:() => fn(x.id) }));
  itens.push('-');
  if(o.sem) itens.push({ t:'Sem assinatura', sub:'anexo, planilha', on:atual === '__sem', fn:() => fn('__sem') });
  itens.push({ t:'+ Incluir novo', cls:'novo', fn:() => incluirSignatarioSheet(fn, o.pre) });
  return popMenu(ancora, itens);
}
function incluirSignatarioSheet(cb, pre){
  pre = pre || {};
  const nome = h('input', { class:'inp', placeholder:'Nome completo', value:pre.nome || '', autocapitalize:'words' });
  const cargo = h('input', { class:'inp', placeholder:'Cargo (ex.: Engenheiro Civil)', value:pre.cargo || '' });
  const reg = h('input', { class:'inp', placeholder:'Registro, se houver (ex.: CREA nº …)', value:pre.reg || '' });
  const s = sheet({ titulo:'Novo signatário', corpo:[
    h('label', { class:'fld' }, h('span', null, 'Nome'), nome),
    h('label', { class:'fld' }, h('span', null, 'Cargo'), cargo),
    h('label', { class:'fld' }, h('span', null, 'Registro (opcional)'), reg),
    h('p', { class:'sgNota' }, 'Fica na lista de signatários do app inteiro, em ordem alfabética. O registro sai embaixo do cargo, no fecho.')],
    botoes:[{ t:'Cancelar', v:'ghost' }, { t:'Incluir', v:'acc', fn:() => {
      if(!nome.value.trim()){ toast('Escreva o nome.'); nome.focus(); return false; }
      if(!cargo.value.trim()){ toast('Escreva o cargo.'); cargo.focus(); return false; }
      const id = garantirSignatario({ nome:nome.value, cargo:cargo.value, reg:reg.value }, true);
      toast('Incluído na lista de signatários.', { ms:1500 });
      if(cb) cb(id);
    } }] });
  setTimeout(() => { if(!nome.value) nome.focus(); }, 120);
  return s;
}

/* ---------- fecho: tocar no nome troca o signatário; tocar na data escolhe física/eletrônica ---------- */
function mudarSig(d, patch, aviso){
  if(!d) return;
  if(typeof histPush === 'function') histPush('signatário');
  d.sig = Object.assign({}, d.sig || novoSig(null), patch);
  const p = procDoDoc(d) || M.p; if(p) touch(p);
  saveDB();
  if(VIEW === 'mesa') atualizarFecho(d);
  if(aviso) toast(aviso, { ms:1400 });
}
function tocarFecho(d, ev){
  if(M.fsel || M.editing) return;
  const alvo = ev.target.closest('.loc, .n1, .n2');
  if(!alvo) return sigSheet(d);
  ev.stopPropagation();
  if(alvo.classList.contains('loc')) return menuDataFecho(d, alvo);
  const s = d.sig || {};
  menuSignatario(alvo, s.sem ? '__sem' : s.pessoa, id => mudarSig(d, { pessoa:id === '__sem' ? null : id, sem:id === '__sem' }, id === '__sem' ? 'Sem assinatura.' : 'Signatário trocado.'), { sem:true });
}
function menuDataFecho(d, ancora){
  const s = d.sig || {}, fis = s.modo === 'fisica';
  popMenu(ancora, [
    { t:'Assinatura eletrônica', sub:'"Ilhéus, data da assinatura eletrônica."', on:!fis, fn:() => mudarSig(d, { modo:'eletronica', data:null }, 'Assinatura eletrônica.') },
    { t:'Assinatura física (caneta)', sub:fis ? 'com a data ' + dataBR(s.data || hojeISO()) : 'escolher a data no calendário', on:fis, fn:() => escolherDataFecho(d) },
    fis ? { t:'Mudar a data…', fn:() => escolherDataFecho(d) } : null
  ]);
}
function escolherDataFecho(d){
  const s = d.sig || {};
  const inp = h('input', { class:'inp', type:'date', value:s.data || hojeISO() });
  sheet({ titulo:'Data da assinatura', corpo:[h('label', { class:'fld' }, h('span', null, 'Assinatura física, com a data'), inp),
    h('p', { class:'sgNota' }, 'A data entra no fecho e na tarja do pé da folha.')],
    botoes:[{ t:'Cancelar', v:'ghost' }, { t:'OK', v:'acc', fn:() => mudarSig(d, { modo:'fisica', data:inp.value || hojeISO() }, 'Assinatura física, ' + dataBR(inp.value || hojeISO()) + '.') }] });
  setTimeout(() => { try{ inp.focus(); if(inp.showPicker) inp.showPicker(); }catch(e){} }, 150);
}

/* ---------- colar no padrão dentro do editor: com o inteiro teor marcado, o texto colado substitui o documento ---------- */
function inteiroMarcado(body){
  const s = window.getSelection(); if(!s || !s.rangeCount || s.isCollapsed) return false;
  if(!body.contains(s.anchorNode) || !body.contains(s.focusNode)) return false;
  const tudo = mapaTexto(body).str.replace(/\s+/g, ''), sel = String(s).replace(/\s+/g, '');
  return tudo.length > 0 && sel.length >= tudo.length * 0.97;
}
function colarNoInteiro(body, d, cd){
  if(!inteiroMarcado(body)) return false;
  let t = cd.getData('text/plain') || '';
  if(!t.trim()){ const hh = cd.getData('text/html'); if(hh){ const x = document.createElement('div'); x.innerHTML = hh; t = x.innerText; } }
  if(!t.trim()) return false;
  if(typeof fecharBolhasS === 'function') fecharBolhasS(true);
  substituirTexto(d, t);
  return true;
}

/* =====================================================================
   Etapa 3, parte 2 (28/09): campos pontilhados, PCA, contratada,
   destinatários e replicação ficha ↔ documentos (desenho 08).
   ===================================================================== */

/* ---------- PCA: a frase sai da ficha (p.ficha.pca = 'Não consta' | 'Consta', p.ficha.pcaItem) ---------- */
const PCA_OPC = ['Não consta', 'Consta'];
function pcaFrase(p){
  const f = (p && p.ficha) || {};
  if(f.pca === 'Consta') return 'A presente contratação consta da versão atual do Plano de Contratações Anual (PCA), item nº ' + (String(f.pcaItem || '').trim() || '[__]') + '.';
  return PCA_NAO_CONSTA;
}

/* ---------- mudar a ficha e levar a mudança a todos os documentos do processo ---------- */
function mudarFicha(p, patch, aviso){
  if(!p) return 0;
  if(VIEW === 'mesa' && M.p === p){ if(typeof histPush === 'function') histPush('campo'); salvarTudo(); }
  const antes = clone(p.ficha || {});
  p.ficha = Object.assign({ extras:[] }, p.ficha || {}, patch);
  touch(p);
  const velhos = new Map(p.docs.map(x => [x, x.html]));
  replicarFicha(p, antes);
  const mudados = p.docs.filter(x => x.html !== velhos.get(x));
  if(VIEW === 'mesa' && M.p === p) mudados.forEach(x => {
    const pg = paginaEl(x.id), b = pg && pg.querySelector('.body');
    if(b){ b.innerHTML = x.html || '<p><br></p>'; prepararCorpo(b, x); diagramar(x); }
  });
  saveDB(true);
  if(aviso) toast(aviso + (mudados.length > 1 ? ' ' + plural(mudados.length, 'documento atualizado', 'documentos atualizados') + '.' : ''), { ms:1800 });
  return mudados.length;
}
/* valor digitado no documento → formato da ficha */
const MARC_CALCULADOS = ['revit', 'revit_inicio', 'revit_codigo', 'secretaria_demandante', 'autoridade_demandante', 'cargo_autoridade_demandante', 'srp', 'pca'];
function valorParaFicha(campo, txt){
  const def = FICHA.find(x => x[0] === campo), tipo = def ? def[2] : 'text';
  if(tipo === 'money'){ const n = numBR(txt); return n == null ? txt : String(Math.round(n * 100) / 100); }
  if(tipo === 'date'){ const m = String(txt).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/); if(m) return m[3] + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0'); const m2 = String(txt).match(/^\d{4}-\d{2}-\d{2}$/); return m2 ? txt : null; }
  if(tipo === 'number'){ const m = String(txt).match(/\d+/); return m ? m[0] : null; }
  return txt;
}
function gravarCampo(p, k, txt){
  if(!p || !k || MARC_ESPECIAIS.includes(k) || MARC_CALCULADOS.includes(k)) return false;
  const campo = MARCADORES[k];
  if(campo){
    const v = valorParaFicha(campo, txt); if(v == null) return false;
    mudarFicha(p, { [campo]:v }, 'Ficha atualizada.');
    return true;
  }
  const ex = ((p.ficha && p.ficha.extras) || []).map(e => Object.assign({}, e));
  const e = ex.find(x => chaveExtra(x.k) === k);
  if(e) e.v = txt; else ex.push({ k:MARC_ROTULO[k] || k.replace(/_/g, ' '), v:txt });
  mudarFicha(p, { extras:ex }, 'Ficha atualizada.');
  return true;
}

/* ---------- tocar nos campos: um toque (listas) abre o menu; dois toques escrevem ali ---------- */
const CAMPO_TOQUE = { t:0, el:null };
let CAMPO_ED = null;
const ehDestinatario = sp => sp.classList.contains('campo') && /^\[(destinat[aá]rio|setor( de destino)?)\]$/i.test(sp.textContent.trim());
function tocarCampo(e, body, d){
  if(M.fsel || M.editing || (CAMPO_ED && CAMPO_ED.sp.contains(e.target))) return;
  const sp = e.target.closest('.fc[data-f], .campo');
  if(!sp || !body.contains(sp)) return;
  const k = sp.dataset.f, agora = Date.now(), dois = CAMPO_TOQUE.el === sp && agora - CAMPO_TOQUE.t < 420;
  CAMPO_TOQUE.t = agora; CAMPO_TOQUE.el = sp;
  if(k === 'pca') return menuPca(sp, d);
  if(k === 'contratada') return menuContratadaCampo(sp, d, body);
  if(ehDestinatario(sp)) return menuDestinatario(sp, nome => trocarCampoTexto(sp, nome, body, d), () => editarCampo(sp, body, d));
  if(dois){ CAMPO_TOQUE.el = null; e.preventDefault(); return editarCampo(sp, body, d); }
  /* o segundo toque não pode cair na bolinha do cursor (ela viraria o pandinho) */
  const cr = document.getElementById('caret');
  if(cr){ cr.classList.add('fcTap'); clearTimeout(CAMPO_TOQUE.tm); CAMPO_TOQUE.tm = setTimeout(() => cr.classList.remove('fcTap'), 450); }
  if(sp.classList.contains('campo') || sp.classList.contains('vazio')) selecionarNo(sp);
}
/* escreve ali, com a letra do documento: só o campo fica editável até sair */
function editarCampo(sp, body, d){
  if(CAMPO_ED) CAMPO_ED.fim();
  const antes = sp.textContent;
  if(typeof histPush === 'function') histPush('campo');
  body.contentEditable = 'false';
  sp.classList.add('fcEd'); sp.contentEditable = 'true'; sp.setAttribute('inputmode', 'text'); sp.setAttribute('enterkeyhint', 'done');
  const tecla = ev => {
    if(ev.key === 'Enter'){ ev.preventDefault(); fim(); }
    else if(ev.key === 'Escape'){ ev.preventDefault(); sp.textContent = antes; fim(); }
  };
  const sair = () => setTimeout(fim, 0);
  function fim(){
    if(!CAMPO_ED || CAMPO_ED.sp !== sp) return;
    CAMPO_ED = null;
    sp.removeEventListener('keydown', tecla); sp.removeEventListener('blur', sair);
    sp.classList.remove('fcEd'); sp.removeAttribute('contenteditable'); sp.removeAttribute('inputmode'); sp.removeAttribute('enterkeyhint');
    body.contentEditable = 'true';
    const txt = sp.textContent.replace(/\s+/g, ' ').trim();
    if(!txt){ sp.textContent = antes; return; }
    if(txt === antes.trim()) return;
    sp.textContent = txt;
    if(!/^\[.*\]$/.test(txt)){ sp.classList.remove('campo'); sp.classList.remove('vazio'); }
    d.html = htmlDoBody(body); saveDB();
    const p = procDoDoc(d) || M.p, k = sp.dataset.f;
    if(!(k && gravarCampo(p, k, txt))){ if(p) touch(p); diagramar(d); }
  }
  CAMPO_ED = { sp, fim };
  sp.addEventListener('keydown', tecla); sp.addEventListener('blur', sair);
  sp.focus(); selecionarNo(sp);
}
/* troca um [campo] por um texto escolhido da lista */
function trocarCampoTexto(sp, txt, body, d){
  if(typeof histPush === 'function') histPush('campo');
  sp.textContent = txt; sp.classList.remove('campo'); sp.classList.remove('vazio');
  d.html = htmlDoBody(body); const p = procDoDoc(d) || M.p; if(p) touch(p); saveDB(); diagramar(d);
}

/* ---------- PCA: menu do campo ---------- */
function menuPca(ancora, d){
  const p = procDoDoc(d) || M.p; if(!p) return;
  const f = p.ficha || {}, consta = f.pca === 'Consta';
  popMenu(ancora, [
    { t:'Não consta do PCA', sub:'entra a frase padrão', on:!consta, fn:() => mudarFicha(p, { pca:'Não consta' }, 'PCA: não consta.') },
    { t:'Consta do PCA — item nº' + (consta && f.pcaItem ? ' ' + f.pcaItem : '…'), sub:'a frase se monta sozinha', on:consta, fn:() => itemPca(p) }
  ]);
}
async function itemPca(p){
  const n = await perguntar('Consta do PCA', 'Item nº', (p.ficha && p.ficha.pcaItem) || '', 'OK');
  if(n == null) return;
  mudarFicha(p, { pca:'Consta', pcaItem:String(n).trim() }, 'PCA: consta, item nº ' + (String(n).trim() || '__') + '.');
}

/* ---------- contratadas: cadastro único (nome, CNPJ, endereço, responsável) ---------- */
const contratadas = () => (settings.contratadas = settings.contratadas || []).slice().sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
function garantirContratada(x){
  if(!x || !String(x.nome || '').trim()) return null;
  const L = settings.contratadas = settings.contratadas || [];
  const nome = String(x.nome).trim(), ja = L.find(c => norm(c.nome) === norm(nome));
  const campos = ['cnpj', 'end', 'resp'];
  if(ja){ let m = false; campos.forEach(k => { const v = String(x[k] || '').trim(); if(v && v !== ja[k]){ ja[k] = v; m = true; } }); if(m) saveSettings(); return ja; }
  const n = { id:uid(), nome }; campos.forEach(k => { const v = String(x[k] || '').trim(); if(v) n[k] = v; });
  L.push(n); saveSettings(); return n;
}
const patchContratada = x => ({ contratada:x.nome, cnpj:x.cnpj || '', contratadaEnd:x.end || '', contratadaResp:x.resp || '' });
function menuContratada(ancora, atual, fn, o){
  o = o || {};
  const itens = contratadas().map(x => ({ t:x.nome, sub:x.cnpj ? 'CNPJ ' + x.cnpj : 'sem CNPJ no cadastro', on:!!atual && norm(x.nome) === norm(atual), fn:() => fn(x) }));
  if(itens.length) itens.push('-');
  if(o.escrever) itens.push({ t:'Escrever aqui', sub:'dois toques também escrevem', fn:o.escrever });
  itens.push({ t:'+ Incluir novo', cls:'novo', fn:() => incluirContratadaSheet(fn, o.pre) });
  return popMenu(ancora, itens);
}
function incluirContratadaSheet(cb, pre){
  pre = pre || {};
  const nome = h('input', { class:'inp', placeholder:'Razão social', value:pre.nome || '' });
  const cnpj = h('input', { class:'inp', placeholder:'00.000.000/0000-00', inputmode:'numeric', value:pre.cnpj || '' });
  const end = h('input', { class:'inp', placeholder:'Rua, nº, bairro, cidade-UF', value:pre.end || '' });
  const resp = h('input', { class:'inp', placeholder:'Nome do responsável', value:pre.resp || '', autocapitalize:'words' });
  const s = sheet({ titulo:'Nova contratada', corpo:[
    h('label', { class:'fld' }, h('span', null, 'Nome'), nome),
    h('label', { class:'fld' }, h('span', null, 'CNPJ'), cnpj),
    h('label', { class:'fld' }, h('span', null, 'Endereço'), end),
    h('label', { class:'fld' }, h('span', null, 'Responsável'), resp),
    h('p', { class:'sgNota' }, 'Fica no cadastro do app inteiro e entra nos documentos como {{contratada}}, {{cnpj}}, {{contratada_endereco}} e {{contratada_responsavel}}.')],
    botoes:[{ t:'Cancelar', v:'ghost' }, { t:'Incluir', v:'acc', fn:() => {
      if(!nome.value.trim()){ toast('Escreva o nome.'); nome.focus(); return false; }
      const x = garantirContratada({ nome:nome.value, cnpj:cnpj.value, end:end.value, resp:resp.value });
      toast('Incluída no cadastro de contratadas.', { ms:1500 });
      if(cb) cb(x);
    } }] });
  setTimeout(() => { if(!nome.value) nome.focus(); }, 120);
  return s;
}
function menuContratadaCampo(sp, d, body){
  const p = procDoDoc(d) || M.p; if(!p) return;
  menuContratada(sp, p.ficha && p.ficha.contratada, x => mudarFicha(p, patchContratada(x), 'Contratada: ' + x.nome + '.'), { escrever:() => editarCampo(sp, body, d) });
}

/* ---------- destinatários: setores e secretarias, com + Incluir novo ---------- */
function destinatarios(){
  if(!Array.isArray(settings.destinatarios)) settings.destinatarios = [];
  const L = [...settings.destinatarios, ...SETORES, ...secretarias().map(s => s.nome)];
  const vistos = new Set();
  return L.filter(x => { const k = norm(x); if(vistos.has(k)) return false; vistos.add(k); return true; }).sort((a, b) => a.localeCompare(b, 'pt-BR'));
}
function menuDestinatario(ancora, fn, escrever){
  const itens = destinatarios().map(x => ({ t:x, fn:() => fn(x) }));
  itens.push('-');
  if(escrever) itens.push({ t:'Escrever aqui', fn:escrever });
  itens.push({ t:'+ Incluir novo', cls:'novo', fn:async () => {
    const n = await perguntar('Novo destinatário', 'Setor ou órgão', '', 'Incluir'); if(!n || !String(n).trim()) return;
    const t = String(n).trim(); settings.destinatarios = settings.destinatarios || [];
    if(!destinatarios().some(x => norm(x) === norm(t))){ settings.destinatarios.push(t); saveSettings(); toast('Incluído na lista de destinatários.', { ms:1400 }); }
    fn(t);
  } });
  return popMenu(ancora, itens);
}

/* ===== p_export.js ===== */
/* =====================================================================
   Etapa 4 (28/09): Exportar de cada documento (desenho 09), módulo
   pré-minuta, imprimir e renumeração automática da lista do processo
   ===================================================================== */
const NOME_CARIMBO = { licitacao:'Carimbo Licitação P.M.I.', seinfra:'Carimbo SEINFRA' };
const temMarcas = d => !!(d && ((d.kind === 'texto' && /<mark\b[^>]*\bmt\b/.test(d.html || '')) || (d.kind === 'pdf' && d.pl.some(e => !e.d && e.mk && e.mk.length))));
/* carimbo que o Exportar usa quando ligado: o da pasta; se a pasta está sem carimbo, o padrão do tipo de processo */
function carimboDoExport(p){ const c = carimboAtual(p); return c !== 'nenhum' ? c : (ehLicAdt(p) ? 'licitacao' : 'seinfra'); }

/* ---------- renumeração: textos que ainda não foram diagramados ganham o nº real de folhas ---------- */
const RECONTA = {};
function recontarLista(p){
  if(!p || RECONTA[p.id] || !window.PDFLib) return;
  if(!p.docs.some(d => d.linha && d.kind === 'texto' && !d.pags)) return;
  RECONTA[p.id] = true;
  setTimeout(async () => {
    let mudou = false;
    try{ mudou = await recontar(p, false); }catch(e){}
    RECONTA[p.id] = false;
    if(mudou && VIEW === 'proc' && NAVP.proc === p.id) renderProcTela();
  }, 60);
}

/* ---------- Exportar de cada documento ---------- */
function exportarDocSheet(d){
  const p = procDoDoc(d) || M.p; if(!p || !d) return;
  salvarTudo();
  const txt = d.kind === 'texto', lic = procReal(p);
  const st = { fmt:txt ? (settings.expFmt || 'ambos') : 'pdf', car:carimboAtual(p) !== 'nenhum', tipo:carimboDoExport(p), marcas:false };
  const seg = h('div', { class:'seg expSeg' }), grp = h('div', { class:'sgGrp expGrp' }), mais = h('div', { class:'sgGrp expGrp' });
  const sw = (on, fn, rot) => h('span', { class:'sw' }, h('input', { type:'checkbox', checked:on, 'aria-label':rot, onchange:e => fn(e.target.checked) }), h('i'));
  const linha2 = (t, sub) => h('span', { class:'expTx' }, h('span', null, t), sub ? h('small', null, sub) : null);
  const val = (t, v, fn, cls) => { const b = h('button', { class:'sgRow ' + (cls || ''), onclick:() => fn(b) }, h('span', null, t), h('span', { class:'v' }, h('span', null, v), h('i', { html:I.chevR, style:{ display:'flex' } }))); return b; };
  function flsTxt(){
    const F = folhas(p)[d.id]; if(!F || !numerarAtual(p)) return '';
    return F.k > 1 ? ' · fls. ' + F.ini + '–' + F.fim : ' · fl. ' + F.ini;
  }
  function pinta(){
    if(txt) seg.replaceChildren(...[['word', 'Word'], ['pdf', 'PDF'], ['ambos', 'Word e PDF']].map(([k, t]) => h('button', { class:st.fmt === k ? 'on' : '', 'data-fmt':k, onclick:() => { st.fmt = k; settings.expFmt = k; saveSettings(); pinta(); } }, t)));
    seg.hidden = !txt;
    const rows = [];
    if(st.fmt !== 'word') rows.push(h('label', { class:'sgRow expCar' }, linha2('Com carimbo', st.car ? NOME_CARIMBO[st.tipo] + (carimboAtual(p) !== 'nenhum' ? ' (pela pasta)' : '') + flsTxt() : 'sem carimbo e sem número'), sw(st.car, v => { st.car = v; pinta(); }, 'Com carimbo')));
    if(temMarcas(d)) rows.push(h('label', { class:'sgRow expMar' }, linha2('Com marcações', st.marcas ? 'o marca-texto sai no arquivo' : 'o marca-texto fica só na tela'), sw(st.marcas, v => { st.marcas = v; pinta(); }, 'Com marcações')));
    if(txt){
      const sg = d.sig || {}, pes = sg.pessoa ? pessoaPorId(sg.pessoa) : null;
      rows.push(val('Signatário', sg.sem ? 'Sem assinatura' : pes ? titleCase(pes.nome) : 'Escolher', b => menuSignatario(b, sg.sem ? '__sem' : sg.pessoa, id => { mudarSig(d, id === '__sem' ? { pessoa:null, sem:true } : { pessoa:id, sem:false }); pinta(); }, { sem:true }), 'expSig'));
      rows.push(val('Assinatura', sg.modo === 'fisica' ? 'Física · ' + dataBR(sg.data || hojeISO()) : 'Eletrônica', b => popMenu(b, [
        { t:'Eletrônica', sub:'"Ilhéus, data da assinatura eletrônica."', on:sg.modo !== 'fisica', fn:() => { mudarSig(d, { modo:'eletronica', data:null }); pinta(); } },
        { t:'Física (caneta)', sub:'escolher a data', on:sg.modo === 'fisica', fn:() => dataFisica(d, pinta) }
      ]), 'expAss'));
    }
    grp.replaceChildren(...rows); grp.hidden = !rows.length;
    const ms = [];
    if(lic) ms.push(h('button', { class:'sgRow expPre', onclick:() => { s.fechar(); preMinutaPdf(p, opcoes()); } }, linha2('Módulo pré-minuta', rotuloPreMinuta(p)), h('i', { html:I.chevR, style:{ display:'flex', color:'var(--faint)' } })));
    ms.push(h('button', { class:'sgRow expImp', onclick:() => { s.fechar(); imprimirDoc(d, p, opcoes()); } }, linha2('Imprimir', 'abre a impressão do Android'), h('i', { html:I.print, style:{ display:'flex', color:'var(--accent)' } })));
    mais.replaceChildren(...ms);
  }
  const opcoes = () => ({ fmt:st.fmt, carimbo:st.car ? st.tipo : 'nenhum', numerar:st.car && numerarAtual(p), marcas:st.marcas });
  pinta();
  const s = sheet({ titulo:'Exportar', corpo:[seg, grp, h('div', { class:'lbl expLbl' }, 'Mais'), mais],
    botoes:[{ t:'Exportar', v:'pri expBtn', fn:() => { exportarDoc(d, p, opcoes()); } }] });
  s.el.classList.add('expSh');
  return s;
}
function dataFisica(d, pinta){
  const s = d.sig || {};
  const inp = h('input', { class:'inp', type:'date', value:s.data || hojeISO() });
  sheet({ titulo:'Data da assinatura', corpo:[h('label', { class:'fld' }, h('span', null, 'Assinatura física, com a data'), inp), h('p', { class:'sgNota' }, 'A data entra no fecho e na tarja do pé da folha.')],
    botoes:[{ t:'Cancelar', v:'ghost' }, { t:'OK', v:'acc', fn:() => { mudarSig(d, { modo:'fisica', data:inp.value || hojeISO() }); pinta(); } }] });
  setTimeout(() => { try{ inp.focus(); if(inp.showPicker) inp.showPicker(); }catch(e){} }, 150);
}
/* PDF de um documento só, com o carimbo e o número real das folhas no processo */
async function pdfDoDoc(d, p, o){
  const opt = { carimbo:o.carimbo || 'nenhum', numerar:!!o.numerar, titulo:d.nome };
  const l = VIEW === 'mesa' && M.p === p ? folhasTela().filter(f => f.d === d) : [];
  if(l.length) return pdfDasFolhas(l, opt);
  const bytes = await bytesDoc(d, p);
  const mk = PDF_MARCAS && d.kind === 'pdf' && temMarcas(d);
  if(opt.carimbo === 'nenhum' && !opt.numerar && !mk) return bytes;
  const out = await PDFLib.PDFDocument.load(bytes, { ignoreEncryption:true });
  if(mk) desenharMarcas(out, vivas(d).map((e, i) => [i, e]));
  const R = await recursos(out, { carimbo:opt.carimbo });
  const F = folhas(p)[d.id] || { ini:1 };
  carimbar(out, R, { carimbo:opt.carimbo, numerar:opt.numerar, numeros:out.getPages().map((_, i) => F.ini + i), deitada:settings.deitada });
  return out.save();
}
async function comMarcas(o, fn){ PDF_MARCAS = !!o.marcas; try{ return await fn(); } finally { PDF_MARCAS = false; } }
async function exportarDoc(d, p, o){
  if(!precisaLibs()) return;
  const b = busy(o.fmt === 'ambos' ? 'Gerando Word e PDF…' : o.fmt === 'word' ? 'Gerando Word…' : 'Gerando PDF…');
  let arqs = [];
  try{
    arqs = await comMarcas(o, async () => {
      const r = [];
      if(o.fmt !== 'word') r.push({ data:await pdfDoDoc(d, p, o), nome:nomeArquivo(d, '.pdf') });
      if(o.fmt !== 'pdf' && d.kind === 'texto') r.push({ data:await buildDocx(htmlDoc(d), d, p), nome:nomeArquivo(d, '.docx') });
      return r;
    });
  }catch(e){ b.end(); console.error(e); return toast(e && e.message === 'vazio' ? 'O documento está vazio.' : 'Não foi possível exportar.'); }
  b.end();
  if(arqs.length === 1) await offer(arqs[0].data, arqs[0].nome); else await offerVarios(arqs);
  aposExportar(d, p);
}
async function imprimirDoc(d, p, o){
  if(!precisaLibs()) return;
  const b = busy('Montando o PDF…');
  let bytes;
  try{ bytes = await comMarcas(o, () => pdfDoDoc(d, p, o)); }catch(e){ b.end(); console.error(e); return toast('Não foi possível montar o PDF.'); }
  b.end();
  imprimirBytes(bytes, nomeArquivo(d, '.pdf'));
}
/* Word e PDF juntos: um compartilhamento só (WhatsApp, Gmail, Drive…) */
async function offerVarios(arqs){
  if(!PWA && window.claude && window.claude.use){ for(const a of arqs) await offer(a.data, a.nome); return; }
  const ext = n => (n.match(/\.([a-z0-9]+)$/i) || [, ''])[1].toLowerCase();
  const files = arqs.map(a => new File([a.data instanceof Blob ? a.data : new Blob([a.data])], a.nome, { type:MIME[ext(a.nome)] || 'application/octet-stream' }));
  let pode = false;
  try{ pode = !!(navigator.canShare && navigator.canShare({ files })); }catch(e){}
  const baixar = () => { files.forEach((f, i) => setTimeout(() => { const a = h('a', { href:URL.createObjectURL(f), download:f.name }); document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000); }, i * 400)); toast(plural(files.length, 'arquivo baixado', 'arquivos baixados') + '.'); };
  sheet({ titulo:'Arquivos prontos', corpo:files.map(f => h('div', { class:'opt expArq' }, h('span', { html:ext(f.name) === 'docx' ? I.word : I.pdf }), h('b', { class:'grow', style:{ overflowWrap:'anywhere' } }, f.name))).concat(
    pode ? [h('p', { class:'muted', style:{ margin:0, fontSize:'13px' } }, (files.length === 2 ? 'Compartilhar manda os dois' : 'Compartilhar manda todos') + ' de uma vez: WhatsApp, Gmail, Drive…')] : []),
  botoes:[
    pode ? { t:'Compartilhar', v:'acc', ic:'share', fn:async () => { try{ await navigator.share({ files, title:files[0].name }); }catch(e){ if(!e || e.name !== 'AbortError') toast('Não foi possível compartilhar. Use Baixar.'); } } } : null,
    { t:'Baixar', v:pode ? 'ghost' : 'pri', ic:'dl', fn:baixar }
  ] });
}

/* ---------- módulo pré-minuta: do 1º documento (DFD ou Despacho inicial) até o despacho que manda à Secretaria de Gestão ---------- */
const FIM_PRE = { licitacoes:'desp-etp', aditivos:'desp-aut' };
const textoHtml = d => (d.html || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
const ehMarcador = d => d.tipo === 'capa';
const ehPops = d => /\bPOPS\b|preliminar sint[eé]tica/i.test((d.vagaNome || '') + ' ' + (d.nome || ''));
function faixaPreMinuta(p){
  const linha = p.docs.filter(d => d.linha && !d.pai);
  const ini = linha.find(d => d.kind === 'texto' && !ehMarcador(d));
  if(!ini) return null;
  const i0 = linha.indexOf(ini);
  let fim = linha.find((d, i) => i >= i0 && d.slot && d.slot === FIM_PRE[p.cat]);
  if(!fim) fim = linha.filter((d, i) => i > i0 && d.kind === 'texto' && (d.tipo === 'desp' || /^despacho/i.test(d.nome))).find(d => /secretaria (municipal )?de gest[aã]o|minuta/i.test(textoHtml(d)));
  if(!fim) return null;
  const principais = linha.slice(i0, linha.indexOf(fim) + 1);
  return { ini, fim, principais };
}
function rotuloPreMinuta(p){
  const f = faixaPreMinuta(p);
  if(!f) return 'falta o despacho que manda à Secretaria de Gestão';
  return 'do ' + (f.ini.slot === 'desp-ini' || f.ini.tipo === 'desp' ? 'Despacho inicial' : f.ini.nome) + ' até o despacho pré-minuta, num PDF só';
}
async function garantirMesa(p){
  if(!(VIEW === 'mesa' && M.p === p)) abrirMesa(p);
  await new Promise(r => setTimeout(r, 300));
  try{ await diagFila; }catch(e){}
  await new Promise(r => setTimeout(r, 150));
  try{ await diagFila; }catch(e){}
}
/* as folhas da pré-minuta, na ordem: folha-marcador vazia fica de fora; a POPS vem logo depois do 1º documento */
function folhasPreMinuta(p, f){
  const docsOk = new Set();
  for(const d of f.principais){
    const filhos = p.docs.filter(x => x.pai === d.id && x.linha);
    if(ehMarcador(d) && !filhos.some(x => x.kind === 'pdf')) continue;
    docsOk.add(d); filhos.forEach(x => docsOk.add(x));
  }
  let l = folhasTela().filter(x => docsOk.has(x.d));
  const pops = l.filter(x => x.d.kind === 'pdf' && ehPops(x.d));
  if(pops.length){
    l = l.filter(x => !pops.includes(x));
    let k = 0; while(k < l.length && l[k].d === f.ini) k++;
    l.splice(k, 0, ...pops);
  }
  const n0 = l.length ? l[0].fl : 1;
  return l.map((x, i) => Object.assign({}, x, { fl:n0 + i }));
}
async function preMinutaPdf(p, o){
  if(!precisaLibs()) return;
  o = o || { carimbo:carimboAtual(p), numerar:numerarAtual(p), marcas:false };
  salvarTudo();
  const f = faixaPreMinuta(p);
  if(!f) return toast('Falta o despacho que manda à Secretaria de Gestão para a minuta. Inclua esse despacho e tente de novo.', { ms:5000 });
  const b = busy('Montando a pré-minuta…');
  let bytes, l;
  try{
    await garantirMesa(p);
    l = folhasPreMinuta(p, f);
    if(!l.length) throw new Error('sem folhas');
    bytes = await comMarcas(o, () => pdfDasFolhas(l, { carimbo:o.carimbo || 'nenhum', numerar:!!o.numerar, titulo:'Pré-minuta – ' + tituloProc(p) }));
  }catch(e){ b.end(); console.error(e); return toast('Não foi possível montar a pré-minuta: ' + (e.message || e)); }
  b.end();
  const nome = safeName('Pré-minuta – ' + (p.ficha.num ? p.ficha.num + ' – ' : '') + (p.ficha.objeto || tituloProc(p)).slice(0, 60), '.pdf');
  if(o.como === 'imprimir') return imprimirBytes(bytes, nome);
  offer(bytes, nome);
}

/* ===== q_mesa6.js ===== */
/* =====================================================================
   Etapa 6 — Mesa de PDF ampliada (sem OCR)
   + da cápsula aberta (só na Mesa de PDF): Reordenar · Tirar · Separar · Juntar ·
   Foto → PDF · Buscar texto · Copiar o texto da folha · Dividir para enviar.
   Camada de texto nas folhas de PDF: segurar e arrastar seleciona; Copiar e Marca-texto
   (com comentário) como no texto; a marca vai para o arquivo só com "com marcações".
   Aviso e limite para arquivos acima de 100 MB; "aguarde" com andamento nas pesadas.
   ===================================================================== */
const MB = 1024 * 1024, LIM_GRANDE = 100 * MB;
Object.assign(I, {
  ordem:P_('<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/><path d="M15 4h3a2 2 0 0 1 2 2v3M9 20H6a2 2 0 0 1-2-2v-3"/><path d="M18 7l2 2 2-2M6 17l-2-2-2 2"/>'),
  tesoura:P_('<circle cx="6" cy="7" r="2.6"/><circle cx="6" cy="17" r="2.6"/><path d="M8.2 8.4 20 17M8.2 15.6 20 7"/>'),
  juntar:P_('<rect x="3" y="4" width="8" height="11" rx="1.5"/><rect x="13" y="4" width="8" height="11" rx="1.5"/><path d="M7 18v2h10v-2M12 15v5"/>'),
  fotoPdf:P_('<path d="M4 8h3l2-2.5h6L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.2"/>'),
  dividir:P_('<rect x="5" y="3" width="14" height="7" rx="1.5"/><rect x="5" y="14" width="14" height="7" rx="1.5"/><path d="M3 12h2M9 12h2M13 12h2M19 12h2"/>'),
  galeria:P_('<rect x="3.5" y="5" width="17" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M4 17l5-4.5 3.5 3 3-2.5 4.5 4"/>'),
  textoPg:P_('<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8.5 8h7M8.5 11.5h7M8.5 15h4.5"/>')
});
const mbTxt = n => n < MB ? Math.max(1, Math.round(n / 1024)) + ' KB' : (n / MB < 10 ? (Math.round(n / MB * 10) / 10) : Math.round(n / MB)).toString().replace('.', ',') + ' MB';

/* ---------- o + da cápsula aberta ---------- */
(function(){
  const bot = $('aBot'), grade = bot.querySelector('.capGrade'); if(!grade) return;
  const b = h('button', { class:'capMais', 'aria-label':'Mais ferramentas de PDF', html:I.plusBold });
  b.addEventListener('click', ev => { ev.stopPropagation(); if(!M.editing) menuMesaMais(b); });
  grade.append(b);
})();
function menuMesaMais(ancora){
  if(!M.p) return;
  popMenu(ancora, [
    { t:'Reordenar páginas', sub:'segurar e arrastar', ic:'ordem', fn:() => organizar('ordem') },
    { t:'Tirar páginas', sub:'marque as que saem', ic:'trash', fn:() => organizar('tirar') },
    { t:'Separar páginas', sub:'as marcadas viram outro arquivo', ic:'tesoura', fn:() => organizar('separar') },
    { t:'Juntar arquivos', sub:'os da mesa num arquivo só', ic:'juntar', fn:() => juntarSheet() },
    '-',
    { t:'Foto → PDF', sub:'várias fotos num PDF só', ic:'fotoPdf', fn:() => fotoPdfSheet() },
    { t:'Buscar texto', sub:'em PDF que tem texto', ic:'search', fn:() => buscaAbrir() },
    { t:'Copiar o texto desta folha', sub:'ou segure no texto para escolher', ic:'textoPg', fn:() => copiarTextoFolha() },
    '-',
    { t:'Dividir para enviar', sub:'partes que cabem no limite', ic:'dividir', fn:() => dividirSheet() }
  ], { chave:'mesaMais' });
}

/* =====================================================================
   Texto das folhas de PDF (pdf.js), com cache
   ===================================================================== */
const TXC = new Map();
function textoDaPagina(d, e){
  if(!d || !e || e.s < 0 || !temPdfjs()) return Promise.resolve({ its:[] });
  const k = d.fileId + ':' + e.s;
  if(!TXC.has(k)){
    TXC.set(k, (async () => {
      const bytes = await bytesDe(d.fileId); if(!bytes) return { its:[] };
      const pdf = await getPdf(d.fileId, bytes), pg = await pdf.getPage(e.s + 1);
      const tc = await pg.getTextContent();
      return { its:tc.items.filter(it => typeof it.str === 'string').map(it => ({ s:it.str, t:it.transform, w:it.width, h:it.height, eol:!!it.hasEOL })) };
    })().catch(err => { console.warn('texto do pdf', err); TXC.delete(k); return { its:[] }; }));
    while(TXC.size > 600) TXC.delete(TXC.keys().next().value);
  }
  return TXC.get(k);
}
async function vpDaFolha(d, e, cssW){
  const bytes = await bytesDe(d.fileId); if(!bytes) return null;
  const pdf = await getPdf(d.fileId, bytes), pg = await pdf.getPage(e.s + 1);
  const rot = ((pg.rotate + (e.r || 0)) % 360 + 360) % 360, v1 = pg.getViewport({ scale:1, rotation:rot });
  return pg.getViewport({ scale:cssW / v1.width, rotation:rot });
}
const pgElDe = (d, e) => pagesEl.querySelector('.page.pdf[data-doc="' + d.id + '"][data-i="' + d.pl.indexOf(e) + '"]');
/* chamado por desenharPg (f_mesa) depois de desenhar cada folha de PDF */
async function aposDesenharPdf(pg, pdf, e, w){
  if(e.s < 0){ pg._vp = null; pg.querySelectorAll('.tlay,.pmkL,.bHitL').forEach(x => x.remove()); return; }
  const d = docById(pg.dataset.doc); if(!d) return;
  const page = await pdf.getPage(e.s + 1);
  const rot = ((page.rotate + (e.r || 0)) % 360 + 360) % 360, v1 = page.getViewport({ scale:1, rotation:rot });
  pg._vp = page.getViewport({ scale:w / v1.width, rotation:rot });
  const { its } = await textoDaPagina(d, e);
  if(!pg.isConnected) return;
  montarCamada(pg, pg._vp, its);
  pintarMarcas(pg); pintarHits(pg);
}
const MED = document.createElement('canvas').getContext('2d');
function montarCamada(pg, vp, its){
  pg.querySelectorAll('.tlay').forEach(x => x.remove());
  if(!its.some(it => it.s.trim())) return;
  const lay = h('div', { class:'tlay' }), U = pdfjsLib.Util, frag = document.createDocumentFragment();
  for(const it of its){
    if(it.s){
      const tx = U.transform(vp.transform, it.t), fh = Math.hypot(tx[2], tx[3]);
      if(fh >= 1){
        const ang = Math.atan2(tx[1], tx[0]), asc = 0.8;
        const sp = document.createElement('span'); sp.textContent = it.s;
        sp.style.left = (tx[4] + asc * fh * Math.sin(ang)) + 'px'; sp.style.top = (tx[5] - asc * fh * Math.cos(ang)) + 'px'; sp.style.fontSize = fh + 'px';
        MED.font = fh + 'px sans-serif';
        const nat = MED.measureText(it.s).width, alvo = Math.abs(it.w) * vp.scale, sx = nat > 0 && alvo > 0 ? alvo / nat : 1;
        let tf = ''; if(Math.abs(ang) > 0.001) tf += 'rotate(' + ang + 'rad) '; if(Math.abs(sx - 1) > 0.01) tf += 'scaleX(' + sx + ')';
        if(tf) sp.style.transform = tf;
        frag.append(sp);
      }
    }
    if(it.eol) frag.append(document.createElement('br'));
  }
  lay.append(frag); pg.append(lay);
}

/* ---------- selecionar texto no PDF: Copiar e Marca-texto ---------- */
const elDe = n => n && (n.nodeType === 1 ? n : n.parentElement);
function rangePdf(){
  const s = window.getSelection(); if(!s || !s.rangeCount || s.isCollapsed) return null;
  const r = s.getRangeAt(0), a = elDe(r.startContainer), b = elDe(r.endContainer);
  if(!(a && a.closest('.tlay')) && !(b && b.closest('.tlay'))) return null;
  return r;
}
let _selPdfT = 0;
document.addEventListener('selectionchange', () => { clearTimeout(_selPdfT); _selPdfT = setTimeout(() => { if(rangePdf()) mostrarAcoesPdf(); }, 260); });
function mostrarAcoesPdf(){
  esconderAcoes();
  const r = rangePdf(); if(!r) return;
  const box = h('div', { id:'selAcoes', class:'pdfA' },
    h('button', { class:'saB', onclick:() => { const t = textoDaSelPdf(); if(t) copiarTexto(t, 'Trecho copiado.'); limparSelPdf(); } }, h('i', { html:I.copy }), 'Copiar'),
    h('button', { class:'saB mt', onclick:() => marcarPdf() }, h('i', { html:I.highlighter }), 'Marca-texto'));
  box.addEventListener('pointerdown', ev => ev.preventDefault());
  document.body.append(box);
  posAcoes();
}
function textoDaSelPdf(){ const s = window.getSelection(); return s ? s.toString().replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim() : ''; }
function limparSelPdf(){ const s = window.getSelection(); if(s) s.removeAllRanges(); esconderAcoes(); }
function marcarPdf(){
  const r = rangePdf(); if(!r) return;
  const rects = Array.from(r.getClientRects()).filter(q => q.width > 1 && q.height > 1);
  const porPg = new Map();
  pagesEl.querySelectorAll('.page.pdf').forEach(pg => {
    if(!pg._vp) return;
    const b = pg.getBoundingClientRect();
    rects.forEach(q => {
      const cx = q.left + q.width / 2, cy = q.top + q.height / 2;
      if(cx < b.left || cx > b.right || cy < b.top || cy > b.bottom) return;
      if(!porPg.has(pg)) porPg.set(pg, { b, l:[] });
      porPg.get(pg).l.push(q);
    });
  });
  if(!porPg.size) return limparSelPdf();
  histPush('marca-texto');
  porPg.forEach(({ b, l }, pg) => {
    const d = docById(pg.dataset.doc), e = d && d.pl[+pg.dataset.i]; if(!e) return;
    const vp = pg._vp, k = b.width / (pg.clientWidth || b.width);
    const rs = unirRetas(l.map(q => {
      const p1 = vp.convertToPdfPoint((q.left - b.left) / k, (q.top - b.top) / k), p2 = vp.convertToPdfPoint((q.right - b.left) / k, (q.bottom - b.top) / k);
      return [Math.min(p1[0], p2[0]), Math.min(p1[1], p2[1]), Math.max(p1[0], p2[0]), Math.max(p1[1], p2[1])].map(v => Math.round(v * 10) / 10);
    }));
    (e.mk = e.mk || []).push({ id:uid(), r:rs });
    pintarMarcas(pg);
  });
  limparSelPdf(); touch(M.p); saveDB();
  toast('Marcado. Toque no trecho para escrever um comentário.', { ms:2200 });
}
/* junta os pedacinhos de uma mesma linha num retângulo só */
function unirRetas(l){
  l = l.slice().sort((a, b) => (b[3] - a[3]) || (a[0] - b[0]));
  const out = [];
  for(const r of l){
    const u = out.find(o => Math.abs(o[1] - r[1]) < (r[3] - r[1]) * 0.5 && Math.abs(o[3] - r[3]) < (r[3] - r[1]) * 0.5 && r[0] <= o[2] + (r[3] - r[1]) * 1.2 && r[2] >= o[0] - (r[3] - r[1]) * 1.2);
    if(u){ u[0] = Math.min(u[0], r[0]); u[1] = Math.min(u[1], r[1]); u[2] = Math.max(u[2], r[2]); u[3] = Math.max(u[3], r[3]); }
    else out.push(r.slice());
  }
  return out;
}
function retaNaTela(vp, r){ const v = vp.convertToViewportRectangle(r); return { x:Math.min(v[0], v[2]), y:Math.min(v[1], v[3]), w:Math.abs(v[2] - v[0]), h:Math.abs(v[3] - v[1]) }; }
function pintarMarcas(pg){
  pg.querySelectorAll('.pmkL').forEach(x => x.remove());
  const d = docById(pg.dataset.doc), e = d && d.pl[+pg.dataset.i];
  if(!e || !e.mk || !e.mk.length || !pg._vp) return;
  const lay = h('div', { class:'pmkL' });
  e.mk.forEach(m => m.r.forEach(r => {
    const q = retaNaTela(pg._vp, r);
    const el = h('div', { class:'pmk' + (m.c ? ' com' : ''), dataset:{ mk:m.id }, style:{ left:q.x + 'px', top:q.y + 'px', width:q.w + 'px', height:q.h + 'px' } });
    el.addEventListener('click', ev => { ev.stopPropagation(); if(M.fsel || M.editing) return; abrirComentarioPdf(pg, e, m, el); });
    lay.append(el);
  }));
  pg.append(lay);
}
function abrirComentarioPdf(pg, e, m, el){
  fecharComentario();
  const txa = h('textarea', { class:'txa', rows:'3', placeholder:'Comentário (pode ficar vazio)' }); txa.value = m.c || '';
  const guardar = () => { const v = txa.value.trim(); if((m.c || '') === v) return; if(v) m.c = v; else delete m.c; touch(M.p); saveDB(); pintarMarcas(pg); };
  const box = h('div', { id:'mtCom' }, h('b', null, 'Comentário'), txa,
    h('div', { class:'row' },
      h('button', { class:'btn sm ghost danger', onclick:() => { histPush('marca-texto'); fecharComentario(true); e.mk = e.mk.filter(x => x !== m); if(!e.mk.length) delete e.mk; touch(M.p); saveDB(); pintarMarcas(pg); } }, 'Tirar marca'),
      h('button', { class:'btn sm acc', onclick:() => fecharComentario() }, 'Pronto')));
  box._guardar = guardar;
  document.body.append(box);
  const r = el.getBoundingClientRect(), W = window.innerWidth, bw = Math.min(320, W - 24);
  box.style.width = bw + 'px'; box.style.left = Math.max(12, Math.min(W - bw - 12, r.left)) + 'px';
  const bh = box.offsetHeight, dr = docEl.getBoundingClientRect();
  box.style.top = (r.bottom + 10 + bh < dr.bottom - 70 ? r.bottom + 10 : Math.max(dr.top + 6, r.top - bh - 10)) + 'px';
  setTimeout(() => document.addEventListener('pointerdown', foraComentario, true), 0);
}
const temMarcasPdf = l => l.some(f => f.e && !f.e.d && f.e.mk && f.e.mk.length);
/* no arquivo: o marca-texto sai por cima do texto, no mesmo tom da tela */
function desenharMarcas(out, pares){
  const cor = PDFLib.rgb(0.933, 0.957, 0.737), bm = PDFLib.BlendMode && PDFLib.BlendMode.Multiply;
  pares.forEach(([i, e]) => {
    if(!e || !e.mk || !e.mk.length || i >= out.getPageCount()) return;
    const page = out.getPage(i);
    e.mk.forEach(m => m.r.forEach(r => {
      const o = { x:r[0], y:r[1], width:r[2] - r[0], height:r[3] - r[1], color:cor, opacity:bm ? 1 : 0.55 };
      if(bm) o.blendMode = bm;
      page.drawRectangle(o);
    }));
  });
}

/* ---------- copiar o texto da folha que está na tela ---------- */
async function copiarTextoFolha(){
  const f = PGI.on ? PGI.lista[PGI.i] : folhaAtual(); if(!f) return toast('Nenhuma folha na tela.');
  if(!f.e){ const b = f.d && bodyDoDoc(f.d); return b ? copiarTexto(b.innerText.trim(), 'Texto do documento copiado.') : null; }
  if(!temPdfjs()) return toast('O leitor de PDF ainda está carregando.');
  const { its } = await textoDaPagina(f.d, f.e);
  const t = its.map(it => it.s + (it.eol ? '\n' : '')).join('').replace(/[ \t]+\n/g, '\n').trim();
  if(!t) return toast('Esta folha não tem texto (é imagem). O reconhecimento de texto (OCR) fica para a próxima etapa.', { ms:4500 });
  copiarTexto(t, 'Texto da folha ' + f.fl + ' copiado.');
}

/* =====================================================================
   Buscar texto (textos e PDFs da mesa): todas as ocorrências, ▲ ▼
   ===================================================================== */
const BUSCA = { q:'', hits:[], i:-1, seq:0, bar:null };
const n1 = c => c.normalize('NFD')[0].toLowerCase();
const normIgual = s => Array.from(s).map(n1).join('');
function buscaAbrir(){
  if(!M.p) return;
  if(BUSCA.bar){ BUSCA.bar.querySelector('input').focus(); return; }
  esconderAcoes(); if(CAP.aberta) capsula(false);
  const inp = h('input', { type:'search', class:'bInp', placeholder:'Buscar nesta mesa', enterkeyhint:'search', autocomplete:'off' });
  const cont = h('span', { class:'bCont' });
  const bt = (ic, rot, fn) => h('button', { class:'bBt', 'aria-label':rot, html:I[ic], onclick:fn });
  const bar = h('div', { id:'buscaBar' }, h('span', { class:'bIc', html:I.search }), inp, cont,
    bt('chevU', 'Anterior', () => buscaIr(BUSCA.i - 1)), bt('chevD', 'Próxima', () => buscaIr(BUSCA.i + 1)), bt('x', 'Fechar a busca', () => buscaFechar()));
  bar.addEventListener('pointerdown', ev => { if(!ev.target.closest('input')) ev.preventDefault(); });
  document.body.append(bar); BUSCA.bar = bar;
  let t = 0;
  inp.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => buscar(inp.value), 380); });
  inp.addEventListener('keydown', ev => { if(ev.key === 'Enter'){ ev.preventDefault(); clearTimeout(t); if(inp.value.trim() === BUSCA.q && BUSCA.hits.length) buscaIr(BUSCA.i + (ev.shiftKey ? -1 : 1)); else buscar(inp.value); } if(ev.key === 'Escape') buscaFechar(); });
  setTimeout(() => inp.focus(), 60);
}
function buscaFechar(){
  BUSCA.seq++; BUSCA.q = ''; BUSCA.hits = []; BUSCA.i = -1;
  if(BUSCA.bar){ BUSCA.bar.remove(); BUSCA.bar = null; }
  if(window.CSS && CSS.highlights){ CSS.highlights.delete('busca'); CSS.highlights.delete('buscaAt'); }
  pagesEl.querySelectorAll('.bHitL').forEach(x => x.remove());
}
function contBusca(t){ if(BUSCA.bar) BUSCA.bar.querySelector('.bCont').textContent = t; }
async function buscar(q, manter){
  q = String(q || '').replace(/\s+/g, ' ').trim();
  const seq = ++BUSCA.seq, velho = BUSCA.i;
  BUSCA.q = q; BUSCA.hits = []; BUSCA.i = -1; if(!manter) pintarBusca();
  if(q.length < 2){ contBusca(''); return; }
  const alvo = normIgual(q), hits = [], docs = M.p.docs.filter(d => d.linha);
  const totPg = docs.reduce((n, d) => n + (d.kind === 'pdf' ? vivas(d).length : 0), 0);
  let feitas = 0;
  for(const d of docs){
    if(d.kind === 'texto'){
      const b = bodyDoDoc(d); if(!b) continue;
      const w = document.createTreeWalker(b, NodeFilter.SHOW_TEXT, SEM_VAO); let tn;
      while((tn = w.nextNode())){
        const s = normIgual(tn.data); let i = s.indexOf(alvo);
        while(i >= 0){ const r = document.createRange(); r.setStart(tn, i); r.setEnd(tn, i + alvo.length); hits.push({ tipo:'txt', d, r }); i = s.indexOf(alvo, i + alvo.length); }
      }
    } else if(d.kind === 'pdf'){
      for(const e of d.pl){
        if(e.d || e.s < 0) continue;
        const { its } = await textoDaPagina(d, e); if(seq !== BUSCA.seq) return;
        feitas++; if(totPg > 15 && feitas % 5 === 0) contBusca('folha ' + feitas + ' de ' + totPg + '…');
        acharNaPagina(its, alvo).forEach(rs => hits.push({ tipo:'pdf', d, e, rs }));
      }
    }
  }
  if(seq !== BUSCA.seq) return;
  BUSCA.hits = hits;
  if(manter){ BUSCA.i = hits.length ? Math.min(Math.max(velho, 0), hits.length - 1) : -1; contBusca(hits.length ? (BUSCA.i + 1) + ' de ' + hits.length : 'nada'); pintarBusca(); return; }
  if(!hits.length){ contBusca('nada'); pintarBusca(); toast(totPg && !docs.some(d => d.kind === 'texto') ? 'Não achei “' + q + '”. Se o PDF for escaneado (imagem), a busca só vai funcionar com o OCR.' : 'Não achei “' + q + '”.', { ms:3200 }); return; }
  buscaIr(0);
}
/* acha o trecho no texto da folha; devolve os retângulos (no espaço do PDF) de cada ocorrência */
function acharNaPagina(its, alvo){
  const mapa = []; let s = '';
  its.forEach((it, k) => {
    const t = normIgual(it.s);
    for(let j = 0; j < t.length; j++){ mapa.push([k, j]); }
    s += t;
    if(it.eol || (it.s && !/\s$/.test(it.s))){ s += ' '; mapa.push([k, -1]); }
  });
  const achados = []; let i = s.replace(/\s+/g, m => ' '.repeat(m.length)).indexOf(alvo);
  const ss = s.replace(/\s+/g, m => ' '.repeat(m.length));
  while(i >= 0){
    const partes = new Map();
    for(let c = i; c < i + alvo.length; c++){ const [k, j] = mapa[c]; if(j < 0) continue; const p = partes.get(k); if(p){ p[1] = j + 1; } else partes.set(k, [j, j + 1]); }
    const rs = []; partes.forEach(([a, b], k) => rs.push(retaDoItem(its[k], a, b)));
    if(rs.length) achados.push(rs);
    i = ss.indexOf(alvo, i + Math.max(1, alvo.length));
  }
  return achados;
}
function retaDoItem(it, a, b){
  const t = it.t, n = Math.max(1, it.s.length), sx = Math.hypot(t[0], t[1]) || 1, sy = Math.hypot(t[2], t[3]) || it.h || 10;
  const ux = t[0] / sx, uy = t[1] / sx, vx = t[2] / sy, vy = t[3] / sy, hh = it.h || sy;
  const x0 = it.w * a / n, x1 = it.w * b / n, y0 = -0.22 * hh, y1 = 0.9 * hh;
  const pts = [[x0, y0], [x1, y0], [x0, y1], [x1, y1]].map(([x, y]) => [t[4] + ux * x + vx * y, t[5] + uy * x + vy * y]);
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}
function pintarBusca(){
  if(window.CSS && CSS.highlights && window.Highlight){
    const txt = BUSCA.hits.filter(x => x.tipo === 'txt'), at = BUSCA.hits[BUSCA.i];
    CSS.highlights.set('busca', new Highlight(...txt.filter(x => x !== at).map(x => x.r)));
    if(at && at.tipo === 'txt') CSS.highlights.set('buscaAt', new Highlight(at.r)); else CSS.highlights.delete('buscaAt');
  }
  pagesEl.querySelectorAll('.page.pdf').forEach(pintarHits);
}
function pintarHits(pg){
  pg.querySelectorAll('.bHitL').forEach(x => x.remove());
  if(!BUSCA.hits.length || !pg._vp) return;
  const d = docById(pg.dataset.doc), e = d && d.pl[+pg.dataset.i]; if(!e) return;
  const meus = BUSCA.hits.filter(x => x.tipo === 'pdf' && x.e === e); if(!meus.length) return;
  const lay = h('div', { class:'bHitL' }), at = BUSCA.hits[BUSCA.i];
  meus.forEach(x => x.rs.forEach(r => { const q = retaNaTela(pg._vp, r); lay.append(h('div', { class:'bHit' + (x === at ? ' at' : ''), style:{ left:(q.x - 1) + 'px', top:(q.y - 1) + 'px', width:(q.w + 2) + 'px', height:(q.h + 2) + 'px' } })); }));
  pg.append(lay);
}
async function buscaIr(i){
  const n = BUSCA.hits.length; if(!n) return;
  BUSCA.i = ((i % n) + n) % n;
  const x = BUSCA.hits[BUSCA.i];
  contBusca((BUSCA.i + 1) + ' de ' + n);
  pintarBusca();
  const d0 = docEl.getBoundingClientRect();
  if(x.tipo === 'txt'){
    const rc = x.r.getBoundingClientRect(); docEl.scrollTop += rc.top - d0.top - docEl.clientHeight / 3; aoRolar(); return;
  }
  const pg = pgElDe(x.d, x.e); if(!pg) return;
  const vp = pg._vp || await vpDaFolha(x.d, x.e, pg.clientWidth);
  const y = vp ? retaNaTela(vp, x.rs[0]).y : 0;
  docEl.scrollTop = Math.max(0, pg.offsetTop + y - docEl.clientHeight / 3); aoRolar();
}

/* =====================================================================
   Organizar páginas: reordenar (segurar e arrastar), tirar, separar
   ===================================================================== */
function unidadesDaMesa(p){
  const out = [];
  p.docs.filter(d => d.linha).forEach(d => {
    if(d.kind === 'pdf') d.pl.forEach((e, i) => { if(!e.d) out.push({ k:d.id + ':' + i, tipo:'pdf', d, e }); });
    else out.push({ k:d.id, tipo:'txt', d });
  });
  const F = folhas(p); let n = {};
  out.forEach(u => { const f = F[u.d.id] || { ini:1 }; const j = n[u.d.id] || 0; n[u.d.id] = j + 1; u.fl = f.ini + j; if(u.tipo === 'txt') u.fim = f.fim; });
  return out;
}
function organizar(modo){
  const p = M.p; if(!p) return;
  salvarTudo(); if(CAP.aberta) capsula(false); esconderAcoes();
  const base = unidadesDaMesa(p);
  if(!base.length) return toast('Inclua um PDF ou uma foto primeiro.');
  if(modo !== 'ordem' && !base.some(u => u.tipo === 'pdf')) return toast('Não há páginas de PDF na mesa.');
  const ordem = base.slice(), marc = new Set();
  const tit = { ordem:'Reordenar páginas', tirar:'Tirar páginas', separar:'Separar páginas' }[modo];
  const grade = h('div', { class:'orgG' });
  const dica = h('p', { class:'sgNota orgDica' }, modo === 'ordem' ? 'Segure a página e arraste para o lugar certo.' : 'Toque nas páginas para marcar. Segure e arraste para mudar a ordem.');
  const todas = modo === 'ordem' ? null : h('button', { class:'btn sm ghost orgTodas', onclick:() => { const ps = ordem.filter(u => u.tipo === 'pdf'); if(ps.every(u => marc.has(u.k))) marc.clear(); else ps.forEach(u => marc.add(u.k)); pintarMarc(); } }, 'Todas');
  const s = sheet({ titulo:tit, cheio:true, cabExtra:todas, corpo:[dica, grade] });
  s.el.classList.add('orgSh'); if(modo !== 'ordem') s.el.classList.add('marca');
  const cards = new Map();
  const card = u => {
    if(cards.has(u.k)) return cards.get(u.k);
    const cv = u.tipo === 'pdf' ? h('canvas') : null;
    const ratio = u.tipo === 'pdf' ? (() => { const [w, hh] = tamanhoPagina(u.d, u.e); return w + ' / ' + hh; })() : '210 / 297';
    const c = h('div', { class:'orgC' + (u.tipo === 'txt' ? ' txt' : ''), dataset:{ k:u.k } },
      h('div', { class:'orgF', style:{ aspectRatio:ratio } }, cv || h('span', { class:'orgT' }, h('b', null, 'Texto'), u.d.nome), h('i', { class:'orgV', html:I.check })),
      h('small', null, u.tipo === 'txt' ? (u.fim > u.fl ? 'fls. ' + u.fl + '–' + u.fim : 'fls. ' + u.fl) : 'fls. ' + u.fl));
    c._u = u; c._cv = cv; cards.set(u.k, c); return c;
  };
  const pintar = () => { grade.replaceChildren(...ordem.map(card)); pintarMarc(); };
  const pintarMarc = () => {
    cards.forEach((c, k) => c.classList.toggle('on', marc.has(k)));
    if(todas){ const ps = ordem.filter(u => u.tipo === 'pdf'); todas.textContent = ps.length && ps.every(u => marc.has(u.k)) ? 'Nenhuma' : 'Todas'; }
    rodape();
  };
  const mudou = () => ordem.map(u => u.k).join('|') !== base.map(u => u.k).join('|');
  const rodape = () => {
    const n = marc.size;
    if(modo === 'ordem') s.rodape([{ t:'Cancelar', v:'ghost' }, { t:'Pronto', v:'acc', fn:() => { if(mudou()){ histPush('reordenar'); aplicarOrdem(p, ordem); depoisDeMudar('Páginas na nova ordem.'); } } }]);
    else if(modo === 'tirar') s.rodape([{ t:'Cancelar', v:'ghost' }, { t:n ? 'Tirar ' + plural(n, 'página', 'páginas') : 'Marque as páginas', v:'acc', disabled:!n, fn:() => tirarPaginas(p, ordem, marc, mudou()) }]);
    else s.rodape([{ t:'Cancelar', v:'ghost' }, { t:n ? 'Separar ' + plural(n, 'página', 'páginas') : 'Marque as páginas', v:'acc', disabled:!n, fn:() => { separarPaginas(p, ordem, marc, mudou()); } }]);
  };
  pintar();
  miniaturas(ordem.map(card), s);
  /* tocar marca; segurar e arrastar muda a ordem */
  let pr = null;
  const achar = (x, y) => { const el = document.elementFromPoint(x, y); return el && el.closest && el.closest('.orgC'); };
  grade.addEventListener('pointerdown', ev => {
    const c = ev.target.closest('.orgC'); if(!c || ev.button > 0) return;
    pr = { c, x:ev.clientX, y:ev.clientY, id:ev.pointerId, arr:false };
    pr.t = setTimeout(() => {
      if(!pr) return;
      pr.arr = true; c.classList.add('ph');
      const r = c.getBoundingClientRect();
      pr.g = c.cloneNode(true); pr.g.classList.add('orgGhost'); pr.g.classList.remove('ph');
      const gc = pr.g.querySelector('canvas'); if(gc && c._cv){ gc.width = c._cv.width; gc.height = c._cv.height; gc.getContext('2d').drawImage(c._cv, 0, 0); }
      Object.assign(pr.g.style, { width:r.width + 'px', left:r.left + 'px', top:r.top + 'px' });
      pr.dx = pr.x - r.left; pr.dy = pr.y - r.top;
      document.body.append(pr.g);
      if(navigator.vibrate) try{ navigator.vibrate(15); }catch(e){}
    }, 320);
  });
  grade.addEventListener('touchmove', ev => { if(pr && pr.arr) ev.preventDefault(); }, { passive:false });
  window.addEventListener('pointermove', mover);
  function mover(ev){
    if(!pr || ev.pointerId !== pr.id) return;
    if(!pr.arr){ if(Math.hypot(ev.clientX - pr.x, ev.clientY - pr.y) > 10){ clearTimeout(pr.t); pr = null; } return; }
    ev.preventDefault();
    pr.g.style.left = (ev.clientX - pr.dx) + 'px'; pr.g.style.top = (ev.clientY - pr.dy) + 'px';
    const sc = s.corpo, sr = sc.getBoundingClientRect();
    if(ev.clientY < sr.top + 50) sc.scrollTop -= 12; else if(ev.clientY > sr.bottom - 50) sc.scrollTop += 12;
    pr.g.style.visibility = 'hidden'; const alvo = achar(ev.clientX, ev.clientY); pr.g.style.visibility = '';
    if(!alvo || alvo === pr.c || !grade.contains(alvo)) return;
    const i = ordem.indexOf(pr.c._u), j = ordem.indexOf(alvo._u); if(i < 0 || j < 0) return;
    ordem.splice(i, 1); ordem.splice(j, 0, pr.c._u);
    grade.insertBefore(pr.c, j > i ? alvo.nextSibling : alvo);
  }
  const soltar = ev => {
    if(!pr || (ev && ev.pointerId !== pr.id)) return;
    clearTimeout(pr.t);
    const d = pr; pr = null;
    if(d.arr){ d.c.classList.remove('ph'); if(d.g) d.g.remove(); d.c._solto = Date.now(); rodape(); return; }
  };
  window.addEventListener('pointerup', soltar); window.addEventListener('pointercancel', soltar);
  grade.addEventListener('click', ev => {
    const c = ev.target.closest('.orgC'); if(!c || (c._solto && Date.now() - c._solto < 400)) return;
    if(modo === 'ordem') return;
    if(c._u.tipo !== 'pdf') return toast('Texto não se tira por aqui: apague o documento na lista do processo.', { ms:2600 });
    marc.has(c._u.k) ? marc.delete(c._u.k) : marc.add(c._u.k); pintarMarc();
  });
  const fecharOrig = s.fechar;
  s.fechar = v => { window.removeEventListener('pointermove', mover); window.removeEventListener('pointerup', soltar); window.removeEventListener('pointercancel', soltar); s._parar = true; fecharOrig(v); };
}
async function miniaturas(cs, s){
  const larg = Math.max(80, Math.round((s.corpo.clientWidth - 56) / 3));
  for(const c of cs){
    if(s._parar || s.fechado) return;
    if(!c._cv) continue;
    try{
      const u = c._u, bytes = u.e.s < 0 ? null : await bytesDe(u.d.fileId);
      const pdf = bytes ? await getPdf(u.d.fileId, bytes) : null;
      await desenharPaginaPdf(c._cv, pdf, u.e, larg);
    }catch(e){ console.warn('miniatura', e); }
    await sleep(0);
  }
}
/* monta p.docs na ordem escolhida; um arquivo que ficou em pedaços vira "(cont.)" nos pedaços seguintes */
function aplicarOrdem(p, ordem){
  const fora = p.docs.filter(d => !d.linha), semPg = p.docs.filter(d => d.linha && d.kind === 'pdf' && !vivas(d).length);
  const novos = [], usado = new Set(); let run = null;
  for(const u of ordem){
    if(u.tipo === 'txt'){ run = null; novos.push(u.d); continue; }
    if(run && run.orig === u.d){ run.doc.pl.push(u.e); continue; }
    let doc;
    if(!usado.has(u.d)){ usado.add(u.d); doc = u.d; doc.pl = doc.pl.filter(e => e.d); doc._ini = true; }
    else { doc = Object.assign(clone(Object.assign({}, u.d, { pl:[] })), { id:uid(), nome:u.d.nome.replace(/ \(cont\.\)$/, '') + ' (cont.)', pl:[] }); }
    run = { orig:u.d, doc }; doc.pl.push(u.e); novos.push(doc);
  }
  /* páginas retiradas continuam guardadas no fim do arquivo original (para Restaurar) */
  novos.forEach(d => { if(d._ini){ const tiradas = d.pl.filter(e => e.d), vivos = d.pl.filter(e => !e.d); d.pl = vivos.concat(tiradas); delete d._ini; } });
  p.docs = novos.concat(semPg.filter(d => !novos.includes(d)), fora);
  touch(p);
}
function tirarPaginas(p, ordem, marc, mudou){
  histPush('tirar páginas');
  if(mudou) aplicarOrdem(p, ordem);
  const l = ordem.filter(u => marc.has(u.k));
  l.forEach(u => { u.e.d = true; });
  depoisDeMudar();
  toast(plural(l.length, 'página tirada', 'páginas tiradas') + '.', { acao:'Desfazer', fn:() => desfazer(), ms:5000 });
}
async function separarPaginas(p, ordem, marc, mudou){
  const l = ordem.filter(u => marc.has(u.k)); if(!l.length) return;
  const op = await escolher('O que fazer com ' + plural(l.length, 'a página marcada', 'as ' + l.length + ' páginas marcadas'), [
    ['enviar', 'Salvar ou compartilhar só essas páginas', 'um PDF à parte, com carimbo e número como na mesa'],
    ['arquivo', 'Virar um arquivo à parte, aqui na mesa', 'saem do arquivo de origem e ficam logo depois dele'],
    ['processo', 'Incluir num processo', 'entram como documento do processo escolhido']], null);
  if(!op) return;
  const es = new Set(l.map(u => u.e));
  if(op === 'arquivo'){
    histPush('separar páginas');
    if(mudou) aplicarOrdem(p, ordem);
    const porDoc = new Map(); l.forEach(u => { const d = p.docs.find(x => x.kind === 'pdf' && x.pl.includes(u.e)); if(!d) return; if(!porDoc.has(d)) porDoc.set(d, []); porDoc.get(d).push(u.e); });
    let n = 0;
    porDoc.forEach((lista, d) => {
      const novo = Object.assign(clone(d), { id:uid(), nome:d.nome.replace(/ \((separado|cont\.)\)$/, '') + ' (separado)', pl:lista.map(e => clone(e)), pai:null });
      lista.forEach(e => { e.d = true; delete e.mk; });
      p.docs.splice(p.docs.indexOf(d) + 1, 0, novo); n++;
    });
    depoisDeMudar(n === 1 ? 'Páginas separadas num arquivo à parte.' : n + ' arquivos separados.');
    return;
  }
  if(mudou){ histPush('reordenar'); aplicarOrdem(p, ordem); depoisDeMudar(); }
  const fs = folhasTela().filter(f => f.e && es.has(f.e));
  if(op === 'enviar') return exportarFolhas(fs, 'compartilhar');
  pdfIncluirEmProcesso(fs);
}

/* ---------- juntar os arquivos da mesa ---------- */
function juntarSheet(){
  const p = M.p; if(!p) return;
  salvarTudo(); if(CAP.aberta) capsula(false);
  const ds = p.docs.filter(d => d.linha && d.kind === 'pdf' && vivas(d).length);
  if(ds.length < 2) return toast('Para juntar, a mesa precisa ter pelo menos dois arquivos de PDF.');
  const boxes = ds.map(() => h('input', { type:'checkbox', checked:true }));
  const nome = h('input', { class:'inp', value:'PDF juntado ' + dataBR(hojeISO()).replace(/\//g, '-') });
  const s = sheet({ titulo:'Juntar arquivos', corpo:[
    h('div', { class:'sgGrp' }, ds.map((d, i) => h('label', { class:'sgRow' }, h('span', { class:'grow', style:{ overflowWrap:'anywhere' } }, d.nome, h('small', { class:'muted', style:{ display:'block' } }, plural(vivas(d).length, 'página', 'páginas'))), boxes[i]))),
    h('div', { class:'sgGrp', style:{ padding:'10px' } }, h('label', { class:'fld' }, h('span', null, 'Nome do arquivo novo'), nome)),
    h('p', { class:'sgNota' }, 'Os marcados viram um arquivo só, na ordem da mesa, no lugar do primeiro. Dá para desfazer.')],
    botoes:[{ t:'Cancelar', v:'ghost' }, { t:'Juntar', v:'acc', fn:async () => {
      const esc = ds.filter((_, i) => boxes[i].checked);
      if(esc.length < 2){ toast('Marque pelo menos dois arquivos.'); return false; }
      await juntarArquivos(p, esc, nome.value.trim() || 'PDF juntado');
    } }] });
  return s;
}
async function juntarArquivos(p, esc, nome){
  if(!precisaLibs()) return;
  const set = new Set(esc), l = folhasTela().filter(f => f.e && set.has(f.d));
  const tot = esc.reduce((n, d) => n + vivas(d).length, 0);
  const b = busy('Juntando ' + plural(tot, 'página', 'páginas') + '… aguarde');
  try{
    histPush('juntar');
    const bytes = await pdfDasFolhas(l, {});
    const d = await novoDocPdf(p, nome, bytes, 'linha');
    d.pl.forEach((e, i) => { const o = l[i] && l[i].e; if(o && o.mk && o.mk.length) e.mk = clone(o.mk); });
    p.docs = p.docs.filter(x => x !== d);
    const i = p.docs.indexOf(esc[0]); p.docs.splice(i < 0 ? p.docs.length : i, 0, d);
    p.docs = p.docs.filter(x => !set.has(x));
    b.end();
    depoisDeMudar('Arquivos juntados: ' + d.nome + '.');
    irParaDoc(d.id);
  }catch(e){ b.end(); console.error(e); toast('Não foi possível juntar: ' + (e.message || e)); }
}

/* ---------- Foto → PDF: várias fotos num PDF só (com a imagem reduzida) ---------- */
function fotoPdfSheet(){
  if(!M.p) return;
  if(CAP.aberta) capsula(false);
  const fotos = [];
  const lista = h('div', { class:'fpL' }), nome = h('input', { class:'inp', value:'Fotos ' + dataBR(hojeISO()).replace(/\//g, '-') });
  const cam = h('input', { type:'file', accept:'image/*', capture:'environment', class:'arqIn' }), gal = h('input', { type:'file', accept:'image/*', multiple:true, class:'arqIn' });
  const receber = async fs => {
    for(const f of fs){ if(!/^image\//.test(f.type || '') && !RX_IMG.test(f.name || '')) continue; fotos.push({ f, url:URL.createObjectURL(f) }); }
    pintar();
  };
  cam.onchange = () => { const l = Array.from(cam.files || []); cam.value = ''; receber(l); };
  gal.onchange = () => { const l = Array.from(gal.files || []); gal.value = ''; receber(l); };
  const pintar = () => {
    lista.replaceChildren(...fotos.map((x, i) => h('div', { class:'fpC' }, h('img', { src:x.url, alt:'' }), h('small', null, String(i + 1)),
      h('button', { class:'fpX', 'aria-label':'Tirar esta foto', html:I.x, onclick:() => { URL.revokeObjectURL(x.url); fotos.splice(i, 1); pintar(); } }))));
    lista.hidden = !fotos.length;
    s.rodape([{ t:'Cancelar', v:'ghost' }, { t:fotos.length ? 'Fazer o PDF (' + plural(fotos.length, 'foto', 'fotos') + ')' : 'Tire ou escolha as fotos', v:'acc', disabled:!fotos.length, fn:async () => { await fotosParaPdf(fotos.map(x => x.f), nome.value.trim() || 'Fotos'); } }]);
  };
  const s = sheet({ titulo:'Foto → PDF', corpo:[
    h('div', { class:'row', style:{ gap:'10px' } },
      h('button', { class:'btn grow', onclick:() => cam.click() }, h('span', { html:I.camera }), 'Tirar foto'),
      h('button', { class:'btn grow', onclick:() => gal.click() }, h('span', { html:I.galeria }), 'Da galeria')),
    lista,
    h('div', { class:'sgGrp', style:{ padding:'10px' } }, h('label', { class:'fld' }, h('span', null, 'Nome do PDF'), nome)),
    h('p', { class:'sgNota' }, 'Cada foto vira uma folha A4, na ordem acima. As fotos são reduzidas para o PDF ficar leve (bom para enviar).'),
    cam, gal],
    aoFechar:() => fotos.forEach(x => URL.revokeObjectURL(x.url)) });
  pintar();
}
async function fotoReduzida(file){
  let bmp;
  try{ bmp = await createImageBitmap(file, { imageOrientation:'from-image' }); }catch(e){ bmp = await createImageBitmap(file); }
  const max = 2000, k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const cv = document.createElement('canvas'); cv.width = Math.round(bmp.width * k); cv.height = Math.round(bmp.height * k);
  const ctx = cv.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height); ctx.drawImage(bmp, 0, 0, cv.width, cv.height);
  if(bmp.close) bmp.close();
  const b = await new Promise(r => cv.toBlob(r, 'image/jpeg', 0.82));
  return { bytes:new Uint8Array(await b.arrayBuffer()), w:cv.width, h:cv.height };
}
async function fotosParaPdf(files, nome){
  if(!precisaLibs()) return;
  const p = M.p, b = busy('Preparando as fotos… aguarde');
  try{
    const pdf = await PDFLib.PDFDocument.create();
    for(let i = 0; i < files.length; i++){
      b.txt('Foto ' + (i + 1) + ' de ' + files.length + '…');
      const im = await fotoReduzida(files[i]), img = await pdf.embedJpg(im.bytes);
      const G = im.w > im.h ? PAG.paisagem : PAG.retrato, page = pdf.addPage([G.W, G.H]);
      const m = 20, k = Math.min((G.W - 2 * m) / im.w, (G.H - 2 * m) / im.h);
      page.drawImage(img, { x:(G.W - im.w * k) / 2, y:(G.H - im.h * k) / 2, width:im.w * k, height:im.h * k });
      await sleep(0);
    }
    pdf.setTitle(nome); pdf.setCreator('Panda'); pdf.setProducer('Panda');
    const bytes = new Uint8Array(await pdf.save());
    salvarTudo(); histPush('foto → PDF');
    const d = await novoDocPdf(p, nome, bytes, 'linha');
    const aqui = M.cur && M.cur.d && p.docs.includes(M.cur.d) ? M.cur.d : null;
    if(aqui){ p.docs = p.docs.filter(x => x !== d); p.docs.splice(p.docs.indexOf(aqui) + 1, 0, d); }
    b.end(); touch(p); saveDB(true);
    renderMesa(true); irParaDoc(d.id);
    toast('PDF feito com ' + plural(files.length, 'foto', 'fotos') + ' (' + mbTxt(bytes.length) + ').');
  }catch(e){ b.end(); console.error(e); toast('Não foi possível fazer o PDF: ' + (e.message || e)); }
}

/* =====================================================================
   Dividir para enviar: partes que cabem no limite (numeração continua)
   ===================================================================== */
const LIMITES = [[25, 'E-mail (Gmail, Outlook)', 'partes de até 25 MB'], [10, 'Sistemas e e-mails menores', 'partes de até 10 MB'], [5, 'Bem pequeno', 'partes de até 5 MB'], [100, 'Arquivo grande', 'partes de até 100 MB']];
async function dividirSheet(lista){
  const p = M.p; if(!p) return;
  salvarTudo(); if(CAP.aberta) capsula(false);
  const l = Array.isArray(lista) && lista.length ? lista : folhasTela(); if(!l.length) return toast('Inclua um PDF ou uma foto primeiro.');
  const ult = settings.limEnvio || 25;
  const op = await escolher('Dividir para enviar', LIMITES.map(([n, t, sub]) => [String(n), t, sub]).concat([['outro', 'Outro tamanho', 'você diz quantos MB']]), LIMITES.some(x => x[0] === ult) ? String(ult) : 'outro');
  if(!op) return;
  let lim = parseFloat(op);
  if(op === 'outro'){
    const v = await perguntar('Limite de cada parte', 'Tamanho máximo, em MB', String(ult).replace('.', ','), 'Dividir', { dica:'Exemplo: 20 ou 7,5' });
    lim = parseFloat(String(v || '').replace(',', '.'));
    if(!(lim > 0.2)) return;
  }
  settings.limEnvio = lim; saveSettings();
  await dividirFolhas(l, lim * MB);
}
async function dividirFolhas(l, lim){
  if(!precisaLibs()) return;
  const o = optCarimbo(), base = safeName(M.p.avulsa ? (Array.from(new Set(l.map(f => f.d)))[0].nome || 'Documentos') : tituloProc(M.p), '').replace(/\.$/, '');
  const b = busy('Medindo o PDF… aguarde');
  try{
    const monta = sub => pdfDasFolhas(sub, Object.assign({ titulo:base }, o));
    const inteiro = await monta(l);
    if(inteiro.length <= lim){ b.end(); toast('O PDF inteiro tem ' + mbTxt(inteiro.length) + ' e já cabe no limite. Não precisa dividir.', { ms:3500 }); return offer(inteiro, safeName(base, '.pdf')); }
    /* cada parte leva o maior número de folhas que cabe no limite (cresce e depois acerta pela metade) */
    const partes = [], grandes = [], porPg = inteiro.length / l.length;
    let i = 0;
    while(i < l.length){
      const resta = l.length - i, cache = new Map();
      const tam = async k => { if(!cache.has(k)){ b.txt('Montando a parte ' + (partes.length + 1) + ' (' + plural(k, 'folha', 'folhas') + ')… aguarde'); cache.set(k, await monta(l.slice(i, i + k))); } return cache.get(k); };
      let ok = 0, ruim = resta + 1, k = Math.max(1, Math.min(resta, Math.floor(lim * 0.9 / porPg)));
      while(ok + 1 < ruim){
        if((await tam(k)).length <= lim){ ok = k; k = Math.min(resta, ruim - 1, Math.max(k + 1, k * 2)); if(ok === resta) break; }
        else { ruim = k; k = Math.max(ok + 1, Math.floor((ok + ruim) / 2)); }
        if(k >= ruim) k = ruim - 1;
        if(k <= ok){ if(ok + 1 < ruim) k = ok + 1; else break; }
      }
      const kk = Math.max(1, ok), bytes = await tam(kk);
      if(bytes.length > lim) grandes.push(l[i].fl);
      partes.push({ fs:l.slice(i, i + kk), bytes });
      i += kk;
    }
    b.end();
    const N = partes.length;
    const arqs = partes.map((x, j) => ({ data:x.bytes, nome:safeName(base + ' - parte ' + (j + 1) + ' de ' + N + ' (fls. ' + faixaTexto(x.fs.map(f => f.fl)) + ')', '.pdf') }));
    partesSheet(arqs, lim, grandes);
  }catch(e){ b.end(); console.error(e); toast('Não foi possível dividir: ' + (e.message || e)); }
}

/* as partes prontas: cada uma com o seu botão (para mandar uma por e-mail) e "todas" de uma vez */
function partesSheet(arqs, lim, grandes){
  const limT = (Math.round(lim / MB * 10) / 10).toString().replace('.', ',') + ' MB';
  const N = arqs.length, arte = !PWA && window.claude && window.claude.use;
  const files = arqs.map(a => new File([a.data], a.nome, { type:'application/pdf' }));
  let pode = false; if(!arte) try{ pode = !!(navigator.canShare && navigator.canShare({ files })); }catch(e){}
  const um = async i => {
    if(arte || !pode) return offer(arqs[i].data, arqs[i].nome);
    try{ await navigator.share({ files:[files[i]], title:arqs[i].nome }); }catch(e){ if(!e || e.name !== 'AbortError') offer(arqs[i].data, arqs[i].nome); }
  };
  const baixar = async () => {
    if(arte){ for(const a of arqs) await offer(a.data, a.nome); return; }
    files.forEach((f, i) => setTimeout(() => { const a = h('a', { href:URL.createObjectURL(f), download:f.name }); document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000); }, i * 400));
    toast(plural(N, 'arquivo baixado', 'arquivos baixados') + '.');
  };
  const linhas = arqs.map((a, i) => h('div', { class:'opt expArq' }, h('span', { html:I.pdf }),
    h('div', { class:'grow', style:{ minWidth:0 } }, h('b', { style:{ display:'block', overflowWrap:'anywhere' } }, a.nome), h('small', { class:'muted' }, mbTxt(a.data.length))),
    h('button', { class:'btn sm ghost', onclick:() => um(i) }, h('span', { html:I.share }), 'Enviar')));
  const aviso = grandes && grandes.length ? h('p', { class:'sgNota', style:{ color:'#C93400' } }, 'Atenção: ' + (grandes.length === 1 ? 'a folha ' + grandes[0] + ' sozinha passa' : 'as folhas ' + grandes.join(', ') + ' sozinhas passam') + ' de ' + limT + ' e ' + (grandes.length === 1 ? 'ficou numa parte só' : 'ficaram cada uma numa parte') + '.') : null;
  sheet({ titulo:plural(N, 'parte pronta', 'partes prontas'), corpo:[
    h('p', { class:'sgNota', style:{ margin:0 } }, 'Cada parte tem até ' + limT + '. A numeração das folhas continua de uma parte para a outra.'),
    aviso].concat(linhas),
    botoes:[pode ? { t:'Enviar todas', v:'acc', ic:'share', fica:true, fn:async () => { try{ await navigator.share({ files, title:arqs[0].nome }); }catch(e){ if(!e || e.name !== 'AbortError') toast('Não foi possível compartilhar todas juntas. Use Enviar em cada parte.'); } } } : null,
      { t:'Baixar todas', v:pode ? 'ghost' : 'pri', ic:'dl', fica:true, fn:baixar }] });
}

/* ---------- arquivos muito grandes: aviso antes de entrar ---------- */
async function filtrarGrandes(ents){
  const out = [];
  for(const it of ents){
    const n = it.bytes ? it.bytes.length : 0;
    if(n > LIM_GRANDE && !await confirmar('Arquivo muito grande', '“' + it.name + '” tem ' + mbTxt(n) + '. Acima de 100 MB o celular pode ficar lento ou travar, e e-mails e sistemas costumam recusar. Incluir mesmo assim? (Depois, use “Dividir para enviar”.)', 'Incluir mesmo assim')) continue;
    out.push(it);
  }
  return out;
}
function avisoGrande(bytes, l){
  if(!bytes || bytes.length <= LIM_GRANDE) return;
  toast('O PDF ficou com ' + mbTxt(bytes.length) + ': acima de 100 MB, e-mails e sistemas costumam recusar.', { acao:'Dividir', fn:() => dividirSheet(l), ms:8000 });
}

/* ===== h_rel.js ===== */
/* =====================================================================
   Relatório integrado do processo (prontuário): situação, ficha,
   pendências, definições, tramitação, repositório e documentos
   ===================================================================== */
let REL = null, relDe = 'home';
function abrirRel(p){
  if(VIEW === 'mesa') salvarTudo();
  relDe = VIEW === 'mesa' || VIEW === 'proc' || VIEW === 'pasta' ? VIEW : 'home';
  REL = { id:p.id }; mostrar('rel'); renderRel(); $('vRel').querySelector('.scroll').scrollTop = 0;
  recontar(p).then(m => { if(m && VIEW === 'rel' && REL && REL.id === p.id) renderRel(); });
}
$('rBack').onclick = () => { if(relDe === 'mesa' && M.p){ mostrar('mesa'); renderMesa(true); } else if(relDe === 'proc' && procPorId(REL && REL.id)) abrirProcTela(procPorId(REL.id)); else if(relDe === 'pasta' && noPorId(NAVP.no)) abrirNo(NAVP.no); else { mostrar('home'); renderHome(); } };
$('rMesa').onclick = () => { const p = procPorId(REL && REL.id); if(p) abrirMesa(p); };
function secao(titulo, extra, ...kids){ return h('div', { class:'rsec' }, h('h3', null, h('span', null, titulo), extra || null), kids); }
function renderRel(){
  const p = procPorId(REL && REL.id); if(!p){ mostrar('home'); return; }
  $('rTit').replaceChildren(document.createTextNode(tituloProc(p)), h('small', null, objetoProc(p)));
  const b = $('relBody'); b.replaceChildren();
  const t = tramAtual(p), dias = t ? diasEntre(t.chegada, t.saida || null) : null;
  b.append(secao('Situação', h('button', { class:'btn sm', onclick:() => tramSheet(p) }, h('span', { html:I.route }), 'Tramitar'),
    h('div', { class:'rbox', style:{ display:'flex', flexDirection:'column', gap:'6px' } },
      h('div', { class:'row' }, chipStatus(p.status), h('span', { class:'muted', style:{ fontSize:'13px' } }, catName(p.cat))),
      t ? h('div', null, h('b', null, 'Está em ' + t.setor), h('div', { class:'muted', style:{ fontSize:'13.5px' } }, (t.acao ? t.acao + ' · ' : '') + 'chegou em ' + dataBR(t.chegada) + (dias != null ? ' (' + plural(Math.max(0, dias), 'dia', 'dias') + ')' : '') + (t.saida ? ' · saiu em ' + dataBR(t.saida) : ''))) : h('div', { class:'muted' }, 'Sem tramitação registrada.'))));
  const val = [['Valor atualizado', fichaValor(p, 'valorAtual')], ['Saldo', fichaValor(p, 'saldo')], ['Término previsto', fichaValor(p, 'termino') || fichaValor(p, 'vigencia')]];
  if(val.some(v => v[1])) b.append(h('div', { class:'stat', style:{ marginTop:'10px' } }, val.map(v => h('div', null, h('small', null, v[0]), h('b', null, v[1] || '—')))));
  const kv = h('dl', { class:'kv' });
  FICHA.forEach(([k, rot]) => { const v = fichaValor(p, k); if(v) kv.append(h('dt', null, rot), h('dd', null, v)); });
  (p.ficha.extras || []).forEach(e => { if(e.v) kv.append(h('dt', null, e.k), h('dd', null, e.v)); });
  b.append(secao('Ficha central', h('button', { class:'btn sm', onclick:() => fichaSheet(p) }, h('span', { html:I.pen }), 'Editar'), kv.children.length ? h('div', { class:'rbox' }, kv) : h('div', { class:'rbox muted' }, 'A ficha ainda está vazia. Preencha para os dados entrarem sozinhos nos documentos.')));
  const addNota = tipo => h('button', { class:'btn sm', onclick:() => novaNotaSheet(p, tipo) }, h('span', { html:I.plus }), 'Anotar');
  const abertas = pendAbertas(p), feitas = p.notas.filter(n => n.tipo === 'pend' && n.ok), defs = p.notas.filter(n => n.tipo === 'def'), notas = p.notas.filter(n => n.tipo === 'nota');
  b.append(secao('Pendências', addNota('pend'), h('div', { class:'rbox' }, abertas.length ? abertas.map(n => itemNota(p, n)) : h('div', { class:'muted' }, 'Sem pendências.'),
    feitas.length ? h('details', { style:{ marginTop:'8px' } }, h('summary', { class:'muted', style:{ cursor:'pointer', fontSize:'13px' } }, 'Resolvidas (' + feitas.length + ')'), feitas.map(n => itemNota(p, n))) : null)));
  b.append(secao('Definições e responsáveis', addNota('def'), h('div', { class:'rbox' }, defs.length ? defs.map(n => itemNota(p, n)) : h('div', { class:'muted' }, 'O que foi definido nas reuniões e quem ficou com cada tarefa.'))));
  if(notas.length) b.append(secao('Notas', addNota('nota'), h('div', { class:'rbox' }, notas.map(n => itemNota(p, n)))));
  const tt = h('table', { class:'ttab' }, h('tr', null, h('th', null, 'Setor'), h('th', null, 'Chegada'), h('th', null, 'Saída'), h('th', null, 'Dias')));
  p.tram.slice().reverse().forEach((x, i) => {
    const dd = diasEntre(x.chegada, x.saida || null);
    tt.append(h('tr', { class:i === 0 ? 'cur' : '', style:{ cursor:'pointer' }, onclick:() => tramSheet(p, x) }, h('td', null, h('b', null, x.setor), x.acao ? h('div', { class:'muted', style:{ fontSize:'12.5px' } }, x.acao) : null), h('td', null, dataBR(x.chegada)), h('td', null, dataBR(x.saida) || '—'), h('td', null, dd != null ? String(Math.max(0, dd)) : '')));
  });
  b.append(secao('Tramitação', h('button', { class:'btn sm', onclick:() => tramSheet(p) }, h('span', { html:I.plus }), 'Registrar'), h('div', { class:'rbox', style:{ padding:'6px 8px', overflowX:'auto' } }, p.tram.length ? tt : h('div', { class:'muted', style:{ padding:'6px' } }, 'Registre as entradas e saídas do processo para saber sempre onde ele está.'))));
  const F = folhas(p), linha = p.docs.filter(d => d.linha), repo = p.docs.filter(d => d.repo);
  b.append(secao('Linha do processo', h('span', { class:'muted', style:{ fontSize:'12.5px' } }, F._total ? plural(F._total, 'folha', 'folhas') : ''), h('div', { class:'rbox' }, linha.length ? linha.map(d => h('div', { class:'drow', style:{ cursor:'pointer' }, onclick:() => abrirMesa(p, { doc:d.id }) }, h('span', { class:'dash' }), h('div', { class:'nm' }, h('span', null, d.nome), h('small', null, (d.kind === 'pdf' ? 'PDF' : 'Texto') + (F[d.id] ? ' · fls. ' + F[d.id].ini + (F[d.id].k > 1 ? '–' + F[d.id].fim : '') : ''))))) : h('div', { class:'muted' }, 'Nenhum documento.'))));
  b.append(secao('Repositório do objeto', repo.length ? h('button', { class:'btn sm', onclick:() => compartilharRepo(p) }, h('span', { html:I.folderShare }), 'Compartilhar') : null, h('div', { class:'rbox' }, repo.length ? repo.map(d => h('div', { class:'drow' }, h('span', { class:'dash', style:{ background:'var(--accent)' } }), h('div', { class:'nm' }, h('span', null, d.nome), h('small', null, d.kind === 'pdf' ? 'PDF' : 'Texto')))) : h('div', { class:'muted' }, 'Vazio. Na mesa, marque “Repositório” nos documentos que vão para todo mundo.'))));
  b.append(secao('Gerar relatório', null, h('div', { class:'rbtns' },
    h('button', { class:'btn acc', onclick:() => relPdf(p, 'situacao') }, h('span', { html:I.pdf }), 'Situação'),
    h('button', { class:'btn acc', onclick:() => relPdf(p, 'completo') }, h('span', { html:I.pdf }), 'Completo'),
    h('button', { class:'btn', onclick:() => relPdf(p, 'tram') }, h('span', { html:I.route }), 'Tramitação'),
    h('button', { class:'btn', onclick:() => copiarTexto(relTexto(p, 'situacao'), 'Situação copiada. Cole no WhatsApp.') }, h('span', { html:I.whats }), 'WhatsApp'),
    h('button', { class:'btn', style:{ gridColumn:'1/-1' }, onclick:() => copiarTexto(relTexto(p, 'completo'), 'Relatório completo copiado.') }, h('span', { html:I.copy }), 'Copiar relatório completo'))));
}
function novaNotaSheet(p, tipo){
  const ta = h('textarea', { class:'txa', autofocus:true, placeholder:TIPO_NOTA[tipo] + '…' });
  const resp = h('input', { class:'inp', list:'dlResp2' }), prazo = h('input', { class:'inp', type:'date' });
  const nomes = Array.from(new Set(DB.procs.flatMap(q => q.notas.map(n => n.resp)).filter(Boolean).concat(SETORES)));
  sheet({ titulo:'Nova ' + TIPO_NOTA[tipo].toLowerCase(), corpo:[ta, tipo !== 'nota' ? h('div', { class:'fgrp' }, h('label', { class:'fld' }, h('span', null, 'Responsável'), resp), h('label', { class:'fld' }, h('span', null, 'Prazo'), prazo)) : null, h('datalist', { id:'dlResp2' }, nomes.map(n => h('option', { value:n })))],
    botoes:[{ t:'Cancelar', v:'ghost' }, { t:'Anotar', v:'pri', fn:() => { const t = ta.value.trim(); if(!t) return false; p.notas.push({ id:uid(), tipo, t, resp:resp.value.trim(), prazo:prazo.value, ok:false, criado:Date.now() }); touch(p); saveDB(true); renderRel(); } }] });
}

/* ---------- tramitação ---------- */
function tramSheet(p, x){
  const novo = !x;
  const ult = tramAtual(p);
  const setor = h('input', { class:'inp', list:'dlSet', value:x ? x.setor : '', autofocus:novo, placeholder:'Para onde foi / onde chegou' });
  const cheg = h('input', { class:'inp', type:'date', value:x ? x.chegada || '' : hojeISO() });
  const sai = h('input', { class:'inp', type:'date', value:x ? x.saida || '' : '' });
  const acao = h('input', { class:'inp', value:x ? x.acao || '' : '', placeholder:'Ex.: parecer jurídico, empenho, assinatura' });
  const st = h('select', { class:'sel' }, STATUS.map(s => h('option', { value:s, selected:p.status === s }, s)));
  const fecha = h('input', { type:'checkbox', checked:true });
  const corpo = [h('label', { class:'fld' }, h('span', null, 'Setor'), setor), h('datalist', { id:'dlSet' }, SETORES.map(s => h('option', { value:s }))),
    h('div', { class:'fgrp' }, h('label', { class:'fld' }, h('span', null, 'Chegada'), cheg), h('label', { class:'fld' }, h('span', null, 'Saída'), sai)),
    h('label', { class:'fld' }, h('span', null, 'O que fazer lá'), acao), h('label', { class:'fld' }, h('span', null, 'Situação do processo'), st)];
  if(novo && ult && !ult.saida) corpo.push(h('label', { class:'opt' }, fecha, h('span', null, 'Registrar a saída de ' + ult.setor + ' na mesma data')));
  sheet({ titulo:novo ? 'Registrar tramitação' : 'Tramitação', corpo,
    botoes:[novo ? { t:'Cancelar', v:'ghost' } : { t:'Excluir', v:'danger', fn:() => { p.tram = p.tram.filter(y => y !== x); saveDB(true); aposMudarProc(p); } },
      { t:'Salvar', v:'pri', fn:() => {
        if(!setor.value.trim()){ toast('Informe o setor.'); return false; }
        if(novo){ if(ult && !ult.saida && fecha.checked) ult.saida = cheg.value; p.tram.push({ id:uid(), setor:setor.value.trim(), chegada:cheg.value, saida:sai.value, acao:acao.value.trim() }); }
        else Object.assign(x, { setor:setor.value.trim(), chegada:cheg.value, saida:sai.value, acao:acao.value.trim() });
        p.status = st.value; touch(p); saveDB(true); aposMudarProc(p); if(VIEW === 'mesa' && M.painel) renderPainel(); toast('Tramitação registrada.');
      } }] });
}

/* ---------- relatórios em PDF e texto ---------- */
const agora = () => { const d = new Date(); return dataCurta(d) + ' às ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
const tabHTML = (cab, linhas, num) => '<table><tbody><tr>' + cab.map(c => '<th>' + esc(c) + '</th>').join('') + '</tr>' + linhas.map(l => '<tr>' + l.map((c, i) => '<td' + (num && num.includes(i) ? ' class="n"' : '') + '>' + esc(c == null ? '' : c) + '</td>').join('') + '</tr>').join('') + '</tbody></table>';
function relHTML(p, tipo){
  const t = tramAtual(p), pend = pendAbertas(p), defs = p.notas.filter(n => n.tipo === 'def'), notas = p.notas.filter(n => n.tipo === 'nota');
  const cab = '<p><strong>' + esc(tituloProc(p)) + '</strong> — ' + esc(objetoProc(p)) + '</p><p>Gerado em ' + agora() + '.</p>';
  const sit = '<p>Situação: <strong>' + esc(p.status) + '</strong>.' + (t ? ' Está em <strong>' + esc(t.setor) + '</strong> desde ' + dataBR(t.chegada) + (t.chegada ? ' (' + plural(Math.max(0, diasEntre(t.chegada, t.saida || null)), 'dia', 'dias') + ')' : '') + (t.saida ? ', saída em ' + dataBR(t.saida) : '') + '.' + (t.acao ? ' Providência: ' + esc(t.acao) + '.' : '') : ' Sem tramitação registrada.') + '</p>';
  const pendT = pend.length ? tabHTML(['Pendência', 'Responsável', 'Prazo'], pend.map(n => [n.t, n.resp || '—', n.prazo ? dataBR(n.prazo) : '—'])) : '<p>Sem pendências.</p>';
  const tramT = p.tram.length ? tabHTML(['Setor', 'Chegada', 'Saída', 'Dias', 'Providência'], p.tram.map(x => [x.setor, dataBR(x.chegada), dataBR(x.saida) || '—', x.chegada ? String(Math.max(0, diasEntre(x.chegada, x.saida || null))) : '', x.acao || '']), [3]) : '<p>Sem tramitação registrada.</p>';
  if(tipo === 'tram') return '<h1>TRAMITAÇÃO DO PROCESSO</h1>' + cab + '<h2>1. Situação atual</h2>' + sit + '<h2>2. Histórico</h2>' + tramT;
  if(tipo === 'situacao'){
    const ult = p.tram.slice(-3).reverse();
    return '<h1>RELATÓRIO DE SITUAÇÃO</h1>' + cab + '<h2>1. Situação atual</h2>' + sit + '<h2>2. Pendências</h2>' + pendT +
      (ult.length ? '<h2>3. Últimas movimentações</h2>' + tabHTML(['Setor', 'Chegada', 'Saída'], ult.map(x => [x.setor, dataBR(x.chegada), dataBR(x.saida) || '—'])) : '');
  }
  const ficha = FICHA.map(([k, rot]) => [rot, fichaValor(p, k)]).filter(x => x[1]).concat((p.ficha.extras || []).filter(e => e.v).map(e => [e.k, e.v]));
  const F = folhas(p), linha = p.docs.filter(d => d.linha), repo = p.docs.filter(d => d.repo);
  let n = 1; const H = t2 => '<h2>' + (n++) + '. ' + t2 + '</h2>';
  return '<h1>RELATÓRIO DO PROCESSO</h1>' + cab +
    H('Situação atual') + sit +
    (ficha.length ? H('Ficha central') + tabHTML(['Campo', 'Informação'], ficha) : '') +
    H('Pendências') + pendT +
    H('Definições e responsáveis') + (defs.length ? tabHTML(['Definição', 'Responsável', 'Data'], defs.map(x => [x.t, x.resp || '—', dataCurta(x.criado)])) : '<p>Nenhuma definição registrada.</p>') +
    (notas.length ? H('Notas') + '<ul>' + notas.map(x => '<li>' + esc(x.t) + '</li>').join('') + '</ul>' : '') +
    H('Tramitação') + tramT +
    H('Documentos do processo') + (linha.length ? tabHTML(['Folhas', 'Documento', 'Tipo'], linha.map(d => [F[d.id] ? F[d.id].ini + (F[d.id].k > 1 ? '–' + F[d.id].fim : '') : '', d.nome, d.kind === 'pdf' ? 'PDF' : 'Texto'])) : '<p>Nenhum documento.</p>') +
    (repo.length ? H('Repositório') + '<ul>' + repo.map(d => '<li>' + esc(d.nome) + '</li>').join('') + '</ul>' : '');
}
function relTexto(p, tipo){
  const t = tramAtual(p), pend = pendAbertas(p), L = [];
  L.push('*' + tituloProc(p) + '*', objetoProc(p), '');
  L.push('*Situação:* ' + p.status + (t ? ' · está em ' + t.setor + ' desde ' + dataBR(t.chegada) + (t.acao ? ' (' + t.acao + ')' : '') : ''));
  if(tipo === 'completo'){
    const ficha = FICHA.map(([k, rot]) => [rot, fichaValor(p, k)]).filter(x => x[1] && x[0] !== 'Objeto');
    if(ficha.length){ L.push('', '*Ficha*'); ficha.forEach(x => L.push('• ' + x[0] + ': ' + x[1])); }
  }
  L.push('', '*Pendências*');
  if(pend.length) pend.forEach(n => L.push('• ' + n.t + (n.resp ? ' — ' + n.resp : '') + (n.prazo ? ' (até ' + dataBR(n.prazo) + ')' : ''))); else L.push('Sem pendências.');
  if(tipo === 'completo'){
    const defs = p.notas.filter(n => n.tipo === 'def');
    if(defs.length){ L.push('', '*Definições*'); defs.forEach(n => L.push('• ' + n.t + (n.resp ? ' — ' + n.resp : ''))); }
    if(p.tram.length){ L.push('', '*Tramitação*'); p.tram.forEach(x => L.push('• ' + x.setor + ': ' + dataBR(x.chegada) + (x.saida ? ' a ' + dataBR(x.saida) : ' (atual)'))); }
  }
  return L.join('\n');
}
async function relPdf(p, tipo){
  if(!precisaLibs()) return;
  const b = busy('Gerando relatório…');
  try{
    const r = await PDFGen.texto(relHTML(p, tipo), { raw:true, bras:'primeira', title:'Relatório' });
    b.end();
    previa(r.bytes, safeName((tipo === 'situacao' ? 'Situação' : tipo === 'tram' ? 'Tramitação' : 'Relatório') + ' – ' + tituloProc(p), '.pdf'));
  }catch(e){ b.end(); console.error(e); toast('Não foi possível gerar o relatório.'); }
}
function relGeralHTML(ps){
  let h2 = '<h1>RELATÓRIO GERAL DOS OBJETOS</h1><p>Gerado em ' + agora() + '. ' + plural(ps.length, 'objeto', 'objetos') + '.</p>';
  h2 += tabHTML(['Processo', 'Objeto', 'Situação', 'Onde está', 'Pend.'], ps.map(p => [p.ficha.num || '—', p.ficha.objeto || '—', p.status, ondeEsta(p) || '—', String(pendAbertas(p).length)]), [4]);
  const comPend = ps.filter(p => pendAbertas(p).length);
  if(comPend.length){
    h2 += '<h2>Pendências por objeto</h2>';
    comPend.forEach(p => { h2 += '<p><strong>' + esc(tituloProc(p)) + '</strong> — ' + esc((p.ficha.objeto || '').slice(0, 120)) + '</p><ul>' + pendAbertas(p).map(n => '<li>' + esc(n.t) + (n.resp ? ' — ' + esc(n.resp) : '') + (n.prazo ? ' (até ' + dataBR(n.prazo) + ')' : '') + '</li>').join('') + '</ul>'; });
  }
  return h2;
}
function relGeralTexto(ps){
  const L = ['*Relatório geral dos objetos* — ' + agora(), ''];
  ps.forEach(p => { L.push('*' + tituloProc(p) + '* — ' + (p.ficha.objeto || '').slice(0, 90)); L.push(p.status + (ondeEsta(p) ? ' · ' + ondeEsta(p) : '')); pendAbertas(p).forEach(n => L.push('  • ' + n.t + (n.resp ? ' — ' + n.resp : ''))); L.push(''); });
  return L.join('\n');
}
async function relGeralPdf(ps){
  if(!precisaLibs()) return;
  if(!ps.length) return toast('Nenhum processo ainda.');
  const b = busy('Gerando relatório geral…');
  try{ const r = await PDFGen.texto(relGeralHTML(ps), { raw:true, bras:'primeira', title:'Relatório geral' }); b.end(); previa(r.bytes, safeName('Relatório geral dos objetos ' + hojeISO(), '.pdf')); }
  catch(e){ b.end(); toast('Não foi possível gerar o relatório.'); }
}

/* ===== i_ajustes.js ===== */
/* =====================================================================
   Ajustes: signatários, modelos, documentos, saída, IA, dados
   ===================================================================== */
function abrirAjustes(){
  const s = sheet({ titulo:'Ajustes', cheio:true, corpo:[] });
  const desenhar = () => {
    const c = s.corpo; c.replaceChildren();
    const item = (t, sub, fn, ic) => h('button', { class:'mitem', onclick:fn }, h('span', { html:I[ic || 'chev'] }), h('span', { class:'grow' }, t, sub ? h('small', null, sub) : null), h('span', { html:I.chev, style:{ color:'var(--faint)' } }));
    c.append(h('span', { class:'lbl' }, 'Documentos'),
      item('Signatários', settings.signatarios.map(x => x.nome).filter(Boolean).join(' · ') || 'Nenhum', () => signatariosSheet(desenhar), 'sig'),
      item('Modelos de documento', plural(modelos().length, 'modelo', 'modelos') + ' · despachos, CI, ofício, nota técnica, DFD, ETP, TR', () => modelosSheet(), 'doc'),
      item('Timbre e brasão', (settings.timbre === 'completo' ? 'Brasão com Estado e Prefeitura' : 'Só o brasão') + ' · textos novos: ' + ({ todas:'brasão em todas', primeira:'brasão na 1ª', nenhum:'sem brasão' })[settings.brasTexto], () => timbreSheet(desenhar), 'eye'),
      h('span', { class:'lbl', style:{ marginTop:'8px' } }, 'Saída de PDF'),
      item('Numeração das folhas', settings.numerar ? 'Numerar ao gerar o PDF' : 'Sem numeração', () => { settings.numerar = !settings.numerar; settings.carimbo = 'nenhum'; saveSettings(); desenhar(); }, 'hash'),
      h('span', { class:'lbl', style:{ marginTop:'8px' } }, 'Mesa'),
      item('Zoom ao abrir', settings.zoom + '% (o botão de zoom volta para este valor)', async () => { const v = await perguntar('Zoom ao abrir', 'Percentual', String(settings.zoom), 'Salvar', { tipo:'number' }); const n = parseInt(v, 10); if(n >= 50 && n <= 260){ settings.zoom = n; saveSettings(); desenhar(); } }, 'search'),
      item('Editar a tela', 'Arrastar botões, trocar função, criar bolinhas e deixar notas para o Claude', () => { s.fechar(); setTimeout(entrarEdicaoTela, 150); }, 'gear'),
      item('Voltar à tela padrão', 'Desfaz botões mexidos, bolinhas e menus do modo de edição. Processos e documentos não mudam.', () => { s.fechar(); setTimeout(telaPadrao, 150); }, 'undo'),
      h('span', { class:'lbl', style:{ marginTop:'8px' } }, 'Revisão por inteligência artificial'),
      item('Revisão de texto (botão R)', iaResumo(), () => iaSheet(desenhar), 'sparkle'),
      h('span', { class:'lbl', style:{ marginTop:'8px' } }, 'Dados deste aparelho'),
      item('Fazer backup', 'Um arquivo ZIP com processos, textos, notas e PDFs', fazerBackup, 'dl'),
      item('Restaurar backup', 'Substitui tudo o que está neste aparelho', () => $('bkFile').click(), 'undo'),
      item('Importar do Proc.Ios 2', DB.importouV2 ? 'Já importado' : 'Traz os processos da versão anterior, se estiverem neste aparelho', async () => { if(DB.importouV2){ if(!await confirmar('Importar de novo', 'Os processos da versão anterior já foram importados. Importar de novo cria cópias.', 'Importar')) return; DB.importouV2 = false; } const n = await importarV2(); saveDB(true); toast(n ? plural(n, 'processo importado', 'processos importados') + '.' : 'Nada da versão anterior neste aparelho.'); if(n) renderHome(); desenhar(); }, 'layers'),
      h('p', { class:'muted', style:{ fontSize:'12.5px', margin:'10px 4px 0' } }, APP_NOME + ' ' + VERSAO_APP + '. ' + (PWA ? 'Tudo fica guardado neste celular e funciona sem internet.' : 'Tudo fica guardado neste navegador. Para usar sem internet, instale o app no celular.')));
  };
  desenhar();
}
async function telaPadrao(){
  const op = await escolher('Voltar à tela padrão', [['botoes', 'Botões, bolinhas e menus', 'Desfaz o que foi mexido no modo de edição (panda)'], ['tudo', 'Isso e também as pastas', 'Pastas voltam a ser: Processos › Licitações, Aditivos, MP, Outras demandas, Autorizações']], 'botoes');
  if(!op) return;
  const L = layUI();
  settings.layUI = { els:{}, extras:[], menus:{}, cods:{}, seq:L.seq || { P:0, B:0 } };
  if(op === 'botoes' && L.arvore) settings.layUI.arvore = L.arvore;
  else { DB.procs.forEach(p => { delete p.pasta; }); saveDB(true); }
  saveSettings(); arvore(); irInicio(); aplicarLayUI();
  toast('Tela padrão de volta. Seus processos e documentos continuam iguais.', { ms:3200 });
}
function iaResumo(){ const ia = settings.ia; if(!PWA) return 'No Claude: usa a sua conta (' + (ia.tier === 'default' ? 'caprichada' : 'rápida') + ')'; if(ia.claudeKey && ia.prov !== 'gemini') return 'Claude · ' + ia.claudeModel; if(ia.geminiKey && ia.prov !== 'claude') return 'Gemini · ' + ia.geminiModel; return 'Sem chave: copia o texto e abre o Claude ou o Gemini'; }

/* ---------- signatários (com carimbo e autoridade competente) ---------- */
function signatariosSheet(volta){
  const lista = h('div', { style:{ display:'flex', flexDirection:'column', gap:'12px' } });
  const linhas = [];
  let autId = (settings.signatarios.find(x => x.autoridade) || {}).id;
  const pintaAut = () => linhas.forEach(r => r.aut.checked = r.id === autId);
  const add = s => {
    const r = { id:s.id || uid() };
    const nome = h('input', { class:'inp', value:s.nome || '', placeholder:'Nome completo' }), cargo = h('input', { class:'inp', value:s.cargo || '', placeholder:'Cargo' }), mat = h('input', { class:'inp', value:s.mat || '', placeholder:'Matrícula' });
    const aut = h('input', { type:'radio', name:'autSig', checked:r.id === autId, onchange:() => { autId = r.id; pintaAut(); } });
    const box = h('div', { class:'rbox', style:{ display:'flex', flexDirection:'column', gap:'8px' } },
      h('div', { class:'row' }, h('span', { class:'lbl grow' }, 'Signatário'), h('button', { class:'ib sm', html:I.trash, 'aria-label':'Remover', onclick:() => { box.remove(); linhas.splice(linhas.indexOf(r), 1); } })),
      nome, h('div', { class:'fgrp' }, cargo, mat),
      h('label', { class:'chk' }, aut, h('span', null, 'Autoridade competente (assina despachos decisórios, ofícios e DFD)')),
      null);
    Object.assign(r, { nome, cargo, mat, aut }); linhas.push(r); lista.append(box);
  };
  settings.signatarios.forEach(add);
  sheet({ titulo:'Signatários', cheio:true, corpo:[h('p', { class:'muted', style:{ margin:0, fontSize:'13px' } }, 'Cada documento tem um signatário, escolhido no botão de signatário da mesa. O nome sai em negrito no fecho e na tarja.'), lista, h('button', { class:'btn sm soft', style:{ alignSelf:'flex-start' }, onclick:() => add({}) }, h('span', { html:I.plus }), 'Signatário')],
    botoes:[{ t:'Cancelar', v:'ghost' }, { t:'Salvar', v:'pri', fn:() => {
      settings.signatarios = linhas.map(r => ({ id:r.id, nome:r.nome.value.trim(), cargo:r.cargo.value.trim(), mat:r.mat.value.trim(), autoridade:r.id === autId })).filter(x => x.nome || x.cargo);
      if(!settings.signatarios.length) settings.signatarios = SETTINGS_PADRAO().signatarios;
      saveSettings(); volta && volta(); if(VIEW === 'mesa') renderMesa(true); toast('Signatários salvos.');
    } }] });
}

/* ---------- modelos ---------- */
function modelosSheet(){
  const s = sheet({ titulo:'Modelos de documento', cheio:true, corpo:[] });
  const desenhar = () => {
    const ms = modelos(); s.corpo.replaceChildren(h('p', { class:'muted', style:{ margin:0, fontSize:'13px' } }, 'Cada linha vira um parágrafo. # título · = identificação (SEINFRA N.) · | linha do cabeçalho (De, Para, Assunto) · |+ linha com espaço antes · @data data do ofício · ## capítulo · > citação · --- quebra de página. {{marcador}} puxa da ficha; [texto] vira campo para preencher. O local, a data e a assinatura entram sozinhos no fim.'));
    GRUPOS_MODELO.concat(Array.from(new Set(ms.map(m => m.grupo))).filter(g => !GRUPOS_MODELO.includes(g))).forEach(g => {
      const doG = ms.filter(m => m.grupo === g); if(!doG.length) return;
      s.corpo.append(h('span', { class:'lbl' }, g));
      doG.forEach(m => s.corpo.append(h('button', { class:'mitem', onclick:() => editarModelo(m, desenhar) }, h('span', { html:I.doc }), h('span', { class:'grow' }, m.nome, h('small', null, m.desc || '')), h('span', { html:I.chev, style:{ color:'var(--faint)' } }))));
    });
    s.corpo.append(h('div', { class:'row', style:{ marginTop:'8px' } }, h('button', { class:'btn sm acc', onclick:() => editarModelo(null, desenhar) }, h('span', { html:I.plus }), 'Novo modelo'),
      h('button', { class:'btn sm danger', onclick:async () => { if(await confirmar('Restaurar modelos', 'Os modelos voltam ao original. Os que você criou ou mudou serão perdidos.', 'Restaurar', true)){ settings.modelos = null; saveSettings(); desenhar(); } } }, 'Restaurar originais')));
  };
  desenhar();
}
function editarModelo(m, volta){
  const novo = !m;
  const nome = h('input', { class:'inp', value:m ? m.nome : '', placeholder:'Ex.: Despacho de devolução' });
  const grupo = h('input', { class:'inp', list:'dlGr', value:m ? m.grupo : 'Despachos' });
  const desc = h('input', { class:'inp', value:m ? m.desc || '' : '' });
  const sig = h('select', { class:'sel' }, h('option', { value:'autoridade', selected:m && m.sig === 'autoridade' }, 'Autoridade competente'), settings.signatarios.map(x => h('option', { value:x.id, selected:(m ? m.sig : 's1') === x.id }, x.nome || x.id)), h('option', { value:'', selected:m && !m.sig }, 'Sem assinatura'));
  const tipo = h('select', { class:'sel' }, Object.keys(TIPO_NOME).map(k => h('option', { value:k, selected:(m ? m.tipo : 'desp') === k }, TIPO_NOME[k])));
  const texto = h('textarea', { class:'txa', style:{ minHeight:'260px', fontFamily:'var(--doc)', fontSize:'14px' } }, m ? m.texto : '# DESPACHO\n| **Referência:** Processo Administrativo nº {{processo}}\n[Texto.]');
  const marc = Object.keys(MARC_ROTULO).map(k => h('button', { class:'chip', style:{ border:0, height:'28px' }, onclick:() => { const a = texto.selectionStart, b = texto.selectionEnd, t = '{{' + k + '}}'; texto.setRangeText(t, a, b, 'end'); texto.focus(); } }, MARC_ROTULO[k]));
  sheet({ titulo:novo ? 'Novo modelo' : 'Modelo', cheio:true, corpo:[
    h('div', { class:'fgrp' }, h('label', { class:'fld w2' }, h('span', null, 'Nome'), nome), h('label', { class:'fld' }, h('span', null, 'Grupo'), grupo), h('label', { class:'fld' }, h('span', null, 'Assina'), sig), h('label', { class:'fld' }, h('span', null, 'Tipo'), tipo), h('label', { class:'fld' }, h('span', null, 'Descrição curta'), desc)),
    h('datalist', { id:'dlGr' }, GRUPOS_MODELO.map(g => h('option', { value:g }))),
    h('label', { class:'fld' }, h('span', null, 'Texto do modelo'), texto),
    h('span', { class:'lbl' }, 'Inserir dado da ficha'), h('div', { class:'row', style:{ gap:'6px' } }, marc)],
    botoes:[novo ? { t:'Cancelar', v:'ghost' } : { t:'Apagar', v:'danger', fn:async () => { if(!await confirmar('Apagar modelo', '“' + m.nome + '” sai da lista de novos documentos.', 'Apagar', true)) return false; settings.modelos = modelos().filter(x => x.id !== m.id); settings.modelosV = MODELOS_V; saveSettings(); volta(); } },
      { t:'Salvar', v:'pri', fn:() => {
        if(!nome.value.trim()){ toast('Dê um nome ao modelo.'); return false; }
        const ms = clone(modelos()), dados = { nome:nome.value.trim(), grupo:grupo.value.trim() || 'Outros', desc:desc.value.trim(), sig:sig.value || null, tipo:tipo.value, texto:texto.value };
        if(novo) ms.push(Object.assign({ id:uid() }, dados)); else Object.assign(ms.find(x => x.id === m.id), dados);
        settings.modelos = ms; settings.modelosV = MODELOS_V; saveSettings(); volta(); toast('Modelo salvo.');
      } }] });
}

/* ---------- timbre, carimbo, IA ---------- */
function timbreSheet(volta){
  const tim = h('select', { class:'sel' }, h('option', { value:'brasao', selected:settings.timbre === 'brasao' }, 'Só o brasão'), h('option', { value:'completo', selected:settings.timbre === 'completo' }, 'Brasão + Estado da Bahia / Prefeitura Municipal de Ilhéus'));
  const br = h('select', { class:'sel' }, [['todas', 'Brasão em todas as páginas'], ['primeira', 'Brasão só na 1ª página'], ['nenhum', 'Sem brasão']].map(o => h('option', { value:o[0], selected:settings.brasTexto === o[0] }, o[1])));
  const cid = h('input', { class:'inp', value:settings.cidade || '' });
  sheet({ titulo:'Timbre e brasão', corpo:[h('label', { class:'fld' }, h('span', null, 'Cabeçalho'), tim), h('label', { class:'fld' }, h('span', null, 'Textos novos'), br), h('label', { class:'fld' }, h('span', null, 'Cidade (datas dos documentos)'), cid)],
    botoes:[{ t:'Cancelar', v:'ghost' }, { t:'Salvar', v:'pri', fn:() => { settings.timbre = tim.value; settings.brasTexto = br.value; settings.cidade = cid.value.trim() || 'Ilhéus'; saveSettings(); volta(); if(VIEW === 'mesa') renderMesa(true); DB.procs.forEach(p => recontar(p, true)); } }] });
}
function iaSheet(volta){
  const ia = settings.ia;
  const prov = h('select', { class:'sel' }, [['auto', 'Automático (usa a chave que houver)'], ['claude', 'Claude'], ['gemini', 'Gemini']].map(o => h('option', { value:o[0], selected:ia.prov === o[0] }, o[1])));
  const tier = h('select', { class:'sel' }, [['quick', 'Rápida (modelo leve, tipo Haiku)'], ['default', 'Caprichada (modelo mais forte, tipo Sonnet)']].map(o => h('option', { value:o[0], selected:ia.tier === o[0] }, o[1])));
  const ck = h('input', { class:'inp', type:'password', value:ia.claudeKey || '', placeholder:'sk-ant-…', autocomplete:'off' }), cm = h('input', { class:'inp', value:ia.claudeModel || 'claude-haiku-4-5' });
  const gk = h('input', { class:'inp', type:'password', value:ia.geminiKey || '', placeholder:'AIza…', autocomplete:'off' }), gm = h('input', { class:'inp', value:ia.geminiModel || 'gemini-2.5-flash' });
  const pr = h('textarea', { class:'txa', style:{ minHeight:'200px', fontSize:'13.5px' } }, ia.prompt || REV_PROMPT);
  sheet({ titulo:'Revisão por IA', cheio:true, corpo:[
    h('p', { class:'muted', style:{ margin:0, fontSize:'13px' } }, PWA ? 'No app instalado, a revisão usa a sua chave de API (cobrada à parte da assinatura, poucos centavos por revisão). A chave fica só neste celular. Sem chave, o botão R copia o trecho e abre o Claude ou o Gemini.' : 'Aberto pelo Claude, a revisão usa a sua própria conta do Claude, sem chave. As chaves abaixo valem para o app instalado.'),
    h('label', { class:'fld' }, h('span', null, 'Modo da revisão'), tier),
    h('label', { class:'fld' }, h('span', null, 'Quem revisa no app instalado'), prov),
    h('div', { class:'fgrp' }, h('label', { class:'fld' }, h('span', null, 'Chave do Claude'), ck), h('label', { class:'fld' }, h('span', null, 'Modelo do Claude'), cm), h('label', { class:'fld' }, h('span', null, 'Chave do Gemini'), gk), h('label', { class:'fld' }, h('span', null, 'Modelo do Gemini'), gm)),
    h('label', { class:'fld' }, h('span', null, 'Prompt da revisão'), pr), h('button', { class:'btn sm soft', style:{ alignSelf:'flex-start' }, onclick:() => { pr.value = REV_PROMPT; } }, 'Voltar ao prompt padrão')],
    botoes:[{ t:'Cancelar', v:'ghost' }, { t:'Salvar', v:'pri', fn:() => { Object.assign(settings.ia, { prov:prov.value, tier:tier.value, claudeKey:ck.value.trim(), claudeModel:cm.value.trim() || 'claude-haiku-4-5', geminiKey:gk.value.trim(), geminiModel:gm.value.trim() || 'gemini-2.5-flash', prompt:pr.value.trim() || REV_PROMPT }); saveSettings(); volta(); toast('Ajustes da revisão salvos.'); } }] });
}

/* ---------- backup ---------- */
async function fazerBackup(){
  if(!window.JSZip) return toast('O gerador de ZIP ainda está carregando.');
  if(VIEW === 'mesa') salvarTudo();
  const b = busy('Preparando backup…');
  try{
    const zip = new JSZip();
    const cfg = clone(settings); cfg.ia = Object.assign({}, cfg.ia, { claudeKey:'', geminiKey:'' });
    zip.file('procios3.json', JSON.stringify({ app:'Proc.Ios', v:3, salvo:new Date().toISOString(), db:DB, settings:cfg }));
    const ids = new Set(DB.procs.flatMap(p => p.docs.filter(d => d.kind === 'pdf').map(d => d.fileId)));
    for(const id of ids){ const bytes = await bytesDe(id); if(bytes) zip.file('arquivos/' + id + '.pdf', bytes); }
    const blob = await zip.generateAsync({ type:'blob' }); b.end();
    offer(blob, 'Panda Backup ' + hojeISO() + '.zip');
  }catch(e){ b.end(); toast('Não foi possível gerar o backup.'); }
}
$('bkFile').onchange = async e => {
  const file = e.target.files[0]; e.target.value = ''; if(!file || !window.JSZip) return;
  let data, zip;
  try{ zip = await JSZip.loadAsync(file); }catch(err){ toast('Este arquivo não é um backup do Panda.'); return; }
  if(!zip.file('procios3.json') && zip.file('procios.json')){
    /* backup da versão 2: acrescenta os processos, sem apagar nada */
    try{
      const v2 = JSON.parse(await zip.file('procios.json').async('string'));
      if(!v2 || !v2.state || !Array.isArray(v2.state.procs)) throw new Error('formato');
      const meta = zip.file('anexos.json') ? JSON.parse(await zip.file('anexos.json').async('string')) : [];
      const porId = {}; meta.forEach(m => porId[m.id] = m);
      if(!await confirmar('Backup da versão anterior', 'O arquivo tem ' + plural(v2.state.procs.length, 'processo', 'processos') + ' do Proc.Ios 2. Eles serão acrescentados aos que já estão aqui.', 'Acrescentar')) return;
      const b = busy('Trazendo processos…');
      const n = await converterV2(v2.state, async id => { const zf = zip.file('anexos/' + id + '.pdf'); return zf ? { name:(porId[id] || {}).name || 'Arquivo', pl:(porId[id] || {}).pl, bytes:await zf.async('uint8array') } : null; });
      await saveDB(true); b.end();
      while(SHEETS.length) SHEETS[SHEETS.length - 1].fechar();
      mostrar('home'); renderHome(); toast(plural(n, 'processo trazido', 'processos trazidos') + ' da versão anterior.');
    }catch(err){ toast('Não foi possível ler o backup da versão anterior.'); }
    return;
  }
  try{ data = JSON.parse(await zip.file('procios3.json').async('string')); if(!data || data.app !== 'Proc.Ios' || !data.db || !Array.isArray(data.db.procs)) throw new Error('formato'); }
  catch(err){ toast('Este arquivo não é um backup do Panda.'); return; }
  if(!await confirmar('Restaurar backup', 'O backup tem ' + plural(data.db.procs.filter(p => !p.avulsa).length, 'processo', 'processos') + '. Tudo o que está neste aparelho será substituído.', 'Restaurar', true)) return;
  const b = busy('Restaurando…');
  try{
    /* 1º grava os arquivos do backup; só depois troca os dados; por fim apaga o que sobrou */
    const novos = new Set();
    for(const f of Object.values(zip.files)){ const m = f.name.match(/^arquivos\/(.+)\.pdf$/); if(!m) continue; b.txt('Restaurando ' + (novos.size + 1) + '…'); await guardarBytes(await f.async('uint8array'), m[1], m[1]); novos.add(m[1]); }
    const antigos = new Set(DB.procs.flatMap(p => p.docs.filter(d => d.kind === 'pdf').map(d => d.fileId)));
    DB = data.db; DB.ui = { tab:'procs' };
    for(const id of antigos) if(!novos.has(id)) await apagarBytes(id);
    if(data.settings){ const ia = settings.ia; settings = Object.assign(SETTINGS_PADRAO(), data.settings); settings.ia = Object.assign({}, data.settings.ia || {}, { claudeKey:ia.claudeKey, geminiKey:ia.geminiKey }); M.lay = null; saveSettings(); }
    migrarSettings(); migrarDB(); procAvulsa(); await saveDB(true); b.end();
    while(SHEETS.length) SHEETS[SHEETS.length - 1].fechar();
    mostrar('home'); renderHome(); toast('Backup restaurado.');
  }catch(err){ b.end(); toast('Não foi possível restaurar o backup.'); }
};

/* ===== j_init.js ===== */
/* =====================================================================
   Início do app, voltar do Android, arquivos recebidos pelo WhatsApp
   ===================================================================== */
const QP = new URLSearchParams(location.search);
$('hAjustes').innerHTML = I.gear; $('hAjustes').onclick = abrirAjustes;
$('rBack').innerHTML = I.back; $('pvBack').innerHTML = I.x;
$('hRapido').innerHTML = I.side; $('hRapido').onclick = abrirRapido;
$('hMais').innerHTML = I.plusBold; $('hMais').onclick = () => menuMais($('hMais'));
$('hScrim').onclick = fecharRapido;
$('pandaLogo').onclick = () => alternarEdicao(); $('pandaMesa').onclick = () => alternarEdicao(); $('pandaMesa').querySelector('img').src = PANDA_SRC;

function voltar(){
  if(SHEETS.length){ fecharFolhaTopo(); return true; }
  if(LAY.editando){ voltarEdicao(); return true; }
  if(!$('vPrev').hidden){ $('pvBack').click(); return true; }
  if(M.editing){ fecharEditor(); return true; }
  if(VIEW === 'home' && $('hPanel').classList.contains('open')){ fecharRapido(); return true; }
  if(VIEW === 'mesa'){
    if(M.fsel){ sairSelecao(); return true; }
    if(!$('fmt').hidden){ $('fmt').hidden = true; atualizarIcones(); return true; }
    if(M.painel){ fecharPainel(); return true; }
    if(ROL.on){ pararRolagem(); return true; }
    sairMesa(); return true;
  }
  if(VIEW === 'rel'){ $('rBack').click(); return true; }
  if(VIEW === 'proc'){ voltarDoProc(); return true; }
  if(VIEW === 'pasta'){ voltarNo(); return true; }
  return false;
}
document.addEventListener('keydown', e => { if(e.key === 'Escape') voltar(); });

/* recebidos pelo menu Compartilhar do Android (app instalado) */
function inboxDb(fn){
  return new Promise(res => {
    try{
      const r = indexedDB.open('procios-inbox', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('inbox', { keyPath:'id', autoIncrement:true });
      r.onsuccess = () => { const tx = r.result.transaction('inbox', 'readwrite'), out = fn(tx.objectStore('inbox')); tx.oncomplete = () => res(out && out.result); tx.onerror = () => res(null); };
      r.onerror = () => res(null);
    }catch(err){ res(null); }
  });
}
let inboxOcupado = false;
async function processarInbox(){
  if(inboxOcupado || !DB) return; inboxOcupado = true;
  try{
    const recs = (await inboxDb(st => st.getAll())) || []; if(!recs.length) return;
    const arqs = recs.filter(r => r.blob), textos = recs.filter(r => r.text);
    const feitos = textos.map(r => r.id);
    const av = procAvulsa();
    if(arqs.length){
      if(!window.PDFLib || !window.JSZip) toast('Abra o app com internet uma vez para carregar as ferramentas de PDF.');
      else {
        feitos.push(...arqs.map(r => r.id));
        await inboxDb(st => { arqs.forEach(r => st.delete(r.id)); });
        await receberArquivos(arqs.map(r => new File([r.blob], r.name || 'arquivo.pdf', { type:r.type || r.blob.type || '' })));
      }
    }
    if(feitos.length) await inboxDb(st => { feitos.forEach(id => st.delete(id)); });
    const t = textos.map(r => r.text.trim()).filter(Boolean).join('\n\n');
    if(t){
      const d = criarTexto(av, null, 's1');
      d.html = mdParaHTML(t);
      d.nome = titleOf(d.html);
      saveDB(true); abrirMesa(av, { doc:d.id });
      toast('Texto recebido como texto pronto na mesa avulsa.');
    }
  } finally { inboxOcupado = false; }
}

/* ajustes de versões anteriores: signatários com carimbo e autoridade, nome da secretaria */
function migrarSettings(){
  const P = SETTINGS_PADRAO();
  if(!Array.isArray(settings.signatarios) || !settings.signatarios.length) settings.signatarios = P.signatarios;
  settings.signatarios.forEach(x => { if(x.carimbo == null) x.carimbo = ''; if(x.autoridade == null) x.autoridade = false; });
  if(!settings.signatarios.some(x => x.autoridade)){
    const s3 = P.signatarios.find(x => x.autoridade);
    const ja = settings.signatarios.find(x => norm(x.nome) === norm(s3.nome));
    if(ja) ja.autoridade = true; else settings.signatarios.push(Object.assign({}, s3, { id:settings.signatarios.some(x => x.id === s3.id) ? uid() : s3.id }));
  }
  if(!settings.orgao || /^secretaria (municipal )?de infraestrutura$/i.test(settings.orgao)) settings.orgao = P.orgao;
  if(!settings.sigla) settings.sigla = P.sigla;
  settings.carimbo = 'nenhum'; settings.signatarios.forEach(x => { delete x.carimbo; });
  if((settings.v || 0) < 4){ settings.v = 4; delete settings.sigLine; settings.timbre = 'completo'; }
  migrarSignatarios();
  saveSettings();
}

/* ---------- partida ---------- */
(async function iniciar(){
  const ls = lsGet('settings', null);
  if(ls) settings = Object.assign(SETTINGS_PADRAO(), ls);
  const kv = await kvGet('settings');
  if(kv && (!ls || JSON.stringify(kv) !== JSON.stringify(ls))) settings = Object.assign(SETTINGS_PADRAO(), kv);
  settings.ia = Object.assign(SETTINGS_PADRAO().ia, settings.ia || {});
  migrarSettings();
  try{ DB = await kvGetStrict('db'); }
  catch(e){
    console.error(e); DB_ERRO = true; DB = { v:3, procs:[], ui:{ tab:'procs' } }; procAvulsa();
    mostrar('home'); renderHome();
    $('homeBody').prepend(h('div', { class:'rbox', style:{ borderColor:'#ecc9c5', background:'var(--danger-soft)', marginTop:'8px' } }, h('b', null, 'Não consegui ler os dados guardados neste aparelho.'), h('div', { style:{ fontSize:'13.5px' } }, 'Para não apagar nada, o app não vai gravar até ser reaberto. Feche e abra de novo.')));
    return;
  }
  if(!DB || !Array.isArray(DB.procs)){
    DB = { v:3, procs:[], ui:{ tab:'procs' } };
    let n = 0;
    try{ n = await importarV2(); }catch(e){ n = 0; }
    if(!n) DB = seedDB();
    await saveDB(true);
  }
  DB.ui = DB.ui || { tab:'procs' };
  DB.procs.forEach(p => { p.docs = p.docs || []; p.tram = p.tram || []; p.notas = p.notas || []; p.ficha = p.ficha || { extras:[] }; if(!p.ficha.extras) p.ficha.extras = []; });
  migrarDB(); procAvulsa();
  /* volta para onde você estava */
  const vistaAntes = DB.ui.view, volta = vistaAntes === 'mesa' && DB.ui.proc && procPorId(DB.ui.proc), docV = DB.ui.doc;
  arvore();
  mostrar('home'); renderHome();
  if(volta) abrirMesa(volta, { doc:docV && volta.docs.some(d => d.id === docV) ? docV : null });
  else if(vistaAntes === 'proc' && DB.ui.proc && procPorId(DB.ui.proc)) abrirProcTela(procPorId(DB.ui.proc));
  else if(vistaAntes === 'pasta' && noPorId(DB.ui.no)) abrirNo(DB.ui.no);
  aplicarLayUI();
  if(PWA){
    processarInbox();
    document.addEventListener('visibilitychange', () => { if(!document.hidden) processarInbox(); });
    if(QP.get('view') === 'otim') abrirMesaPdf();
    if(QP.has('novo')) setTimeout(() => novoDocumento({}), 200);
  }
})();

if(PWA){
  if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  if(navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); window.__instalar = e; if(VIEW === 'home' && DB) renderHome(); });
  window.addEventListener('appinstalled', () => { window.__instalar = null; toast('Panda instalado.'); });
  history.replaceState({ root:1 }, '', location.pathname);
  history.pushState({ guarda:1 }, '');
  window.addEventListener('popstate', () => { if(voltar()) history.pushState({ guarda:1 }, ''); else history.back(); });
}

})();
