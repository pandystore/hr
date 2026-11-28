'use strict';
var ui={route:'dashboard',ym:today().slice(0,7),attTab:'day',attDate:today(),empQ:'',empSys:'',empSt:'',sheetQ:'',sheetSys:'',sheetSt:''};
ui.empView='cards';ui.hideAtt=false;ui.hcols={};
/* ====================== النماذج والنوافذ ====================== */
function field(id,label,type,val,extra){extra=extra||'';
 if(type==='select')return '<div class="field"><label for="'+id+'">'+label+'</label><select id="'+id+'" '+extra.attrs+'>'+extra.opts+'</select></div>';
 if(type==='textarea')return '<div class="field"><label for="'+id+'">'+label+'</label><textarea id="'+id+'" rows="2">'+esc(val)+'</textarea></div>';
 var a=type==='number'?' step="any" inputmode="decimal" min="0"':'';
 return '<div class="field"><label for="'+id+'">'+label+'</label><input id="'+id+'" type="'+type+'" value="'+esc(val)+'"'+a+' '+(extra.attrs||'')+'></div>';}
function opts(list,sel,blank){return (blank!==undefined?'<option value="">'+blank+'</option>':'')+list.map(function(o){var v=o.v!==undefined?o.v:o,l=o.l!==undefined?o.l:o;return '<option value="'+esc(v)+'"'+(String(v)===String(sel)?' selected':'')+'>'+esc(l)+'</option>';}).join('');}
function empOpts(sel,blank,filter){return opts(DB.emps.filter(filter||function(){return true;}).map(function(e){return {v:e.id,l:e.id+' — '+e.name+(e.nick?' ('+e.nick+')':'')};}),sel,blank);}
var modalState=null;
function openModal(o){closeModal();var bg=document.createElement('div');bg.className='sheetbg';bg.id='mbg';
 bg.innerHTML='<div class="modal'+(o.wide?' wide':'')+'" role="dialog" aria-modal="true" aria-label="'+esc(o.title)+'"><header><h2>'+esc(o.title)+'</h2><button class="iconbtn" data-act="mclose" aria-label="إغلاق" style="width:34px;height:34px">'+ic('x')+'</button></header><div class="mb">'+o.body+'<div class="err" id="merr"></div></div>'+
  '<footer>'+(o.actions||[]).map(function(a,i){return '<button class="btn '+(a.cls||'')+'" data-act="mact" data-i="'+i+'">'+esc(a.label)+'</button>';}).join('')+'</footer></div>';
 $('#layer').appendChild(bg);modalState=o;bg.addEventListener('mousedown',function(e){if(e.target===bg)closeModal();});
 var f=$('input,select',bg);if(f&&!o.noFocus)setTimeout(function(){try{f.focus();}catch(e){}},30);if(o.onOpen)o.onOpen(bg);}
function closeModal(){var m=$('#mbg'),page=m&&m.dataset.page==='1';if(m)m.remove();modalState=null;if(page&&currentUser)render();}
function merr(t){var e=$('#merr');if(e)e.textContent=t||'';}
function val(id){var e=$('#'+id);return e?e.value.trim():'';}
function numv(id){var v=parseFloat(val(id));return isNaN(v)?0:v;}

/* ====================== الصفحات ====================== */
var ROUTES=[
 {k:'dashboard',t:'لوحة التحكم',i:'dash'},{k:'employees',t:'الموظفون',i:'users'},{k:'attendance',t:'الحضور والانصراف',i:'clock'},
 {k:'advances',t:'السلف',i:'wallet'},{k:'bonuses',t:'الحوافز والجزاءات',i:'gift'},{k:'payments',t:'المدفوعات',i:'cash'},
 {k:'settlement',t:'تصفية الموظفين',i:'exit'},{k:'payroll',t:'كشف الرواتب',i:'report'},{k:'settings',t:'الإعدادات',i:'gear'},{k:'location',t:'البصمة والموقع',i:'pin'},{k:'audit',t:'سجل التدقيق',i:'report'},{k:'attreport',t:'سجل الحضور الشهري',i:'cal',hide:true},{k:'leaves',t:'أرصدة الإجازات والغياب',i:'cal',kid:true}];
var TABS=['dashboard','employees','attendance','payroll'];
var NAVG={
 employees:function(){return [{s:'list',r:'employees',t:'قائمة الموظفين'},{s:'new',r:'employees',t:'إضافة موظف'},{s:'att',r:'attreport',t:'سجل الحضور الشهري'},{s:'lv',r:'leaves',t:'أرصدة الإجازات والغياب'}];},
 advances:function(){return [{s:'list',r:'advances',t:'قائمة السلف'},{s:'new',r:'advances',t:'إضافة سلفة جديدة'}];},
 bonuses:function(){return [{s:'list',r:'bonuses',t:'كل الحوافز والجزاءات'}].concat(DB.settings.btypes.map(function(b){return {s:'type',r:'bonuses',t:b.n,ty:b.n};}));}};
