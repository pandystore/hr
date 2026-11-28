'use strict';
/* ---------- قسيمة الراتب ---------- */
function slip(id,ym){var e=empById(id),c=calc(e,ym),ln=function(a,b,x){return '<div class="ln'+(x?' tot':'')+'"><span>'+a+'</span><span class="num">'+b+'</span></div>';};
 var body='<div class="ehead"><div class="avatar" style="background:'+hue(e.id)+'">'+esc(initials(e.name))+'</div><div><b>'+esc(e.name)+'</b><small>'+esc(e.job||'')+' · '+esc(e.id)+' · '+SYS[e.sys]+'</small></div><span class="pill '+pcls(c.pstat)+'" style="margin-inline-start:auto">'+c.pstat+'</span></div>'+
 '<div class="hint">فترة الاستحقاق: <span class="num">'+fdate(c.ps)+' → '+fdate(c.pe)+'</span> ('+c.elig+' يوم) · أساس الشهر: '+c.basis+' يوم</div>'+(e.susp?'<div class="hint" style="color:var(--warn);font-weight:600">'+esc(suspLabel(e))+'</div>':'')+
 '<div class="card" style="box-shadow:none;background:var(--surface2)"><div class="slip" style="grid-template-columns:minmax(0,1fr)">'+stmtHTML(stmtItems(e,c,c.pe))+'</div></div>';
 openModal({title:'قسيمة راتب — '+mlabel(ym),body:body,actions:[{label:'طباعة ريسيت 80 مم',cls:'pri',fn:function(){printReceipt(id,ym);}},{label:'حفظ PDF',fn:function(){slipPdf(id,ym);}},{label:'إرسال واتساب',fn:function(){slipWhatsApp(id,ym);}},{label:'إغلاق',fn:closeModal}],noFocus:true});}

/* ---------- الطباعة ---------- */
function receiptHTML(e,ym){var c=calc(e,ym),ln=function(a,v,b){return '<div class="ln'+(b?' big':'')+'"><span>'+a+'</span><span class="n">'+v+'</span></div>';};
 var lg=DB.settings.logo?'<img class="lg" src="'+DB.settings.logo+'" alt="">':'';
 return lg+'<h4>'+esc(DB.settings.company)+'</h4><div class="c">قسيمة راتب · '+mlabel(ym)+'</div><div class="sep"></div>'+
  ln('الموظف',esc(e.name))+ln('الكود',esc(e.id)+(e.job?' · '+esc(e.job):''))+ln('الأجر',SYS[e.sys])+ln('الفترة',fdate(c.ps).slice(0,5)+' ← '+fdate(c.pe).slice(0,5))+
  stmtItems(e,c,c.pe).map(function(i){return i[0]==='s'?'<div class="sep"></div><div class="c"><b>'+i[1]+'</b></div>':ln(i[1],i[2],i[3]);}).join('');}
function printReceipt(id,ym){var e=empById(id);if(!e)return;var r=$('#rcpt');r.innerHTML=receiptHTML(e,ym||ui.ym);r.style.cssText='display:block;position:absolute;left:-9999px;top:0';var h=r.offsetHeight;r.style.cssText='';var mm=Math.ceil(h*25.4/96+3);doPrint('rcpt','@page{size:80mm '+mm+'mm;margin:1mm}');}
function doPrint(kind,css){var old=$('#pgs');if(old)old.remove();var st=document.createElement('style');st.id='pgs';st.textContent=css;document.head.appendChild(st);document.body.setAttribute('data-print',kind);
 var clean=function(){document.body.removeAttribute('data-print');var x=$('#pgs');if(x)x.remove();window.removeEventListener('afterprint',clean);};window.addEventListener('afterprint',clean);setTimeout(clean,120000);
 var t0=Date.now();try{window.print();}catch(e){}if(Date.now()-t0<250)toast('لو لم تظهر نافذة الطباعة، افتح النظام في تبويب مستقل من المتصفح واطبع منه.');}
