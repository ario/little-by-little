// Invented examples only. This module never reads a family's Google calendar.
import {add,monthMove,localDay,label,bounds,until} from './calendar-date.js';
export function demoCalendar(){
 const today=localDay(new Date()),year=Number(today.slice(0,4));
 const annual=(monthDay)=>{const d=`${year}-${monthDay}`;return d<today?`${year+1}-${monthDay}`:d;};
 const event=(n,title,start,all_day=true,end=null,location='')=>({id:n.toString(16).padStart(32,'0'),title,start,end:end||(all_day?add(start,1):''),all_day,location,description:''});
 const children={negaan:[event(1,'Library adventure',today+'T15:30:00-07:00',false,today+'T16:15:00-07:00','The library'),event(2,'Art with friends',add(today,2)),event(3,'A birthday party',add(today,9)),event(4,'Halloween',annual('10-31')),event(5,'Christmas',annual('12-25')),event(6,'Nowruz',annual('03-20'))],neev:[event(11,'Swim and splash',today+'T16:00:00-07:00',false,today+'T16:45:00-07:00','The pool'),event(12,'Play at the park',add(today,1)),event(13,'A birthday party',add(today,6)),event(14,'Halloween',annual('10-31')),event(15,'Christmas',annual('12-25')),event(16,'Nowruz',annual('03-20'))]};
 return {version:1,available:true,stale:false,demo:true,today,generated_at:new Date().toISOString(),range_start:monthMove(today.slice(0,7)+'-01',-1),range_end:monthMove(today.slice(0,7)+'-01',14),children};
}
export async function demoVoice(body){const data=demoCalendar(),e=data.children.neev.find(e=>e.id===body.event);return {text:e?`${e.title}. ${label(bounds(e)[0])}. ${until(e,data.today).text}.`:`${label(body.date)}.`};}
