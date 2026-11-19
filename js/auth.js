'use strict';
/* الحسابات والصلاحيات: المصادقة عبر Firebase Auth، والصلاحيات التفصيلية تُطبَّق في الواجهة */
var currentUser=null;
function canRoute(r){return !currentUser||currentUser.admin||currentUser.perms.indexOf(r)>=0||(r==='attreport'&&currentUser.perms.indexOf('employees')>=0);}
function firstRoute(){return currentUser&&!currentUser.admin?(currentUser.perms[0]||'attendance'):'dashboard';}
var LOGIN_ERR={
 'auth/invalid-credential':'اسم المستخدم أو كلمة المرور غير صحيح.','auth/wrong-password':'اسم المستخدم أو كلمة المرور غير صحيح.',
 'auth/user-not-found':'اسم المستخدم أو كلمة المرور غير صحيح.','auth/invalid-login-credentials':'اسم المستخدم أو كلمة المرور غير صحيح.',
 'auth/too-many-requests':'محاولات كثيرة. انتظر قليلاً ثم أعد المحاولة.','auth/network-request-failed':'تعذر الاتصال بالإنترنت.',
 'auth/operation-not-allowed':'فعّل تسجيل الدخول بالبريد وكلمة المرور من Firebase Authentication.','auth/email-already-in-use':'اسم المستخدم موجود بالفعل (قد يكون الموظف له حساب تلقائي، راجع شاشة البصمة والموقع). اختر اسماً آخر.',
 'hr/already-initialized':'النظام مُهيّأ بالفعل. اطلب من المدير إنشاء حساب لك.','permission-denied':'ليست لديك صلاحية. تأكد من نشر قواعد Firestore.'};
