'use strict';
/* الحسابات والصلاحيات: المصادقة عبر Firebase Auth، والصلاحيات التفصيلية تُطبَّق في الواجهة */
var currentUser=null;
function canRoute(r){return !currentUser||currentUser.admin||currentUser.perms.indexOf(r)>=0||(r==='attreport'&&currentUser.perms.indexOf('employees')>=0);}
function firstRoute(){return currentUser&&!currentUser.admin?(currentUser.perms[0]||'attendance'):'dashboard';}
var LOGIN_ERR={
 'auth/invalid-credential':'اسم المستخدم أو كلمة المرور غير صحيح.','auth/wrong-password':'اسم المستخدم أو كلمة المرور غير صحيح.',
 'auth/user-not-found':'اسم المستخدم أو كلمة المرور غير صحيح.','auth/invalid-login-credentials':'اسم المستخدم أو كلمة المرور غير صحيح.',
 'auth/too-many-requests':'محاولات كثيرة. انتظر قليلاً ثم أعد المحاولة.','auth/network-request-failed':'تعذر الاتصال بالإنترنت.',
 'auth/operation-not-allowed':'فعّل تسجيل الدخول بالبريد وكلمة المرور من Firebase Authentication.','auth/email-already-in-use':'اسم المستخدم محجوز. اختر اسماً آخر.',
 'hr/already-initialized':'النظام مُهيّأ بالفعل. اطلب من المدير إنشاء حساب لك.','permission-denied':'ليست لديك صلاحية. تأكد من نشر قواعد Firestore.'};