function navKidOn(k){if(k.s==='new')return false;if(k.s==='att')return ui.route==='attreport';if(k.s==='type')return ui.route==='bonuses'&&ui.bonType===k.ty;if(k.r==='bonuses')return ui.route==='bonuses'&&!ui.bonType;return ui.route===k.r;}
function navHTML(){ui.navOpen=ui.navOpen||{};var inG=function(g){return ui.route===g||(g==='employees'&&(ui.route==='attreport'||ui.route==='leaves'));};
 if(ui.navRoute!==ui.route){ui.navRoute=ui.route;Object.keys(NAVG).forEach(function(g){if(inG(g)){ui.navOpen={};ui.navOpen[g]=true;}});}
 return ROUTES.filter(function(r){return !r.hide&&!r.kid&&(!window.currentUser||canRoute(r.k));}).map(function(r,i){var sep=(i===5||i===8?'<div class="sep"></div>':'');
  if(!NAVG[r.k])return sep+'<a data-act="go" data-r="'+r.k+'" href="#'+r.k+'" title="'+r.t+'">'+ic(r.i)+'<span>'+r.t+'</span></a>';
  var open=!!ui.navOpen[r.k];
  return sep+'<div class="ngrp'+(open?' open':'')+'"><a class="ngh'+(inG(r.k)?' on':'')+'" data-act="ngroup" data-k="'+r.k+'" title="'+r.t+'" role="button" aria-expanded="'+open+'">'+ic(r.i)+'<span>'+r.t+'</span><i class="chev">'+ic('right')+'</i></a><div class="nsub">'+NAVG[r.k]().map(function(k){return '<a class="nk'+(navKidOn(k)?' on':'')+'" data-act="nsub" data-nr="'+k.r+'" data-s="'+k.s+'" data-t="'+esc(k.ty||'')+'">'+esc(k.t)+'</a>';}).join('')+'</div></div>';}).join('');}
function drawShell(){
 $('#side').innerHTML='<div class="brand"><button class="logo'+(DB.settings.logo?' has':'')+'" data-act="home" type="button" aria-label="الانتقال إلى لوحة التحكم" title="لوحة التحكم">'+(DB.settings.logo?'<img src="'+DB.settings.logo+'" alt="">':'ش')+'</button><div><b id="cname"></b><small>شؤون الموظفين</small></div></div><nav class="nav">'+
  navHTML()+'</nav><div class="side-foot">البيانات متزامنة مع Firebase</div><div class="side-controls"><button class="side-control" data-act="biomodal" aria-label="الدخول بالبصمة" title="الدخول بالبصمة"><span aria-hidden="true">👆</span></button><button class="side-control" data-act="chpass" aria-label="تغيير كلمة المرور" title="تغيير كلمة المرور"><span aria-hidden="true">🔑</span></button><button class="side-control" data-act="logout" aria-label="تسجيل الخروج" title="تسجيل الخروج"><span aria-hidden="true">⏻</span></button></div>';
 $('#tabbar').innerHTML=TABS.map(function(k){var r=ROUTES.filter(function(x){return x.k===k;})[0];return '<a data-act="go" data-r="'+k+'" href="#'+k+'">'+ic(r.i)+'<span>'+r.t.replace('الحضور والانصراف','الحضور')+'</span></a>';}).join('')+'<a data-act="more" id="morebtn">'+ic('more')+'<span>المزيد</span></a>';}
function drawTop(){
 var r=ROUTES.filter(function(x){return x.k===ui.route;})[0]||ROUTES[0];$('#ttl').textContent=r.t;
 $('#mnav').innerHTML='<button data-act="mprev" aria-label="الشهر السابق">'+ic('right')+'</button><span>'+mlabel(ui.ym)+'</span><button data-act="mnext" aria-label="الشهر التالي">'+ic('left')+'</button>';
 $('#mnav').style.display=(ui.route==='settings'||ui.route==='location'||ui.route==='settlement')?'none':'';
 $('#cname').textContent=DB.settings.company;
 $('#themebtn').innerHTML=ic(document.documentElement.getAttribute('data-theme')==='dark'?'sun':'moon');
 var nv=$('.nav');if(nv)nv.innerHTML=navHTML();$$('[data-r]').forEach(function(a){a.classList.toggle('on',a.getAttribute('data-r')===((ui.route==='attreport'||ui.route==='leaves')?'employees':ui.route));});
 $('#banner').innerHTML=DB.demo?'<div class="banner">'+ic('alert')+'<span>أنت تعرض بيانات تجريبية. امسحها من الإعدادات قبل إدخال بيانات شركتك.</span><button class="btn sm" data-act="clearall">مسح البيانات التجريبية</button></div>':'';
 document.title=r.t+' · نظام شؤون الموظفين';}
