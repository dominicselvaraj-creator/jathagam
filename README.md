# Offline Vedic Birth Chart — browser-only starter

A privacy-first static site. When built and deployed to GitHub Pages, the complete Astronomy Engine JS code and **full Moment Timezone IANA time-zone database** are bundled in `app.js` by esbuild. There are no third-party runtime scripts, fonts, analytics, trackers or server-side chart calculations.

**What it does now:** enter date, local time, latitude, longitude and IANA time-zone ID; compute geocentric Sun/Moon/planets, a mean-node Rahu/Ketu, sidereal rāsi and ascendant, nakshatra and pada, instantaneous tithi/yoga/karana/weekday, Vimshottari mahadashas, and a simple Sevvai/Manglik screen. It includes a South Indian rāsi chart, a purely optional geocoding button and an optional offline mathematical Bayesian updater.

**What it does not yet do:** astrologer-grade Chitrapaksha/Lahiri ayanamsa, precise historical standard validation, true-node Rahu/Ketu, sunrise-based day panchangam, festival calculations, antardashas, comprehensive dosham rules/cancellations, sourced traditional Palan predictions or empirically calibrated Bayesian likelihoods. The ayanamsa is a **linear approximation** and can change sign classification near boundaries. Do not label this prototype a certified horoscope/panchangam. Astrology is a traditional interpretive system; its predictive claims are not scientifically established.

## Build

Requires Node.js 20+ and internet on the **developer's build computer once**, to install the libraries:

```sh
npm install
npm test
npm run build
```

This produces `dist/` with `index.html`, `app.js` (fully bundled), `style.css`, `sw.js`, and `manifest.webmanifest`. Upload the **contents** of `dist/` to any HTTPS static host. **The visitor's phone needs no npm, no backend and no API keys.**

For local testing, host `dist/` over localhost:

```sh
cd dist
python3 -m http.server 8080
```

Then visit http://localhost:8080 . Don't open the HTML with `file://` because service workers require HTTP localhost or HTTPS.

## GitHub Pages

1. Create a GitHub repository and copy the project files to the main branch.
2. In repository **Settings → Pages → Build and deployment**, set **Source: GitHub Actions**.
3. Push to `main`: the included workflow builds `dist/` and deploys it.
4. Open the published URL online once, and wait for the "Offline files cached" message.
5. Activate airplane mode. Reload the page (or navigate back to it), enter coordinates plus the IANA time zone (e.g., `Asia/Kolkata`), and tap **Calculate on this device**.

The chart runs without any network. **Place-name lookup is the only explicit external request**; that button sends the typed place name to Open-Meteo (not the birth date or time). Geocoding is not used during Calculate. On first install the service worker caches all five site assets for future offline visits; browser cache/site-data clearing will remove them. Some OS/browser combinations can evict service-worker caches.

## Privacy

- Date, time, location coordinates and time zone stay in local browser memory, not on a server.
- Birth data are not placed in the URL, cookies, localStorage or IndexedDB.
- Clicking **Download results as JSON** writes a local file only.
- The service worker only intercepts same-origin static files; it never transmits birth details.
- The browser loads the initial site from your GitHub Pages origin and GitHub may receive standard HTTP connection metadata, but not birth form fields.
- No remote fonts or CDN references in the deployed page.

## Calculation choices

- `Astronomy.Ecliptic(Astronomy.GeoVector(..., true)).elon` supplies **geocentric** tropical longitude. Do NOT call `Astronomy.EclipticLongitude`, which is **heliocentric**.
- Moon uses `Astronomy.EclipticGeoMoon().lon`.
- The rising intersection of horizon/ecliptic is selected by local hour angle; then the approximate Lahiri ayanamsa is subtracted.
- Mean lunar node from a simple standard mean-longitude polynomial; Ketu opposite.
- Nakshatra: 27 equal 13°20′ segments, four padas each.
- Dasha starting lord and balance from Moon's nakshatra fraction; year conversion is 365.2425 days (not savana 360 days).
- Tithi by Moon−Sun elongation (12° intervals), yoga by sidereal Moon+Sun (13°20′), karana by half-tithi (6°).
- A **simple** Manglik check flags Mars in whole-sign houses 1,2,4,7,8,12 from lagnam; there is no exception logic.
- Time zone uses **bundled Moment Timezone data**, including DST history known to that database. Ambiguous repeated clock hours are not resolved in this starter; corroborate the UTC offset if birth time lands in a DST rollback hour. Historic time-zone records are imperfect and can change.

## Extending the site

Palan: supply your exact interpretive texts and source/tradition plus conditions, priorities, exceptions, and conflicts. Then implement these as deterministic testable rules in `src/main.js` or a new rules module. Dosham also needs selected school and exception rules.

Bayesian check: the optional math function `bayesianUpdate(prior, evidence)` accepts your actual numerical prior and conditional likelihoods. For example `{ "prior": 0.2, "evidence": [{"label":"Positive outcome","likelihoodIfTrue":0.7,"likelihoodIfFalse":0.2}] }` returns a posterior, but these **example numbers are fabricated** solely to explain arithmetic; they're not statistical evidence for astrology. Repeated evidence must be conditionally independent for simple sequential multiplication, otherwise use a joint model.

## Validation / production caveat

Compare a table of verified birth examples and near-boundary times with a trusted ephemeris/panchangam. Replace approximate ayanamsa with an exact cited formula or validated authoritative dataset before claiming high precision. Check pre-1970 historical time zones and near-polar locations. The included tests cover pure-math invariants, not astronomy-engine numerical accuracy or IANA timezone completeness; those libraries are brought in during build and can be tested further after installation.
