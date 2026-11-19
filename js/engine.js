'use strict';
function defaults(){return {v:1,demo:false,
 settings:{company:'اسم الشركة',precision:0,graceMinutes:0,departments:[],basis:'30',defHours:8,otOn:true,otFactor:1.5,lateFactor:1,absFactor:1,susp:false,suspMode:'none',suspPct:50,geo:{on:false,lat:'',lng:'',radius:100,maxAcc:100},punchEarly:30,punchLateOut:240,partPay:true,workDays:26,
  statuses:[{n:'حاضر',p:1,a:0,r:1},{n:'غائب',p:0,a:1,r:0},{n:'إجازة مدفوعة',p:0,a:0,r:0},{n:'إجازة بدون أجر',p:0,a:1,r:0},{n:'عطلة رسمية',p:0,a:0,r:0},{n:'راحة أسبوعية',p:0,a:0,r:0},{n:'نصف يوم',p:.5,a:.5,r:.5}],
  shifts:{morning:{s:'09:00',e:'17:00'},evening:{s:'14:00',e:'22:00'}},
  jobs:[],users:[],btypes:[{n:'مكافأة',k:'plus'},{n:'حافز',k:'plus'},{n:'بدل',k:'plus'},{n:'عمولة',k:'plus'},{n:'جزاء',k:'minus'},{n:'خصم آخر',k:'minus'}]},
 emps:[],att:[],adv:[],bon:[],sett:[],pay:[],seq:1};}
var DB=null, ver=0, idxCache=null;
function nid(){return DB.seq++;}
function codeNum(id){var m=/(\d+)$/.exec(id);return m?+m[1]:1e9;}
function sortEmps(){DB.emps.sort(function(a,b){return codeNum(a.id)-codeNum(b.id)||(a.id<b.id?-1:1);});}
var SHIFTL={morning:'صباحية',evening:'مسائية',both:'الاثنين معاً'};
function shiftOf(e){return e.shift||'morning';}
function hasClock(e){return e.clock!==false;}
function nowHM(){var d=new Date();return pad(d.getHours())+':'+pad(d.getMinutes());}
function logoImg(h){return DB.settings.logo?'<img src="'+DB.settings.logo+'" alt="" style="max-height:'+h+'px;max-width:100%">':'';}
function shiftTxt(e){var k=shiftOf(e);if(k==='both')return 'الورديتان';var sh=DB.settings.shifts[k];return SHIFTL[k]+' '+sh.s+'–'+sh.e;}
function toEn(v){return String(v==null?'':v).replace(/[\u0660-\u0669\u06F0-\u06F9]/g,function(d){var c=d.charCodeAt(0);return String(c>=0x06F0?c-0x06F0:c-0x0660);});}
function getIdx(){if(idxCache)return idxCache;var a={};DB.att.forEach(function(r){(a[r.c]=a[r.c]||[]).push(r);});idxCache={att:a};return idxCache;}
/* ====================== محرك الحساب ====================== */
function empById(id){for(var i=0;i<DB.emps.length;i++)if(DB.emps[i].id===id)return DB.emps[i];return null;}
function endOf(id){var l='';DB.sett.forEach(function(s){if(s.c===id&&s.l>l)l=s.l;});return l;}
function statusOf(name){for(var i=0;i<DB.settings.statuses.length;i++)if(DB.settings.statuses[i].n===name)return DB.settings.statuses[i];return null;}
function ratesAt(e,pe){var r={sal:+e.sal||0,dly:+e.dly||0,hrly:+e.hrly||0},best='';(e.raises||[]).forEach(function(x){if(x.d<=pe&&x.d>=best){best=x.d;r={sal:+x.sal||0,dly:+x.dly||0,hrly:+x.hrly||0};}});return r;}
function attLine(e,rec){var S=DB.settings,st=statusOf(rec.s),h=+e.hours||S.defHours,req=st?h*st.r:0,act=0,sh=0,ot=0,a=tmin(rec.i),b=tmin(rec.o);
 if(st&&req>0&&a!==null&&b!==null){act=Math.max(0,(((b-a)%1440+1440)%1440)/60-(+rec.b||0)/60);sh=Math.max(0,req-act);ot=Math.max(0,act-req);}
 var grace=0,issues=attWarnings(e,rec);if(issues.length&&!rec.reviewed){act=0;sh=0;ot=0;}else if(sh>0){var start=DB.settings.shifts[rec.sh||shiftOf(e)],delay=start&&a!==null?Math.max(0,a-tmin(start.s)):0;if(start&&tmin(start.e)<tmin(start.s)&&a!==null&&a<tmin(start.s))delay=Math.max(0,a+1440-tmin(start.s));grace=Math.min(sh,delay/60,(+S.graceMinutes||0)/60);}
 return {req:req,act:act,sh:sh,charged:Math.max(0,sh-grace)<1e-9?0:Math.max(0,sh-grace),grace:grace,ot:ot,p:st?st.p:0,ab:st?st.a:0};}
