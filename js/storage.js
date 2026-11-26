/*
 * طبقة Firebase: المصادقة + Firestore. لا يوجد أي تخزين محلي للبيانات.
 * كل مستند يُخزَّن كحقل واحد { j: "<JSON>" } لتجنب قيود أنواع Firestore (المصفوفات المتداخلة وغيرها)،
 * وتُقارَن المستندات بصيغة JSON ثابتة الترتيب لاكتشاف التغييرات الفعلية فقط.
 */
import { initializeApp, deleteApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, setPersistence, browserSessionPersistence, browserLocalPersistence, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, onAuthStateChanged, updatePassword, EmailAuthProvider, reauthenticateWithCredential, deleteUser }
  from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, collection, doc, getDoc, setDoc, updateDoc, deleteDoc, onSnapshot, writeBatch, addDoc, query, where, serverTimestamp, getDocs, orderBy, limit }
  from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const COLS = ['emps', 'att', 'adv', 'bon', 'sett', 'pay', 'efiles'];
const cfg = window.FIREBASE_CONFIG || {};
const configured = !!cfg.apiKey && !/PASTE_/.test(cfg.apiKey + cfg.projectId);

let app, auth, db, profile = null, ready = false, curDB = null, timer = null, queue = Promise.resolve();
let busy = false, remoteDirty = false, prefsTimer = null, flushing = false;
let shadowBefore = new Map();
const shadow = new Map(); // key "col/id" -> JSON string المطابق لما على الخادم
const unsubs = [];
const H = { onRemote: null, onError: null, onUsers: null, onProfile: null };

/* ---------- أدوات ---------- */
function stable(o) {
  if (Array.isArray(o)) return '[' + o.map(stable).join(',') + ']';
  if (o && typeof o === 'object') {
    return '{' + Object.keys(o).filter(k => o[k] !== undefined).sort()
      .map(k => JSON.stringify(k) + ':' + stable(o[k])).join(',') + '}';
  }
  return JSON.stringify(o === undefined ? null : o);
}
async function sha(s) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join('');
}
/* اسم المستخدم يتحول لبريد وهمي ثابت (يدعم الحروف العربية)، وكلمة المرور الرقمية تُزاد لتبلغ حد Firebase الأدنى (6). */
async function emailOf(u) { return 'u' + (await sha(String(u).normalize('NFC').replace(/\s+/g, ' ').trim().toLowerCase())).slice(0, 40) + '@hr-system.app'; }
const pwOf = p => 'HR#' + p + '#sys';

function flatten(DB) {
  const out = {};
  const S = Object.assign({}, DB.settings); delete S.users;
  out['meta/main'] = { settings: S, seq: DB.seq, demo: !!DB.demo, v: DB.v || 1 };
  (DB.emps || []).forEach(e => {
    const rest = Object.assign({}, e); const files = rest.files || []; delete rest.files;
    out['emps/' + e.id] = rest;
    files.forEach((f, i) => { out['efiles/' + e.id + '__' + i] = Object.assign({ c: e.id, i }, f); });
  });
  (DB.att || []).forEach(r => { out['att/' + r.d + '__' + r.c] = r; });
  ['adv', 'bon', 'sett', 'pay'].forEach(c => (DB[c] || []).forEach(r => { out[c + '/' + r.id] = r; }));
  return out;
}
function assemble() {
  const raw = { settings: null, seq: 1, demo: false, emps: [], att: [], adv: [], bon: [], sett: [], pay: [] };
  const files = {};
  shadow.forEach((j, key) => {
    const o = JSON.parse(j), col = key.split('/')[0];
    if (key === 'meta/main') { raw.settings = o.settings; raw.seq = o.seq || 1; raw.demo = !!o.demo; }
    else if (col === 'efiles') (files[o.c] = files[o.c] || []).push(o);
    else if (raw[col]) raw[col].push(o);
  });
  raw.emps.forEach(e => {
    e.files = (files[e.id] || []).sort((a, b) => a.i - b.i).map(f => { const x = Object.assign({}, f); delete x.c; delete x.i; return x; });
  });
  return raw;
}
function fail(e) { console.error(e); if (H.onError) H.onError(e); }

