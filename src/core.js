// All calculations in this module are deterministic, with no browser APIs or network.
export const SIGNS = ['Mesha / Aries','Rishabha / Taurus','Mithuna / Gemini','Kataka / Cancer','Simha / Leo','Kanya / Virgo','Tula / Libra','Vrischika / Scorpio','Dhanu / Sagittarius','Makara / Capricorn','Kumbha / Aquarius','Meena / Pisces'];
export const NAKSHATRAS = ['Ashwini','Bharani','Krittika','Rohini','Mrigashira','Ardra','Punarvasu','Pushya','Ashlesha','Magha','Purva Phalguni','Uttara Phalguni','Hasta','Chitra','Swati','Vishakha','Anuradha','Jyeshtha','Mula','Purva Ashadha','Uttara Ashadha','Shravana','Dhanishta','Shatabhisha','Purva Bhadrapada','Uttara Bhadrapada','Revati'];
export const TITHIS = ['Pratipada','Dvitiya','Tritiya','Chaturthi','Panchami','Shashthi','Saptami','Ashtami','Navami','Dashami','Ekadashi','Dvadashi','Trayodashi','Chaturdashi','Purnima'];
export const YOGAS = ['Vishkambha','Priti','Ayushman','Saubhagya','Shobhana','Atiganda','Sukarma','Dhriti','Shula','Ganda','Vriddhi','Dhruva','Vyaghata','Harshana','Vajra','Siddhi','Vyatipata','Variyana','Parigha','Shiva','Siddha','Sadhya','Shubha','Shukla','Brahma','Indra','Vaidhriti'];
export const DASHA_LORDS = ['Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury'];
export const DASHA_YEARS = [7,20,6,10,7,18,16,19,17];
export const mod = (n, m=360) => ((n % m) + m) % m;
export const radians = d => d*Math.PI/180;
export const degrees = r => r*180/Math.PI;
export function rasi(lon) { return {number:Math.floor(mod(lon)/30)+1, name:SIGNS[Math.floor(mod(lon)/30)], degree:mod(lon)%30}; }
export function nakshatra(lon) {
  const segment = 360/27; const absolute = mod(lon);
  const index = Math.min(26,Math.floor(absolute/segment));
  const fraction = (absolute-index*segment)/segment;
  return {index, name:NAKSHATRAS[index], pada:Math.min(4,1+Math.floor(fraction*4)), fraction, lord:DASHA_LORDS[index%9]};
}
export function panchanga(sunSid, moonSid, localDayIndex) {
  const elongation=mod(moonSid-sunSid);
  const i=Math.floor(elongation/12);
  const tithiNumber=(i%15)+1;
  const paksha=i<15?'Shukla (waxing)':'Krishna (waning)';
  const tithiName=i===14?'Purnima':i===29?'Amavasya':TITHIS[i%15];
  const karanaIndex=Math.floor(elongation/6);
  let karana;
  if(karanaIndex===0) karana='Kimstughna';
  else if(karanaIndex>=57) karana=['Shakuni','Chatushpada','Naga'][karanaIndex-57];
  else karana=['Bava','Balava','Kaulava','Taitila','Garaja','Vanija','Vishti'][(karanaIndex-1)%7];
  const yoga=YOGAS[Math.floor(mod(sunSid+moonSid)/(360/27))];
  return {paksha,tithiNumber,tithiName,karana,yoga,vara:['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][localDayIndex],elongation};
}
// Computes the eastern intersection of the horizon and ecliptic, using
// apparent sidereal time (hours), observer longitude east, and true obliquity.
export function tropicalAscendant(greenwichSiderealHours, longitudeEast, latitude, obliquityDeg) {
  if (!Number.isFinite(latitude)||Math.abs(latitude)>=89.9) throw new Error('Ascendant is not supported near the geographic poles.');
  const theta=radians(mod(greenwichSiderealHours*15+longitudeEast));
  const phi=radians(latitude), eps=radians(obliquityDeg);
  const A=Math.cos(phi)*Math.cos(theta);
  const B=Math.sin(phi)*Math.sin(eps)+Math.cos(phi)*Math.sin(theta)*Math.cos(eps);
  const first=mod(degrees(Math.atan2(-A,B)));
  // Determine rising versus setting by the sign of the local hour angle.
  const lam=radians(first);
  const ra=mod(degrees(Math.atan2(Math.sin(lam)*Math.cos(eps),Math.cos(lam))));
  const hourAngle=mod(degrees(theta)-ra);
  const eastern=Math.sin(radians(hourAngle))<0;
  return eastern?first:mod(first+180);
}
// Approximate Lahiri/Chitrapaksha ayanamsa. Linear precession is explicitly
// NOT an ephemeris-grade implementation of official Lahiri ayanamsa.
export function approximateLahiri(date) {
  const years=(date.getTime()-Date.UTC(2000,0,1,12))/(365.2425*86400000);
  return 23.8530556+years*(50.290966/3600);
}
export function meanNorthNodeTropical(date) {
  const jd=date.getTime()/86400000+2440587.5;
  const T=(jd-2451545)/36525;
  return mod(125.044555-1934.1361849*T+0.0020762*T*T+T*T*T/467410-T*T*T*T/60616000);
}
const YEAR_MS=365.2425*86400000;
export function vimshottari(utcDate, moonSid, years=120) {
  const n=nakshatra(moonSid), first=n.index%9;
  // The birth mahadasha is already in progress. First end reflects the
  // fraction of the nakshatra remaining at the birth instant.
  let cursor=utcDate.getTime();
  const periods=[];
  for(let k=0;k<30 && cursor<utcDate.getTime()+years*YEAR_MS;k++) {
    const lordIndex=(first+k)%9;
    const duration=DASHA_YEARS[lordIndex] * (k===0?1-n.fraction:1);
    const finish=cursor+duration*YEAR_MS;
    periods.push({lord:DASHA_LORDS[lordIndex],start:new Date(cursor),end:new Date(finish),years:duration});
    cursor=finish;
  }
  return periods;
}
export function marsDoshaScreen(marsSid, ascSid) {
  const marsSign=Math.floor(mod(marsSid)/30);
  const risingSign=Math.floor(mod(ascSid)/30);
  const house=mod(marsSign-risingSign,12)+1;
  return {house,flag:[1,2,4,7,8,12].includes(house),method:'A simple Mars-from-lagna screen, with no exceptions or cancellations applied. Traditions differ.'};
}
// Generic, mathematically valid Bayesian update; NO default astrology priors.
// evidence entries: {label, likelihoodIfTrue, likelihoodIfFalse}
export function bayesianUpdate(prior, evidence) {
  if(!Number.isFinite(prior)||prior<=0||prior>=1) throw new Error('Prior must be between 0 and 1 (exclusive).');
  let odds=prior/(1-prior);
  if(!Array.isArray(evidence)) throw new Error('Evidence must be an array.');
  for(const e of evidence){
    const a=e.likelihoodIfTrue,b=e.likelihoodIfFalse;
    if(!Number.isFinite(a)||!Number.isFinite(b)||a<0||b<=0||a>1||b>1) throw new Error('Likelihood values must be probabilities in [0,1], with likelihoodIfFalse > 0.');
    odds*=a/b;
  }
  return odds/(1+odds);
}
