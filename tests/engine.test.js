'use strict';
/* اختبارات محرك الحساب (calc) والحضور والسلف والإيقاف الجزئي والأرقام العربية. التشغيل: node --test tests/ */
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

const ctx = vm.createContext({ console, crypto: require('node:crypto').webcrypto });
['utils', 'engine', 'punch', 'auth'].forEach(f =>
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f + '.js'), 'utf8'), ctx, { filename: f + '.js' }));
const run = code => vm.runInContext(code, ctx);

const BASE = { id: 'E1', name: 'اختبار', hire: '2026-01-01', hours: 8, shift: 'morning', susp: false, raises: [], sal: 0, dly: 0, hrly: 0 };
function fresh(emp, opt) {
  run('DB=defaults();idxCache=null;');
  if (opt && opt.precision !== undefined) run('DB.settings.precision=' + opt.precision);
  if (opt && opt.grace) run('DB.settings.graceMinutes=' + opt.grace);
  run('DB.emps.push(' + JSON.stringify(Object.assign({}, BASE, emp)) + ')');
}
function att(list) {
  list.forEach(r => run('DB.att.push(' + JSON.stringify(Object.assign({ c: 'E1', s: 'حاضر', i: '', o: '', b: 0 }, r)) + ')'));
  run('idxCache=null');
}
const calc = ym => run(`calc(empById('E1'),'${ym}')`);