/* ---------- تهيئة ---------- */
async function init() {
  if (!configured) return false;
  app = initializeApp(cfg); auth = getAuth(app);
  /* تخزين محلي دائم: عند فتح البرنامج مرة أخرى لا تُقرأ من الخادم إلا المستندات التي تغيّرت (يقلل القراءات كثيراً) */
  try { db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) }); } catch (_) { db = getFirestore(app); }
  return true;
}
function onAuth(cb) { onAuthStateChanged(auth, u => { if (!busy) cb(u); }); }

async function loadProfile() {
  const u = auth.currentUser; if (!u) return null;
  const s = await getDoc(doc(db, 'users', u.uid));
  profile = s.exists() ? Object.assign({ uid: u.uid }, s.data()) : null;
  return profile;
}

/* ---------- الدخول والحسابات ---------- */
/* البقاء مسجلاً على هذا الجهاز (يُستدعى قبل تسجيل الدخول). لا نستدعيه عند فتح الصفحة حتى لا تنتقل جلسة محفوظة إلى جلسة مؤقتة */
async function setRemember(v) { await setPersistence(auth, v ? browserLocalPersistence : browserSessionPersistence); }
async function login(username, pass) {
  await signInWithEmailAndPassword(auth, await emailOf(username), pwOf(pass));
}
/* إنشاء أول مدير للنظام (يعمل مرة واحدة فقط بحسب قواعد Firestore) */
async function bootstrapAdmin(username, pass) {
  busy = true;
  try {
    const cred = await createUserWithEmailAndPassword(auth, await emailOf(username), pwOf(pass));
    try {
      const b = writeBatch(db);
      b.set(doc(db, 'users', cred.user.uid), { username, admin: true, perms: [], prefs: {}, createdAt: Date.now() });
      b.set(doc(db, 'meta', 'initialized'), { by: cred.user.uid, at: Date.now() });
      await b.commit();
    } catch (e) {
      try { await deleteUser(cred.user); } catch (_) { await signOut(auth); }
      const err = new Error('already-initialized'); err.code = 'hr/already-initialized'; throw err;
    }
  } finally { busy = false; }
}
async function createUser(username, pass, perms, empId) {
  const sapp = initializeApp(cfg, 'secondary-' + Date.now());
  try {
    const sauth = getAuth(sapp);
    const cred = await createUserWithEmailAndPassword(sauth, await emailOf(username), pwOf(pass));
    await signOut(sauth);
    await setDoc(doc(db, 'users', cred.user.uid), Object.assign({ username, admin: false, perms, prefs: {}, createdAt: Date.now() }, empId ? { role: 'employee', empId } : {})); // يكتبه المدير (الجلسة الأساسية)
  } finally { await deleteApp(sapp); }
}
const updateUserPerms = (uid, perms) => updateDoc(doc(db, 'users', uid), { perms });
const deleteUserProfile = uid => deleteDoc(doc(db, 'users', uid));
async function changeOwnPassword(oldPass, newPass) {
  const u = auth.currentUser;
  await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, pwOf(oldPass)));
  await updatePassword(u, pwOf(newPass));
}
async function verifyPassword(pass) {
  const u = auth.currentUser;
  await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, pwOf(pass)));
}
async function logout() {
  try { await flushNow(); } catch (_) {}
  stop(); profile = null; ready = false; curDB = null; sid = null;
  try { sessionStorage.removeItem(SID_KEY); } catch (_) {}
  await signOut(auth);
}
function savePrefs(p) {
  if (!profile) return; profile.prefs = Object.assign({}, profile.prefs, p);
  clearTimeout(prefsTimer);
  prefsTimer = setTimeout(() => updateDoc(doc(db, 'users', profile.uid), { prefs: profile.prefs }).catch(fail), 800);
}

