'use strict';
/* شاشة الموظف: بصمة حضور/انصراف ذاتية بالموقع. لا تقرأ أي بيانات رواتب أو موظفين. */
function empDisplayName(u){return (window.HRStore&&HRStore.getLoginList?HRStore.getLoginList():Promise.resolve([])).then(function(l){var x=(l||[]).filter(function(y){return y.u===u;})[0];return x?x.n:u;},function(){return u;});}
var SP={name:'',cfg:null,punches:[],profile:null,busy:false,msg:'',msgOk:false,last:null};

function geoErrMsg(e){return e&&e.code===1?'لم تسمح للمتصفح بالوصول إلى موقعك. فعّل إذن الموقع للموقع من إعدادات المتصفح.':e&&e.code===3?'انتهت مهلة تحديد الموقع. تأكد من تشغيل GPS وأعد المحاولة.':'تعذر تحديد موقعك. فعّل GPS وأعد المحاولة.';}
function getPos(){return new Promise(function(res,rej){if(!navigator.geolocation)return rej({code:0});navigator.geolocation.getCurrentPosition(function(p){res({lat:p.coords.latitude,lng:p.coords.longitude,acc:p.coords.accuracy});},rej,{enableHighAccuracy:true,timeout:20000,maximumAge:0});});}

function dayGroups(){var g={},list=[];SP.punches.forEach(function(p){var d=dayOf(p.ts);(g[d]=g[d]||[]).push(p);});
 Object.keys(g).sort().reverse().slice(0,31).forEach(function(d){var a=g[d],ins=a.filter(function(p){return p.type==='in';}),outs=a.filter(function(p){return p.type==='out';});list.push({d:d,i:ins[0]||null,o:outs[0]||null});});return list;}
function spToday(){var d=today(),x=dayGroups().filter(function(r){return r.d===d;})[0];return x||{d:d,i:null,o:null};}
function spInfo(){var p=SP.profile,c=SP.cfg,x=c&&c.emps?c.emps[p.empId]:null;return x?{w:shiftWindow(x.s,c.shifts),h:x.h,key:x.s}:null;}
function minOf(ms){var d=new Date(ms);return d.getHours()*60+d.getMinutes();}
function daySummary(r){var f=spInfo();return f?punchSummary(r.i?minOf(r.i.ts):null,r.o?minOf(r.o.ts):null,f.w,f.h,SP.cfg.ot):null;}
function chips(r,sm){if(!sm)return '';var c=[];
 if(r.i&&sm.early>0)c.push('<span class="pill g">حضور مبكر '+esc(minsTxt(sm.early))+'</span>');
 if(r.i&&sm.late>0)c.push('<span class="pill w">تأخير '+esc(minsTxt(sm.late))+'</span>');
 if(r.o&&sm.ot>0)c.push('<span class="pill g">إضافي '+esc(minsTxt(sm.ot))+'</span>');
 if(r.o&&sm.short>0&&!(r.i&&sm.late>0&&sm.short<=sm.late+1))c.push('<span class="pill w">نقص '+esc(minsTxt(sm.short))+'</span>');
 return c.join(' ');}
function drawSelfPunch(){
 var root=$('#selfpunch');if(!root){root=document.createElement('div');root.id='selfpunch';root.className='login-screen sp-screen';document.body.appendChild(root);}
 var p=SP.profile,cfg=SP.cfg,f=cfg&&cfg.emps?spInfo():null,tr=spToday(),body='';
 if(!cfg||!geoReady(cfg.geo))body='<p class="sp-off">لم يحدد المسؤول موقع العمل بعد، لذلك لا يمكن تسجيل الحضور الآن. أخبر المسؤول ليفعّل البصمة الذاتية من شاشة "البصمة والموقع"، ثم أعد فتح الصفحة.</p>';
 else if(!f)body='<p class="hint">حسابك غير مسموح له بالبصم حالياً (الموظف غير نشط أو ليس له حضور وانصراف).</p>';
 else{var fm=function(m){m=((m%1440)+1440)%1440;var h=Math.floor(m/60),mi=m%60,sf=h>=12?'مساءً':'صباحاً',h12=h%12===0?12:h%12;return h12+(mi?':'+pad(mi):'')+' '+sf;};
  body='<p class="hint sp-shift">ورديتك من الساعة <b>'+fm(f.w.s)+'</b> حتى <b>'+fm(f.w.e)+'</b></p>'+
  '<div class="sp-clock num" id="spclock">'+nowHM()+'</div>'+
  '<div class="sp-row"><span>الحضور</span><b class="num">'+(tr.i?hmOf(tr.i.ts):'—')+'</b></div>'+
  '<div class="sp-row"><span>الانصراف</span><b class="num">'+(tr.o?hmOf(tr.o.ts):'—')+'</b></div>'+
  '<div class="sp-herowrap"><button id="sphero" class="sp-hero '+(tr.i?'out':'in')+(SP.busy?' busy':'')+(tr.i&&tr.o?' done':'')+'"'+(SP.busy||(tr.i&&tr.o)?' disabled':'')+' type="button" aria-label="'+(tr.i?'تسجيل انصراف':'تسجيل حضور')+'"><span class="sp-ring"></span>'+IC.finger+'</button><div class="sp-herolbl">'+(SP.busy?'جارٍ التحقق من موقعك…':(tr.i?(tr.o?'تم تسجيل حضورك وانصرافك اليوم ✓':'اضغط لتسجيل الانصراف'):'اضغط لتسجيل الحضور'))+'</div></div>';}
 var hist=dayGroups().map(function(r){var sm=daySummary(r),dt=r.d.split('-');return '<div class="sp-hist"><div><b class="num">'+dt[2]+'/'+dt[1]+'/'+dt[0]+'</b><span class="num">'+(r.i?hmOf(r.i.ts):'—')+' ← '+(r.o?hmOf(r.o.ts):'—')+'</span></div><div>'+chips(r,sm)+'</div></div>';}).join('');
 root.innerHTML='<div class="card login-box" style="max-width:440px"><h2 style="margin-bottom:2px">مرحباً، '+esc(SP.name||p.username)+'</h2><p class="hint" style="margin:0 0 6px">'+fdate(today())+'</p>'+body+'<p class="'+(SP.msgOk?'sp-ok':'err')+'" role="status" id="spmsg">'+esc(SP.msg)+'</p>'+
  '<h3 style="margin:16px 0 6px;font-size:15px">سجل حضوري</h3>'+(hist||'<p class="hint">لا توجد بصمات بعد.</p>')+
  '<div style="display:flex;gap:8px;margin-top:12px"><button class="btn sm" id="splogout">تسجيل الخروج</button></div></div>';
 var hb=$('#sphero');if(hb)hb.onclick=function(){doPunch(spToday().i?'out':'in');};
 
 $('#splogout').onclick=function(){HRStore.logout().then(function(){location.reload();},function(){location.reload();});};}

