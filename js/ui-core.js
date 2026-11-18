'use strict';
var ui={route:'dashboard',ym:today().slice(0,7),attTab:'day',attDate:today(),empQ:'',empSys:'',empSt:'',sheetQ:'',sheetSys:'',sheetSt:''};
ui.empView='cards';ui.hideAtt=false;
/* ====================== النماذج والنوافذ ====================== */
function field(id,label,type,val,extra){extra=extra||'';
 if(type==='select')return '<div class="field"><label for="'+id+'">'+label+'</label><select id="'+id+'" '+extra.attrs+'>'+extra.opts+'</select></div>';
 if(type==='textarea')return '<div class="field"><label for="'+id+'">'+label+'</label><textarea id="'+id+'" rows="2">'+esc(val)+'</textarea></div>';
 var a=type==='number'?' step="any" inputmode="decimal" min="0"':'';
 return '<div class="field"><label for="'+id+'">'+label+'</label><input id="'+id+'" type="'+type+'" value="'+esc(val)+'"'+a+' '+(extra.attrs||'')+'></div>';}
function opts(list,sel,blank){return (blank!==undefined?'<option value="">'+blank+'</option>':'')+list.map(function(o){var v=o.v!==undefined?o.v:o,l=o.l!==undefined?o.l:o;return '<option value="'+esc(v)+'"'+(String(v)===String(sel)?' selected':'')+'>'+esc(l)+'</option>';}).join('');}
function empOpts(sel,blank,filter){return opts(DB.emps.filter(filter||function(){return true;}).map(function(e){return {v:e.id,l:e.id+' — '+e.name};}),sel,blank);}
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
 {k:'settlement',t:'تصفية الموظفين',i:'exit'},{k:'payroll',t:'كشف الرواتب',i:'report'},{k:'settings',t:'الإعدادات',i:'gear'},{k:'attreport',t:'سجل الحضور الشهري',i:'cal',hide:true}];
var TABS=['dashboard','employees','attendance','payroll'];
function drawShell(){
 $('#side').innerHTML='<div class="brand"><button class="logo'+(DB.settings.logo?' has':'')+'" data-act="home" type="button" aria-label="الانتقال إلى لوحة التحكم" title="لوحة التحكم">'+(DB.settings.logo?'<img src="'+DB.settings.logo+'" alt="">':'ش')+'</button><div><b id="cname"></b><small>شؤون الموظفين</small></div></div><nav class="nav">'+
  ROUTES.filter(function(r){return !r.hide;}).map(function(r,i){return (i===5||i===8?'<div class="sep"></div>':'')+'<a data-act="go" data-r="'+r.k+'" href="#'+r.k+'" title="'+r.t+'">'+ic(r.i)+'<span>'+r.t+'</span></a>';}).join('')+'</nav><div class="side-foot">البيانات متزامنة مع Firebase</div><div class="side-controls"><button class="side-control" data-act="navcollapse" aria-label="تغيير شكل القائمة" title="تغيير شكل القائمة: جانبية، مختصرة، علوية"><span aria-hidden="true">☰</span></button><button class="side-control" data-act="biomodal" aria-label="الدخول بالبصمة" title="الدخول بالبصمة"><span aria-hidden="true">👆</span></button><button class="side-control" data-act="chpass" aria-label="تغيير كلمة المرور" title="تغيير كلمة المرور"><span aria-hidden="true">🔑</span></button><button class="side-control" data-act="logout" aria-label="تسجيل الخروج" title="تسجيل الخروج"><span aria-hidden="true">⏻</span></button></div>';
 $('#tabbar').innerHTML=TABS.map(function(k){var r=ROUTES.filter(function(x){return x.k===k;})[0];return '<a data-act="go" data-r="'+k+'" href="#'+k+'">'+ic(r.i)+'<span>'+r.t.replace('الحضور والانصراف','الحضور')+'</span></a>';}).join('')+'<a data-act="more" id="morebtn">'+ic('more')+'<span>المزيد</span></a>';}
