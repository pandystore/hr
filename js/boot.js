/* نقطة التشغيل: تهيئة Firebase ثم ربط الجلسة بتحميل البيانات (module) */
document.documentElement.dir='rtl';document.documentElement.lang='ar';

(async function(){
 if(!HRStore.configured){
  fatalScreen('إعداد Firebase مطلوب','افتح الملف <b>js/firebase-config.js</b> وضع فيه بيانات مشروعك من Firebase Console، ثم ارفع التعديل على GitHub. الخطوات الكاملة في ملف README.md.');
  return;}
 try{await HRStore.init();}catch(e){fatalScreen('تعذر تهيئة Firebase','تحقق من بيانات الإعداد في js/firebase-config.js ومن الاتصال بالإنترنت.<br><span dir="ltr">'+esc(e&&e.message||'')+'</span>');return;}

 var started=false,pendingMsg='',pendingPunches=null;

 function kickOut(msg){try{sessionStorage.setItem('hr_msg',msg);}catch(e){}HRStore.logout().then(function(){location.reload();},function(){location.reload();});}
 function onProfileChange(p){
  if(!p)return kickOut('تم حذف حسابك من النظام.');
  var sid=HRStore.sid();if(sid&&p.session&&p.session.id!==sid)return kickOut('تم تسجيل الدخول بهذا الحساب من جهاز أو متصفح آخر، فانتهت هذه الجلسة.');
  if(p.role==='employee'&&p.deviceId!==undefined&&p.deviceId!==HRStore.deviceId())return kickOut('تمت إعادة ضبط ربط الجهاز لحسابك. سجّل الدخول من جديد.');
  if(!currentUser)return;
  var changed=JSON.stringify([currentUser.admin,currentUser.perms])!==JSON.stringify([!!p.admin,p.perms||[]]);
  currentUser.admin=!!p.admin;currentUser.perms=p.perms||[];
  if(changed&&DB){toast('تم تحديث صلاحياتك');drawShell();route();}}

 function onUsers(list){
  USERS.length=0;list.forEach(function(u){USERS.push({uid:u.uid,username:u.username,admin:!!u.admin,perms:u.perms||[],empId:u.empId||'',bound:!!u.deviceId});});
  USERS.sort(function(a,b){return (b.admin-a.admin)||(a.username<b.username?-1:1);});
  if(DB)publishLoginList();
  if(DB&&!modalState&&!$('#mbg')&&(ui.route==='settings'||ui.route==='location'))render();}

 async function handle(){
  if(started)return;started=true;showLoading('جارٍ تحميل البيانات…');
  try{
   var p=await HRStore.loadProfile();
   if(!p){started=false;pendingMsg='هذا الحساب غير مفعّل في النظام. اطلب من المدير إضافته.';await HRStore.logout();return;}
   var bd=await HRStore.bindDevice();
   if(!bd.ok){started=false;pendingMsg='هذا الحساب مرتبط بهاتف آخر ولا يمكن فتحه من هذا الجهاز. اطلب من المدير إعادة ربط الجهاز.';await HRStore.logout();return;}
   var cs=await HRStore.claimSession();
   if(!cs.ok){started=false;pendingMsg='انتهت جلسة هذا التبويب لأن الحساب فُتح من مكان آخر.';await HRStore.logout();return;}
   if(p.role==='employee'){ // حساب موظف: شاشة البصمة فقط
    SP.profile={uid:p.uid,username:p.username,empId:p.empId};hideLoading();
    var r=await HRStore.startEmployee({onCfg:function(c){SP.cfg=c;drawSelfPunch();},onPunchList:function(l){SP.punches=l;drawSelfPunch();},onProfile:onProfileChange});
    SP.cfg=r.cfg;SP.punches=r.punches;drawSelfPunch();empDisplayName(p.username).then(function(n){SP.name=n;drawSelfPunch();});setTimeout(offerBio,500);return;}
   currentUser={uid:p.uid,username:p.username,admin:!!p.admin,perms:p.perms||[]};
   var raw=await HRStore.start({onRemote:onRemoteData,onUsers:onUsers,onProfile:onProfileChange,onPunches:function(l){if(DB)processPunches(l);else pendingPunches=l;},onError:function(e){toast(errMsg(e));}});
   DB=buildDB(raw);idxCache=null;applyPrefs(p.prefs);publishCfg();try{if(autoCheckout(DB))setTimeout(save,500);}catch(e){}applyFavicon();if(pendingPunches){var pl=pendingPunches;pendingPunches=null;setTimeout(function(){processPunches(pl);},300);}
   hideLoading();drawShell();setNavMode('open');
   var h=location.hash.replace('#','');if(!h||!canRoute(h))location.hash=firstRoute();
   route();setTimeout(offerBio,700);
  }catch(e){started=false;pendingMsg=errMsg(e);try{await HRStore.logout();}catch(_){}}}

 window.hrAfterAuth=handle; // بعد إنشاء حساب المدير الأول
 HRStore.handleError(function(e){toast(errMsg(e));});
 HRStore.onAuth(function(u){
  if(!u){started=false;var carried='';try{carried=sessionStorage.getItem('hr_msg')||'';sessionStorage.removeItem('hr_msg');}catch(e){}showLogin(pendingMsg||carried);pendingMsg='';return;}
  handle();});
})();