function errMsg(e){return LOGIN_ERR[e&&e.code]||('تعذر تنفيذ العملية'+(e&&e.code?' ('+e.code+')':'')+'.');}
function validUser(u){return /^[\p{L}\p{N}]+$/u.test(u);}
function validPass(p){return /^\d{4,20}$/.test(p);}
function normalizeLoginInput(el,digitsOnly){var v=toEn(el.value).replace(/\s+/g,'');if(digitsOnly)v=v.replace(/\D/g,'');if(v!==el.value)el.value=v;}
/* شاشة الدخول: اسم مستخدم (حروف/أرقام) وكلمة مرور أرقام فقط، وتقبل الأرقام العربية */
function showLogin(msg){
 closeModal();var old=$('.login-screen');if(old)old.remove();var first=false;
 var overlay=document.createElement('div');overlay.className='login-screen';
 overlay.innerHTML='<div class="card login-box"><h2 id="logintitle"></h2><p class="hint" id="loginhint"></p><div class="field"><label for="loginuser">اسم المستخدم (حروف أو أرقام)</label><input id="loginuser" autocomplete="username" autocapitalize="off"></div><div class="field" style="margin-top:10px"><label for="loginpass">كلمة المرور (أرقام فقط، 4 على الأقل)</label><input id="loginpass" type="password" inputmode="numeric" autocomplete="current-password"></div><p class="err" id="loginerror" role="alert"></p><button class="btn pri" id="loginbutton"></button> <button class="btn sm" id="loginmode" type="button" style="margin-top:10px"></button><button class="btn big" id="loginbio" type="button" hidden style="width:100%;margin-top:14px">👆 الدخول بالبصمة / الوجه</button></div>';
 document.body.appendChild(overlay);
 function mode(f){first=f;$('#logintitle').textContent=f?'إنشاء حساب المدير (أول تشغيل)':'تسجيل الدخول';$('#loginhint').textContent=f?'يعمل هذا الخيار مرة واحدة فقط عند تهيئة النظام لأول مرة. احتفظ ببياناته في مكان آمن.':'أدخل اسم المستخدم وكلمة المرور الرقمية. الأرقام العربية (٠١٢٣) مقبولة.';$('#loginbutton').textContent=f?'إنشاء ودخول':'دخول';$('#loginmode').textContent=f?'لدي حساب بالفعل':'أول تشغيل؟ إنشاء حساب المدير';$('#loginerror').textContent='';}
 mode(false);if(msg)$('#loginerror').textContent=msg;
 $('#loginuser').addEventListener('input',function(){normalizeLoginInput(this,false);});
 $('#loginpass').addEventListener('input',function(){normalizeLoginInput(this,true);});
 $('#loginmode').onclick=function(){mode(!first);};
 function submit(){var u=toEn($('#loginuser').value).trim(),p=toEn($('#loginpass').value).trim(),err=$('#loginerror'),btn=$('#loginbutton');
  if(!validUser(u)){err.textContent='اسم المستخدم حروف وأرقام فقط، بدون مسافات أو رموز.';return;}
  if(!validPass(p)){err.textContent='كلمة المرور أرقام فقط، من 4 إلى 20 رقماً.';return;}
  err.textContent='';btn.disabled=true;
  (first?HRStore.bootstrapAdmin(u,p).then(function(){return window.hrAfterAuth();}):HRStore.login(u,p)).catch(function(e){err.textContent=errMsg(e);btn.disabled=false;});}
 $('#loginbutton').onclick=submit;
 overlay.addEventListener('keydown',function(e){if(e.key==='Enter')submit();});
 bioSupported().then(function(ok){if(!ok)return;bioEnabledFor().then(function(cur){if(!cur)return;var b=$('#loginbio');if(!b)return;b.hidden=false;b.textContent='👆 الدخول بالبصمة: '+cur.username;
  b.onclick=function(){var err=$('#loginerror');err.textContent='';b.disabled=true;
   bioUnlock().then(function(c){return HRStore.login(c.u,c.p).catch(function(e){if(e&&/^auth\//.test(e.code||'')&&e.code!=='auth/network-request-failed'&&e.code!=='auth/too-many-requests'){bioDisable();b.hidden=true;err.textContent='تغيّرت بيانات الدخول. سجّل بكلمة المرور ثم فعّل البصمة من جديد.';}throw e;});})
   .catch(function(e){if(!err.textContent)err.textContent=e&&e.code?errMsg(e):bioErr(e);b.disabled=false;});};});});
 setTimeout(function(){$('#loginuser').focus();},30);}
function showLoading(t){var old=$('.login-screen');if(old)old.remove();var o=document.createElement('div');o.className='login-screen';o.innerHTML='<div class="card login-box" style="text-align:center"><h2>'+esc(t||'جارٍ التحميل…')+'</h2></div>';document.body.appendChild(o);}
function hideLoading(){var o=$('.login-screen');if(o)o.remove();}
function fatalScreen(title,html){var old=$('.login-screen');if(old)old.remove();var o=document.createElement('div');o.className='login-screen';o.innerHTML='<div class="card login-box"><h2>'+esc(title)+'</h2><div class="hint" style="line-height:1.9">'+html+'</div></div>';document.body.appendChild(o);}
function changePassModal(){
 openModal({title:'تغيير كلمة المرور',body:'<div class="fgrid">'+field('cp_old','كلمة المرور الحالية','password','',{attrs:'inputmode="numeric" autocomplete="current-password"'})+field('cp_new','كلمة المرور الجديدة (أرقام، 4 على الأقل)','password','',{attrs:'inputmode="numeric" autocomplete="new-password"'})+field('cp_new2','تأكيد كلمة المرور الجديدة','password','',{attrs:'inputmode="numeric" autocomplete="new-password"'})+'</div>',
  onOpen:function(){['cp_old','cp_new','cp_new2'].forEach(function(id){$('#'+id).addEventListener('input',function(){normalizeLoginInput(this,true);});});},
  actions:[{label:'حفظ',cls:'pri',fn:function(){var o=toEn(val('cp_old')),n=toEn(val('cp_new')),n2=toEn(val('cp_new2'));if(!validPass(o))return merr('أدخل كلمة المرور الحالية (أرقام).');if(!validPass(n))return merr('كلمة المرور الجديدة أرقام فقط، من 4 إلى 20 رقماً.');if(n!==n2)return merr('تأكيد كلمة المرور غير مطابق.');
   HRStore.changeOwnPassword(o,n).then(function(){bioDisable();closeModal();toast('تم تغيير كلمة المرور. فعّل الدخول بالبصمة من جديد إن أردت.');},function(e){merr(errMsg(e));});}},{label:'إلغاء',fn:closeModal}]});}
function settingsExtras(){return '<div class="grid two-eq" style="margin-bottom:14px"><div class="card"><h2>الوظائف المكودة</h2><p class="sub">أضف الوظائف لتظهر عند تسجيل الموظفين. الوظائف المستخدمة لا يمكن حذفها.</p><div class="toolbar"><input id="newjob" class="grow" placeholder="اسم الوظيفة"><button class="btn pri" data-act="jobadd">إضافة وظيفة</button></div>'+((DB.settings.jobs||[]).map(function(j,i){return '<div class="alert"><b style="flex:1">'+esc(j)+'</b><button class="btn sm bad" data-act="jobdel" data-i="'+i+'">حذف</button></div>';}).join('')||'<div class="hint">لا توجد وظائف بعد</div>')+departmentSettings()+'</div><div class="card"><h2>المستخدمون والصلاحيات</h2><p class="sub">الدخول إلى البيانات محصور بالحسابات المسجلة (قواعد Firestore). صلاحيات الشاشات والإجراءات تُطبَّق في الواجهة. كلمة المرور رقمية (4 أرقام على الأقل) وتقبل الأرقام العربية.</p><div class="fgrid"><input id="newuser" placeholder="اسم المستخدم: حروف أو أرقام"><input id="newpass" placeholder="كلمة المرور: أرقام فقط (4 على الأقل)" type="password" inputmode="numeric" autocomplete="new-password"></div><div style="display:flex;gap:12px;flex-wrap:wrap;margin:12px 0">'+PERMS.map(function(p){return '<label><input type="checkbox" value="'+p[0]+'" class="permcheck"> '+p[1]+'</label>';}).join('')+'</div><button class="btn pri" data-act="useradd">إضافة مستخدم</button>'+USERS.map(function(u,i){if(u.empId)return '';return '<div class="alert"><span style="flex:1">'+esc(u.username)+(u.admin?' · مدير':u.empId?' · بصمة موظف '+esc(u.empId):' · مستخدم')+'</span>'+(u.admin?'':(u.empId?'':'<button class="btn sm" data-act="useredit" data-i="'+i+'">تعديل الصلاحيات</button> ')+'<button class="btn sm bad" data-act="userdel" data-i="'+i+'">حذف</button>')+'</div>';}).join('')+'</div></div>'+geoCard()+empAccountsCard();}
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
function addUser(){var u=toEn(val('newuser')).trim(),p=toEn(val('newpass')).trim(),perms=$$('.permcheck:checked').map(function(x){return x.value;});
 if(!validUser(u))return toast('اسم المستخدم حروف وأرقام فقط، بدون مسافات أو رموز');if(!validPass(p))return toast('كلمة المرور أرقام فقط، من 4 إلى 20 رقماً');
 if(USERS.some(function(x){return x.username.toLowerCase()===u.toLowerCase();}))return toast('اسم المستخدم موجود');
 if(!validPerms(perms))return toast('اختر شاشة واحدة على الأقل، والشاشة المرتبطة بكل صلاحية');
 HRStore.createUser(u,p,perms).then(function(){toast('تم إضافة المستخدم');},function(e){toast(errMsg(e));});}
function applyPermissions(){if(!currentUser)return;$$('[data-act="go"]').forEach(function(e){var r=e.getAttribute('data-r');if(r&&!canRoute(r))e.style.display='none';});var side=$('.side-foot');if(side)side.innerHTML='المستخدم: '+esc(currentUser.username)+'<br>البيانات متزامنة مع Firebase';if(currentUser.admin)return;var p=currentUser.perms;$$('[data-act="empnew"]').forEach(function(e){if(p.indexOf('empnew')<0)e.remove();});$$('[data-act="advnew"]').forEach(function(e){if(p.indexOf('advnew')<0)e.remove();});$$('[data-act="advedit"],[data-act="advdel"]').forEach(function(e){e.removeAttribute('data-act');if(e.tagName==='BUTTON')e.remove();});if(ui.route==='attendance'&&p.indexOf('attwrite')<0){$$('#daylist input,#daylist select,#daylist button,[data-act="allpresent"],[data-act="allout"],[data-act="attdel"]').forEach(function(e){e.disabled=true;});}}
function validUser(u){return /^[\p{L}\p{N}]+$/u.test(u);}
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
 (emps.map(function(e){var u=USERS.filter(function(x){return x.empId===e.id;})[0],i=USERS.indexOf(u);return '<div class="alert"><span style="flex:1">'+esc(e.name)+' <small class="hint">'+(u?'اسم المستخدم: <b dir="ltr">'+esc(u.username)+'</b>':'بدون حساب')+'</small></span>'+(u?'<button class="btn sm bad" data-act="userdel" data-i="'+i+'">حذف الحساب</button>':'<button class="btn sm" data-act="empacc" data-id="'+esc(e.id)+'">إنشاء حساب</button>')+'</div>';}).join('')||'<div class="hint">لا يوجد موظفون لهم بصمة.</div>')+
 '<p class="hint">نسيان كلمة المرور: احذف الحساب من هنا، ثم احذف المستخدم من Firebase Console ← Authentication، ثم أنشئ الحساب من جديد.</p></div>';}