function calc(e,ym,o){o=o||{};var S=DB.settings,ms=ym+'-01',dim=daysIn(ym),me=ym+'-'+pad(dim);
 var end=o.end!==undefined?o.end:endOf(e.id),ps=e.hire>ms?e.hire:ms,pe=end?(end<me?end:me):me;
 var elig=pe>=ps?dnum(pe)-dnum(ps)+1:0,R=ratesAt(e,pe),basis=S.basis==='30'?30:dim,hh=+e.hours||S.defHours;
 var pres=0,absd=0,hw=0,sh=0,otr=0,graceHours=0,recs=(getIdx().att[e.id]||[]);
 recs.forEach(function(r){if(r.d>=ps&&r.d<=pe){var L=attLine(e,r);pres+=L.p;absd+=L.ab;hw+=L.act;sh+=L.charged;otr+=L.ot;graceHours+=L.grace;}});
 var ot=S.otOn?otr:0,regh=Math.max(0,hw-ot),sys=e.sys,dval=sys==='monthly'?R.sal/basis:R.dly,hval=sys==='monthly'?R.sal/basis/hh:(sys==='daily'?R.dly/hh:R.hrly),base=0;
 if(elig>0&&suspFactor(e)>0){base=sys==='monthly'?(elig===dim?R.sal:Math.min(R.sal,round5(R.sal/basis*elig))):(sys==='daily'?round5(pres*R.dly):round5((regh+graceHours)*R.hrly));if(e.susp)base=round5(base*suspFactor(e));}
 var otv=round5(ot*hval*S.otFactor),bonus=0,pen=0,adv=0,paid=0;
 DB.bon.forEach(function(b){if(b.c===e.id&&b.d.slice(0,7)===ym){var t=btype(b.t);if(t&&t.k==='minus')pen+=round5(b.a);else bonus+=round5(b.a);}});
 DB.adv.forEach(function(a){if(a.c===e.id)adv+=advanceDue(a,ym);});
 DB.pay.forEach(function(p){if(p.c===e.id&&p.m===ym)paid+=round5(p.a);});
 base=round5(base);otv=round5(otv);bonus=round5(bonus);pen=round5(pen);adv=round5(adv);paid=round5(paid);
 var absded=sys==='monthly'?round5(absd*dval*S.absFactor):0,lateded=sys==='monthly'?round5(sh*hval*S.lateFactor):0,gross=round5(base+otv+bonus),totded=round5(absded+lateded+adv+pen),net=round5(gross-totded),due=round5(net-paid);
 var pstat=(Math.abs(net)<=.00000001&&paid<=.00000001)?'لا مستحقات':net<-.00000001?'رصيد مدين':due<-.00000001?'صرف زائد':due<=.00000001?'تم الصرف':paid>.00000001?'صرف جزئي':'مستحق ولم يُصرف';
 /* المستحق فعلياً بحسب الأيام المسجلة (للموظف الشهري ذي الحضور والانصراف): يوم عمل = يوم حضور أو إجازة/عطلة مدفوعة مسجّلة */
 var earnedDays=0;recs.forEach(function(r){if(r.d>=ps&&r.d<=pe){var st0=statusOf(r.s);if(st0)earnedDays+=1-st0.a;}});
 var clockCap=sys==='monthly'&&hasClock(e),earnedBase=clockCap?Math.min(base,round5(earnedDays*dval*suspFactor(e))):base,earnedNet=round5(earnedBase+otv+bonus-lateded-pen-adv),payable=clockCap?Math.max(0,Math.min(due,round5(earnedNet-paid))):due;
 return {earnedDays:earnedDays,clockCap:clockCap,earnedBase:earnedBase,earnedNet:earnedNet,payable:payable,ms:ms,me:me,dim:dim,end:end,ps:ps,pe:pe,elig:elig,R:R,basis:basis,dval:dval,hval:hval,pres:pres,absd:absd,hw:hw,sh:sh,ot:ot,graceHours:graceHours,paidHours:regh+graceHours,base:base,otv:otv,bonus:bonus,pen:pen,adv:adv,gross:gross,absded:absded,lateded:lateded,totded:totded,net:net,paid:paid,due:due,pstat:pstat,sf:suspFactor(e)};}