/* ---------- جدول الحضور الشهري ---------- */
function clsOf(rec){var st=statusOf(rec.s),n=rec.s||'';if(/غائب|غياب/.test(n))return 'a';if(/إجازة/.test(n))return 'l';if(/راحة|عطلة/.test(n))return 'r';if(st&&st.p>0)return 'p';return 'o';}
function matrixHTML(ym){var dim=daysIn(ym),emps=DB.emps.filter(function(e){return inMonth(e,ym);}),days=[];for(var d=1;d<=dim;d++)days.push(d);
 var WD=['ح','ن','ث','ر','خ','ج','س'];
 var head='<tr><th>الموظف / الوردية</th><th class="tot">حضور</th><th class="tot">غياب</th><th class="tot">إجازة</th>'+days.map(function(d){var w=new Date(+ym.slice(0,4),+ym.slice(5)-1,d).getDay();return '<th class="num'+(w===5?' we':'')+'">'+d+'<div style="font-size:9.5px;font-weight:400">'+WD[w]+'</div></th>';}).join('')+'</tr>';
 var rows=emps.map(function(e){var recs={};(getIdx().att[e.id]||[]).forEach(function(r){if(r.d.slice(0,7)===ym)recs[r.d]=r;});var end=endOf(e.id),P=0,A=0,Lv=0;
  var cells=days.map(function(d){var ds=ym+'-'+pad(d);if(ds<e.hire||(end&&ds>end))return '<td><span class="cell c-n"></span></td>';var r=recs[ds];if(!r||!r.s)return '<td><span class="cell c-n">-</span></td>';
   var k=clsOf(r),st=stFor(e,r),L=attLine(e,r);if(st)P+=st.p;if(k==='l'&&leaveCovered(e,r)!==false)Lv++;else if(st)A+=st.a;
   if(k==='p'){if(L.sh>0)return '<td><span class="cell c-t" title="'+esc(r.s)+' · نقص '+Math.round(L.sh*60)+' دقيقة">د'+Math.round(L.sh*60)+'</span></td>';return '<td><span class="cell c-p" title="'+esc(r.s)+'">'+(st&&st.p<1?'½':'✓')+'</span></td>';}
   if(k==='a')return '<td><span class="cell c-a" title="'+esc(r.s)+'">غياب</span></td>';if(k==='l')return '<td><span class="cell c-l" title="'+esc(r.s)+'">إجازة</span></td>';if(k==='r')return '<td><span class="cell c-r" title="'+esc(r.s)+'">'+(/عطلة/.test(r.s)?'عطلة':'راحة')+'</span></td>';return '<td><span class="cell c-r" title="'+esc(r.s)+'">'+esc(r.s.slice(0,4))+'</span></td>';}).join('');
  return '<tr><td><b>'+esc(e.name)+'</b><div class="hint" style="font-size:11px">'+shiftTxt(e)+'</div></td><td class="num tot" style="color:var(--good)">'+hrs(P)+'</td><td class="num tot" style="color:var(--bad)">'+hrs(A)+'</td><td class="num tot" style="color:var(--lv)">'+hrs(Lv)+'</td>'+cells+'</tr>';}).join('');
 return '<div class="mxnav" style="margin-bottom:10px"><b style="font-family:var(--f-display);font-size:16px">'+mlabel(ym)+'</b><span style="flex:1"></span>'+
  '<div class="legend" style="margin:0"><span><i style="background:var(--good)"></i>حضور</span><span><i style="background:var(--bad)"></i>غياب</span><span><i style="background:var(--lv)"></i>إجازة</span><span><i style="background:var(--muted)"></i>راحة / عطلة</span><span><i style="background:var(--warn)"></i>د = دقائق نقص</span></div></div>'+
  (emps.length?'<div class="mxwrap"><table class="mx"><thead>'+head+'</thead><tbody>'+rows+'</tbody></table></div>':'<div class="empty">لا يوجد موظفون في هذا الشهر.</div>');}
function vAttReport(){return '<div class="toolbar"><button class="btn" data-act="go" data-r="employees">'+ic('right')+'رجوع للموظفين</button><span class="grow"></span><button class="btn pri" data-act="printpay">'+ic('print')+'طباعة A4 عرضي</button></div><div class="print-head">'+logoImg(44)+'<b>'+esc(DB.settings.company)+'</b>سجل الحضور والغياب والإجازات — '+mlabel(ui.ym)+'</div><div class="card" style="padding:14px">'+matrixHTML(ui.ym)+'</div>';}

