// Civil dates are UTC-backed numbers used only as dates, never as local instants.
export const MS_DAY=86400000;
export function number(day){return Date.parse(`${day}T00:00:00Z`)/MS_DAY;}
export function add(day,n){return new Date((number(day)+n)*MS_DAY).toISOString().slice(0,10);}
export function weekday(day){return (new Date(number(day)*MS_DAY).getUTCDay()+6)%7;}
export function monday(day){return add(day,-weekday(day));}
export function monthMove(day,delta){const d=new Date(number(day)*MS_DAY),n=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+delta);const max=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();d.setUTCDate(Math.min(n,max));return d.toISOString().slice(0,10);}
export function monthCells(day){const first=day.slice(0,7)+'-01',start=monday(first),next=monthMove(first,1);const count=Math.ceil((number(next)-number(start))/7)*7;return Array.from({length:count},(_,i)=>add(start,i));}
export function label(day,options={weekday:'long',month:'long',day:'numeric',year:'numeric'}){return new Intl.DateTimeFormat('en-US',{...options,timeZone:'UTC'}).format(new Date(number(day)*MS_DAY));}
export function localDay(instant){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(instant));}
export function clock(instant){return new Intl.DateTimeFormat('en-US',{timeZone:'America/Los_Angeles',hour:'numeric',minute:'2-digit'}).format(new Date(instant));}
const boundCache=new WeakMap();
export function bounds(event){if(!boundCache.has(event))boundCache.set(event,event.all_day?[event.start,event.end]:[localDay(event.start),add(localDay(new Date(Math.max(Date.parse(event.start),Date.parse(event.end)-1))),1)]);return boundCache.get(event);}
export function until(event,today){const [a,b]=bounds(event),n=number(a)-number(today);if(a<today&&today<b&&(event.all_day||Date.parse(event.end)>Date.now()))return {text:'Happening now',n:0};return {text:n===0?'Today!':n===1?'Tomorrow · 1 sleep':n>1?`${n} sleeps to go`:`${-n} ${n===-1?'day':'days'} ago`,n};}
export function dayDistance(day,today){const n=number(day)-number(today);return n===0?'Today':n===1?'Tomorrow':n===-1?'Yesterday':n>0?`In ${n} days`:`${-n} days ago`;}