test('شهري: شهر كامل = الراتب كاملاً (أساس 30)', () => {
  fresh({ sys: 'monthly', sal: 6000 });
  const c = calc('2026-06');
  assert.equal(c.base, 6000); assert.equal(c.net, 6000);
});
test('شهري: تعيين منتصف الشهر يحتسب 20 يوماً من 30', () => {
  fresh({ sys: 'monthly', sal: 6000, hire: '2026-06-11' });
  const c = calc('2026-06');
  assert.equal(c.elig, 20); assert.equal(c.base, 4000);
});
test('تصفية: يُحتسب الأجر حتى آخر يوم عمل فقط', () => {
  fresh({ sys: 'monthly', sal: 6000 });
  run("DB.sett.push({id:1,d:'2026-06-20',c:'E1',l:'2026-06-20',n:''})");
  const c = calc('2026-06');
  assert.equal(c.elig, 20); assert.equal(c.base, 4000);
});
test('رفع الأجر: الشهر قبل التاريخ بالأجر القديم وبعده بالجديد', () => {
  fresh({ sys: 'monthly', sal: 5000, raises: [{ d: '2026-06-15', sal: 6000, dly: 0, hrly: 0 }] });
  assert.equal(calc('2026-05').base, 5000);
  assert.equal(calc('2026-07').base, 6000);
});
test('يومي: الأجر = أيام الحضور × اليومية', () => {
  fresh({ sys: 'daily', dly: 200 });
  att([{ d: '2026-06-01' }, { d: '2026-06-02' }, { d: '2026-06-03' }, { d: '2026-06-04', s: 'غائب' }]);
  const c = calc('2026-06');
  assert.equal(c.pres, 3); assert.equal(c.base, 600);
});
test('شهري: خصم الغياب = أيام الغياب × (الراتب ÷ 30)', () => {
  fresh({ sys: 'monthly', sal: 6000 });
  att([{ d: '2026-06-01', s: 'غائب' }, { d: '2026-06-02', s: 'غائب' }]);
  const c = calc('2026-06');
  assert.equal(c.absd, 2); assert.equal(c.absded, 400); assert.equal(c.net, 5600);
});
test('الإضافي: ساعتان × (6000÷30÷8) × 1.5 = 75', () => {
  fresh({ sys: 'monthly', sal: 6000 });
  att([{ d: '2026-06-01', i: '09:00', o: '19:00' }]);
  const c = calc('2026-06');
  assert.equal(c.ot, 2); assert.equal(c.otv, 75); assert.equal(c.gross, 6075);
});
test('بالساعة + فترة سماح: تأخير 10 دقائق مع سماح 15 يُدفع كاملاً', () => {
  fresh({ sys: 'hourly', hrly: 30 }, { grace: 15 });
  att([{ d: '2026-06-01', i: '09:10', o: '17:00' }]);
  const c = calc('2026-06');
  assert.equal(c.base, 240);
});
test('بالساعة بدون سماح: التأخير يُخصم من الساعات', () => {
  fresh({ sys: 'hourly', hrly: 30 }, { grace: 0 });
  att([{ d: '2026-06-01', i: '09:30', o: '17:00' }]);
  assert.equal(calc('2026-06').base, 225); // 7.5 ساعة × 30
});
test('سجل زمني مشبوه (حضور = انصراف) يُستبعد من الحساب حتى المراجعة', () => {
  fresh({ sys: 'hourly', hrly: 30 });
  att([{ d: '2026-06-01', i: '09:00', o: '09:00' }]);
  assert.equal(calc('2026-06').base, 0);
  run("DB.att[0].reviewed=true;idxCache=null");
  assert.equal(calc('2026-06').hw, 0); // بعد المراجعة تُحتسب الساعات الفعلية (صفر هنا)
});
test('التقريب: النصف يبتعد عن الصفر وعدد الخانات من الإعدادات', () => {
  fresh({ sys: 'monthly', sal: 1 }, { precision: 0 });
  assert.equal(run('round5(2.5)'), 3); assert.equal(run('round5(-2.5)'), -3);
  run('DB.settings.precision=2');
  assert.equal(run('round5(1.005)'), 1.01);
});
test('السلف: توزيع الأقساط بدون فقد في القرش', () => {
  fresh({ sys: 'monthly', sal: 6000 });
  const s0 = run("advanceSchedule({d:'2026-06-05',a:1000,parts:3,start:'2026-06'}).map(x=>x.a)");
  assert.deepEqual(Array.from(s0), [334, 333, 333]);
  run('DB.settings.precision=2');
  const s2 = run("advanceSchedule({d:'2026-06-05',a:100,parts:3,start:'2026-06'}).map(x=>x.a)");
  assert.deepEqual(Array.from(s2), [33.34, 33.33, 33.33]);
});
test('السلف: القسط يُخصم في شهره فقط', () => {
  fresh({ sys: 'monthly', sal: 6000 });
  run("DB.adv.push({id:1,d:'2026-06-05',c:'E1',a:900,parts:3,start:'2026-07',n:''})");
  assert.equal(calc('2026-06').adv, 0);
  assert.equal(calc('2026-07').adv, 300);
  assert.equal(calc('2026-08').net, 5700);
});
test('الإيقاف: بدون أجر / بأجر كامل / جزئي بنسبة خصم / نسبة خاصة بالموظف', () => {
  fresh({ sys: 'monthly', sal: 6000, susp: true });
  run("DB.settings.suspMode='none'");  assert.equal(calc('2026-06').base, 0);
  run("DB.settings.suspMode='full'");  assert.equal(calc('2026-06').base, 6000);
  run("DB.settings.suspMode='partial';DB.settings.suspPct=50"); assert.equal(calc('2026-06').base, 3000);
  run("DB.emps[0].suspPct=20"); assert.equal(calc('2026-06').base, 4800); // النسبة الخاصة تتقدم على العامة
  run("DB.settings.suspMode='none'"); assert.equal(calc('2026-06').base, 4800);
});
test('الإيقاف: توافق مع الإعداد القديم susp=true', () => {
  fresh({ sys: 'monthly', sal: 6000, susp: true });
  run("delete DB.settings.suspMode;DB.settings.susp=true");
  assert.equal(calc('2026-06').base, 6000);
});
test('تحذير الأنماط: نفس الدقيقة 4 أيام متتالية فأكثر', () => {
  fresh({ sys: 'hourly', hrly: 30 });
  att(['01', '02', '03', '04'].map(d => ({ d: '2026-06-' + d, i: '09:00', o: '17:00' })));
  assert.equal(run("attPatternWarnings(empById('E1'),recOf('E1','2026-06-03'))").length, 0);
  const w = run("attPatternWarnings(empById('E1'),recOf('E1','2026-06-04'))");
  assert.equal(w.length, 1); assert.match(w[0], /4 أيام/);
});
test('تحذير الأنماط: حضور خارج نافذة الوردية', () => {
  fresh({ sys: 'hourly', hrly: 30 });
  att([{ d: '2026-06-01', i: '04:00', o: '12:00' }, { d: '2026-06-02', i: '18:00', o: '22:00' }, { d: '2026-06-03', i: '09:05', o: '17:00' }]);
  assert.match(run("attPatternWarnings(empById('E1'),recOf('E1','2026-06-01'))")[0], /قبل بداية/);
  assert.match(run("attPatternWarnings(empById('E1'),recOf('E1','2026-06-02'))")[0], /بعد نهاية/);
  assert.equal(run("attPatternWarnings(empById('E1'),recOf('E1','2026-06-03'))").length, 0);
});
test('الأرقام العربية والفارسية تتحول لإنجليزية', () => {
  assert.equal(run("toEn('٠١٢٣٤٥٦٧٨٩')"), '0123456789');
  assert.equal(run("toEn('۱۲۳۴')"), '1234');
  assert.equal(run("toEn('أحمد٥')"), 'أحمد5');
});
test('تسجيل الدخول: اسم المستخدم حروف/أرقام وكلمة المرور أرقام (4–20)', () => {
  assert.equal(run("validUser('أحمد123')"), true);
  assert.equal(run("validUser(toEn('مدير٢'))"), true);
  assert.equal(run("validUser('ahmed 1')"), false);
  assert.equal(run("validUser('a_b')"), false);
  assert.equal(run("validPass(toEn('١٢٣٤٥٦'))"), true);
  assert.equal(run("validPass('123')"), false);
  assert.equal(run("validPass('12ab')"), false);
});

