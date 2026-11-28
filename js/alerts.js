'use strict';
/* نظام التنبيهات: غياب / تأخر / انصراف مبكر. يعمل أثناء فتح البرنامج (إشعارات الدفع والتطبيق مغلق تحتاج خادماً). */
var ALERTS={list:[],timer:null,shown:{}};
function notifCfg(){var n=DB.settings.notif||{};return {on:n.on!==false,late:n.late!=null?+n.late:5,early:n.early!=null?+n.early:10,noshow:n.noshow!=null?+n.noshow:30,browser:!!n.browser};}
function computeAlerts(){var out=[];if(!DB||!DB.settings)return out;var c=notifCfg();if(!c.on)return out;
 var d=today(),now=new Date(),m=now.getHours()*60+now.getMinutes(),S=DB.settings;
 dayEmps(d).forEach(function(e){if(!hasClock(e)||(e.susp&&e.suspFrom&&e.suspFrom<=d))return;
  var w=shiftWindow(shiftOf(e),S.shifts),rec=recOf(e.id,d),st=rec&&rec.s?statusOf(rec.s):null,overnight=w.e>1440;
  if(rec&&rec.s&&st&&!(st.p>0))return; /* غياب/إجازة مسجلة مسبقاً */
  var has=!!(rec&&rec.i),nm=e.name;
  if(!has){
   if(!overnight&&m>=w.e)out.push({k:'abs|'+e.id+'|'+d,t:'abs',e:e,text:nm+': انتهت ورديته ('+S.shifts[shiftOf(e)==='both'?'evening':shiftOf(e)].e+') ولم يسجَّل له حضور اليوم — سجّل له غياباً.'});
   else if(!overnight&&c.noshow>0&&m>=w.s+c.noshow&&m<w.e)out.push({k:'ns|'+e.id+'|'+d,t:'ns',e:e,text:nm+': لم يسجل حضوره بعد مرور '+c.noshow+' دقيقة من بداية الوردية.'});
   return;}
  var a=tmin(rec.i);if(a!==null&&a>w.s+c.late&&a<w.e)out.push({k:'late|'+e.id+'|'+d,t:'late',e:e,text:nm+': تأخر '+(a-w.s)+' دقيقة (حضر '+rec.i+').'});
  if(rec.o&&!rec.auto&&!overnight){var b=tmin(rec.o);if(b!==null&&b<w.e-c.early&&b>w.s)out.push({k:'early|'+e.id+'|'+d,t:'early',e:e,text:nm+': انصرف مبكراً قبل نهاية الوردية بـ '+(w.e-b)+' دقيقة (انصرف '+rec.o+').'});}
 });return out;}
var ALERT_ICON={abs:'⛔',ns:'⏳',late:'🕒',early:'🚪'},ALERT_TTL={abs:'غياب',ns:'لم يحضر بعد',late:'تأخر',early:'انصراف مبكر'};
function alertSeenKey(){return 'hr_alert_seen_'+today();}
function alertSeen(){try{return JSON.parse(localStorage.getItem(alertSeenKey())||'{}');}catch(e){return {};}}
function alertMark(keys){var s=alertSeen();keys.forEach(function(k){s[k]=1;});try{localStorage.setItem(alertSeenKey(),JSON.stringify(s));}catch(e){}}
function drawBell(){var b=$('#bellbtn');if(!b)return;var n=ALERTS.list.length;b.innerHTML='<span aria-hidden="true">🔔</span>'+(n?'<i class="bellbadge">'+n+'</i>':'');b.hidden=!(DB&&notifCfg().on);}
function checkAlerts(){if(!DB||!currentUser)return;ALERTS.list=computeAlerts();drawBell();
 var seen=alertSeen(),fresh=ALERTS.list.filter(function(a){return !seen[a.k];});if(!fresh.length)return;
 var abs=fresh.filter(function(a){return a.t==='abs';});
 if(abs.length&&!$('#alertpop')&&!modalState&&!$('#warnbg'))showAbsentPop(abs);
 var others=fresh.filter(function(a){return a.t!=='abs'});
 if(others.length){alertMark(others.map(function(a){return a.k;}));toast(others.length===1?others[0].text:'لديك '+others.length+' تنبيهات جديدة (اضغط 🔔)');}
 if(notifCfg().browser)browserNotify(fresh);
}
function showAbsentPop(abs){var el=document.createElement('div');el.id='alertpop';el.className='alertpop';el.setAttribute('role','alertdialog');
 el.innerHTML='<div class="ap-h"><b>⚠️ تنبيه: موظفون لم يسجلوا حضور اليوم</b><button class="iconbtn" data-act="apclose" aria-label="إغلاق" style="width:30px;height:30px">'+ic('x')+'</button></div><div class="ap-b">انتهت وردية هؤلاء ولم يُسجَّل لهم حضور. إن لم يكونوا في إجازة فسجّل غيابهم اليوم:'+abs.map(function(a){return '<div class="ap-i">'+esc(a.e.name)+'</div>';}).join('')+'</div><div class="ap-f"><button class="btn pri" data-act="apabs">تسجيل الغياب للجميع</button><button class="btn" data-act="apopen">فتح الحضور</button><button class="btn" data-act="apclose">لاحقاً</button></div>';
 document.body.appendChild(el);el._abs=abs;}
function markAbsent(list){var n=0;list.forEach(function(a){var e=a.e,d=today();if(recOf(e.id,d))return;DB.att.push({d:d,c:e.id,s:'غائب',i:'',o:'',b:0});n++;});if(n){save();render();}checkAlerts();return n;}
function bellModal(){var L=ALERTS.list;
 openModal({title:'الإشعارات — '+fdate(today()),body:L.length?L.map(function(a,i){return '<div class="alert" style="align-items:center"><span style="font-size:20px">'+ALERT_ICON[a.t]+'</span><span style="flex:1"><b>'+ALERT_TTL[a.t]+'</b><div class="hint" style="color:inherit">'+esc(a.text)+'</div></span>'+(a.t==='abs'?'<button class="btn sm" data-act="absone" data-i="'+i+'">تسجيل غياب</button>':'')+'</div>';}).join(''):'<div class="empty">لا توجد تنبيهات اليوم ✓</div>',actions:[{label:'إغلاق',fn:closeModal}]});}
function browserNotify(list){try{if(!('Notification' in window)||Notification.permission!=='granted')return;list.slice(0,4).forEach(function(a){var o={body:a.text,tag:a.k,icon:'icons/icon-192.png',dir:'rtl',lang:'ar'};if(navigator.serviceWorker&&navigator.serviceWorker.ready)navigator.serviceWorker.ready.then(function(r){r.showNotification(ALERT_TTL[a.t],o);});else new Notification(ALERT_TTL[a.t],o);});}catch(e){}}
function enableBrowserNotif(){if(!('Notification' in window))return toast('المتصفح لا يدعم الإشعارات');Notification.requestPermission().then(function(p){toast(p==='granted'?'تم تفعيل إشعارات المتصفح':'لم يتم السماح بالإشعارات');});}
function startAlerts(){if(ALERTS.timer)return;setTimeout(checkAlerts,1500);ALERTS.timer=setInterval(function(){try{if(!document.hidden)checkAlerts();}catch(e){}},60000);}