var lastViewHTML='',autoTimer=null;
function viewFn(){return {dashboard:vDash,employees:vEmps,attendance:vAtt,advances:vAdv,bonuses:vBon,settlement:vSett,payments:vPay,payroll:vPayroll,settings:vSet,location:vLoc,leaves:vLeaves,audit:vAudit,attreport:vAttReport}[ui.route]||vDash;}
/* تحديث تلقائي كل 5 ثوانٍ للوحة التحكم وشاشة الموظفين: لا يعيد الرسم إلا إذا تغيّرت البيانات، ويتوقف أثناء الكتابة أو فتح نافذة */
function startAutoRefresh(){if(autoTimer)return;autoTimer=setInterval(function(){try{if(document.hidden||!DB||!$('#view'))return;if(ui.route!=='dashboard'&&ui.route!=='employees')return;if(modalState||$('#mbg')||$('.sheetbg')||$('#warnbg'))return;var ae=document.activeElement;if(ae&&/^(INPUT|SELECT|TEXTAREA)$/.test(ae.tagName)&&ae.closest('#view'))return;var html=viewFn()();if(ui.route+'\u0001'+html===lastViewHTML)return;var y=window.scrollY,mv=$('#view');render();window.scrollTo(0,y);}catch(e){}},5000);}
function render(){if(!canRoute(ui.route)){ui.route=firstRoute();} drawTop();var v=$('#view'),html=viewFn()();lastViewHTML=ui.route+'\u0001'+html;v.innerHTML=html;applyPermissions();var after=AFTER[ui.route];if(after)after();}
var AFTER={};

/* ====================== الأحداث ====================== */
function arm(btn,txt){if(btn.classList.contains('arm'))return true;btn.classList.add('arm');btn.dataset.o=btn.textContent;btn.textContent=txt||'اضغط للتأكيد';setTimeout(function(){if(btn.isConnected){btn.classList.remove('arm');btn.textContent=btn.dataset.o||btn.textContent;}},3500);return false;}
function download(name,text,type){try{var b=new Blob([text],{type:type}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(u);},1500);toast(/json/.test(type)?'جارٍ التنزيل. لو لم يبدأ، استخدم "نسخ البيانات" من الإعدادات.':'جارٍ التنزيل…');}catch(e){toast('التنزيل غير متاح هنا. استخدم "نسخ البيانات".');}}
function copyText(t){var ok=function(){toast('تم النسخ. الصقه في ملف نصي واحتفظ به.');},fb=function(){var b=$('#impbox');if(b){b.value=t;b.select();toast('انسخ النص المحدد يدوياً (Ctrl+C).');}};try{navigator.clipboard.writeText(t).then(ok,fb);}catch(e){fb();}}
function openMore(){var bg=document.createElement('div');bg.className='sheetbg';bg.id='sheet';bg.innerHTML='<div class="modal more-sheet" style="padding:10px"><div style="display:flex;flex-direction:column">'+ROUTES.filter(function(r){return TABS.indexOf(r.k)<0&&!r.hide&&canRoute(r.k);}).map(function(r){return '<a data-act="go" data-r="'+r.k+'" href="#'+r.k+'">'+ic(r.i)+'<span>'+r.t+'</span></a>';}).join('')+'<div class="mobile-nav-controls"><button class="btn sm" data-act="biomodal">الدخول بالبصمة</button><button class="btn sm" data-act="chpass">تغيير كلمة المرور</button><button class="btn sm" data-act="logout">تسجيل الخروج</button></div></div></div>';bg.addEventListener('mousedown',function(e){if(e.target===bg)closeSheet();});$('#layer').appendChild(bg);}
function closeSheet(){var s=$('#sheet');if(s)s.remove();}
function route(){var h=location.hash.replace('#','');ui.route=ROUTES.some(function(r){return r.k===h;})?h:'dashboard';closeModal();render();window.scrollTo(0,0);if(ui.afterNav){var f=ui.afterNav;ui.afterNav=null;f();}}
window.addEventListener('hashchange',route);


function setNavMode(mode){if(['open','collapsed','top'].indexOf(mode)<0)mode='open';var app=$('#app');app.classList.remove('nav-collapsed','nav-top');if(mode!=='open')app.classList.add('nav-'+mode);var b=$('[data-act=navcollapse]');if(b)b.title=mode==='open'?'اختصار القائمة':mode==='collapsed'?'تحويل إلى قائمة علوية':'فتح القائمة الجانبية';}

