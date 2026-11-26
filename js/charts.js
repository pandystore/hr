'use strict';
/* ====================== رسوم بيانية ====================== */
function niceMax(v){if(v<=0)return 1;var p=Math.pow(10,Math.floor(Math.log10(v))),n=v/p;return (n<=1?1:n<=2?2:n<=2.5?2.5:n<=5?5:10)*p;}
function compact(v){v=Math.abs(v);return v>=1e6?(v/1e6).toFixed(1)+'M':v>=1000?(v/1000).toFixed(v>=10000?0:1)+'k':String(Math.round(v));}
function barChart(cats,A,P){
 var W=640,H=290,L=46,Rr=8,T=30,B=34,mx=niceMax(Math.max.apply(null,A.concat([1]))),pw=W-L-Rr,ph=H-T-B,n=cats.length,gw=pw/n,bw=Math.min(48,gw*.58),out='';
 for(var i=0;i<=4;i++){var y=T+ph-ph*i/4,v=mx*i/4;out+='<line class="g" x1="'+L+'" x2="'+(W-Rr)+'" y1="'+y+'" y2="'+y+'" stroke-dasharray="'+(i?'3 5':'0')+'"/><text x="'+(L-8)+'" y="'+(y+4)+'" text-anchor="end">'+compact(v)+'</text>';}
 for(var k=0;k<n;k++){var cx=L+gw*(n-1-k)+gw/2,ha=ph*Math.max(A[k],0)/mx,hp=ph*Math.min(Math.max(P[k],0),Math.max(A[k],0))/mx,cur=k===n-1;
  if(ha>0){out+='<rect x="'+(cx-bw/2)+'" y="'+(T+ph-ha)+'" width="'+bw+'" height="'+ha+'" rx="9" fill="var(--ch-m)" opacity="'+(cur?.3:.2)+'"><title>صافي المستحق: '+money(A[k])+'</title></rect>';
   if(hp>0)out+='<rect x="'+(cx-bw/2)+'" y="'+(T+ph-hp)+'" width="'+bw+'" height="'+hp+'" rx="9" fill="var(--ch-m)"><title>المصروف: '+money(P[k])+'</title></rect>';
   out+='<text x="'+cx+'" y="'+(T+ph-ha-9)+'" text-anchor="middle" style="fill:var(--fg);font-weight:700;font-size:11.5px">'+compact(A[k])+'</text>';}
  else out+='<text x="'+cx+'" y="'+(T+ph-8)+'" text-anchor="middle" style="font-size:10px">—</text>';
  out+='<text x="'+cx+'" y="'+(H-10)+'" text-anchor="middle" style="'+(cur?'fill:var(--fg);font-weight:700':'')+'">'+esc(cats[k])+'</text>';}
 return '<svg class="chart" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="الرواتب خلال ستة أشهر">'+out+'</svg>';}
function donut(items){var tot=items.reduce(function(a,x){return a+x.v;},0);
 if(tot<=0)return '<div class="empty">لا توجد بيانات</div>';
 var r=60,C=2*Math.PI*r,act=items.filter(function(x){return x.v>0;}),gap=act.length>1?5:0,off=0,out='<circle cx="90" cy="90" r="'+r+'" fill="none" stroke="var(--surface2)" stroke-width="26"/>';
 act.forEach(function(x){var len=C*x.v/tot,d=Math.max(0,len-gap);out+='<circle cx="90" cy="90" r="'+r+'" fill="none" stroke="'+x.c+'" stroke-width="26" stroke-dasharray="'+d+' '+(C-d)+'" stroke-dashoffset="'+(-off)+'" transform="rotate(-90 90 90)"><title>'+esc(x.l)+': '+money(x.v)+'</title></circle>';off+=len;});
 out+='<text x="90" y="85" text-anchor="middle" style="font-size:11px">الإجمالي</text><text x="90" y="106" text-anchor="middle" style="font-size:16px;font-weight:800;fill:var(--fg)">'+compact(tot)+'</text>';
 return '<div style="display:flex;gap:22px;align-items:center;flex-wrap:wrap;justify-content:center"><svg class="chart" style="width:190px;flex:none" viewBox="0 0 180 180" role="img" aria-label="توزيع المستحقات حسب نظام الأجر">'+out+'</svg><div style="display:flex;flex-direction:column;gap:14px;min-width:150px;flex:1">'+
  items.map(function(x){return '<div><div style="display:flex;justify-content:space-between;gap:10px"><span><i style="display:inline-block;width:10px;height:10px;border-radius:3px;background:'+x.c+';margin-inline-end:8px"></i>'+esc(x.l)+'</span><b class="num">'+money(x.v/tot*100)+'%</b></div><div class="hint num" style="margin-inline-start:18px">'+money(x.v)+'</div></div>';}).join('')+'</div></div>';}
function meterCls(p){return p>=.6?'b':p>=.3?'w':'';}

function gauge(p,size){var r=size/2-5,C=2*Math.PI*r,v=Math.min(1,Math.max(0,p)),col=p>=.6?'var(--bad)':p>=.3?'var(--warn)':'var(--good)',h=size/2;
 return '<svg class="gauge" width="'+size+'" height="'+size+'" viewBox="0 0 '+size+' '+size+'" role="img" aria-label="نسبة السلفة '+money(p*100)+'%"><circle cx="'+h+'" cy="'+h+'" r="'+r+'" fill="none" stroke="var(--line)" stroke-width="6"/>'+(v>0?'<circle cx="'+h+'" cy="'+h+'" r="'+r+'" fill="none" stroke="'+col+'" stroke-width="6" stroke-linecap="round" stroke-dasharray="'+(C*v)+' '+C+'" transform="rotate(-90 '+h+' '+h+')"/>':'')+'<text x="'+h+'" y="'+(h+4)+'" text-anchor="middle" style="font-size:'+(size>50?13:10.5)+'px;font-weight:700;fill:var(--fg)">'+money(p*100)+'%</text></svg>';}
function spark(a,color,label){var w=150,h=42,lo=Math.min.apply(null,a.concat([0])),hi=Math.max.apply(null,a.concat([1]));if(hi===lo)hi=lo+1;var points=a.map(function(n,i){return (i*w/Math.max(1,a.length-1)).toFixed(1)+','+(h-4-(n-lo)/(hi-lo)*(h-9)).toFixed(1);});return '<svg class="spark" viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="none" role="img" aria-label="'+esc(label)+'"><polygon points="0,'+h+' '+points.join(' ')+' '+w+','+h+'" fill="'+color+'" opacity=".1"></polygon><polyline points="'+points.join(' ')+'" fill="none" stroke="'+color+'" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round"></polyline></svg>';}
