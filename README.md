# AirScope — weather, air quality & pollution trends

A no-framework website that shows the usual weather stuff **plus** how much air
pollution has actually risen where you are — for any area, district, state or
country on Earth.

## What it shows

| Section | What you get |
| --- | --- |
| Hero | Current temperature, condition, feels-like, today's high/low, live AQI badge, the administrative hierarchy (Area → District → State → Country), and a **real photo of a famous polluted area from the same country** (see below) |
| Air quality | US AQI with a colour gauge, a **plain-English summary** ("what this means today"), a ✔/✖ **do & don't checklist**, all six criteria pollutants measured against **WHO safe daily limits** (each with a one-line human description), and impact tiles (cigarette equivalent, days over the safe limit, visibility, worst pollutant) |
| What's going wrong & how to fix it | A plain-language diagnosis of this place right now (today's main culprit, how many recent days were over the safe limit, whether the trend is worsening) plus practical fixes — **what you can do** and **what your city / state / country can do** |
| Pollution trends | Daily averages of **PM2.5 or AQI** over the last 7 / 30 / 90 days, with the change vs the previous period (▲/▼ % + "in simple words" sentence), worst & best days, and a days-by-AQI-category breakdown. You can **compare up to 2 extra places** on the same chart |
| Next 24 hours | Hourly temperature, weather icon, rain chance and hourly AQI |
| 7-day forecast | Daily high/low, rain total and the day's average AQI |
| Where this data is from | Elevation, coordinates, time zone, population and the full administrative breadcrumb for the selected point |
| In simple words | Short FAQ at the bottom: what AQI and PM2.5 mean, why other apps (aqi.in, CPCB) show different numbers, what µg/m³ is, where the data comes from |

## Run it

Two options — no install, no build step:

1. **Just open the file** — double-click `index.html` (your browser may warn
   about `file://`; if everything shows but the data doesn't load, use option 2).
2. **Tiny local server** (recommended):

   ```bash
   node server.js            # → http://localhost:5173
   ```

Everything is static files (`index.html`, `css/`, `js/`), so you can also drop
the folder onto GitHub Pages, Netlify, Cloudflare Pages, or any web host.

## How the data works

All data comes from **[Open-Meteo](https://open-meteo.com/)** — free, no API
key, no sign-up:

- **Forecast API** — current conditions, hourly and 7-day weather.
- **Air Quality API** — current pollutants + hourly history (we pull the last
  **92 days**) and a 7-day AQI forecast.
- **Geocoding API** — place search, including countries (`feature_code: PCLI`),
  states/cities (results carry `admin1`/`admin2`, which is how the
  Area/District/State/Country breadcrumb is built).
- **BigDataCloud reverse geocode** — only used by the "My location" button to
  name your coordinates (falls back gracefully).

### How "how much has pollution increased" is calculated

The site aggregates the hourly history into **daily averages**, then compares
the last *N* days with the *N* days before that (7 vs previous 7, 30 vs previous
30, 90 vs previous 90). The ▲/▼ % is that change in the daily average. Rain,
wind, festivals and crop-burning seasons make these swings large — the trend is
a local measurement, not a global census.

> Note: the **US AQI is computed on this site** from Open-Meteo's modelled
> pollutant concentrations using the official EPA breakpoint tables (and we
> show *which pollutant drives the number*). Ground monitoring stations
> (CPCB in India, aqi.in, IQAir, etc.) measure at street level and will often
> read higher or lower — that's a difference in data source, not a bug.

### The photo in the hero

When you pick a place, the hero card shows a real photo of a **famous polluted
area from the same country** — the nearest one in our curated list (Germany →
the Ruhr's Duisburg steelworks; India → Delhi / Mumbai / Kanpur smog; UK → the
1952 Great London Smog; China → Beijing's Forbidden City in smog; …). If the
spot is more than 40 km away the caption says how far. Photos come from
**Wikimedia Commons** — hover the caption to see the photographer and licence.
The list lives in `CFG.pollutionShots` in `js/config.js`; add your own spots
there (country code + coordinates + image URL + caption + credit).

## Customising

- **Default location** → `CFG.defaultPlace` in `js/config.js`
- **Colours / theme** → CSS variables at the top of `css/style.css`
- **Quick-pick cities** → `CFG.quickPlaces` in `js/config.js`
- **Humidity/units** → the °C/°F toggle is remembered per browser

## Files

```
index.html        markup + layout
css/style.css     the whole design (dark glass, responsive)
js/config.js      constants: endpoints, WHO limits, defaults, hero photos
js/aqi.js         AQI categories, colours, advice, health math
js/icons.js       inline SVG weather + UI icons (no icon fonts)
js/api.js         Open-Meteo fetch + daily aggregation + stats
js/charts.js      hand-rolled SVG line chart with tooltips + AQI bars
js/app.js         state, rendering, search, compare, geolocation
server.js         optional zero-dependency static server
```