/* أيقونة التبويب: شعار الشركة إن وُجد */
var pwaKey='';
function lumOf(h){var m=/^#?([0-9a-f]{6})$/i.exec(h||'');if(!m)return 0;var n=parseInt(m[1],16),r=n>>16,g=n>>8&255,b=n&255;return (0.299*r+0.587*g+0.114*b)/255;}
function applyBars(b){try{var th=DB&&DB.settings?DB.settings.theme:null,br=b||window.__brand||{},top=(DB&&DB.settings?(th&&th.top||''):(br.tc||'')),bot=(DB&&DB.settings?(th&&th.bot||''):(br.bc||'')),st=document.documentElement.style;
 if(top){st.setProperty('--topbg',top);st.setProperty('--topfg',lumOf(top)>.6?'#111827':'#ffffff');}else{st.removeProperty('--topbg');st.removeProperty('--topfg');}
 if(bot){st.setProperty('--botbg',bot);st.setProperty('--botfg',lumOf(bot)>.5?'#4b5563':'#e5e7eb');st.setProperty('--botac',lumOf(bot)>.5?'#0f766e':'#ffffff');}else{st.removeProperty('--botbg');st.removeProperty('--botfg');st.removeProperty('--botac');}
 var mt=document.querySelector('meta[name="theme-color"]');if(mt)mt.setAttribute('content',top||'#0f766e');
 var name=(DB&&DB.settings?DB.settings.company:br.n)||'شئون الموظفين',logo=(DB&&DB.settings?DB.settings.logo:br.l)||'';pwaSync(name,logo,top||'#0f766e');}catch(e){}}
function pwaIcon(size,logo,color,name,cb){var c=document.createElement('canvas');c.width=c.height=size;var x=c.getContext('2d');x.fillStyle=logo?'#ffffff':color;x.fillRect(0,0,size,size);
 var done=function(){cb(c.toDataURL('image/png'));};
 if(!logo){x.fillStyle='#ffffff';x.font='bold '+Math.round(size*.55)+'px sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(String(name||'ش').trim().charAt(0)||'ش',size/2,size/2+size*.04);return done();}
 var im=new Image();im.onload=function(){var k=Math.min(size*.7/im.width,size*.7/im.height),w=im.width*k,h=im.height*k;x.drawImage(im,(size-w)/2,(size-h)/2,w,h);done();};im.onerror=function(){x.fillStyle=color;x.fillRect(0,0,size,size);done();};im.src=logo;}
function pwaSync(name,logo,top){var key=name+'|'+(logo?logo.length+logo.slice(-30):'')+'|'+top;if(key===pwaKey)return;pwaKey=key;
 document.title=name+' — شئون الموظفين';var at=document.querySelector('meta[name="apple-mobile-web-app-title"]');if(!at){at=document.createElement('meta');at.name='apple-mobile-web-app-title';document.head.appendChild(at);}at.content=name;
 pwaIcon(192,logo,top,name,function(i192){pwaIcon(512,logo,top,name,function(i512){
  window.__pwa={name:name,top:top,i192:i192,i512:i512};
  var ai=document.querySelector('link[rel="apple-touch-icon"]');if(ai)ai.href=i192;});});}
function applyFavicon(){applyBars();try{var l=document.getElementById('favicon');if(!l)return;var lg=DB&&DB.settings&&DB.settings.logo;if(lg&&l.getAttribute('data-lg')!==lg){l.removeAttribute('type');l.href=lg;l.setAttribute('data-lg',lg);}}catch(e){}}

function eLabel(e,fb){return e?esc(e.name)+(e.nick?' <span class="nick">('+esc(e.nick)+')</span>':''):esc(fb||'');}

/* ملفات التثبيت على الموبايل: تُرفع للمستودع فيظهر التطبيق المثبَّت باسم وشعار الشركة (الأندرويد يتطلب ملفات ثابتة وليس روابط مؤقتة) */
function dlFile(name,href){var a=document.createElement('a');a.href=href;a.download=name;document.body.appendChild(a);a.click();a.remove();}
function downloadPwaFiles(){var w=window.__pwa;if(!w)return toast('انتظر لحظة ثم أعد المحاولة');var man={name:w.name,short_name:w.name.length>12?w.name.slice(0,12):w.name,description:'نظام شئون الموظفين — '+w.name,start_url:'./',scope:'./',display:'standalone',dir:'rtl',lang:'ar',background_color:'#ffffff',theme_color:w.top,icons:[{src:'icons/icon-192.png',sizes:'192x192',type:'image/png',purpose:'any'},{src:'icons/icon-512.png',sizes:'512x512',type:'image/png',purpose:'any'}]};
 dlFile('manifest.json',URL.createObjectURL(new Blob([JSON.stringify(man,null,1)],{type:'application/json'})));setTimeout(function(){dlFile('icon-192.png',w.i192);},400);setTimeout(function(){dlFile('icon-512.png',w.i512);},800);}
