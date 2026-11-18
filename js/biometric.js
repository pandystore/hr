'use strict';
/* الدخول ببصمة الجهاز (WebAuthn): بعد تفعيله مرة من جهاز الموظف، يدخل بالبصمة/الوجه بدل كتابة كلمة المرور.
   تُحفظ بيانات الدخول على هذا الجهاز فقط، مشفّرة بمفتاح غير قابل للتصدير، ولا تُفك إلا بعد نجاح تحقق بصمة الجهاز. */
var BIO_DB='hr-bio',BIO_ST='k',BIO_KEY='cred';
function bioIdb(){return new Promise(function(res,rej){var r=indexedDB.open(BIO_DB,1);r.onupgradeneeded=function(){r.result.createObjectStore(BIO_ST);};r.onsuccess=function(){res(r.result);};r.onerror=function(){rej(r.error);};});}
function bioGet(){return bioIdb().then(function(d){return new Promise(function(res,rej){var q=d.transaction(BIO_ST).objectStore(BIO_ST).get(BIO_KEY);q.onsuccess=function(){res(q.result||null);};q.onerror=function(){rej(q.error);};});}).catch(function(){return null;});}
function bioPut(v){return bioIdb().then(function(d){return new Promise(function(res,rej){var t=d.transaction(BIO_ST,'readwrite');t.objectStore(BIO_ST).put(v,BIO_KEY);t.oncomplete=res;t.onerror=function(){rej(t.error);};});});}
function bioDisable(){return bioIdb().then(function(d){return new Promise(function(res){var t=d.transaction(BIO_ST,'readwrite');t.objectStore(BIO_ST).delete(BIO_KEY);t.oncomplete=res;t.onerror=res;});}).catch(function(){});}
function rnd(n){return crypto.getRandomValues(new Uint8Array(n));}
/* هل الجهاز يدعم بصمة/قفل شاشة مدمجاً؟ */
function bioSupported(){if(!window.PublicKeyCredential||!navigator.credentials||!window.indexedDB||!crypto.subtle)return Promise.resolve(false);
 return PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().catch(function(){return false;});}
function bioEnabledFor(){return bioGet().then(function(r){return r?{username:r.username}:null;});}

/* تفعيل: إنشاء مفتاح بصمة للجهاز + تشفير بيانات الدخول */
function bioEnable(username,pass){
 var enc=new TextEncoder(),iv=rnd(12),aes,credId;
 return navigator.credentials.create({publicKey:{challenge:rnd(32),rp:{name:'نظام شؤون الموظفين',id:location.hostname},
  user:{id:rnd(16),name:username,displayName:username},pubKeyCredParams:[{type:'public-key',alg:-7},{type:'public-key',alg:-257}],
  authenticatorSelection:{authenticatorAttachment:'platform',userVerification:'required',residentKey:'discouraged'},timeout:60000,attestation:'none'}})
 .then(function(c){if(!c)throw new Error('cancel');credId=c.rawId;return crypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']);})
 .then(function(k){aes=k;return crypto.subtle.encrypt({name:'AES-GCM',iv:iv},k,enc.encode(JSON.stringify({u:username,p:pass})));})
 .then(function(ct){return bioPut({credId:credId,username:username,iv:iv,ct:ct,key:aes});});}

/* دخول: تحقق البصمة ثم فك التشفير. يرجع {u,p} */
function bioUnlock(){
 return bioGet().then(function(r){if(!r)throw {bio:'none'};
  return navigator.credentials.get({publicKey:{challenge:rnd(32),rpId:location.hostname,allowCredentials:[{type:'public-key',id:r.credId}],userVerification:'required',timeout:60000}})
  .then(function(a){if(!a)throw {bio:'cancel'};return crypto.subtle.decrypt({name:'AES-GCM',iv:r.iv},r.key,r.ct);})
  .then(function(pt){return JSON.parse(new TextDecoder().decode(pt));});});}
function bioErr(e){var n=e&&e.name;return e&&e.bio==='none'?'لم تُفعَّل البصمة على هذا الجهاز بعد.':(n==='NotAllowedError'||(e&&e.bio==='cancel'))?'تم إلغاء التحقق بالبصمة.':n==='SecurityError'?'البصمة تعمل على رابط آمن (https) فقط.':'تعذر التحقق بالبصمة. استخدم كلمة المرور.';}

/* نافذة التفعيل/الإلغاء داخل التطبيق (للمدير والموظف) */
function bioModal(username){
 bioSupported().then(function(ok){
  if(!ok)return toast('هذا الجهاز أو المتصفح لا يدعم الدخول بالبصمة. فعّل بصمة أو قفل شاشة للجهاز.');
  bioEnabledFor().then(function(cur){var on=cur&&cur.username===username;
   openModal({title:'الدخول ببصمة الجهاز',body:'<p class="hint">'+(on?'الدخول بالبصمة مفعّل على هذا الجهاز لحساب <b>'+esc(username)+'</b>.':'بعد التفعيل تدخل بالبصمة أو الوجه بدل كتابة كلمة المرور على هذا الجهاز فقط. أدخل كلمة مرورك الحالية للتأكيد.')+'</p>'+(on?'':'<div class="fgrid">'+field('bio_pass','كلمة المرور الحالية','password','',{attrs:'inputmode="numeric" autocomplete="current-password"'})+'</div>'),
    onOpen:function(){var i=$('#bio_pass');if(i)i.addEventListener('input',function(){normalizeLoginInput(this,true);});},
    actions:on?[{label:'إلغاء التفعيل',cls:'bad',fn:function(){bioDisable().then(function(){closeModal();toast('تم إلغاء الدخول بالبصمة');});}},{label:'إغلاق',fn:closeModal}]
     :[{label:'تفعيل',cls:'pri',fn:function(){var p=toEn(val('bio_pass'));if(!validPass(p))return merr('أدخل كلمة المرور (أرقام).');
      HRStore.verifyPassword(p).then(function(){return bioEnable(username,p);}).then(function(){closeModal();toast('تم تفعيل الدخول بالبصمة ✓');},function(e){merr(e&&e.code&&String(e.code).indexOf('auth/')===0?'كلمة المرور غير صحيحة.':bioErr(e));});}},{label:'إلغاء',fn:closeModal}]});});});}