function errMsg(e){return LOGIN_ERR[e&&e.code]||('تعذر تنفيذ العملية'+(e&&e.code?' ('+e.code+')':'')+'.');}
function normUser(u){return toEn(u).replace(/\s+/g,' ').trim();}
function validUser(u){return /^[\p{L}\p{N}]+( [\p{L}\p{N}]+)*$/u.test(u);}
function validPass(p){return /^[\p{L}\p{N}]{4,32}$/u.test(p);}
function normalizeLoginInput(el,isPass){var v=toEn(el.value);v=isPass?v.replace(/\s/g,''):v.replace(/\s{2,}/g,' ').replace(/^\s+/,'');if(v!==el.value)el.value=v;}
/* شاشة الدخول: اسم مستخدم، وكلمة مرور حروف وأرقام (4 خانات على الأقل). الأرقام العربية تتحول تلقائياً. أول مدير: اسم من كلمتين */
var SUPER_USER='Admin',SUPER_PASS='27072350';
var IC={user:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/></svg>',
 lock:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="10" width="16" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>',
 eye:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
 eyeoff:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4M6.3 6.3C3.7 8 2 12 2 12s3.6 7 10 7c1.7 0 3.2-.4 4.5-1M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>',
 finger:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 11v3.5c0 2.2-.6 4.2-1.8 6M8 12a4 4 0 0 1 8 0v2.5c0 1.8-.3 3.5-1 5M5 14c0-.7 0-1 .1-2a7 7 0 0 1 13.8 0c.1 1 .1 1.3.1 2.5 0 1.5-.2 2.9-.6 4.2M3 9.5a10 10 0 0 1 18 0"/></svg>',
 logo:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.6 2.7-6 6-6s6 2.4 6 6"/><circle cx="17" cy="9" r="2.4"/><path d="M16.5 14.2c2.8.2 4.5 2.2 4.5 5.3"/></svg>',
 check:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'};
function validAdminName(u){return validUser(u);}
function showLogin(msg){
 closeModal();var old=$('.login-screen');if(old)old.remove();
 var overlay=document.createElement('div');overlay.className='login-screen lg';
 overlay.innerHTML='<div class="lg-card">'+
  '<div class="lg-side"><div class="lg-logo">'+IC.logo+'</div><h2>نظام شؤون الموظفين</h2><p>كل ما تحتاجه لإدارة فريقك في مكان واحد.</p>'+
  '<ul><li>'+IC.check+'حضور وانصراف بالموقع الجغرافي</li><li>'+IC.check+'رواتب وسلف وحوافز تُحسب تلقائياً</li><li>'+IC.check+'بياناتك آمنة ومتزامنة على السحابة</li></ul></div>'+
  '<div class="lg-main"><div class="lg-mob-brand"><div class="lg-logo">'+IC.logo+'</div><b>نظام شؤون الموظفين</b></div>'+
  '<button class="lg-theme" id="lgtheme" type="button" aria-label="تبديل الوضع الليلي"></button><h1 id="logintitle"></h1><p class="lg-sub" id="loginhint"></p>'+
  '<div id="lgrole" class="lg-roles"><button type="button" class="lg-rolebtn" data-role="emp">'+IC.user+'<b>أنا موظف</b><small>تسجيل الحضور والانصراف</small></button><button type="button" class="lg-rolebtn" data-role="adm">'+IC.lock+'<b>أنا مسؤول</b><small>الدخول إلى لوحة الإدارة</small></button></div>'+
  '<div id="lgform" hidden>'+
  '<label class="lg-field" id="fld_emp"><span>اختر اسمك</span><div class="lg-input">'+IC.user+'<select id="loginemp"></select></div></label>'+
  '<label class="lg-field" id="fld_user"><span>اسم المستخدم</span><div class="lg-input">'+IC.user+'<input id="loginuser" autocomplete="username" autocapitalize="off" spellcheck="false" placeholder="اسم المستخدم"></div></label>'+
  '<label class="lg-field"><span>كلمة المرور</span><div class="lg-input">'+IC.lock+'<input id="loginpass" type="password" autocomplete="current-password" autocapitalize="off" spellcheck="false" placeholder="كلمة المرور"><button type="button" class="lg-eye" id="lgeye" aria-label="إظهار كلمة المرور">'+IC.eye+'</button></div></label>'+
  '<label class="lg-remember"><input type="checkbox" id="lgremember" checked><span>ابقَ مسجلاً على هذا الجهاز</span></label></div>'+
  '<div class="lg-err" id="loginerror" role="alert"></div>'+
  '<button class="lg-btn" id="loginbutton" type="button" hidden>تسجيل الدخول</button>'+
  '<button class="lg-bio" id="loginbio" type="button" hidden>'+IC.finger+'<span></span></button>'+
  '<button class="lg-link" id="loginmode" type="button" hidden>رجوع</button></div></div>';
 document.body.appendChild(overlay);
 var role=null,empList=[];
 function setRole(r){role=r;$('#lgrole').hidden=!!r;$('#lgform').hidden=!r;$('#loginbutton').hidden=!r;$('#loginmode').hidden=!r;$('#loginerror').textContent='';
  $('#logintitle').textContent=!r?'مرحباً بك':(r==='emp'?'دخول الموظف':'دخول المسؤول');$('#loginhint').textContent=!r?'اختر نوع الدخول للمتابعة.':'';
  var useList=r==='emp'&&empList.length;$('#fld_emp').hidden=!useList;$('#fld_user').hidden=useList||false;
  if(r)setTimeout(function(){(useList?$('#loginpass'):$('#loginuser')).focus();},30);}
 setRole(null);if(msg)$('#loginerror').textContent=msg;
 $$('.lg-rolebtn',overlay).forEach(function(b){b.onclick=function(){setRole(b.getAttribute('data-role'));};});
 $('#loginmode').onclick=function(){setRole(null);};
 if(HRStore.getLoginList)HRStore.getLoginList().then(function(l){empList=l||[];var sel=$('#loginemp');if(sel)sel.innerHTML=empList.map(function(x){return '<option value="'+esc(x.u)+'">'+esc(x.n)+'</option>';}).join('');if(role==='emp')setRole('emp');});
 $('#loginuser').addEventListener('input',function(){normalizeLoginInput(this,false);});
 $('#loginpass').addEventListener('input',function(){normalizeLoginInput(this,true);});
 $('#lgeye').onclick=function(){var i=$('#loginpass'),show=i.type==='password';i.type=show?'text':'password';this.innerHTML=show?IC.eyeoff:IC.eye;this.setAttribute('aria-label',show?'إخفاء كلمة المرور':'إظهار كلمة المرور');};
 function themeIcon(){var d=document.documentElement.getAttribute('data-theme');d=d?d==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;$('#lgtheme').innerHTML=ic(d?'sun':'moon');}
 themeIcon();$('#lgtheme').onclick=function(){toggleTheme();themeIcon();};
 function submit(){if(!role)return;var useList=role==='emp'&&empList.length,u=useList?$('#loginemp').value:normUser($('#loginuser').value),p=toEn($('#loginpass').value).replace(/\s/g,''),err=$('#loginerror'),btn=$('#loginbutton');
  if(!u||!validUser(u)){err.textContent=useList?'اختر اسمك من القائمة.':'أدخل اسم المستخدم (حروف وأرقام).';return;}
  if(!validPass(p)){err.textContent='أدخل كلمة المرور (حروف وأرقام، 4 خانات على الأقل).';return;}
  err.textContent='';btn.disabled=true;window.__pendingCred={u:u,p:p};
  HRStore.setRemember($('#lgremember').checked).then(function(){return HRStore.login(u,p).catch(function(e){
   /* المدير العام الثابت: يُنشأ تلقائياً عند أول دخول به */
   if(role==='adm'&&u.toLowerCase()===SUPER_USER.toLowerCase()&&p===SUPER_PASS&&e&&(e.code==='auth/invalid-credential'||e.code==='auth/user-not-found'||e.code==='auth/invalid-login-credentials'))
    return HRStore.bootstrapAdmin(SUPER_USER,SUPER_PASS).then(function(){return window.hrAfterAuth();},function(e2){if(e2&&e2.code==='hr/already-initialized')throw e;throw e2;});
   throw e;});}).catch(function(e){window.__pendingCred=null;err.textContent=errMsg(e);btn.disabled=false;});}
 $('#loginbutton').onclick=submit;
 overlay.addEventListener('keydown',function(e){if(e.key==='Enter')submit();});
 bioSupported().then(function(ok){if(!ok)return;bioEnabledFor().then(function(cur){if(!cur)return;var b=$('#loginbio');if(!b)return;b.hidden=false;$('span',b).textContent='الدخول بالبصمة: '+cur.username;
  b.onclick=function(){var err=$('#loginerror');err.textContent='';b.disabled=true;
   bioUnlock().then(function(c){return HRStore.setRemember(true).then(function(){return HRStore.login(c.u,c.p);}).catch(function(e){if(e&&/^auth\//.test(e.code||'')&&e.code!=='auth/network-request-failed'&&e.code!=='auth/too-many-requests'){bioDisable();b.hidden=true;err.textContent='تغيّرت بيانات الدخول. سجّل بكلمة المرور ثم فعّل البصمة من جديد.';}throw e;});})
   .catch(function(e){if(!err.textContent)err.textContent=e&&e.code?errMsg(e):bioErr(e);b.disabled=false;});};});});
 setTimeout(function(){$('#loginuser').focus();},30);}
function showLoading(t){var old=$('.login-screen');if(old)old.remove();var o=document.createElement('div');o.className='login-screen';o.innerHTML='<div class="card login-box" style="text-align:center"><h2>'+esc(t||'جارٍ التحميل…')+'</h2></div>';document.body.appendChild(o);}
function hideLoading(){var o=$('.login-screen');if(o)o.remove();}
function fatalScreen(title,html){var old=$('.login-screen');if(old)old.remove();var o=document.createElement('div');o.className='login-screen';o.innerHTML='<div class="card login-box"><h2>'+esc(title)+'</h2><div class="hint" style="line-height:1.9">'+html+'</div></div>';document.body.appendChild(o);}
function changePassModal(){
 openModal({title:'تغيير كلمة المرور',body:'<div class="fgrid">'+field('cp_old','كلمة المرور الحالية','password','',{attrs:'autocomplete="current-password"'})+field('cp_new','كلمة المرور الجديدة (حروف وأرقام، 4 على الأقل)','password','',{attrs:'autocomplete="new-password"'})+field('cp_new2','تأكيد كلمة المرور الجديدة','password','',{attrs:'autocomplete="new-password"'})+'</div>',
  onOpen:function(){['cp_old','cp_new','cp_new2'].forEach(function(id){$('#'+id).addEventListener('input',function(){normalizeLoginInput(this,true);});});},
  actions:[{label:'حفظ',cls:'pri',fn:function(){var o=toEn(val('cp_old')),n=toEn(val('cp_new')),n2=toEn(val('cp_new2'));if(!validPass(o))return merr('أدخل كلمة المرور الحالية.');if(!validPass(n))return merr('كلمة المرور الجديدة حروف وأرقام، 4 خانات على الأقل.');if(n!==n2)return merr('تأكيد كلمة المرور غير مطابق.');
   HRStore.changeOwnPassword(o,n).then(function(){bioDisable();bioFlagSet(false);closeModal();toast('تم تغيير كلمة المرور. فعّل الدخول بالبصمة من جديد إن أردت.');},function(e){merr(errMsg(e));});}},{label:'إلغاء',fn:closeModal}]});}
function settingsExtras(){return '<div class="grid two-eq" style="margin-bottom:14px"><div class="card"><h2>الوظائف المكودة</h2><p class="sub">أضف الوظائف لتظهر عند تسجيل الموظفين. الوظائف المستخدمة لا يمكن حذفها.</p><div class="toolbar"><input id="newjob" class="grow" placeholder="اسم الوظيفة"><button class="btn pri" data-act="jobadd">إضافة وظيفة</button></div>'+((DB.settings.jobs||[]).map(function(j,i){return '<div class="alert"><b style="flex:1">'+esc(j)+'</b><button class="btn sm bad" data-act="jobdel" data-i="'+i+'">حذف</button></div>';}).join('')||'<div class="hint">لا توجد وظائف بعد</div>')+departmentSettings()+'</div><div class="card"><h2>المستخدمون والصلاحيات</h2><p class="sub">الدخول إلى البيانات محصور بالحسابات المسجلة (قواعد Firestore). صلاحيات الشاشات والإجراءات تُطبَّق في الواجهة. كلمة المرور حروف وأرقام (4 خانات على الأقل)، والأرقام العربية تتحول تلقائياً.</p><div class="fgrid"><input id="newuser" placeholder="اسم المستخدم: حروف أو أرقام"><input id="newpass" placeholder="كلمة المرور" type="password" autocomplete="new-password"></div><div style="display:flex;gap:12px;flex-wrap:wrap;margin:12px 0">'+PERMS.map(function(p){return '<label><input type="checkbox" value="'+p[0]+'" class="permcheck"> '+p[1]+'</label>';}).join('')+'</div><button class="btn pri" data-act="useradd">إضافة مستخدم</button>'+USERS.map(function(u,i){if(u.empId)return '';return '<div class="alert"><span style="flex:1">'+esc(u.username)+(u.admin?' · مدير':u.empId?' · بصمة موظف '+esc(u.empId):' · مستخدم')+'</span>'+(u.admin?'':(u.empId?'':'<button class="btn sm" data-act="useredit" data-i="'+i+'">تعديل الصلاحيات</button> ')+'<button class="btn sm bad" data-act="userdel" data-i="'+i+'">حذف</button>')+'</div>';}).join('')+'</div></div>';}
function vLoc(){return '<div class="grid two-eq" style="align-items:start">'+geoCard()+empAccountsCard()+'</div>';}
function geoCard(){var g=DB.settings.geo||{};
 return '<div class="card" style="margin-bottom:14px"><h2>البصمة الذاتية والنطاق الجغرافي</h2><p class="sub">يبصم الموظف من هاتفه داخل نطاق موقع العمل وفي وردية. الحضور المبكر يُثبَّت عند بداية الوردية بلا إضافي، والتأخر يُخصم، والانصراف بعد نهاية الوردية يُحتسب إضافياً. التحقق من الموقع يتم في متصفح الموظف وقد يمكن التحايل عليه ببرامج تزييف الموقع، لذلك راجع سجل الحضور دورياً.</p>'+
 '<label style="display:flex;gap:8px;align-items:center;margin-bottom:10px"><input type="checkbox" id="g_on"'+(g.on?' checked':'')+'> تفعيل البصمة الذاتية</label>'+
 '<div class="fgrid">'+field('g_lat','خط العرض (Latitude)','text',g.lat,{attrs:'inputmode="decimal" dir="ltr"'})+field('g_lng','خط الطول (Longitude)','text',g.lng,{attrs:'inputmode="decimal" dir="ltr"'})+
 field('g_radius','نصف قطر النطاق (متر)','number',g.radius,{attrs:'min="10" max="5000"'})+field('g_acc','أقصى خطأ مسموح لدقة GPS (متر)','number',g.maxAcc,{attrs:'min="10" max="1000"'})+
 field('g_early','السماح بالبصمة قبل الوردية (دقيقة)','number',DB.settings.punchEarly,{attrs:'min="0" max="240"'})+field('g_lateout','السماح بالانصراف بعد الوردية (دقيقة)','number',DB.settings.punchLateOut,{attrs:'min="0" max="720"'})+'</div>'+
 '<p class="err" id="g_err" role="alert"></p><div class="toolbar"><button class="btn" data-act="geohere" type="button">استخدم موقعي الحالي (وأنا في مقر العمل)</button><button class="btn pri" data-act="geosave" type="button">حفظ</button></div></div>';}
function geoSave(){var err=$('#g_err'),lat=parseFloat(toEn(val('g_lat'))),lng=parseFloat(toEn(val('g_lng'))),r=parseFloat(toEn(val('g_radius'))),a=parseFloat(toEn(val('g_acc'))),ea=parseFloat(toEn(val('g_early'))),lo=parseFloat(toEn(val('g_lateout'))),on=$('#g_on').checked;
 if(on&&(!isFinite(lat)||lat<-90||lat>90||!isFinite(lng)||lng<-180||lng>180)){err.textContent='أدخل إحداثيات صحيحة أو استخدم زر "موقعي الحالي".';return;}
 if(!(r>=10&&r<=5000)||!(a>=10&&a<=1000)||!(ea>=0&&ea<=240)||!(lo>=0&&lo<=720)){err.textContent='راجع القيم: النطاق 10–5000 م، دقة GPS 10–1000 م، السماح قبل 0–240 د، بعد 0–720 د.';return;}
 DB.settings.geo={on:on,lat:isFinite(lat)?lat:'',lng:isFinite(lng)?lng:'',radius:r,maxAcc:a};DB.settings.punchEarly=ea;DB.settings.punchLateOut=lo;save();toast('تم حفظ إعدادات البصمة الذاتية');}
function geoHere(){toast('جارٍ تحديد موقعك…');getPos().then(function(p){$('#g_lat').value=p.lat.toFixed(6);$('#g_lng').value=p.lng.toFixed(6);toast('تم أخذ الموقع (دقة '+Math.round(p.acc)+' م). اضغط حفظ.');},function(e){toast(geoErrMsg(e));});}
function addUser(){var u=normUser(val('newuser')),p=toEn(val('newpass')).trim(),perms=$$('.permcheck:checked').map(function(x){return x.value;});
 if(!validUser(u))return toast('اسم المستخدم حروف وأرقام فقط (يسمح بمسافة بين الكلمات)');if(!validPass(p))return toast('كلمة المرور حروف وأرقام، 4 خانات على الأقل');
 if(USERS.some(function(x){return x.username.toLowerCase()===u.toLowerCase();}))return toast('اسم المستخدم موجود');
 if(!validPerms(perms))return toast('اختر شاشة واحدة على الأقل، والشاشة المرتبطة بكل صلاحية');
 HRStore.createUser(u,p,perms).then(function(){toast('تم إضافة المستخدم');},function(e){toast(errMsg(e));});}
function applyPermissions(){if(!currentUser)return;$$('[data-act="go"]').forEach(function(e){var r=e.getAttribute('data-r');if(r&&!canRoute(r))e.style.display='none';});var side=$('.side-foot');if(side)side.innerHTML='المستخدم: '+esc(currentUser.username)+'<br>البيانات متزامنة مع Firebase';if(currentUser.admin)return;var p=currentUser.perms;$$('[data-act="empnew"]').forEach(function(e){if(p.indexOf('empnew')<0)e.remove();});$$('[data-act="advnew"]').forEach(function(e){if(p.indexOf('advnew')<0)e.remove();});$$('[data-act="advedit"],[data-act="advdel"]').forEach(function(e){e.removeAttribute('data-act');if(e.tagName==='BUTTON')e.remove();});if(ui.route==='attendance'&&p.indexOf('attwrite')<0){$$('#daylist input,#daylist select,#daylist button,[data-act="allpresent"],[data-act="allout"],[data-act="attdel"]').forEach(function(e){e.disabled=true;});}}
var PERMS=[['employees','شاشة الموظفين وطباعة قسيمة الراتب'],['empnew','إضافة موظف'],['attendance','شاشة الحضور'],['attwrite','تسجيل الحضور والانصراف'],['advances','شاشة السلف'],['advnew','تسجيل سلفة'],['dashboard','لوحة التحكم'],['payroll','كشف الرواتب'],['payments','المدفوعات'],['bonuses','الحوافز والجزاءات'],['settlement','التصفية']];
function validPerms(p){return p.some(function(x){return ['employees','attendance','advances','dashboard','payroll','payments','bonuses','settlement'].indexOf(x)>=0;})&&!(p.indexOf('empnew')>=0&&p.indexOf('employees')<0||p.indexOf('attwrite')>=0&&p.indexOf('attendance')<0||p.indexOf('advnew')>=0&&p.indexOf('advances')<0);}
function editUser(i){var u=USERS[i];if(!u||u.admin)return;var body='<div class="fgrid">'+field('edit_username','اسم المستخدم (لا يمكن تغييره)','text',u.username,{attrs:'readonly'})+'</div><p class="hint">تغيير الصلاحيات يسري فوراً على المستخدم. لتغيير كلمة مروره: يغيّرها المستخدم بنفسه من زر المفتاح في القائمة، أو احذف الحساب وأنشئ حساباً جديداً باسم مختلف.</p><div class="filesgrid">'+PERMS.map(function(x){return '<label><input class="editperm" type="checkbox" value="'+x[0]+'"'+(u.perms.indexOf(x[0])>=0?' checked':'')+'> '+x[1]+'</label>';}).join('')+'</div>';
 openModal({title:'تعديل صلاحيات المستخدم',body:body,actions:[{label:'حفظ',cls:'pri',fn:function(){var perms=$$('.editperm:checked').map(function(x){return x.value;});if(!validPerms(perms))return merr('اختر شاشة واحدة على الأقل، والشاشة المرتبطة بكل صلاحية.');HRStore.updateUserPerms(u.uid,perms).then(function(){closeModal();toast('تم تحديث الصلاحيات');},function(e){merr(errMsg(e));});}},{label:'إلغاء',fn:closeModal}]});}


/* ---------- حسابات دخول الموظفين (تلقائية) ---------- */
function hasAccount(e){return USERS.some(function(u){return u.empId===e.id;});}
function usedNames(){var m={};USERS.forEach(function(u){m[u.username.toLowerCase()]=1;});return m;}
var DEFAULT_EMP_PASS='1234';
function createEmpAccount(e,used,pass){pass=pass||DEFAULT_EMP_PASS;var name=accountName(e,used);
 function attempt(nm,retry){return HRStore.createUser(nm,pass,[],e.id).then(function(){used[nm.toLowerCase()]=1;return {e:e,username:nm,pass:pass};},function(err){
  if(retry&&err&&err.code==='auth/email-already-in-use')return attempt(accountName(e,Object.assign({},used,(function(){var o={};o[nm]=1;return o;})())),false);throw err;});}
 return attempt(name,true);}
/* ينشئ الحسابات واحداً تلو الآخر ثم يعرض بيانات الدخول مرة واحدة */
function autoAccounts(list,pass){
 if(!currentUser||!currentUser.admin){toast('إنشاء حسابات الموظفين للمدير فقط');return;}
 var todo=list.filter(function(e){return e.clock!==false&&!hasAccount(e);});if(!todo.length){toast('كل الموظفين لديهم حسابات');return;}
 toast('جارٍ إنشاء الحسابات…');var used=usedNames(),done=[],fails=[];
 return todo.reduce(function(p,e){return p.then(function(){return createEmpAccount(e,used,pass).then(function(r){done.push(r);},function(er){fails.push(e.name+': '+errMsg(er));});});},Promise.resolve())
  .then(function(){publishCfg();showCredentials(done,fails);});}
function siteUrl(){return location.origin+location.pathname;}
function showCredentials(rows,fails){
 var lines=rows.map(function(r){return r.e.name+' — اسم المستخدم: '+r.username+' — كلمة المرور: '+r.pass;}).join('\n');
 var body='<p class="hint">بيانات دخول الموظف. كلمة المرور الافتراضية 1234، ويمكن للموظف تغييرها بنفسه بعد الدخول. كلمة المرور لا تُعرض مرة أخرى بعد إغلاق هذه النافذة.</p><div class="tablewrap"><table class="tbl"><thead><tr><th>الموظف</th><th>اسم المستخدم</th><th>كلمة المرور</th><th></th></tr></thead><tbody>'+
  rows.map(function(r){var num=waNumber(r.e.phone),txt='مرحباً '+r.e.name+'\nرابط تسجيل الحضور والانصراف: '+siteUrl()+'\nاسم المستخدم: '+r.username+'\nكلمة المرور: '+r.pass;
   return '<tr><td>'+esc(r.e.name)+'</td><td class="num" dir="ltr">'+esc(r.username)+'</td><td class="num" dir="ltr"><b>'+esc(r.pass)+'</b></td><td>'+(num?'<a class="btn sm" target="_blank" rel="noopener" href="https://wa.me/'+num+'?text='+encodeURIComponent(txt)+'">واتساب</a>':'')+'</td></tr>';}).join('')+'</tbody></table></div>'+
  '<p class="hint">الرابط: <b dir="ltr">'+esc(siteUrl())+'</b></p>'+(fails.length?'<p class="err">تعذر إنشاء: '+esc(fails.join(' | '))+'</p>':'');
 openModal({title:rows.length?'تم إنشاء حسابات الدخول':'لم يُنشأ أي حساب',body:body,actions:[rows.length?{label:'نسخ الكل',cls:'pri',fn:function(){copyText('رابط التسجيل: '+siteUrl()+'\n'+lines);}}:null,{label:'إغلاق',fn:closeModal}].filter(Boolean)});}
function empAccountsCard(){var emps=DB.emps.filter(function(e){return e.clock!==false;}),missing=emps.filter(function(e){return !hasAccount(e);}).length;
 return '<div class="card" style="margin-bottom:14px"><h2>حسابات دخول الموظفين (للبصمة)</h2><p class="sub">يُنشأ حساب لكل موظف له حضور وانصراف تلقائياً عند تسجيله، واسم المستخدم هو رقم موبايله وكلمة المرور الافتراضية 1234 (أو ما تكتبه في نموذج الموظف). أرسل له الرابط وبيانات الدخول.</p>'+
 (missing?'<div class="toolbar"><button class="btn pri" data-act="empaccall">إنشاء حسابات لـ '+missing+' موظف</button></div>':'')+
 (emps.map(function(e){var u=USERS.filter(function(x){return x.empId===e.id;})[0],i=USERS.indexOf(u);return '<div class="alert"><span style="flex:1">'+esc(e.name)+' <small class="hint">'+(u?'اسم المستخدم: <b dir="ltr">'+esc(u.username)+'</b> · '+(u.bound?'الهاتف: مرتبط ✓':'الهاتف: لم يُربط بعد'):'بدون حساب')+'</small></span>'+(u&&u.bound?'<button class="btn sm" data-act="devreset" data-i="'+i+'">إعادة ربط الهاتف</button> ':'')+(u?'<button class="btn sm bad" data-act="userdel" data-i="'+i+'">حذف الحساب</button>':'<button class="btn sm" data-act="empacc" data-id="'+esc(e.id)+'">إنشاء حساب</button>')+'</div>';}).join('')||'<div class="hint">لا يوجد موظفون لهم بصمة.</div>')+
 '<p class="hint">نسيان كلمة المرور: احذف الحساب من هنا، ثم احذف المستخدم من Firebase Console ← Authentication، ثم أنشئ الحساب من جديد.</p></div>';}
