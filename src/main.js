import {calculateChart} from './astro.js';
import {bayesianUpdate, mod} from './core.js';
const $=id=>document.getElementById(id);
const shortBody={Sun:'Su',Moon:'Mo',Mercury:'Me',Venus:'Ve',Mars:'Ma',Jupiter:'Ju',Saturn:'Sa',Rahu:'Ra',Ketu:'Ke'};
const positionsInChart=[['Meena',12,1,1],['Mesha',1,1,2],['Rishabha',2,1,3],['Mithuna',3,1,4],['Kumbha',11,2,1],['Kataka',4,2,4],['Makara',10,3,1],['Simha',5,3,4],['Dhanu',9,4,1],['Vrischika',8,4,2],['Tula',7,4,3],['Kanya',6,4,4]];
let lastResult=null;
function fmtDeg(d){const r=mod(d);return `${r.toFixed(3)}°`;}
function dateOnly(d){return d.toISOString().slice(0,10);}
function elt(tag,className,text){const e=document.createElement(tag);if(className)e.className=className;if(text!==undefined)e.textContent=text;return e;}
function populate(id,rows){const target=$(id);target.replaceChildren(...rows);}
function addDL(data){const d=$('panchanga');d.replaceChildren();for(const [label,val] of Object.entries(data)){d.append(elt('dt','',label),elt('dd','',val));}}
function render(chart){
  const {birth,ascendant,moonNakshatra,positions,panchanga,dashas,dosha}=chart;
  const badges=[['Lagnam',ascendant.rasi.name],['Nakshatram',`${moonNakshatra.name} · Pada ${moonNakshatra.pada}`],['Moon rāsi',positions.Moon.rasi.name],['Birth instant (UTC)',birth.utc.replace('.000','')]];
  populate('summary',badges.map(([name,value])=>{const x=elt('div','metric');x.append(elt('small','',name),elt('b','',value));return x;}));
  const boxes=positionsInChart.map(([name,sign,row,col])=>{
    const box=elt('div','sign'+(sign===ascendant.rasi.number?' ascending':''));
    box.style.gridRow=String(row);box.style.gridColumn=String(col);
    box.append(elt('strong','',name));
    const names=Object.keys(positions).filter(k=>positions[k].rasi.number===sign).map(k=>shortBody[k]);
    if(sign===ascendant.rasi.number)names.unshift('Asc');
    box.append(elt('span','planets',names.join(' · ')));
    return box;
  });
  const middle=elt('div','chartMiddle','RĀSI\nSIDEREAL');middle.style.whiteSpace='pre-line';
  populate('chart',[...boxes,middle]);
  addDL({Weekday:panchanga.vara, Tithi:`${panchanga.paksha} ${panchanga.tithiNumber}: ${panchanga.tithiName}`,Nakshatram:`${moonNakshatra.name}, pada ${moonNakshatra.pada}`,Yoga:panchanga.yoga,Karana:panchanga.karana,'UTC offset':birth.offset,'Ayanamsa (approx.)':fmtDeg(chart.ayanamsa)});
  populate('planetRows',Object.entries(positions).map(([name,p])=>{const row=elt('tr');for(const x of [name,p.rasi.name,fmtDeg(p.rasi.degree),fmtDeg(p.sidereal)])row.append(elt('td','',x));return row;}));
  populate('dashas',dashas.slice(0,13).map(d=>{const row=elt('tr');for(const x of [d.lord,dateOnly(d.start),dateOnly(d.end)])row.append(elt('td','',x));return row;}));
  const interpretation=$('interpretation');interpretation.replaceChildren();
  interpretation.append(elt('p','',`Sevvai / Manglik dosham screen: ${dosha.flag?'triggered':'not triggered'} under the selected rule (Mars in house ${dosha.house} from lagnam).`));
  interpretation.append(elt('p','',dosha.method));
  interpretation.append(elt('p','',`Palan rule input: lagnam ${ascendant.rasi.name}; Janma nakshatram ${moonNakshatra.name}; Moon rāsi ${positions.Moon.rasi.name}. Add tradition-specific rules and a citation for each before issuing interpretations.`));
  populate('warnings',chart.warnings.map(w=>elt('li','',w)));
  $('results').hidden=false;
}
function readInput(){return {date:$('birthDate').value,time:$('birthTime').value,latitude:$('latitude').value,longitude:$('longitude').value,timezone:$('timezone').value.trim()};}
$('birthForm').addEventListener('submit',e=>{
  e.preventDefault();$('message').textContent='';
  try{const chart=calculateChart(readInput());lastResult=chart;render(chart);}catch(err){$('message').textContent=err.message;$('results').hidden=true;}
});
const presets={chennai:[13.0827,80.2707,'Asia/Kolkata'],bengaluru:[12.9716,77.5946,'Asia/Kolkata'],austin:[30.2672,-97.7431,'America/Chicago']};
document.querySelectorAll('[data-preset]').forEach(b=>b.addEventListener('click',()=>{
  const [lat,lon,tz]=presets[b.dataset.preset];$('latitude').value=lat;$('longitude').value=lon;$('timezone').value=tz;
}));
$('geocode').addEventListener('click',async()=>{
  const name=$('placeName').value.trim();if(!name)return;
  const button=$('geocode');button.disabled=true;$('message').textContent='Looking up place…';
  try{
    const url='https://geocoding-api.open-meteo.com/v1/search?name='+encodeURIComponent(name)+'&count=1&language=en&format=json';
    const response=await fetch(url,{cache:'no-store'});if(!response.ok)throw new Error(`Geocoding service error: ${response.status}`);
    const obj=await response.json(),place=obj.results?.[0];if(!place)throw new Error('Place not found. Enter coordinates and timezone manually.');
    $('latitude').value=place.latitude;$('longitude').value=place.longitude;$('timezone').value=place.timezone;
    $('message').textContent=`Found ${place.name}, ${place.country}. Confirm this is your birth place.`;
  }catch(err){$('message').textContent=`Online lookup unavailable: ${err.message}`;}finally{button.disabled=false;}
});
$('runBayes').addEventListener('click',()=>{
  try{const obj=JSON.parse($('modelJson').value);const posterior=bayesianUpdate(obj.prior,obj.evidence);$('bayesResult').textContent=`Posterior probability: ${(posterior*100).toFixed(2)}% (using only your supplied model; no claim of scientific validity).`;}
  catch(err){$('bayesResult').textContent=`Invalid model: ${err.message}`;}
});
$('saveJson').addEventListener('click',()=>{
  if(!lastResult)return;
  const blob=new Blob([JSON.stringify(lastResult,(k,v)=>k==='utcDate'?undefined:v,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download='vedic-chart-results.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
(async()=>{
  const status=$('offlineStatus');
  if(!('serviceWorker' in navigator)){status.textContent='Offline caching is not supported in this browser; the chart itself still needs no network.';return;}
  try{
    await navigator.serviceWorker.register('./sw.js');
    await navigator.serviceWorker.ready;
    const cache=await caches.open('vedic-birth-chart-v1');
    const cached=await cache.match('./app.js');
    status.textContent=cached?'✓ Offline files cached. You can turn on airplane mode.':'Site loaded. Offline cache may still be finishing.';
  }catch(err){status.textContent='Offline installation requires HTTPS (such as GitHub Pages), or localhost.';}
})();