/* ---------- المزامنة ---------- */
function applySnap(col, snap, initial) {
  let changed = false;
  snap.docChanges().forEach(ch => {
    const key = col + '/' + ch.doc.id;
    if (ch.type === 'removed') { if (shadow.delete(key)) changed = true; return; }
    if (!initial && ch.doc.metadata.hasPendingWrites) return; // صدى كتابتنا المحلية
    const j = ch.doc.data().j;
    if (shadow.get(key) !== j) { shadow.set(key, j); changed = true; }
  });
  return changed;
}
function isDirty() {
  if (!curDB) return false;
  const flat = flatten(curDB);
  for (const k in flat) if (shadow.get(k) !== stable(flat[k])) return true;
  for (const k of shadow.keys()) if (!(k in flat)) return true;
  return false;
}
function notifyRemote() {
  if (flushing || timer || isDirty()) { remoteDirty = true; return; }
  remoteDirty = false; if (H.onRemote) H.onRemote(assemble());
}
/* يبدأ الاستماع ويُرجع البيانات الأولية بعد وصول أول لقطة من كل المجموعات */
function start(handlers) {
  Object.assign(H, handlers);
  const names = COLS;
  return new Promise((resolve, reject) => {
    let left = names.length + 1, failed = false;
    /* الإعدادات: مستند واحد meta/main (لا نقرأ مجموعة meta كلها لأن فيها مستند التهيئة المحجوب) */
    let metaFirst = true;
    unsubs.push(onSnapshot(doc(db, 'meta', 'main'), snap => {
      let changed = false;
      if (!snap.exists()) { changed = shadow.delete('meta/main'); }
      else if (metaFirst || !snap.metadata.hasPendingWrites) {
        const j = snap.data().j; if (shadow.get('meta/main') !== j) { shadow.set('meta/main', j); changed = true; }
      }
      if (metaFirst) { metaFirst = false; if (--left === 0) { ready = true; resolve(assemble()); } }
      else if (changed && ready) notifyRemote();
    }, err => { if (!failed) { failed = true; reject(err); } fail(err); }));
    names.forEach(col => {
      let first = true;
      unsubs.push(onSnapshot(collection(db, col), snap => {
        if (first) { first = false; applySnap(col, snap, true); if (--left === 0) { ready = true; resolve(assemble()); } }
        else if (applySnap(col, snap, false) && ready) notifyRemote();
      }, err => { if (!failed) { failed = true; reject(err); } fail(err); }));
    });
    if (profile && !isEmployee()) {
      unsubs.push(onSnapshot(query(collection(db, 'punches'), where('applied', '==', false)), snap => {
        if (H.onPunches) H.onPunches(snap.docs.map(d => Object.assign({ id: d.id }, d.data(), { ts: d.data().ts && d.data().ts.toMillis ? d.data().ts.toMillis() : null })).filter(p => p.ts));
      }, fail));
    }
    if (profile && profile.admin) {
      unsubs.push(onSnapshot(collection(db, 'users'), snap => {
        if (H.onUsers) H.onUsers(snap.docs.map(d => Object.assign({ uid: d.id }, d.data())));
      }, fail));
    }
    unsubs.push(onSnapshot(doc(db, 'users', profile.uid), snap => {
      if (!snap.exists()) { if (H.onProfile) H.onProfile(null); return; }
      profile = Object.assign({ uid: profile.uid }, snap.data()); if (H.onProfile) H.onProfile(profile);
    }, fail));
  });
}
/* ---- ربط الجهاز (للموظفين) وجلسة واحدة لكل حساب ---- */
const SID_KEY = 'hr_sid';
let sid = null;
const rndHex = n => Array.from(crypto.getRandomValues(new Uint8Array(n))).map(x => x.toString(16).padStart(2, '0')).join('');
/* أول دخول للموظف يربط الحساب بهذا الهاتف (معرّف سري محفوظ فيه). أي هاتف آخر يُرفض */
async function bindDevice() {
  if (!profile || profile.role !== 'employee') return { ok: true };
  const dev = await window.getDeviceId();
  if (!profile.deviceId) { await updateDoc(doc(db, 'users', profile.uid), { deviceId: dev }); profile.deviceId = dev; return { ok: true, first: true }; }
  return { ok: profile.deviceId === dev };
}
/* الدخول الجديد يأخذ الجلسة وتنتهي القديمة. إعادة تحميل نفس التبويب لا تُعدّ دخولاً جديداً */
async function claimSession() {
  let s = null; try { s = sessionStorage.getItem(SID_KEY); } catch (_) {}
  const cur = profile.session && profile.session.id;
  if (s && cur === s) { sid = s; return { ok: true }; }
  if (s && cur && cur !== s) return { ok: false };
  sid = rndHex(16); try { sessionStorage.setItem(SID_KEY, sid); } catch (_) {}
  const at = Date.now();
  await updateDoc(doc(db, 'users', profile.uid), { session: { id: sid, at } });
  profile.session = { id: sid, at };
  return { ok: true };
}
const resetDevice = uid => updateDoc(doc(db, 'users', uid), { deviceId: '' });
const isEmployee = () => !!(profile && profile.role === 'employee');
const markPunchApplied = ids => Promise.all(ids.map(id => updateDoc(doc(db, 'punches', id), { applied: true })));
/* إعدادات البصمة التي يقرؤها الموظف (بدون أي بيانات رواتب): النطاق الجغرافي والورديات ووردية كل موظف */
/* قائمة أسماء الموظفين لشاشة الدخول (اسم + اسم مستخدم فقط، بلا كلمات مرور أو بيانات مالية) */
const publishLoginList = (l, b) => setDoc(doc(db, 'loginlist', 'main'), { l, b: b || null });
async function getLoginInfo() { try { const s = await getDoc(doc(db, 'loginlist', 'main')); const d = s.exists() ? s.data() : {}; return { l: d.l || [], b: d.b || null }; } catch (_) { return { l: [], b: null }; } }
async function getLoginList() { return (await getLoginInfo()).l; }
const publishPunchCfg = cfgObj => setDoc(doc(db, 'punchcfg', 'main'), { j: stable(cfgObj) });

