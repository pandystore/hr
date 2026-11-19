'use strict';
/* منطق البصمة الذاتية: النطاق الجغرافي ونافذة الوردية ودمج البصمة في سجل الحضور.
   القواعد: الحضور المبكر يُثبَّت عند بداية الوردية (لا إضافي له)، التأخر يُخصم، والانصراف المتأخر يُحتسب إضافياً عبر محرك الحساب. */

function distMeters(lat1,lng1,lat2,lng2){var R=6371000,rad=Math.PI/180,dp=(lat2-lat1)*rad,dl=(lng2-lng1)*rad,
 a=Math.sin(dp/2)*Math.sin(dp/2)+Math.cos(lat1*rad)*Math.cos(lat2*rad)*Math.sin(dl/2)*Math.sin(dl/2);
 return 2*R*Math.asin(Math.min(1,Math.sqrt(a)));}

function geoReady(g){return !!(g&&g.on&&isFinite(parseFloat(g.lat))&&isFinite(parseFloat(g.lng))&&(+g.radius)>0);}
/* pos = {lat,lng,acc} بالمتر. النطاق: المسافة ≤ نصف القطر، ودقة الموقع ≤ الحد الأقصى المسموح */
function geoCheck(pos,g){
 if(!geoReady(g))return {ok:false,reason:'لم يُضبط موقع العمل بعد. راجع المسؤول.'};
 if(!pos||!isFinite(pos.lat)||!isFinite(pos.lng))return {ok:false,reason:'تعذر تحديد موقعك.'};
 var d=distMeters(+pos.lat,+pos.lng,parseFloat(g.lat),parseFloat(g.lng)),max=+g.maxAcc||100;
 if(isFinite(pos.acc)&&pos.acc>max)return {ok:false,dist:d,reason:'دقة الموقع ضعيفة ('+Math.round(pos.acc)+' م). انتقل لمكان مكشوف وأعد المحاولة.'};
 if(d>(+g.radius))return {ok:false,dist:d,reason:'أنت خارج نطاق العمل (على بعد '+Math.round(d)+' م، المسموح '+Math.round(+g.radius)+' م).'};
 return {ok:true,dist:d};}

/* نافذة وردية الموظف بالدقائق: {s,e} مع دعم الوردية العابرة لمنتصف الليل */
function shiftWindow(key,shifts){
 var a=shifts[key==='both'?'morning':key]||shifts.morning,b=shifts[key==='both'?'evening':key]||shifts.morning,
  s=tmin(a.s),e=tmin(b.e);if(e<=s)e+=1440;return {s:s,e:e};}
function adjMin(m,w,early){return (w.e>1440&&m<w.s-early)?m+1440:m;}
/* مسموح بالحضور من (بداية الوردية − سماح مبكر) حتى نهاية الوردية، وبالانصراف حتى (نهاية الوردية + سماح متأخر) */
function punchAllowed(type,nowMin,w,early,lateOut){
 early=isFinite(+early)?+early:30;lateOut=isFinite(+lateOut)?+lateOut:240;var m=adjMin(nowMin,w,early);
 if(type==='in')return m>=w.s-early&&m<=w.e?{ok:true}:{ok:false,reason:m<w.s-early?'لم يحن موعد الحضور بعد (يبدأ قبل الوردية بـ '+early+' دقيقة).':'انتهت وردية اليوم.'};
 return m>=w.s&&m<=w.e+lateOut?{ok:true}:{ok:false,reason:m<w.s?'لم تبدأ وردية اليوم بعد.':'تجاوزت الحد المسموح للانصراف بعد نهاية الوردية.'};}

function hmOf(ms){var d=new Date(ms);return pad(d.getHours())+':'+pad(d.getMinutes());}
function dayOf(ms){var d=new Date(ms);return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());}