function btype(n){for(var i=0;i<DB.settings.btypes.length;i++)if(DB.settings.btypes[i].n===n)return DB.settings.btypes[i];return null;}
function movements(e,ym){var f=function(a){return a.c===e.id&&(a.d||'').slice(0,7)===ym;};return DB.adv.some(function(a){return a.c===e.id&&(f(a)||advanceDue(a,ym)>0);})||DB.bon.some(f)||DB.pay.some(function(p){return p.c===e.id&&p.m===ym;});}
function inMonth(e,ym){var ms=ym+'-01',me=ym+'-'+pad(daysIn(ym)),end=endOf(e.id);return e.hire<=me&&(!end||end>=ms||movements(e,ym));}
function monthRows(ym){return DB.emps.filter(function(e){return inMonth(e,ym);}).map(function(e){return {e:e,c:calc(e,ym)};});}
function sums(rows){var t={gross:0,totded:0,net:0,paid:0,due:0,adv:0,base:0,otv:0,bonus:0,pen:0,absded:0,lateded:0,pres:0,absd:0,hw:0};rows.forEach(function(r){Object.keys(t).forEach(function(k){t[k]+=(r.c[k]!==undefined?r.c[k]:0);});});Object.keys(t).forEach(function(k){t[k]=['pres','absd','hw'].indexOf(k)>=0?r2(t[k]):round5(t[k]);});return t;}
function monthlyEq(e,c){var S=DB.settings;return c.R.sal>0&&e.sys==='monthly'?c.R.sal:(e.sys==='daily'?c.R.dly*S.workDays:c.R.hrly*((+e.hours||S.defHours))*S.workDays);}
function empStatus(e){return endOf(e.id)?{t:'تمت تصفيته',k:'b'}:(e.susp?{t:'موقوف',k:'w'}:{t:'نشط',k:'g'});}
function pcls(p){return p==='تم الصرف'?'g':p==='صرف جزئي'?'w':p==='مستحق ولم يُصرف'?'a':(p==='صرف زائد'||p==='رصيد مدين')?'b':'n';}

function attWarnings(e,r){if(!r||!r.i||!r.o)return [];var a=tmin(r.i),b=tmin(r.o);if(a===null||b===null)return [];var warnings=[];if(b<a)warnings.push('الانصراف قبل الحضور؛ يُفترض اليوم التالي');if(b===a)warnings.push('الحضور والانصراف في نفس الوقت');var duration=(b-a+1440)%1440;if(duration>16*60)warnings.push('مدة العمل '+Math.floor(duration/60)+' ساعة و'+duration%60+' دقيقة؛ راجعها');return warnings;}
function advanceSchedule(a){var count=Number(a.parts)||1,start=a.start||a.d.slice(0,7),factor=Math.pow(10,precision()),units=Math.round(round5(a.a)*factor),base=Math.floor(units/count),extra=units%count;return Array.from({length:count},function(_,i){return {m:addMonths(start,i),a:(base+(i<extra?1:0))/factor};});}
function advanceDue(a,ym){var x=advanceSchedule(a).find(function(v){return v.m===ym;});return x?x.a:0;}
function dayEmps(d){return DB.emps.filter(function(e){var end=endOf(e.id);return e.hire<=d&&(!end||end>=d);});}
function recOf(c,d){var a=getIdx().att[c]||[];for(var i=0;i<a.length;i++)if(a[i].d===d)return a[i];return null;}

/* ---------- الإيقاف الجزئي (نسبة خصم من الأجر) ---------- */
function suspMode(){var S=DB.settings;return S.suspMode||(S.susp?'full':'none');}
function clampPct(v){v=Number(v);return isFinite(v)?Math.min(100,Math.max(0,v)):0;}
/* معامل الأجر المصروف للموظف الموقوف: 1 = كامل، 0 = بدون أجر. نسبة الموظف الخاصة تتقدم على الإعداد العام. */
function suspFactor(e){
 if(!e.susp)return 1;
 var own=e.suspPct;
 if(own!==undefined&&own!==null&&own!==''&&isFinite(Number(own)))return 1-clampPct(own)/100;
 var m=suspMode();
 return m==='full'?1:m==='partial'?1-clampPct(DB.settings.suspPct)/100:0;}
function suspLabel(e){var f=suspFactor(e);return f>=1?'موقوف بأجر كامل':f<=0?'موقوف بدون أجر':'موقوف بخصم '+round5((1-f)*100)+'%';}

/* ---------- تحذيرات الحضور عبر الأيام (تحذير فقط، لا يستبعد الساعات) ---------- */
function attPatternWarnings(e,r){
 if(!r||!r.i||!r.o||!hasClock(e))return [];
 var out=[],st=statusOf(r.s);if(!st||!(st.r>0))return out;
 var run=1,d=r.d,k,p;
 for(k=0;k<6;k++){d=dayOffset(d,-1);p=recOf(e.id,d);if(p&&p.i===r.i&&p.o===r.o)run++;else break;}
 if(run>=4)out.push('نفس وقت الحضور والانصراف بالدقيقة تكرر '+run+' أيام متتالية');
 var sk=r.sh||(shiftOf(e)==='both'?'':shiftOf(e)),sh=sk?DB.settings.shifts[sk]:null;
 if(sh){var a=tmin(r.i),s0=tmin(sh.s),s1=tmin(sh.e);
  if(s1>s0){if(a<s0-240)out.push('الحضور قبل بداية الوردية بأكثر من 4 ساعات');else if(a>s1)out.push('الحضور بعد نهاية الوردية');}}
 return out;}
