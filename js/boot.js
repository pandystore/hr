/* نقطة التشغيل: تهيئة Firebase ثم ربط الجلسة بتحميل البيانات (module) */
document.documentElement.dir='rtl';document.documentElement.lang='ar';

(async function(){
 if(!HRStore.configured){
  fatalScreen('إعداد Firebase مطلوب','افتح الملف <b>js/firebase-config.js</b> وضع فيه بيانات مشروعك من Firebase Console، ثم ارفع التعديل على GitHub. الخطوات الكاملة في ملف README.md.');
  return;}
 try{await HRStore.init();}catch(e){fatalScreen('تعذر تهيئة Firebase','تحقق من بيانات الإعداد في js/firebase-config.js ومن الاتصال بالإنترنت.<br><span dir="ltr">'+esc(e&&e.message||'')+'</span>');return;}

 var started=false,pendingMsg='',pendingPunches=null;

 function onProfileChange(p){
  if(!p){pendingMsg='تم حذف حسابك من النظام.';HRStore.logout().then(function(){location.reload();},function(){location.reload();});return;}
  if(!currentUser)return;
  var changed=JSON.stringify([currentUser.admin,currentUser.perms])!==JSON.stringify([!!p.admin,p.perms||[]]);
  currentUser.admin=!!p.admin;currentUser.perms=p.perms||[];
  if(changed&&DB){toast('تم تحديث صلاحياتك');drawShell();route();}}

 function onUsers(list){
  USERS.length=0;list.forEach(function(u){USERS.push({uid:u.uid,username:u.username,admin:!!u.admin,perms:u.perms||[],empId:u.empId||''});});
  USERS.sort(function(a,b){return (b.admin-a.admin)||(a.username<b.username?-1:1);});
  if(DB&&!modalState&&!$('#mbg')&&ui.route==='settings')render();}

 async function handle(){
  if(started)return;started=true;showLoading('جارٍ تحميل البيانات…');
  try{
   var p=await HRStore.loadProfile();
   if(!p){started=false;pendingMsg='هذا الحساب غير مفعّل في النظام. اطلب من المدير إضافته.';await HRStore.logout();return;}
   if(p.role==='employee'){ // حساب موظف: شاشة البصمة فقط
    SP.profile={uid:p.uid,username:p.username,empId:p.empId};hideLoading();
    var r=await HRStore.startEmployee({onCfg:function(c){SP.cfg=c;drawSelfPunch();},onPunchList:function(l){SP.punches=l;drawSelfPunch();},onProfile:function(x){if(!x)onProfileChange(null);}});
    SP.cfg=r.cfg;SP.punches=r.punches;drawSelfPunch();return;}
   currentUser={uid:p.uid,username:p.username,admin:!!p.admin,perms:p.perms||[]};
   var raw=await HRStore.start({onRemote:onRemoteData,onUsers:onUsers,onProfile:onProfileChange,onPunches:function(l){if(DB)processPunches(l);else pendingPunches=l;},onError:function(e){toast(errMsg(e));}});
   DB=buildDB(raw);idxCache=null;applyPrefs(p.prefs);publishCfg();if(pendingPunches){var pl=pendingPunches;pendingPunches=null;setTimeout(function(){processPunches(pl);},300);}
   hideLoading();drawShell();setNavMode('open');
   var h=location.hash.replace('#','');if(!h||!canRoute(h))location.hash=firstRoute();
   route();
  }catch(e){started=false;pendingMsg=errMsg(e);try{await HRStore.logout();}catch(_){}}}

 window.hrAfterAuth=handle; // بعد إنشاء حساب المدير الأول
 HRStore.handleError(function(e){toast(errMsg(e));});
 HRStore.onAuth(function(u){
  if(!u){started=false;showLogin(pendingMsg);pendingMsg='';return;}
  handle();});
})();
