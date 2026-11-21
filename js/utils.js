'use strict';
/* ====================== أدوات عامة ====================== */
var MONTHS=['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
var SYS={monthly:'شهري',daily:'يومي',hourly:'بالساعة'}, SYS_COL={monthly:'var(--ch-m)',daily:'var(--ch-d)',hourly:'var(--ch-h)'};
var ICONS={pin:'<path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
 dash:'<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
 users:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 3-6 6.5-6s6.5 2.4 6.5 6"/><circle cx="17.5" cy="9" r="2.5"/><path d="M17 14.2c2.6.3 4.5 2.2 4.5 5.3"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 wallet:'<path d="M3 7a2 2 0 0 1 2-2h13v4"/><path d="M3 7v10a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1H5a2 2 0 0 1-2-2"/><circle cx="16.5" cy="13.5" r="1.2"/>',
 gift:'<rect x="3" y="8" width="18" height="5" rx="1"/><path d="M12 8v13M5 13v7h14v-7M12 8c-1-3-5-3.5-5-1s3 3 5 1zM12 8c1-3 5-3.5 5-1s-3 3-5 1z"/>',
 exit:'<path d="M10 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h5"/><path d="M15 8l4 4-4 4M19 12H9"/>',
 cash:'<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.8"/><path d="M6 9.5v.01M18 14.5v.01"/>',
 report:'<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h7"/>',
 gear:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
 plus:'<path d="M12 5v14M5 12h14"/>', search:'<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
 trash:'<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>', edit:'<path d="M4 20h4L19 9l-4-4L4 16z"/>',
 right:'<path d="M9 6l6 6-6 6"/>', left:'<path d="M15 6l-6 6 6 6"/>', x:'<path d="M6 6l12 12M18 6L6 18"/>',
 moon:'<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>', sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/>',
 more:'<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>',
 check:'<path d="M5 12.5l4.5 4.5L19 7"/>', alert:'<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17v.01"/>', copy:'<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
 down:'<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>', up:'<path d="M12 20V9M7 13l5-5 5 5M5 4h14"/>',
 in:'<path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4"/><path d="M10 8l4 4-4 4M14 12H4"/>',
 eye:'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
 list:'<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>', grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
 cal:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18M8 14h2M12 14h2M16 14h.01M8 17.5h2M12 17.5h2"/>',
 print:'<path d="M7 9V3h10v6M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2"/><rect x="7" y="14" width="10" height="7"/>'
};
function ic(n){return '<svg class="i" viewBox="0 0 24 24" aria-hidden="true">'+(ICONS[n]||'')+'</svg>';}
function $(s,r){return (r||document).querySelector(s);}
function $$(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s));}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function r2(x){return Math.round((x+Number.EPSILON)*100)/100;}
function precision(){var n=DB&&DB.settings?Number(DB.settings.precision):0;return Number.isInteger(n)&&n>=0&&n<=6?n:0;}
function round5(x){x=Number(x)||0;var f=Math.pow(10,precision());return Math.sign(x)*Math.round((Math.abs(x)+Number.EPSILON)*f)/f;}
function r5up(x){return DB&&DB.settings&&DB.settings.r5&&x>0?Math.ceil(x/5-1e-9)*5:x;}
function money(x){var n=precision();return round5(x).toLocaleString('en-US',{minimumFractionDigits:n,maximumFractionDigits:n});}
function money0(x){return money(x);}
function hrs(x){x=Number(x)||0;return x===0?'-':money(x);}
function pad(n){return n<10?'0'+n:''+n;}
function dparts(s){var a=s.split('-');return [+a[0],+a[1],+a[2]];}
function dnum(s){var p=dparts(s);return Date.UTC(p[0],p[1]-1,p[2])/864e5;}
function daysIn(ym){var p=ym.split('-');return new Date(+p[0],+p[1],0).getDate();}
function today(){var d=new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());}
function fdate(s){if(!s)return '-';var p=dparts(s);return pad(p[2])+'/'+pad(p[1])+'/'+p[0];}
function mlabel(ym){var p=ym.split('-');return MONTHS[+p[1]-1]+' '+p[0];}
function addMonths(ym,n){var p=ym.split('-'),m=(+p[0])*12+(+p[1]-1)+n;return Math.floor(m/12)+'-'+pad(m%12+1);}
function tmin(t){if(!t)return null;var a=t.split(':');return (+a[0])*60+(+a[1]);}
function hue(s){var h=0;for(var i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))%360;return 'hsl('+h+' 48% 42%)';}
function initials(n){var p=String(n).trim().split(/\s+/);return (p[0]||'?').charAt(0)+(p[1]?p[1].charAt(0):'');}
var toastT;
function toast(m){var t=$('#toast');if(!t){t=document.createElement('div');t.id='toast';t.className='toast';t.setAttribute('role','status');document.body.appendChild(t);}t.textContent=m;t.hidden=false;clearTimeout(toastT);toastT=setTimeout(function(){t.hidden=true;},2800);}

function dayOffset(date,n){var d=new Date(date+'T12:00:00');d.setDate(d.getDate()+n);return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());}