/* ---- جلسة الموظف: لا تقرأ أي بيانات نظام، فقط إعدادات البصمة وبصماته هو ---- */
function startEmployee(handlers) {
  Object.assign(H, handlers);
  return new Promise((resolve, reject) => {
    let cfgDone = false, punchDone = false, cfg = null, punches = [];
    const check = () => { if (cfgDone && punchDone) resolve({ cfg, punches }); };
    unsubs.push(onSnapshot(doc(db, 'punchcfg', 'main'), s => {
      cfg = s.exists() ? JSON.parse(s.data().j) : null; cfgDone = true; check(); if (H.onCfg) H.onCfg(cfg);
    }, e => { reject(e); fail(e); }));
    unsubs.push(onSnapshot(query(collection(db, 'punches'), where('uid', '==', profile.uid)), s => {
      punches = s.docs.map(d => { const x = d.data(); return { id: d.id, type: x.type, day: x.day, ts: x.ts && x.ts.toMillis ? x.ts.toMillis() : Date.now(), dist: x.dist }; }).sort((a, b) => a.ts - b.ts);
      punchDone = true; check(); if (H.onPunchList) H.onPunchList(punches);
    }, e => { reject(e); fail(e); }));
    unsubs.push(onSnapshot(doc(db, 'users', profile.uid), snap => {
      if (!snap.exists()) { if (H.onProfile) H.onProfile(null); return; }
      profile = Object.assign({ uid: profile.uid }, snap.data()); if (H.onProfile) H.onProfile(profile);
    }, fail));
  });
}
/* البصمة: الوقت من الخادم (serverTimestamp) فلا يمكن تغييره من جهاز الموظف */
function sendPunch(p) {
  return setDoc(doc(db, 'punches', profile.uid + '_' + p.day + '_' + p.type), { uid: profile.uid, empId: profile.empId, type: p.type, day: p.day, lat: p.lat, lng: p.lng, acc: p.acc, dist: p.dist, applied: false, dev: profile.deviceId, sid, ts: serverTimestamp() });
}
function stop() { unsubs.splice(0).forEach(u => u()); shadow.clear(); }