/* ما يقرؤه تطبيق الموظف (بدون أسماء أو رواتب) */
function buildPunchCfg(db){
 var S=db.settings,g=S.geo||{},map={},td=today();
 db.emps.forEach(function(e){if(e.clock===false||e.hire>td)return;var end='';db.sett.forEach(function(s){if(s.c===e.id&&s.l>end)end=s.l;});if(end&&end<td)return;map[e.id]={s:e.shift||'morning',h:+e.hours||+S.defHours||8};});
 return {geo:{on:!!g.on,lat:g.lat,lng:g.lng,radius:+g.radius||100,maxAcc:+g.maxAcc||100},shifts:S.shifts,early:isFinite(+S.punchEarly)?+S.punchEarly:30,lateOut:isFinite(+S.punchLateOut)?+S.punchLateOut:240,ot:!!S.otOn,grace:+S.graceMinutes||0,emps:map};}

/* دمج بصمة في سجل الحضور. تُرجع 'ok' أو 'same' (لا تغيير) أو 'ignored' (خارج النافذة/موظف غير معروف) */
function applyPunch(db,p){
 var e=null,i;for(i=0;i<db.emps.length;i++)if(db.emps[i].id===p.empId){e=db.emps[i];break;}
 if(!e||e.clock===false)return 'ignored';
 var S=db.settings,key=e.shift||'morning',w=shiftWindow(key,S.shifts),hm=hmOf(p.ts),d=dayOf(p.ts),m=tmin(hm);
 if(!punchAllowed(p.type,m,w,S.punchEarly,S.punchLateOut).ok)return 'ignored';
 var rec=null;for(i=0;i<db.att.length;i++)if(db.att[i].c===e.id&&db.att[i].d===d){rec=db.att[i];break;}
 var first=S.shifts[key==='both'?'morning':key]||S.shifts.morning,startM=tmin(first.s),changed=false;
 if(!rec){rec={d:d,c:e.id,s:'حاضر',i:'',o:'',b:0,src:'self'};db.att.push(rec);changed=true;}
 else if(!rec.s){rec.s='حاضر';changed=true;}
 if(p.type==='in'){
  if(!rec.i){rec.i=(m<startM&&w.e<=1440?first.s:hm);changed=true;}   // الحضور المبكر يُثبَّت عند بداية الوردية
 }else{
  if(!rec.o||tmin(rec.o)<m){rec.o=hm;changed=true;}
 }
 if(changed){rec.reviewed=false;rec.pn=((rec.pn||'')+(p.type==='in'?'حضور ':'انصراف ')+hm+(isFinite(p.dist)?' ('+Math.round(p.dist)+'م) · ':' · ')).slice(-160);}
 return changed?'ok':'same';}

/* ملخص يوم الموظف من وقت البصمتين (نفس منطق محرك الحساب):
   early = دقائق الحضور قبل الوردية (تُثبَّت عند البداية بلا إضافي)، late = دقائق التأخير، ot = دقائق الإضافي، short = دقائق النقص */
function punchSummary(inM,outM,w,hours,otOn){
 var o={early:0,late:0,ot:0,short:0};if(inM===null||inM===undefined)return o;
 var a=adjMin(inM,w,240);if(a<w.s)o.early=w.s-a;else o.late=a-w.s;
 if(outM!==null&&outM!==undefined){var b=adjMin(outM,w,0);if(b<a)b+=1440;var act=b-Math.max(a,w.s),req=(+hours||8)*60;
  if(otOn&&act>req)o.ot=Math.round(act-req);if(act<req)o.short=Math.round(req-act);}
 return o;}
function minsTxt(m){m=Math.round(m);var h=Math.floor(m/60),r=m%60;return (h?h+' ساعة':'')+(h&&r?' و':'')+(r?r+' دقيقة':(h?'':'0 دقيقة'));}

/* حساب دخول الموظف تلقائياً: اسم المستخدم = رقم الموبايل (أو كود الموظف)، وكلمة المرور 6 أرقام عشوائية */
function accountName(e,used){var a=toEn(e.phone||'').replace(/\D/g,''),b=String(e.id).toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
 return a&&!used[a]?a:(b&&!used[b]?b:(b||a)+Math.floor(Math.random()*90+10));}
function genPassword(){var a=new Uint32Array(1);crypto.getRandomValues(a);return String(100000+a[0]%900000);}
