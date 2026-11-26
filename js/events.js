'use strict';
document.addEventListener('click',function(ev){var el=ev.target.closest('[data-act]');if(!el)return;var a=el.getAttribute('data-act'),id=el.getAttribute('data-id');
 switch(a){
 case 'home':if(canRoute('dashboard')){location.hash='dashboard';closeSheet();if(ui.route==='dashboard'){closeModal();render();}}else toast('ليست لديك صلاحية لعرض لوحة التحكم');break;
 case 'go':ev.preventDefault();ui.bonType='';location.hash=el.getAttribute('data-r');closeSheet();break;
 case 'more':openMore();break;
 case 'theme':var nx=toggleTheme();HRStore.savePrefs({theme:nx});drawTop();break;
 case 'mprev':ui.ym=addMonths(ui.ym,-1);saveUI();render();break;
 case 'mnext':ui.ym=addMonths(ui.ym,1);saveUI();render();break;
 case 'mclose':closeModal();break;
 case 'mact':var o=modalState;if(o){merr('');o.actions[+el.getAttribute('data-i')].fn(el);}break;
 case 'empnew':empForm(null);break;
 case 'matrix':location.hash='attreport';break;
 case 'eview':ui.empView=el.getAttribute('data-v');saveUI();render();break;
 case 'empmenu':var me=empById(id);openModal({title:me.name,noFocus:true,body:'<div class="menu2"><button class="btn big" data-act="menuprint" data-id="'+esc(id)+'">'+ic('print')+'<span><b>طباعة قسيمة الراتب</b><small>ريسيت 80 مم · '+mlabel(ui.ym)+'</small></span></button><button class="btn big" data-act="menupdf" data-id="'+esc(id)+'">'+ic('down')+'<span><b>حفظ القسيمة PDF</b><small>ملف جاهز للإرسال</small></span></button><button class="btn big" data-act="menuwa" data-id="'+esc(id)+'">'+ic('up')+'<span><b>إرسال عبر واتساب</b><small>PDF + ملخص على رقم الموظف</small></span></button>'+(currentUser&&currentUser.admin?'<button class="btn big" data-act="menuedit" data-id="'+esc(id)+'">'+ic('edit')+'<span><b>تعديل بيانات الموظف</b><small>الاسم والأجر والوردية والتعديلات</small></span></button>':'')+'</div>',actions:[{label:'إغلاق',fn:closeModal}]});break;
 case 'menupdf':closeModal();slipPdf(id,ui.ym);break;
 case 'menuwa':closeModal();slipWhatsApp(id,ui.ym);break;
 case 'menuprint':closeModal();printReceipt(id,ui.ym);break;
 case 'menuedit':closeModal();empForm(empById(id));break;
 case 'printpay':doPrint('page','@page{size:A4 landscape;margin:8mm}');break;
 case 'r5save':DB.settings.r5=$('#c_r5').checked;save();render();toast(DB.settings.r5?'تم تفعيل التقريب إلى 5 جنيه':'تم إيقاف التقريب إلى 5 جنيه');break;
 case 'colpanel':var cp=$('#colpanel');if(cp)cp.hidden=!cp.hidden;break;
 case 'colall':ui.hcols={};saveUI();$$('.colchk').forEach(function(x){x.checked=true;});$('#stable').innerHTML=sheetTable();break;
 case 'logodel':DB.settings.logo='';save();drawShell();render();toast('تمت إزالة الشعار');break;
 case 'attconfirm':var cr=recOf(el.getAttribute('data-c'),ui.attDate);if(cr){cr.reviewed=!cr.reviewed;save();render();toast(cr.reviewed?'تم اعتماد الوقت بعد المراجعة':'تم إلغاء اعتماد الوقت');}break;
 case 'clkin':case 'clkout':var cid=el.getAttribute('data-c'),ce=empById(cid),row=el.closest('.arow'),shE=$('[data-att=sh]',row),shv=shE?shE.value:'',now=nowHM(),rc=recOf(cid,ui.attDate);
  if(a==='clkin'){if(!rc){rc={d:ui.attDate,c:cid,s:'حاضر',i:now,o:'',b:0,sh:shv};DB.att.push(rc);}else{var sx=statusOf(rc.s);if(!sx||sx.r===0)rc.s='حاضر';rc.i=now;rc.sh=shv;rc.reviewed=false;}toast('تم تسجيل حضور '+ce.name+' الساعة '+now);}
  else{if(!rc||!rc.i){toast('سجّل الحضور أولاً قبل الانصراف.');break;}rc.o=now;rc.reviewed=false;toast('تم تسجيل انصراف '+ce.name+' الساعة '+now);}
  save();render();break;
 case 'empedit':empForm(empById(id));break;
 case 'raiseadd':var d=val('r_d');if(!d)return merr('اختر تاريخ سريان التعديل.');var e=empById(id),s=round5(numv('r_sal')),dl=round5(numv('r_dly')),h=round5(numv('r_hrly'));if(e.sys==='monthly'&&s<=0)return merr('أدخل الراتب الجديد.');if(e.sys==='daily'&&dl<=0)return merr('أدخل اليومية الجديدة.');if(e.sys==='hourly'&&h<=0)return merr('أدخل سعر الساعة الجديد.');
  e.raises=(e.raises||[]).filter(function(r){return r.d!==d;});e.raises.push({d:d,sal:s,dly:dl,hrly:h});save();render();empForm(e);toast('تمت إضافة التعديل');break;
 case 'raisedel':var ee=empById($('[data-act=raiseadd]').getAttribute('data-id'));ee.raises=ee.raises.filter(function(r){return r.d!==el.getAttribute('data-d');});save();render();empForm(ee);break;
 case 'slip':slip(id,ui.ym);break;
 case 'atab':ui.attTab=el.getAttribute('data-t');render();break;
 case 'allout':var outCount=0,nowOut=nowHM();dayEmps(ui.attDate).forEach(function(e){var r=recOf(e.id,ui.attDate);if(r&&r.i&&!r.o&&statusOf(r.s)&&statusOf(r.s).r>0){r.o=nowOut;r.reviewed=false;outCount++;}});save();render();toast('تم تسجيل الانصراف الساعة '+nowOut+' لعدد '+outCount+' موظف؛ لم تُغيّر الحالات الأخرى');break;
 case 'allpresent':dayEmps(ui.attDate).forEach(function(e){if(!recOf(e.id,ui.attDate)){var shk=e.shift==='both'?'morning':shiftOf(e),shx=DB.settings.shifts[shk];DB.att.push({d:ui.attDate,c:e.id,s:'حاضر',i:hasClock(e)?shx.s:'',o:'',b:0,sh:e.shift==='both'?'morning':''});}});save();render();toast('تم اعتماد الحضور لمن لم تُسجل حالتهم');break;
 case 'attdel':DB.att=DB.att.filter(function(r){return !(r.d===el.getAttribute('data-d')&&r.c===el.getAttribute('data-c'));});save();render();break;
 case 'advnew':movForm('adv',null);break;case 'bonnew':movForm('bon',null,ui.bonType||'');break;
 case 'advedit':movForm('adv',DB.adv.filter(function(x){return x.id==id;})[0]);break;case 'bonedit':movForm('bon',DB.bon.filter(function(x){return x.id==id;})[0]);break;
 case 'advdel':if(arm(el,'تأكيد حذف السلفة وكل أقساطها؟')){DB.adv=DB.adv.filter(function(x){return x.id!=id;});save();render();toast('تم الحذف');}break;
 case 'bondel':if(arm(el)){DB.bon=DB.bon.filter(function(x){return x.id!=id;});save();render();toast('تم الحذف');}break;
 case 'settsave':var c=val('s_c'),l=val('s_l'),sd=val('s_d'),er=$('#s_err');if(!c){er.textContent='اختر الموظف.';return;}if(!l||!sd){er.textContent='أدخل التاريخين.';return;}var emp=empById(c);if(l<emp.hire){er.textContent='آخر يوم عمل قبل تاريخ التعيين.';return;}
  var sx=calc(emp,l.slice(0,7),{end:l});if((sx.paid>sx.net+.00000001||(sx.clockCap&&sx.paid>sx.earnedNet+.00000001))&&!arm(el,'تنبيه: أخذ أكثر من مستحقاته. اضغط للتأكيد'))return;
  DB.sett.push({id:nid(),d:sd,c:c,l:l,n:val('s_n')});save();render();toast('تم تسجيل التصفية وتحديث حالة الموظف');break;
 case 'settdel':if(arm(el,'تأكيد الإلغاء')){DB.sett=DB.sett.filter(function(x){return x.id!=id;});save();render();toast('تم إلغاء التصفية');}break;
 case 'settslip':var st=DB.sett.filter(function(x){return x.id==id;})[0];slip(st.c,st.l.slice(0,7));break;
 case 'paysave':var pe=$('#p_err'),pc=val('p_c'),pd=val('p_d'),pa=round5(numv('p_a'));pe.textContent='';if(!pc){pe.textContent='اختر الموظف.';return;}if(!pd){pe.textContent='أدخل تاريخ الصرف.';return;}if(pa<=0){pe.textContent='أدخل المبلغ المصروف.';return;}
  var pe2=empById(pc),cc=calc(pe2,ui.ym);if(pa>cc.due+.00000001){pe.textContent='الرقم أكبر من المفروض صرفه لتصفية الموظف. المتبقي له '+money(Math.max(0,cc.due))+' فقط.';return;}
  if(cc.clockCap&&pa>cc.payable+.00000001){pe.textContent='لا يمكن صرف أكثر من قيمة الأيام التي عملها فعلاً ('+hrs(cc.earnedDays)+' يوم = '+money(cc.earnedBase)+'). المسموح صرفه الآن '+money(cc.payable)+' فقط.';return;}
  if(!DB.settings.partPay&&Math.abs(pa-cc.payable)>.00000001){pe.textContent='الإعدادات تشترط أن يساوي المبلغ المتبقي بالكامل: '+money(cc.payable)+'.';return;}
  DB.pay.push({id:nid(),d:pd,c:pc,m:ui.ym,a:pa,n:val('p_n'),b:null});save();render();toast('تم تسجيل الصرف');break;
 case 'paydel':if(arm(el)){DB.pay=DB.pay.filter(function(x){return x.id!=id;});save();render();toast('تم الحذف');}break;
 case 'bulk':var dr=dueRows(ui.ym),bd=val('bulk_d');if(!bd){toast('أدخل تاريخ الصرف أولاً.');return;}if(!dr.length)return;if(arm(el,'تأكيد دفع '+money(dr.reduce(function(a,r){return a+r.c.payable;},0))+' لـ '+dr.length+' موظف')){var bid=nid();dr.forEach(function(r){DB.pay.push({id:nid(),d:bd,c:r.e.id,m:ui.ym,a:r.c.payable,n:'دفع كلي',b:bid});});save();render();toast('تم الدفع الكلي لـ '+dr.length+' موظف');}break;
 case 'csv':var rows=sheetRows(),L=[['الكود','الاسم','النظام','أيام الحضور','أيام الغياب','ساعات العمل','الأجر الأساسي','قيمة الأيام الفعلية','الإضافي','الحوافز','إجمالي المستحقات','نقص وتأخير','الجزاءات','السلف','إجمالي الاستقطاعات','صافي الراتب','المصروف','المتبقي','حالة الصرف']];
  rows.forEach(function(r){var c=r.c;L.push([r.e.id,r.e.name,SYS[r.e.sys],c.pres,c.absd,c.hw,(r.e.sys==='monthly'?c.R.sal:r.e.sys==='daily'?c.R.dly:c.R.hrly),c.daysVal,c.otv,c.bonus,c.gross,c.lateded,c.pen,c.adv,c.totded,c.net,c.paid,c.due,c.pstat]);});
  download('payroll-'+ui.ym+'.csv','﻿'+L.map(function(x){return x.map(function(v){return '"'+String(v).replace(/"/g,'""')+'"';}).join(',');}).join('\n'),'text/csv');break;
 case 'ngroup':{var g=el.getAttribute('data-k');if(getComputedStyle(document.querySelector('.brand b')).display==='none'){ui.bonType='';location.hash=g;break;}ui.navOpen=ui.navOpen||{};ui.navOpen[g]=!ui.navOpen[g];var gp=el.closest('.ngrp');gp.classList.toggle('open',ui.navOpen[g]);el.setAttribute('aria-expanded',ui.navOpen[g]);break;}
 case 'nsub':{var nr=el.getAttribute('data-nr'),ns=el.getAttribute('data-s'),nt=el.getAttribute('data-t');ui.bonType=ns==='type'?nt:'';
  var fn=ns==='new'?(nr==='employees'?function(){empForm(null);}:function(){movForm('adv',null);}):null;closeSheet();
  if(location.hash==='#'+nr){render();if(fn)fn();}else{ui.afterNav=fn;location.hash=nr;}break;}
 case 'auditload':auditLoad();break;
 case 'setsave':var precisionInput=val('c_precision'),decimals=Number(precisionInput);if(precisionInput===''||!Number.isInteger(decimals)||decimals<0||decimals>6){$('#c_err').textContent='عدد الخانات العشرية يجب أن يكون رقماً صحيحاً من 0 إلى 6.';break;}var graceText=val('c_grace'),grace=Number(graceText);if(graceText===''||!Number.isInteger(grace)||grace<0||grace>1440){$('#c_err').textContent='فترة السماح يجب أن تكون عدداً صحيحاً من 0 إلى 1440 دقيقة.';break;}var S=DB.settings;S.graceMinutes=grace;S.advMax=Math.max(0,numv('c_advmax')||0);S.advMaxType=val('c_advtype')==='pct'?'pct':'fix';S.precision=decimals;S.company=val('c_name')||S.company;S.basis=val('c_basis');S.defHours=numv('c_hours')||8;S.workDays=numv('c_wd')||26;S.otOn=val('c_ot')==='1';S.otFactor=numv('c_otf');S.lateFactor=numv('c_lf');S.absFactor=numv('c_af');S.partPay=val('c_part')==='1';S.shifts={morning:{s:val('c_ms')||'09:00',e:val('c_me')||'17:00'},evening:{s:val('c_es')||'14:00',e:val('c_ee')||'22:00'}};save();render();toast('تم حفظ الإعدادات');break;
 case 'deptadd':var dep=val('newdept').trim();if(!dep)return toast('أدخل اسم القسم');if(DB.settings.departments.indexOf(dep)>=0)return toast('القسم موجود بالفعل');DB.settings.departments.push(dep);DB.settings.deptJobs=DB.settings.deptJobs||{};DB.settings.deptJobs[dep]=DB.settings.deptJobs[dep]||[];save();render();break;
 case 'deptdel':var di=+el.getAttribute('data-i'),dep=DB.settings.departments[di];if(DB.emps.some(function(e){return e.dept===dep;}))return toast('لا يمكن حذف قسم مرتبط بموظف');if(arm(el)){DB.settings.departments.splice(di,1);if(DB.settings.deptJobs)delete DB.settings.deptJobs[dep];save();render();}break;
 case 'jobadd':var jd=+el.getAttribute('data-i'),jin=$(jd>=0?'#nj_'+jd:'#nj_u'),j=jin?jin.value.trim():'';if(!j)return toast('أدخل اسم الوظيفة');var S0=DB.settings;S0.deptJobs=S0.deptJobs||{};if(jd>=0){var dn=S0.departments[jd],arr=(S0.deptJobs[dn]=S0.deptJobs[dn]||[]);if(arr.indexOf(j)>=0)return toast('الوظيفة موجودة بالفعل في هذا القسم');arr.push(j);}else if(S0.jobs.indexOf(j)>=0)return toast('الوظيفة موجودة بالفعل');if(S0.jobs.indexOf(j)<0)S0.jobs.push(j);save();render();break;
 case 'jobdel':var xd=+el.getAttribute('data-d'),xi=+el.getAttribute('data-i'),S1=DB.settings;S1.deptJobs=S1.deptJobs||{};var xdn=xd>=0?S1.departments[xd]:'',xj=xd>=0?(S1.deptJobs[xdn]||[])[xi]:ungroupedJobs()[xi];if(!xj)break;if(DB.emps.some(function(e){return e.job===xj&&(xd<0||e.dept===xdn);}))return toast('لا يمكن حذف وظيفة مرتبطة بموظف');if(xd>=0)S1.deptJobs[xdn].splice(xi,1);var still=Object.keys(S1.deptJobs).some(function(k){return S1.deptJobs[k].indexOf(xj)>=0;})||DB.emps.some(function(e){return e.job===xj;});if(!still){var ji=S1.jobs.indexOf(xj);if(ji>=0)S1.jobs.splice(ji,1);}save();render();break;
 case 'useradd':addUser();break;
 case 'useredit':editUser(+el.getAttribute('data-i'));break;
 case 'filedel':fileDraft.splice(+el.getAttribute('data-i'),1);refreshFiles();break;
 case 'userdel':var ux=USERS[+el.getAttribute('data-i')];if(ux&&!ux.admin&&arm(el,'تأكيد حذف المستخدم؟')){HRStore.deleteUserProfile(ux.uid).then(function(){toast('تم حذف المستخدم وإلغاء وصوله للبيانات');},function(e){toast(errMsg(e));});}break;
 case 'chpass':changePassModal();break;
 case 'biomodal':bioModal(currentUser.username);break;
 case 'devreset':var dv=USERS[+el.getAttribute('data-i')];if(dv&&arm(el,'تأكيد إعادة الربط؟'))HRStore.resetDevice(dv.uid).then(function(){toast('تمت إعادة الربط. سيربط الموظف هاتفه الجديد عند أول دخول.');},function(e){toast(errMsg(e));});break;
 case 'empaccall':autoAccounts(DB.emps);break;
 case 'empacc':autoAccounts([empById(el.getAttribute('data-id'))]);break;
 case 'geosave':geoSave();break;
 case 'geohere':geoHere();break;
 case 'navcollapse':var appMode=$('#app');setNavMode(appMode.classList.contains('nav-collapsed')?'top':appMode.classList.contains('nav-top')?'open':'collapsed');closeSheet();break;
 case 'navtop':setNavMode($('#app').classList.contains('nav-top')?'open':'top');closeSheet();break;
 case 'logout':HRStore.logout().then(function(){location.reload();},function(){location.reload();});break;
 case 'stadd':DB.settings.statuses.push({n:'حالة جديدة '+(DB.settings.statuses.length+1),p:0,a:0,r:0});save();render();break;
 case 'stdel':var si=+el.getAttribute('data-i'),sn=DB.settings.statuses[si].n;if(DB.att.some(function(r){return r.s===sn;}))return toast('لا يمكن حذف حالة مستخدمة في سجلات الحضور.');if(arm(el)){DB.settings.statuses.splice(si,1);save();render();}break;
 case 'btadd':DB.settings.btypes.push({n:'نوع جديد '+(DB.settings.btypes.length+1),k:'plus'});save();render();break;
 case 'btdel':var bi=+el.getAttribute('data-i'),bn=DB.settings.btypes[bi].n;if(DB.bon.some(function(r){return r.t===bn;}))return toast('لا يمكن حذف نوع مستخدم في حركات مسجلة.');if(arm(el)){DB.settings.btypes.splice(bi,1);save();render();}break;
 case 'exp':download('hr-backup-'+today()+'.json',exportData(),'application/json');break;
 case 'expcopy':copyText(exportData());break;
 case 'imptext':importJSON($('#impbox').value);break;
 case 'demo':if(arm(el,'سيستبدل كل بياناتك الحالية. اضغط للتأكيد')){DB=defaults();seedDemo();save();render();toast('تم تحميل البيانات التجريبية');}break;
 case 'clearall':if(arm(el,'تأكيد المسح')){var s0=DB.settings.company.indexOf('بيانات تجريبية')>=0;DB=defaults();if(s0)DB.settings.company='اسم الشركة';save();location.hash='settings';render();toast('تم مسح كل البيانات');}break;
 }});

/* ---- تغييرات الحقول: إعدادات، حضور، ملفات (مستمع واحد) ---- */
function onAttChange(t){var row=t.closest('.arow');if(!row)return;
 var at=t.getAttribute('data-att'),sel=$('[data-att=s]',row),ti=$('[data-att=i]',row),to=$('[data-att=o]',row),shs=$('[data-att=sh]',row),e=empById(row.getAttribute('data-c'));
 if(at!=='s'&&at!=='sh'&&!sel.value)sel.value='حاضر';var stt=statusOf(sel.value);
 if(ti&&to&&stt&&stt.r>0&&(at==='s'||at==='sh')&&(at==='sh'||(!ti.value&&!to.value))){var key=e.shift==='both'?(shs?shs.value:'morning'):shiftOf(e),sh=DB.settings.shifts[key];ti.value=sh.s;to.value=sh.e;}
 saveAttRow(row);render();}
function onFileChange(input){var k=input.getAttribute('data-filekind');if(!k||!input.files)return;
 var files=Array.prototype.slice.call(input.files),size=files.reduce(function(a,f){return a+f.size;},0),existing=fileDraft.filter(function(f){return k!=='photo'||f.kind!=='photo';}).reduce(function(a,f){return a+(f.size||0);},0);
 if(files.some(function(f){return f.size>600*1024;})||existing+size>2*1024*1024){merr('حجم الملف أكبر من 600 كيلوبايت أو إجمالي مرفقات الموظف أكبر من 2 ميجابايت.');input.value='';return;}
 if(k==='photo'&&files.some(function(f){return !f.type.startsWith('image/');})){merr('الصورة الشخصية يجب أن تكون صورة.');return;}
 if(k==='photo')fileDraft=fileDraft.filter(function(f){return f.kind!=='photo';});merr('');
 files.forEach(function(f){filePending++;var reader=new FileReader();reader.onload=function(){fileDraft.push({kind:k,name:f.name,size:f.size,data:String(reader.result)});filePending--;refreshFiles();};reader.onerror=function(){filePending--;merr('تعذرت قراءة الملف '+f.name);};reader.readAsDataURL(f);});input.value='';}
document.addEventListener('change',function(ev){var t=ev.target;if(!t.hasAttribute)return;
 if(t.hasAttribute('data-st')||t.hasAttribute('data-bt'))return stEdit(ev);
 if(t.hasAttribute('data-att'))return onAttChange(t);
 if(t.hasAttribute('data-filekind'))return onFileChange(t);});
document.addEventListener('input',function(ev){var t=ev.target;if(t&&(t.id==='f_phone'||t.id==='f_nid')){var v=toEn(t.value).replace(/\D/g,'');if(v!==t.value)t.value=v;}});
document.addEventListener('keydown',function(ev){if(ev.key==='Escape')closeModal();if((ev.key==='Enter'||ev.key===' ')&&ev.target.classList&&ev.target.classList.contains('ecard')){ev.preventDefault();ev.target.click();}});

/* ---- حارس الصلاحيات (مرحلة الالتقاط، قبل باقي المستمعين) ---- */
var GUARD_NEED={empnew:'empnew',advnew:'advnew',clkin:'attwrite',clkout:'attwrite',allpresent:'attwrite',allout:'attwrite',attdel:'attwrite',attconfirm:'attwrite'};
function permGuard(ev){if(!currentUser||currentUser.admin)return;var p=currentUser.perms;
 if(ev.type==='change'){if(p.indexOf('attwrite')<0&&ev.target.hasAttribute&&ev.target.hasAttribute('data-att'))ev.stopImmediatePropagation();return;}
 var el=ev.target.closest('[data-act]');if(!el)return;var a=el.getAttribute('data-act'),need=GUARD_NEED[a];
 if((need&&p.indexOf(need)<0)||['advedit','advdel','menuedit','empedit'].indexOf(a)>=0){ev.stopImmediatePropagation();ev.preventDefault();toast('ليس لديك صلاحية لهذا الإجراء');}}
['click','change'].forEach(function(t){document.addEventListener(t,permGuard,true);});