function scheduleSave(DB) {
  curDB = DB; if (!ready) return;
  clearTimeout(timer); timer = setTimeout(() => { timer = null; flushNow(); }, 700);
}
function flushNow() {
  clearTimeout(timer); timer = null;
  queue = queue.then(doFlush).catch(fail);
  return queue;
}
async function doFlush() {
  if (!ready || !curDB) return;
  flushing = true;
  try {
    const flat = flatten(curDB), ops = [];
    shadowBefore = new Map(shadow);
    for (const k in flat) { const j = stable(flat[k]); if (shadow.get(k) !== j) ops.push({ k, j }); }
    shadow.forEach((_, k) => { if (!(k in flat)) ops.push({ k, del: true }); });
    const auditItems = ops.length ? auditSummary(ops) : [];
    for (let i = 0; i < ops.length; i += 400) {
      const part = ops.slice(i, i + 400), prev = part.map(o => shadow.get(o.k));
      part.forEach(o => { if (o.del) shadow.delete(o.k); else shadow.set(o.k, o.j); });
      const b = writeBatch(db);
      part.forEach(o => { const [c, id] = [o.k.slice(0, o.k.indexOf('/')), o.k.slice(o.k.indexOf('/') + 1)]; const r = doc(db, c, id); if (o.del) b.delete(r); else b.set(r, { j: o.j }); });
      try { await b.commit(); }
      catch (e) {
        part.forEach((o, n) => { if (prev[n] === undefined) shadow.delete(o.k); else shadow.set(o.k, prev[n]); });
        timer = setTimeout(() => { timer = null; flushNow(); }, 8000); // إعادة المحاولة
        throw e;
      }
    }
    if (auditItems.length && profile) { try { await addDoc(collection(db, 'audit'), { at: serverTimestamp(), by: profile.username || profile.name || '', items: auditItems }); } catch (e) { /* السجل لا يعطّل الحفظ */ } }
  } finally { flushing = false; if (remoteDirty && !timer) notifyRemote(); }
}
const AUD_COL = { emps: 'موظف', adv: 'سلفة', bon: 'حافز/جزاء', pay: 'دفعة', sett: 'تصفية', att: 'حضور', meta: 'إعدادات', efiles: 'ملف موظف' };
function auditSummary(ops) {
  const out = [], att = { add: 0, edit: 0, del: 0 };
  for (const o of ops) {
    const c = o.k.slice(0, o.k.indexOf('/'));
    if (c === 'punches' || !AUD_COL[c]) continue;
    const prev = shadowBefore.get(o.k);
    const t = o.del ? 'del' : (prev === undefined ? 'add' : 'edit');
    if (c === 'att') { att[t]++; continue; }
    let n = '';
    try { const x = JSON.parse(o.del ? (prev || '{}') : o.j); n = x.name || (x.c ? x.c + (x.a != null ? ' · ' + x.a : '') : '') || ''; } catch (e) { }
    if (c === 'meta') n = 'الإعدادات العامة';
    if (out.length < 40) out.push({ k: AUD_COL[c], t, n: String(n).slice(0, 60) });
  }
  ['add', 'edit', 'del'].forEach(t => { if (att[t]) out.push({ k: 'حضور', t, n: att[t] + ' سجل' }); });
  return out;
}
async function getAudit() {
  const q = query(collection(db, 'audit'), orderBy('at', 'desc'), limit(150));
  const r = await getDocs(q);
  return r.docs.map(d => { const x = d.data(); return { id: d.id, by: x.by, at: x.at && x.at.toMillis ? x.at.toMillis() : 0, items: x.items || [] }; });
}
const hasUnsaved = () => !!timer || !!flushing || isDirty();
addEventListener('beforeunload', e => { if (ready && hasUnsaved()) { e.preventDefault(); e.returnValue = ''; } });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && ready) flushNow(); });

window.HRStore = {
  configured, init, onAuth, setRemember, loadProfile, login, bootstrapAdmin, createUser, updateUserPerms, deleteUserProfile,
  changeOwnPassword, verifyPassword, logout, start, startEmployee, bindDevice, claimSession, resetDevice, sendPunch, getAudit, sid: () => sid, deviceId: () => profile && profile.deviceId, markPunchApplied, publishPunchCfg, publishLoginList, getLoginList, getLoginInfo, isEmployee, scheduleSave, flushNow, savePrefs, hasUnsaved,
  profile: () => profile, currentUid: () => auth && auth.currentUser && auth.currentUser.uid,
  flatten, stable, setBusy: v => { busy = v; }, handleError: fn => { H.onError = fn; }
};