function drawTop(){
 var r=ROUTES.filter(function(x){return x.k===ui.route;})[0]||ROUTES[0];$('#ttl').textContent=r.t;
 $('#mnav').innerHTML='<button data-act="mprev" aria-label="الشهر السابق">'+ic('right')+'</button><span>'+mlabel(ui.ym)+'</span><button data-act="mnext" aria-label="الشهر التالي">'+ic('left')+'</button>';
 $('#mnav').style.display=(ui.route==='settings'||ui.route==='settlement')?'none':'';
 $('#cname').textContent=DB.settings.company;
 $('#themebtn').innerHTML=ic(document.documentElement.getAttribute('data-theme')==='dark'?'sun':'moon');
 $$('[data-r]').forEach(function(a){a.classList.toggle('on',a.getAttribute('data-r')===(ui.route==='attreport'?'employees':ui.route));});
 $('#banner').innerHTML=DB.demo?'<div class="banner">'+ic('alert')+'<span>أنت تعرض بيانات تجريبية. امسحها من الإعدادات قبل إدخال بيانات شركتك.</span><button class="btn sm" data-act="clearall">مسح البيانات التجريبية</button></div>':'';
 document.title=r.t+' · نظام شؤون الموظفين';}
function render(){if(!canRoute(ui.route)){ui.route=firstRoute();} drawTop();var v=$('#view'),fn={dashboard:vDash,employees:vEmps,attendance:vAtt,advances:vAdv,bonuses:vBon,settlement:vSett,payments:vPay,payroll:vPayroll,settings:vSet,attreport:vAttReport}[ui.route]||vDash;v.innerHTML=fn();applyPermissions();var after=AFTER[ui.route];if(after)after();}
var AFTER={};

/* ====================== الأحداث ====================== */
function arm(btn,txt){if(btn.classList.contains('arm'))return true;btn.classList.add('arm');btn.dataset.o=btn.textContent;btn.textContent=txt||'اضغط للتأكيد';setTimeout(function(){if(btn.isConnected){btn.classList.remove('arm');btn.textContent=btn.dataset.o||btn.textContent;}},3500);return false;}
function download(name,text,type){try{var b=new Blob([text],{type:type}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(u);},1500);toast(/json/.test(type)?'جارٍ التنزيل. لو لم يبدأ، استخدم "نسخ البيانات" من الإعدادات.':'جارٍ التنزيل…');}catch(e){toast('التنزيل غير متاح هنا. استخدم "نسخ البيانات".');}}
function copyText(t){var ok=function(){toast('تم النسخ. الصقه في ملف نصي واحتفظ به.');},fb=function(){var b=$('#impbox');if(b){b.value=t;b.select();toast('انسخ النص المحدد يدوياً (Ctrl+C).');}};try{navigator.clipboard.writeText(t).then(ok,fb);}catch(e){fb();}}
function openMore(){var bg=document.createElement('div');bg.className='sheetbg';bg.id='sheet';bg.innerHTML='<div class="modal more-sheet" style="padding:10px"><div style="display:flex;flex-direction:column">'+ROUTES.filter(function(r){return TABS.indexOf(r.k)<0&&!r.hide&&canRoute(r.k);}).map(function(r){return '<a data-act="go" data-r="'+r.k+'" href="#'+r.k+'">'+ic(r.i)+'<span>'+r.t+'</span></a>';}).join('')+'<div class="mobile-nav-controls"><button class="btn sm" data-act="navcollapse">تغيير شكل القائمة</button><button class="btn sm" data-act="biomodal">الدخول بالبصمة</button><button class="btn sm" data-act="chpass">تغيير كلمة المرور</button><button class="btn sm" data-act="logout">تسجيل الخروج</button></div></div></div>';bg.addEventListener('mousedown',function(e){if(e.target===bg)closeSheet();});$('#layer').appendChild(bg);}
function closeSheet(){var s=$('#sheet');if(s)s.remove();}
function route(){var h=location.hash.replace('#','');ui.route=ROUTES.some(function(r){return r.k===h;})?h:'dashboard';closeModal();render();window.scrollTo(0,0);}
window.addEventListener('hashchange',route);


function setNavMode(mode){if(['open','collapsed','top'].indexOf(mode)<0)mode='open';var app=$('#app');app.classList.remove('nav-collapsed','nav-top');if(mode!=='open')app.classList.add('nav-'+mode);var b=$('[data-act=navcollapse]');if(b)b.title=mode==='open'?'اختصار القائمة':mode==='collapsed'?'تحويل إلى قائمة علوية':'فتح القائمة الجانبية';}