/* ================= البصمة الذاتية ================= */
const G = { on: true, lat: 30.0444, lng: 31.2357, radius: 100, maxAcc: 50 };
test('المسافة: نقطتان على بعد ~111 م شمالاً', () => {
  const d = run('distMeters(30.0444,31.2357,30.0454,31.2357)');
  assert.ok(d > 105 && d < 117, String(d));
});
test('النطاق الجغرافي: داخل / خارج / دقة ضعيفة / غير مضبوط', () => {
  const chk = (p, g) => run(`geoCheck(${JSON.stringify(p)},${JSON.stringify(g)})`);
  assert.equal(chk({ lat: 30.0445, lng: 31.2357, acc: 10 }, G).ok, true);
  const out = chk({ lat: 30.0544, lng: 31.2357, acc: 10 }, G);
  assert.equal(out.ok, false); assert.match(out.reason, /خارج نطاق/);
  assert.match(chk({ lat: 30.0445, lng: 31.2357, acc: 200 }, G).reason, /دقة الموقع/);
  assert.match(chk({ lat: 30.0445, lng: 31.2357, acc: 5 }, Object.assign({}, G, { on: false })).reason, /لم يُضبط/);
});
test('نافذة البصمة: الحضور من قبل الوردية بالسماح، والانصراف حتى السماح المتأخر', () => {
  fresh({ sys: 'monthly', sal: 6000 });
  const w = run("shiftWindow('morning',DB.settings.shifts)"); // 09:00-17:00
  assert.equal(w.s, 540); assert.equal(w.e, 1020);
  const ok = (t, m) => run(`punchAllowed('${t}',${m},{s:${w.s},e:${w.e}},30,240)`).ok;
  assert.equal(ok('in', 500), false);  // 08:20 قبل السماح
  assert.equal(ok('in', 515), true);   // 08:35
  assert.equal(ok('in', 1030), false); // بعد نهاية الوردية
  assert.equal(ok('out', 1200), true); // 20:00 ضمن 4 ساعات بعد الوردية
  assert.equal(ok('out', 1300), false);
});
function punchTs(day, hm) { const [h, m] = hm.split(':').map(Number); const [y, mo, d] = day.split('-').map(Number); return new Date(y, mo - 1, d, h, m).getTime(); }
function doPunch(type, day, hm, extra) {
  return run(`applyPunch(DB,${JSON.stringify(Object.assign({ empId: 'E1', type, ts: punchTs(day, hm), dist: 20 }, extra))})`);
}
test('الحضور المبكر يُثبَّت عند بداية الوردية (بلا إضافي)', () => {
  fresh({ sys: 'monthly', sal: 6000 });
  assert.equal(doPunch('in', '2026-06-01', '08:40'), 'ok');
  assert.equal(doPunch('out', '2026-06-01', '17:00'), 'ok');
  const r = run("DB.att[0]");
  assert.equal(r.i, '09:00'); assert.equal(r.o, '17:00'); assert.equal(r.s, 'حاضر');
  assert.equal(calc('2026-06').ot, 0);
});
test('التأخر يُخصم والانصراف المتأخر إضافي', () => {
  fresh({ sys: 'hourly', hrly: 30 });
  doPunch('in', '2026-06-02', '09:30'); doPunch('out', '2026-06-02', '18:30');
  const c = calc('2026-06'); // 9 ساعات فعلية: 8 عادية + 1 إضافي
  assert.equal(c.ot, 1);
  fresh({ sys: 'monthly', sal: 6000 });
  doPunch('in', '2026-06-02', '09:30'); doPunch('out', '2026-06-02', '17:00');
  const c2 = calc('2026-06'); assert.equal(c2.sh > 0.49 && c2.sh < 0.51, true); // نصف ساعة نقص
});
test('بصمة خارج النافذة أو لموظف غير معروف تُتجاهل', () => {
  fresh({ sys: 'monthly', sal: 6000 });
  assert.equal(doPunch('in', '2026-06-01', '03:00'), 'ignored');
  assert.equal(doPunch('in', '2026-06-01', '09:00', { empId: 'X' }), 'ignored');
  assert.equal(run('DB.att.length'), 0);
});
test('البصمة لا تُغيّر حضوراً مسجلاً يدوياً، ولا تُكرّر الحضور', () => {
  fresh({ sys: 'monthly', sal: 6000 });
  att([{ d: '2026-06-03', i: '09:10', o: '' }]);
  doPunch('in', '2026-06-03', '09:00');
  assert.equal(run("DB.att[0].i"), '09:10');
  doPunch('out', '2026-06-03', '17:05'); doPunch('out', '2026-06-03', '17:01');
  assert.equal(run("DB.att[0].o"), '17:05'); assert.equal(run('DB.att.length'), 1);
});
test('إعدادات الموظف المنشورة: بدون موظفي لا يبصمون ولا مصفّين', () => {
  fresh({ sys: 'monthly', sal: 6000 });
  run("DB.emps.push({id:'E2',name:'ب',hire:'2026-01-01',clock:false,shift:'morning'},{id:'E3',name:'ج',hire:'2026-01-01',shift:'evening'})");
  run("DB.sett.push({id:1,d:'2026-02-01',c:'E3',l:'2026-02-01'})");
  const c = run('buildPunchCfg(DB)');
  assert.deepEqual(Object.keys(c.emps), ['E1']);
  assert.equal(JSON.stringify(c).includes('"name"'), false);
});

