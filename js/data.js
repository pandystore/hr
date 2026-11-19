'use strict';
/* ربط حالة التطبيق (DB) بطبقة Firebase. كل تعديل يمر عبر save() ثم يُزامَن تلقائياً. */
var USERS=[]; // حسابات النظام (يغذيها Firestore للمدير فقط)

/* يبني كائن DB من اللقطة القادمة من Firestore مع دمج الإعدادات الافتراضية */
function buildDB(raw){
 var base=defaults(),S=raw.settings||{};
 if(S.suspMode===undefined)S.suspMode=S.susp?'full':'none'; // توافق مع بيانات أقدم
 Object.keys(base.settings).forEach(function(k){if(S[k]===undefined)S[k]=base.settings[k];});
 var db={v:1,demo:!!raw.demo,settings:S,emps:raw.emps||[],att:raw.att||[],adv:raw.adv||[],bon:raw.bon||[],sett:raw.sett||[],pay:raw.pay||[],seq:raw.seq||1};
 var maxId=0;['adv','bon','sett','pay'].forEach(function(c){db[c].forEach(function(r){if(+r.id>maxId)maxId=+r.id;});});
 if(db.seq<=maxId)db.seq=maxId+1;
 db.emps.forEach(function(e){if(e.job&&S.jobs.indexOf(e.job)<0)S.jobs.push(e.job);});
 db.emps.sort(function(a,b){return codeNum(a.id)-codeNum(b.id)||(a.id<b.id?-1:1);});
 S.users=USERS;
 return db;}

var lastCfg='';
function publishCfg(){try{var j=HRStore.stable(buildPunchCfg(DB));if(j!==lastCfg){lastCfg=j;HRStore.publishPunchCfg(buildPunchCfg(DB)).catch(function(e){lastCfg='';if(!window.__cfgWarned){window.__cfgWarned=1;toast('تعذر نشر إعدادات البصمة للموظفين: '+(typeof errMsg==='function'?errMsg(e):'خطأ')+' تأكد من نشر قواعد Firestore.');}});}}catch(e){}}
function save(){ver++;idxCache=null;DB.settings.users=USERS;HRStore.scheduleSave(DB);publishCfg();}

/* دمج البصمات الجديدة القادمة من الموظفين في سجل الحضور (تُنفَّذ على جهاز إداري مفتوح) */
var punchBusy={};
function processPunches(list){
 if(!DB||!list||!list.length)return;
 var todo=list.filter(function(p){return !punchBusy[p.id];}).sort(function(a,b){return a.ts-b.ts;});if(!todo.length)return;
 todo.forEach(function(p){punchBusy[p.id]=1;});
 var changed=0,res=todo.map(function(p){var r=applyPunch(DB,p);if(r==='ok')changed++;return r;});
 if(changed){save();idxCache=null;if(!$('#mbg'))render();toast('تم تسجيل '+changed+' بصمة ذاتية من الموظفين');}
 HRStore.flushNow().then(function(){if(HRStore.hasUnsaved())throw new Error('unsaved');return HRStore.markPunchApplied(todo.map(function(p){return p.id;}));}).catch(function(){todo.forEach(function(p){delete punchBusy[p.id];});});}

function saveUI(){HRStore.savePrefs({ym:ui.ym,empView:ui.empView,hideAtt:ui.hideAtt});}
function applyTheme(t){if(t==='dark'||t==='light'){document.documentElement.setAttribute('data-theme',t);try{localStorage.setItem('hr_theme',t);}catch(e){}}}
(function(){try{var t=localStorage.getItem('hr_theme');if(t==='dark'||t==='light')document.documentElement.setAttribute('data-theme',t);}catch(e){}})();
function toggleTheme(){var cur=document.documentElement.getAttribute('data-theme'),dark=cur?cur==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches,nx=dark?'light':'dark';applyTheme(nx);return nx;}
function applyPrefs(p){p=p||{};if(/^\d{4}-(0[1-9]|1[0-2])$/.test(p.ym||''))ui.ym=p.ym;if(p.empView==='cards'||p.empView==='table')ui.empView=p.empView;ui.hideAtt=!!p.hideAtt;applyTheme(p.theme);}

/* تغيّر البيانات من جهاز/مستخدم آخر */
function onRemoteData(raw){
 DB=buildDB(raw);idxCache=null;
 var typing=document.activeElement&&/^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement.tagName)&&$('#view')&&$('#view').contains(document.activeElement);
 if(!modalState&&!$('#mbg')&&!typing)render();}
