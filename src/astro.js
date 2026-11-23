import * as Astronomy from 'astronomy-engine';
import moment from 'moment-timezone';
import {mod,approximateLahiri,meanNorthNodeTropical,tropicalAscendant,rasi,nakshatra,panchanga,vimshottari,marsDoshaScreen} from './core.js';

export function calculateChart({date,time,latitude,longitude,timezone}) {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Enter a valid birth date.');
  if(!/^\d{2}:\d{2}(?::\d{2})?$/.test(time)) throw new Error('Enter a valid birth time.');
  const lat=Number(latitude),lon=Number(longitude);
  if(!Number.isFinite(lat)||lat < -90||lat > 90||!Number.isFinite(lon)||lon < -180||lon > 180) throw new Error('Latitude or longitude is outside its valid range.');
  if(!moment.tz.zone(timezone)) throw new Error('Unknown IANA timezone (example: Asia/Kolkata).');
  const paddedTime=time.length===5?`${time}:00`:time;
  const local=`${date} ${paddedTime}`;
  const localMoment=moment.tz(local,'YYYY-MM-DD HH:mm:ss',true,timezone);
  if(!localMoment.isValid()||localMoment.format('YYYY-MM-DD HH:mm:ss')!==local) {
    throw new Error('This local time is invalid or skipped by a daylight-saving transition. Check the birth time.');
  }
  const utcDate=localMoment.toDate();
  const ayanamsa=approximateLahiri(utcDate);
  const positions={};
  for(const name of ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn']) {
    // Astronomy.EclipticLongitude is HELIOCENTRIC and must not be used here.
    // GeoVector + Ecliptic returns geocentric, true-ecliptic-of-date longitude.
    const tropical=name==='Moon'
      ? Astronomy.EclipticGeoMoon(utcDate).lon
      : Astronomy.Ecliptic(Astronomy.GeoVector(Astronomy.Body[name],utcDate,true)).elon;
    const sidereal=mod(tropical-ayanamsa);
    positions[name]={tropical,sidereal,rasi:rasi(sidereal)};
  }
  positions.Rahu={tropical:meanNorthNodeTropical(utcDate)};
  positions.Rahu.sidereal=mod(positions.Rahu.tropical-ayanamsa);
  positions.Rahu.rasi=rasi(positions.Rahu.sidereal);
  positions.Ketu={tropical:mod(positions.Rahu.tropical+180),sidereal:mod(positions.Rahu.sidereal+180),rasi:rasi(positions.Rahu.sidereal+180)};
  const gast=Astronomy.SiderealTime(utcDate);
  const obliquity=Astronomy.e_tilt(Astronomy.MakeTime(utcDate)).tobl;
  const ascTropical=tropicalAscendant(gast,lon,lat,obliquity);
  const ascSidereal=mod(ascTropical-ayanamsa);
  const moonNak=nakshatra(positions.Moon.sidereal);
  const dayIndex=new Date(`${date}T12:00:00Z`).getUTCDay();
  return {
    birth:{local,timezone,latitude:lat,longitude:lon,utc:utcDate.toISOString(),utcDate,offset:localMoment.format('Z')},
    ayanamsa,ascendant:{tropical:ascTropical,sidereal:ascSidereal,rasi:rasi(ascSidereal)},
    moonNakshatra:moonNak,
    panchanga:panchanga(positions.Sun.sidereal,positions.Moon.sidereal,dayIndex),
    positions,
    dashas:vimshottari(utcDate,positions.Moon.sidereal),
    dosha:marsDoshaScreen(positions.Mars.sidereal,ascSidereal),
    warnings:['Lahiri ayanamsa uses a linear approximation; validate sign-boundary cases against an authoritative panchangam.','Rahu and Ketu are mean nodes, not true nodes.','Panchanga elements are evaluated at the birth instant (not at sunrise).','For repeated daylight-saving hours, this version uses the timezone library’s default occurrence.','Vimshottari dates use a 365.2425-day year; schools using a 360-day savana year will differ.']
  };
}