/* ---------- قسيمة PDF وإرسالها عبر واتساب (توليد داخل المتصفح) ---------- */
function loadScript(src){return new Promise(function(res,rej){var s=document.createElement('script');s.src=src;s.onload=res;s.onerror=function(){rej(new Error('تعذر تحميل مكتبة PDF. تحقق من الاتصال.'));};document.head.appendChild(s);});}
function ensurePdfLibs(){return (window.html2canvas&&window.jspdf)?Promise.resolve():Promise.all([loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'),loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js')]);}
function slipFileName(e,ym){return 'salary-slip-'+e.id+'-'+ym+'.pdf';}
function slipPdfBlob(id,ym){var e=empById(id);
 return ensurePdfLibs().then(function(){
  var box=document.createElement('div');box.className='rcptbox';box.setAttribute('dir','rtl');box.innerHTML=receiptHTML(e,ym);
  box.style.cssText='position:fixed;left:-9999px;top:0;width:380px;background:#fff;padding:18px';document.body.appendChild(box);
  var done=function(){box.remove();};
  return window.html2canvas(box,{scale:2,backgroundColor:'#ffffff'}).then(function(cv){done();
   var w=100,h=Math.max(40,cv.height*w/cv.width),pdf=new window.jspdf.jsPDF({unit:'mm',format:[w,h]});
   pdf.addImage(cv.toDataURL('image/jpeg',.92),'JPEG',0,0,w,h);return pdf.output('blob');},function(err){done();throw err;});});}
function slipPdf(id,ym){var e=empById(id);if(!e)return;toast('جارٍ تجهيز ملف PDF…');
 slipPdfBlob(id,ym).then(function(b){download(slipFileName(e,ym),b,'application/pdf');},function(err){toast(err.message||'تعذر إنشاء PDF');});}
function waNumber(phone){var d=toEn(phone||'').replace(/\D/g,'');if(/^01\d{9}$/.test(d))return '20'+d.slice(1);if(/^20\d{10}$/.test(d))return d;return d;}
function slipWaText(e,ym){var c=calc(e,ym);
 return ['قسيمة راتب '+mlabel(ym)+' — '+DB.settings.company,'الموظف: '+e.name].concat(stmtItems(e,c,c.pe).map(function(i){return i[0]==='s'?'\n'+i[1]:i[1]+': '+i[2];})).join('\n');}
/* على الجوال: مشاركة الملف مباشرة إلى واتساب. على الحاسوب: يُحفظ PDF ثم تُفتح محادثة واتساب برسالة ملخّصة لإرفاق الملف. */
function slipWhatsApp(id,ym){var e=empById(id);if(!e)return;
 var probe=null;try{probe=new File([''],'a.pdf',{type:'application/pdf'});}catch(x){}
 var canShare=!!(probe&&navigator.canShare&&navigator.canShare({files:[probe]})),text=slipWaText(e,ym),num=waNumber(e.phone),win=canShare?null:window.open('','_blank');
 toast('جارٍ تجهيز القسيمة…');
 slipPdfBlob(id,ym).then(function(b){
  if(canShare){var f=new File([b],slipFileName(e,ym),{type:'application/pdf'});return navigator.share({files:[f],text:text}).catch(function(err){if(err&&err.name!=='AbortError')throw err;});}
  download(slipFileName(e,ym),b,'application/pdf');
  var url='https://wa.me/'+(num?num:'')+'?text='+encodeURIComponent(text);
  if(win)win.location.href=url;else window.open(url,'_blank');
  toast(num?'تم حفظ PDF وفتح واتساب: أرفق الملف في المحادثة.':'تم حفظ PDF. لا يوجد رقم للموظف: اختر جهة الاتصال داخل واتساب.');
 }).catch(function(err){if(win)win.close();toast(err&&err.message||'تعذر إرسال القسيمة');});}