test('ملخص اليوم: حضور مبكر بلا إضافي، تأخير، إضافي، نقص', () => {
  const w = { s: 540, e: 1020 }, S = (a, b, h = 8, ot = true) => run(`punchSummary(${a},${b},{s:540,e:1020},${h},${ot})`);
  let r = S(520, 1020); assert.equal(r.early, 20); assert.equal(r.ot, 0); assert.equal(r.short, 0);   // مبكر بلا إضافي
  r = S(540, 1080);     assert.equal(r.ot, 60);                                                       // انصراف بعد الوردية = إضافي
  r = S(530, 1080);     assert.equal(r.early, 10); assert.equal(r.ot, 60);                            // المبكر لا يزيد الإضافي
  r = S(570, 1020);     assert.equal(r.late, 30); assert.equal(r.short, 30);                          // تأخير يُخصم
  r = S(540, 1080, 8, false); assert.equal(r.ot, 0);                                                  // الإضافي معطّل بالإعدادات
  r = S(540, 960);      assert.equal(r.short, 60);
});
test('اسم حساب الموظف: رقم الموبايل أو الكود، وكلمة مرور رقمية من 6 أرقام', () => {
  assert.equal(run("accountName({id:'EMP-001',phone:'01012345678'},{})"), '01012345678');
  assert.equal(run("accountName({id:'EMP-001',phone:'01012345678'},{'01012345678':1})"), 'emp001');
  assert.equal(run("accountName({id:'EMP-002',phone:''},{})"), 'emp002');
  for (let i = 0; i < 50; i++) { const p = run('genPassword()'); assert.match(p, /^\d{6}$/); assert.equal(run(`validPass('${p}')`), true); }
  assert.equal(run("validUser(accountName({id:'EMP-001',phone:'٠١٠١٢٣٤٥٦٧٨'},{}))"), true);
});
