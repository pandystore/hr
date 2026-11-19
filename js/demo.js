'use strict';
/* ====================== بيانات تجريبية ====================== */
function seedDemo(){
 var S=DB.settings,now=new Date(),cur=now.getFullYear()+'-'+pad(now.getMonth()+1);
 S.company='شركة النيل للتجارة (بيانات تجريبية)';DB.demo=true;
 var m0=addMonths(cur,-3)+'-01';
 DB.emps=[
  {id:'EMP-001',name:'أحمد علي محمود',job:'محاسب',phone:'01012345678',hire:m0,sys:'monthly',sal:6000,dly:0,hrly:0,hours:8,susp:false,notes:'',raises:[]},
  {id:'EMP-002',name:'محمد حسن إبراهيم',job:'عامل إنتاج',phone:'01123456789',hire:m0,sys:'daily',sal:0,dly:200,hrly:0,hours:8,susp:false,notes:'',raises:[]},
  {id:'EMP-003',name:'سارة محمود فتحي',job:'فنية جودة',phone:'01234567890',hire:m0,sys:'hourly',sal:0,dly:0,hrly:30,hours:8,susp:false,notes:'',raises:[]},
  {id:'EMP-004',name:'مهند سعيد عبد الله',job:'مندوب مبيعات',phone:'01098765432',hire:m0,sys:'monthly',sal:4500,dly:0,hrly:0,hours:8,susp:false,notes:'',raises:[{d:addMonths(cur,-1)+'-01',sal:5000,dly:0,hrly:0}]},
  {id:'EMP-005',name:'تسنيم عادل صلاح',job:'سكرتيرة',phone:'01155667788',hire:m0,sys:'monthly',sal:3500,dly:0,hrly:0,hours:8,susp:false,notes:'',raises:[]},
  {id:'EMP-006',name:'يوسف رضا كامل',job:'سائق',phone:'01211223344',hire:addMonths(cur,-2)+'-01',sys:'daily',sal:0,dly:180,hrly:0,hours:8,susp:false,notes:'',raises:[]}
 ];
 var shs=['morning','morning','evening','both','morning','evening'];DB.emps.forEach(function(e,i){e.shift=shs[i];e.nid='2990101123456'+i;});
 DB.emps.forEach(function(e){e.clock=e.id!=='EMP-004';});
 var seed=7;function rnd(){seed=(seed*9301+49297)%233280;return seed/233280;}
 [-3,-2,-1,0].forEach(function(off){var ym=addMonths(cur,off),dim=daysIn(ym),lim=off===0?Math.min(dim,now.getDate()):dim;
  for(var d=1;d<=lim;d++){var ds=ym+'-'+pad(d),wd=new Date(+ym.slice(0,4),+ym.slice(5)-1,d).getDay();
   DB.emps.forEach(function(e){if(e.hire>ds)return;if(e.id==='EMP-005'&&ds>cur+'-'+pad(Math.max(1,now.getDate()-4)))return;
    if(e.sys==='monthly'&&e.id==='EMP-005')return;
    var st=wd===5?'راحة أسبوعية':(rnd()<.06?'غائب':'حاضر'),rec={d:ds,c:e.id,s:st,i:'',o:'',b:0};
    if(st==='حاضر'&&(e.sys==='hourly'||e.sys==='monthly')&&e.id!=='EMP-004'){var late=rnd()<.15?Math.floor(rnd()*60):0,extra=rnd()<.2?Math.floor(rnd()*3)+1:0,sh0=e.shift==='evening'?14:9;
     var i=sh0*60+late,o=(sh0+8)*60+extra*60;rec.i=pad(Math.floor(i/60))+':'+pad(i%60);rec.o=pad(Math.floor(o/60))+':'+pad(o%60);}
    DB.att.push(rec);});}});
 function dt(off,day){return addMonths(cur,off)+'-'+pad(Math.min(day,daysIn(addMonths(cur,off))));}
 [['EMP-001',0,5,1000,'سلفة شخصية'],['EMP-002',0,10,500,'ظرف طارئ'],['EMP-003',0,12,300,''],['EMP-004',0,15,2200,'سلفة إيجار'],['EMP-001',-1,20,800,''],['EMP-002',-1,8,400,''],['EMP-006',0,3,200,'']].forEach(function(a){DB.adv.push({id:nid(),d:dt(a[1],a[2]),c:a[0],a:a[3],n:a[4]});});
 [['EMP-001',0,20,'حافز',300,'التزام بالمواعيد'],['EMP-001',0,25,'مكافأة',200,''],['EMP-002',0,15,'حافز',200,''],['EMP-003',0,18,'حافز',250,''],['EMP-004',0,22,'جزاء',100,'تأخير متكرر'],['EMP-004',-1,10,'عمولة',600,'مبيعات']].forEach(function(b){DB.bon.push({id:nid(),d:dt(b[1],b[2]),c:b[0],t:b[3],a:b[4],n:b[5]});});
 DB.sett.push({id:nid(),d:cur+'-'+pad(Math.max(1,now.getDate()-4)),c:'EMP-005',l:cur+'-'+pad(Math.max(1,now.getDate()-4)),n:'استقالة'});
 [-3,-2,-1].forEach(function(off){var ym=addMonths(cur,off);DB.emps.forEach(function(e){if(e.hire.slice(0,7)>ym)return;var c=calc(e,ym);if(c.net>0)DB.pay.push({id:nid(),d:addMonths(ym,1)+'-01',c:e.id,m:ym,a:c.net,n:'',b:null});});});
}