/* رسالة بعد البصمة: قبل الموعد / تأخير / إضافي / انصراف مبكر */
function punchMsg(type,nm){var f=spInfo(),tr=spToday();if(!f)return '';
 var sm=punchSummary(type==='in'?nm:(tr.i?minOf(tr.i.ts):null),type==='out'?nm:null,f.w,f.h,SP.cfg.ot);
 if(type==='in'){if(sm.early>0)return 'تم تسجيلك قبل الوقت المحدد بـ '+minsTxt(sm.early)+'. سيُحتسب حضورك من بداية الوردية.';
  if(sm.late>(+SP.cfg.grace||0))return 'تم تسجيل حضورك متأخراً '+minsTxt(sm.late)+'، وسيُخصم حسب سياسة الشركة.';
  return 'تم تسجيل حضورك في الموعد ✓';}
 if(sm.ot>0)return 'تم تسجيل ساعات إضافية لك: '+minsTxt(sm.ot)+' ✓';
 if(sm.short>0)return 'تم تسجيل انصرافك قبل نهاية ساعات العمل بـ '+minsTxt(sm.short)+'.';
 return 'تم تسجيل انصرافك ✓';}

function doPunch(type){
 if(SP.busy)return;var cfg=SP.cfg,f=spInfo(),td0=spToday();
 if(type==='in'&&td0.i){SP.msg='سجّلت حضورك اليوم بالفعل، ولا يمكن تسجيل حضور آخر.';SP.msgOk=false;return drawSelfPunch();}
 if(type==='out'&&td0.o){SP.msg='سجّلت انصرافك اليوم بالفعل، ولا يمكن تسجيل انصراف آخر.';SP.msgOk=false;return drawSelfPunch();}
SP.busy=true;SP.msg='جارٍ تحديد موقعك…';SP.msgOk=true;drawSelfPunch();
 var now=new Date(),nm=now.getHours()*60+now.getMinutes(),pa=punchAllowed(type,nm,f.w,cfg.early,cfg.lateOut);
 if(!pa.ok){SP.busy=false;SP.msg=pa.reason;SP.msgOk=false;return drawSelfPunch();}
 var msg='';
 getPos().then(function(pos){var gc=geoCheck(pos,cfg.geo);if(!gc.ok)throw {friendly:gc.reason,far:gc.far};msg=punchMsg(type,nm);
  return HRStore.sendPunch({type:type,day:today(),lat:+pos.lat.toFixed(6),lng:+pos.lng.toFixed(6),acc:Math.round(pos.acc||0),dist:Math.round(gc.dist)});})
 .then(function(){SP.msg=msg;SP.msgOk=true;bigPunch(type,msg);},
  function(e){if(e&&e.far)warnBox('أنت بعيد عن موقع العمل',e.friendly);SP.msg=e&&e.friendly?e.friendly:(e&&e.code==='permission-denied'?'غير مسموح بتسجيل البصمة. راجع المسؤول.':geoErrMsg(e));SP.msgOk=false;})
 .then(function(){SP.busy=false;drawSelfPunch();});}

setInterval(function(){var c=$('#spclock');if(c)c.textContent=nowHM();},15000);

function bigPunch(type,msg){var old=document.getElementById('bigpunch');if(old)old.remove();var d=document.createElement('div');d.id='bigpunch';d.className='bigpunch '+(type==='in'?'in':'out');
 d.innerHTML='<div class="bp-ic">✓</div><div class="bp-t">'+(type==='in'?'تم تسجيل حضورك':'تم تسجيل انصرافك')+'</div><div class="bp-m">'+esc(msg||'')+'</div><div class="bp-s">اضغط للإغلاق</div>';
 d.onclick=function(){d.remove();};document.body.appendChild(d);setTimeout(function(){if(d.parentNode)d.remove();},9000);}
