import { DateTime } from 'luxon';

function getDateTimeFromConfig(timeStr: string, nowMs: number, zone: string): DateTime {
    const [hour, minute] = timeStr.split(':').map(Number);
    return DateTime.fromMillis(nowMs, { zone })
        .set({ hour, minute, second: 0, millisecond: 0 });}


export function msUntilStart(nowMs: number, startTime: string, zone: string = 'UTC'): number {
  const now = DateTime.fromMillis(nowMs, { zone });
  let start = getDateTimeFromConfig(startTime, nowMs, zone);

  if (now >= start) {
    start = start.plus({ days: 1 });
  }

  return start.diff(now).as('milliseconds');
}

export function msUntilNextDay(nowMs: number, startTime: string, zone: string = 'UTC'): number {
  const now = DateTime.fromMillis(nowMs, { zone });
  const nextDay = now.startOf('day').plus({ days: 1 });
  
  return nextDay.diff(now).as('milliseconds');
}



export function isWithinWorkingHours(nowMs: number, startTime: string, endTime: string, zone: string = 'UTC'): boolean {
  const now = DateTime.fromMillis(nowMs, { zone });
  const start = getDateTimeFromConfig(startTime, nowMs, zone);
  let end = getDateTimeFromConfig(endTime, nowMs, zone);
  
  if (end < start) {
    end = end.plus({ days: 1 });
  return now >= start || now <= end;
}

  return now >= start && now <= end;
}



export function getDayIdentifier(nowMs: number, zone: string = 'UTC'): string {
return DateTime.fromMillis(nowMs, { zone }).toISODate() || '';
}




/**
 * without luxon
 */

// export function parseTime(time: string) {
//   const [h, m] = time.split(":").map(Number);
//   return h * 60 + m;
// }

// export function getDay(time:number):number{
//     return Math.floor(time / (24 * 60 * 60 * 1000));
// }
// export function isWithinWorkHour(nowMs:number, startTime:string, endTime: string){
//     const now = new Date(nowMs)
//     const start = parseTime(startTime)
//     const end = parseTime(endTime)
//     const minutesNow = now.getUTCHours() * 60 + now.getUTCMinutes();
//     return minutesNow >= start && minutesNow <= end
// }
// export function msUntilStart(nowMs:number,startTime:string){
//     const now =  new Date(nowMs)
//   const [startH, startM] = startTime.split(":").map(Number);

//   const start = new Date(now);
//   start.setUTCHours(startH,startM,0,0)

//   if(start.getTime() <= now.getTime()){
//     start.setUTCDate(start.getUTCDate() + 1);
//   }
//   return start.getTime() - now.getTime()
// }
// export function msUntilNextDay(nowMs:number){
//     const now = new Date(nowMs)
//     const next =  new Date(now)
//     next.setUTCHours(24,0,0,0)
//     return next.getTime() - now.getTime()
// }