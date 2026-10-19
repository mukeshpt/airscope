/* AirScope — app state, rendering, and interactions. */
(() => {
  const CFG = AirScope.CFG;
  const AQI = AirScope.AQI;
  const fmt = AirScope.fmt;
  const icons = AirScope.icons;
  const api = AirScope.api;
  const charts = AirScope.charts;

  const $ = (id) => document.getElementById(id);

  const S = {
    unit: localStorage.getItem(CFG.localStorageKeys.unit) === 'F' ? 'F' : 'C',
    place: null,
    weather: null,
    air: null,
    weatherDaily: null,
    airDaily: null,
    airHourlyAqi: null,
    trendKey: 'pm2_5',
    range: 30,
    compare: [],
    comparePick: false,
    toastTimer: null,
  };

  /* ------------------------------------------------------------- helpers */

  function shortCat(cat) {
    return cat.label === 'Unhealthy for Sensitive Groups' ? 'Sensitive groups' : cat.label;
  }

  function levelFor(place) {
    const fc = place.feature_code || '';
    if (fc.startsWith('PCLI')) return 'Country';
    if (fc.startsWith('ADM1')) return 'State';
    if (fc.startsWith('ADM2')) return 'District';
    if (fc.startsWith('PPL')) return 'Area';
    return 'Area';
  }

  function crumbsHtml(place) {
    const parts = [];
    const seen = new Set();
    const add = (lvl, val) => {
      if (val === null || val === undefined || val === '') return;
      const key = String(val).toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      parts.push({ lvl, val });
    };

    const head = levelFor(place);
    add(head, place.name);
    if (head !== 'District') add('District', place.admin2);
    if (head !== 'State') add('State', place.admin1);
    if (head !== 'Country') add('Country', place.country);

    return parts
      .map((p, i) => {
        const val =
          p.lvl === 'Country' && place.country_code
            ? `${fmt.flag(place.country_code)} ${fmt.escape(p.val)}`
            : fmt.escape(p.val);
        const sep = i > 0 ? '<span class="crumb-sep">›</span>' : '';
        return `${sep}<span class="crumb"><span class="crumb-lvl">${p.lvl}</span>${val}</span>`;
      })
      .join('');
  }

  function skLines(n, width = '100%') {
    return Array.from({ length: n }, () => `<div class="sk sk-line" style="width:${width}"></div>`).join('');
  }

  function showSkeletons() {
    $('heroTemp').innerHTML = '<div class="sk" style="width:190px;height:72px"></div>';
    $('heroCondition').innerHTML = '<div class="sk sk-line" style="width:150px"></div>';
    $('heroSub').innerHTML = '<div class="sk sk-line" style="width:280px"></div>';
    $('heroAqiChip').innerHTML = '<div class="sk sk-chip"></div>';
    $('heroPlaceName').innerHTML = '<div class="sk sk-line" style="width:170px"></div>';
    $('heroCrumbs').innerHTML = '<div class="sk sk-line" style="width:320px"></div>';
    $('aqiValue').textContent = '–';
    $('aqiCategory').innerHTML = '<div class="sk sk-line" style="width:160px"></div>';
    $('aqiGauge').innerHTML = '<div class="sk" style="height:14px;border-radius:999px"></div>';
    $('airAdvice').innerHTML = skLines(3);
    $('pollutants').innerHTML = skLines(5);
    $('airImpact').innerHTML = skLines(3);
    $('fixWhat').innerHTML = skLines(4);
    $('fixHow').innerHTML = skLines(3);
    $('trendChart').innerHTML = '<div class="sk" style="height:240px"></div>';
    $('trendStats').innerHTML = skLines(3);
    $('trendDist').innerHTML = skLines(2);
    $('trendLead').innerHTML = '<div class="sk sk-line" style="width:70%"></div>';
    $('hourlyStrip').innerHTML = '<div class="sk" style="height:110px;width:100%"></div>';
    $('dailyGrid').innerHTML = '<div class="sk" style="height:130px;width:100%"></div>';
    $('detailsGrid').innerHTML = skLines(8);
    $('placeMeta').innerHTML = skLines(2);
    $('crumbList').innerHTML = '';
  }

  function showToast(msg) {
    $('toastMsg').textContent = msg;
    $('toast').hidden = false;
    clearTimeout(S.toastTimer);
    S.toastTimer = setTimeout(hideToast, 12000);
  }

  function hideToast() {
    $('toast').hidden = true;
    clearTimeout(S.toastTimer);
  }

  function syncUrl(place) {
    const p = new URLSearchParams();
    p.set('lat', place.latitude.toFixed(3));
    p.set('lon', place.longitude.toFixed(3));
    p.set('name', place.name || '');
    if (place.admin1) p.set('admin1', place.admin1);
    if (place.admin2) p.set('admin2', place.admin2);
    if (place.country) p.set('country', place.country);
    if (place.country_code) p.set('cc', place.country_code);
    history.replaceState(null, '', `${location.pathname}?${p.toString()}`);
  }

  /* --------------------------------------------------------------- loading */

  async function loadPlace(place, { silent = false } = {}) {
    S.place = place;
    try {
      localStorage.setItem(CFG.localStorageKeys.place, JSON.stringify(place));
    } catch {
      /* private mode — fine */
    }
    syncUrl(place);
    if (!silent) showSkeletons();

    try {
      const [weather, air] = await Promise.all([
        api.fetchWeather(place.latitude, place.longitude),
        api.fetchAir(place.latitude, place.longitude, { force: true }),
      ]);
      S.weather = weather;
      S.air = air;
      S.weatherDaily = weather.daily;
      S.airDaily = api.aggregateDaily(air.hourly);
      S.airHourlyAqi = api.hourlyAqi(air.hourly);
      hideToast();
      renderAll();
      if (!S.compareRestored) {
        S.compareRestored = true;
        void restoreCompare();
      }
    } catch (err) {
      if (!silent) showToast(err && err.message ? err.message : 'Something went wrong loading this place.');
    }
  }

  function renderAll() {
    renderHero();
    renderAir();
    renderFixes();
    renderDetails();
    renderTrends();
    renderHourly();
    renderDaily();
    renderPlaces();
  }

  /** US AQI computed from the current pollutant concentrations (see aqi.js). */
  function currentAqiInfo() {
    return AQI.computeAqi(S.air.current);
  }

  /* -------------------------------------------- famous polluted-area photos */

  function haversineKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const rad = (d) => (d * Math.PI) / 180;
    const dLat = rad(lat2 - lat1);
    const dLon = rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  }

  /** Nearest famous polluted area from the same country as `place`, or null. */
  function pollutionShotFor(place) {
    if (!place || !place.country_code || !CFG.pollutionShots) return null;
    const cc = String(place.country_code).toUpperCase();
    const list = CFG.pollutionShots.filter((s) => s.cc === cc);
    if (!list.length) return null;
    let best = null;
    for (const s of list) {
      const dist = haversineKm(place.latitude, place.longitude, s.lat, s.lon);
      if (!best || dist < best.dist) best = { shot: s, dist };
    }
    return best;
  }

  /** Shows a real photo of a famous polluted area in the hero card. */
  function applyHeroPhoto(place) {
    const img = $('heroPhoto');
    const note = $('heroPhotoNote');
    const pick = pollutionShotFor(place);
    if (!pick) {
      img.classList.remove('is-on');
      img.removeAttribute('data-src');
      note.hidden = true;
      return;
    }
    const { shot, dist } = pick;
    const rounded = dist < 98 ? Math.max(1, Math.round(dist)) : Math.round(dist / 10) * 10;
    note.innerHTML =
      `${icons.ui('camera', 13)}<span>${fmt.escape(shot.caption)}` +
      (dist >= 40 ? ` · <b>${rounded} km away</b>` : '') +
      '</span>';
    note.title = `Photo: ${shot.credit} · Wikimedia Commons`;
    note.hidden = false;

    const url = shot.img;
    if (img.dataset.src === url && img.classList.contains('is-on')) return;
    img.dataset.src = url;
    const loader = new Image();
    loader.onload = () => {
      if (img.dataset.src !== url) return;
      img.src = url;
      img.classList.add('is-on');
    };
    loader.onerror = () => {
      if (img.dataset.src !== url) return;
      img.classList.remove('is-on');
      note.hidden = true;
    };
    loader.src = url;
  }

  /* ------------------------------------------------------------------ hero */

  function renderHero() {
    const cur = S.weather.current;
    const d = S.weatherDaily;

    $('heroIcon').innerHTML = icons.weather(cur.weather_code, cur.is_day === 1, 96);
    $('heroTemp').innerHTML = `${fmt.temp(cur.temperature_2m, S.unit)}<span class="temp-unit">${S.unit}</span>`;
    $('heroCondition').textContent = icons.condition(cur.weather_code);
    $('heroSub').innerHTML =
      `Feels like ${fmt.temp(cur.apparent_temperature, S.unit)} · H ${fmt.temp(d.temperature_2m_max[0], S.unit)} / L ${fmt.temp(d.temperature_2m_min[0], S.unit)} · Humidity ${cur.relative_humidity_2m}%`;

    const info = currentAqiInfo();
    const cat = AQI.category(info.aqi);
    $('heroAqiChip').innerHTML = cat
      ? `<span class="aqi-chip" style="--chip-color:${cat.color}"><span class="dot"></span>AQI ${info.aqi}<span class="chip-label">${shortCat(cat)}</span></span>`
      : '';

    $('heroPlaceName').textContent = S.place.name || '—';
    $('heroCrumbs').innerHTML = crumbsHtml(S.place);
    $('heroUpdated').textContent = `Updated ${fmt.hhmm(cur.time)} local time`;
    document.title = `${fmt.temp(cur.temperature_2m, S.unit)}${S.unit} · AQI ${info.aqi ?? '—'} — ${S.place.name} | AirScope`;

    applyHeroPhoto(S.place);
  }

  /* ------------------------------------------------------------------- air */

  function gaugeHtml(aqi) {
    const caps = AQI.CATEGORIES.map((c) => c.max);
    let prev = 0;
    let zones = '';
    let axis = '';
    for (let i = 0; i < AQI.CATEGORIES.length; i++) {
      const c = AQI.CATEGORIES[i];
      const w = ((c.max - prev) / 500) * 100;
      zones += `<div class="gauge-zone" style="width:${w}%;background:${c.color}"></div>`;
      axis += `<span style="width:${w}%;text-align:right">${c.max}${i < AQI.CATEGORIES.length - 1 ? '+' : ''}</span>`;
      prev = c.max;
    }
    const left = Math.min(99.5, AQI.gaugeFraction(aqi) * 100);
    return (
      `<div class="gauge-track">${zones}</div>` +
      `<div class="gauge-marker-wrap"><div class="gauge-marker" style="left:${left.toFixed(1)}%"></div></div>` +
      `<div class="gauge-axis">${axis}</div>`
    );
  }

  function renderAir() {
    const air = S.air.current;
    const info = currentAqiInfo();
    const cat = AQI.category(info.aqi);

    $('aqiValue').textContent = info.aqi === null ? '—' : info.aqi;
    $('aqiValue').style.color = cat ? cat.color : '';
    $('aqiCategory').innerHTML = cat
      ? `<div class="aqi-label" style="--cat:${cat.color}">${shortCat(cat)}</div>` +
        `<div class="aqi-simple">${cat.simple}</div>` +
        (info.driver
          ? `<div class="aqi-driver">Mostly caused by ${info.driver.human} · ${fmt.round(info.driver.value, info.driver.value < 10 ? 1 : 0)} ${info.driver.unit}</div>`
          : '') +
        `<div class="aqi-scale-note">US EPA method, using this location's pollutant readings · European AQI ${air.european_aqi ?? '—'} · model grid data</div>`
      : '<div class="aqi-label">No AQI data</div>';
    $('airUpdated').textContent = `Updated ${fmt.hhmm(air.time)}`;

    $('aqiGauge').innerHTML = gaugeHtml(info.aqi);

    $('airAdvice').innerHTML = cat
      ? `<div class="advice" style="--adv-color:${cat.color}"><div class="advice-title">${icons.ui('mask', 17)} ${cat.label} — what to do</div>` +
        `<ul>${cat.advice.map((a) => `<li>${a}</li>`).join('')}</ul>` +
        `<div class="checklist">${cat.checklist
          .map((c) => `<span class="chk ${c.ok ? 'ok' : 'no'}"><span class="chk-ico">${c.ok ? '✔' : '✖'}</span>${c.t}</span>`)
          .join('')}</div></div>`
      : '';

    $('pollutants').innerHTML = CFG.pollutants
      .map((p) => {
        const v = air[p.key];
        if (v === null || v === undefined) return '';
        const mult = AQI.whoMultiple(v, p.who);
        const color = AQI.multipleColor(mult);
        const pct = Math.min(100, (v / (p.who * 4)) * 100);
        const multTxt = mult <= 1 ? 'within safe limit' : `${mult.toFixed(1)}× safe limit`;
        return (
          `<div class="pol-row" style="--mult-color:${color}">` +
          `<div><div class="pol-name">${p.label}</div>` +
          `<div class="pol-desc">${fmt.escape(p.note)}</div>` +
          `<div class="pol-val">${fmt.round(v, v < 10 ? 1 : 0)} <small>${p.unit}</small></div></div>` +
          `<div class="pol-bar-wrap"><div class="pol-bar">` +
          `<div class="pol-fill" style="width:${pct.toFixed(1)}%"></div>` +
          `<div class="pol-who" style="left:25%" title="WHO recommended daily limit: ${p.who} ${p.unit}"></div>` +
          `</div><span class="pol-mult" title="Safe limit = the World Health Organization's recommended limit for a full day">${multTxt}</span></div>` +
          `</div>`
        );
      })
      .join('');

    $('airImpact').innerHTML = impactHtml(air);
  }

  function impactHtml(air) {
    const cigs = AQI.cigarettesPerDay(air.pm2_5);
    const todayStr = (S.air.current.time || '').slice(0, 10);
    const pastdays = S.airDaily.dates.filter((d) => d <= todayStr);
    const over = pastdays.filter((d) => {
      const i = S.airDaily.dates.indexOf(d);
      const v = S.airDaily.pm2_5[i];
      return v !== null && v !== undefined && v > 15;
    }).length;

    const hi = api.currentHourIndex(S.weather.hourly, S.weather.current.time);
    const visM = S.weather.hourly.visibility[hi];
    const visKm = visM === null || visM === undefined ? null : visM / 1000;

    let worst = null;
    CFG.pollutants.forEach((p) => {
      const v = air[p.key];
      if (v === null || v === undefined) return;
      const mult = AQI.whoMultiple(v, p.who);
      if (!worst || mult > worst.mult) worst = { label: p.label, mult, color: AQI.multipleColor(mult) };
    });

    const tiles = [];
    tiles.push(
      `<div class="impact-tile"><div class="impact-k">Cigarette equivalent</div>` +
        `<div class="impact-v">≈${cigs === null ? '—' : cigs < 0.1 ? '&lt;0.1' : cigs.toFixed(1)}<small>/day</small></div>` +
        `<div class="impact-sub">A full day in this air ≈ this many cigarettes (common comparison)</div></div>`,
    );
    tiles.push(
      `<div class="impact-tile"><div class="impact-k">Days over the safe limit</div>` +
        `<div class="impact-v">${over}<small>of ${pastdays.length}</small></div>` +
        `<div class="impact-sub">Days PM2.5 was above the WHO's safe daily limit (15 µg/m³)</div></div>`,
    );
    if (visKm !== null) {
      const mood = visKm < 5 ? 'Hazy — pollution + humidity' : visKm < 10 ? 'Slightly reduced' : 'Clear';
      tiles.push(
        `<div class="impact-tile"><div class="impact-k">Visibility now</div>` +
          `<div class="impact-v">${visKm.toFixed(0)}<small>km</small></div>` +
          `<div class="impact-sub">${mood}</div></div>`,
      );
    }
    if (worst) {
      tiles.push(
        `<div class="impact-tile"><div class="impact-k">Worst pollutant vs safe limit</div>` +
          `<div class="impact-v" style="color:${worst.color}">${worst.label}</div>` +
          `<div class="impact-sub">${worst.mult.toFixed(1)}× the WHO's recommended daily limit</div></div>`,
      );
    }
    return tiles.join('');
  }

  /* --------------------------------------------------- what's wrong & fixes */

  function renderFixes() {
    const air = S.air.current;
    const info = currentAqiInfo();
    const cat = AQI.category(info.aqi);
    const todayStr = (air.time || '').slice(0, 10);
    const pastDates = S.airDaily.dates.filter((d) => d <= todayStr);
    const last30 = pastDates.slice(Math.max(0, pastDates.length - 30));

    /* --- what's going wrong, in plain words --- */
    const rows = [];
    if (cat && info.aqi !== null) {
      const tone = info.aqi <= 50 ? 'ok' : info.aqi <= 100 ? 'warn' : 'bad';
      rows.push({ tone, text: `Air today is <b>${cat.label}</b> (AQI ${info.aqi}).` });
    }
    if (info.driver) {
      const p = CFG.pollutants.find((x) => x.key === info.driver.key);
      const v = p ? air[p.key] : null;
      if (p && v !== null && v !== undefined) {
        const mult = AQI.whoMultiple(v, p.who);
        if (mult !== null && mult > 1) {
          rows.push({
            tone: mult >= 2 ? 'bad' : 'warn',
            text: `The main culprit is <b>${p.label}</b> — ${p.note.toLowerCase()}. It is <b>${mult.toFixed(1)}× the WHO safe limit</b> right now.`,
          });
        } else {
          rows.push({
            tone: 'ok',
            text: `The main pollutant today is <b>${p.label}</b> (${p.note.toLowerCase()}) — still within the WHO's safe limit.`,
          });
        }
      }
    }
    if (last30.length >= 7) {
      let over = 0;
      let have = 0;
      last30.forEach((d) => {
        const i = S.airDaily.dates.indexOf(d);
        const v = S.airDaily.pm2_5[i];
        if (v === null || v === undefined) return;
        have += 1;
        if (v > 15) over += 1;
      });
      if (have >= 5) {
        rows.push(
          over > 0
            ? {
                tone: over > have / 2 ? 'bad' : 'warn',
                text: `PM2.5 — the most harmful pollutant — was <b>above the safe limit on ${over} of the last ${have} days</b>.`,
              }
            : {
                tone: 'ok',
                text: `PM2.5 stayed <b>within the safe limit on all of the last ${have} days</b>.`,
              },
        );
      }
    }
    const d60 = pastDates.slice(Math.max(0, pastDates.length - 60));
    const st = api.trendStats(d60, alignedSeries(S.airDaily, 'pm2_5', d60), 30);
    if (st && st.changePct !== null) {
      const pct = st.changePct;
      const flat = Math.abs(pct) < 5;
      rows.push({
        tone: flat || pct < 0 ? 'ok' : pct > 15 ? 'bad' : 'warn',
        text: flat
          ? 'The trend is <b>steady</b> — PM2.5 is about the same as the previous month.'
          : pct > 0
            ? `The trend is <b>getting worse</b> — PM2.5 is up <b>${pct.toFixed(0)}%</b> compared with the previous month.`
            : `The trend is <b>getting better</b> — PM2.5 is down <b>${Math.abs(pct).toFixed(0)}%</b> compared with the previous month.`,
      });
    }
    $('fixWhat').innerHTML = rows
      .map(
        (r) =>
          `<div class="fix-item ${r.tone}"><span class="fx-ico">${r.tone === 'ok' ? '✔' : r.tone === 'warn' ? '!' : '✖'}</span><span>${r.text}</span></div>`,
      )
      .join('');

    /* --- how to fix it, split by who can act --- */
    const spec = (info.driver && CFG.fixes.byPollutant[info.driver.key]) || null;
    const you = [...(spec ? spec.person : []), ...CFG.fixes.generalPerson];
    const city = [...(spec ? spec.city : []), ...CFG.fixes.generalCity];

    $('fixHow').innerHTML =
      `<div class="fix-col fix-you"><h3>${icons.ui('mask', 15)} What you can do</h3><ul>${you
        .map((t) => `<li>${t}</li>`)
        .join('')}</ul></div>` +
      `<div class="fix-col fix-city"><h3>${icons.ui('pin', 15)} What your city / state / country can do</h3><ul>${city
        .map((t) => `<li>${t}</li>`)
        .join('')}</ul></div>`;
  }

  /* --------------------------------------------------------------- details */

  function renderDetails() {
    const w = S.weather;
    const cur = w.current;
    const h = w.hourly;
    const d = w.daily;
    const hi = api.currentHourIndex(h, cur.time);

    const uv = h.uv_index[hi] ?? d.uv_index_max[0];
    const uvLvl = fmt.uvLevel(uv);
    const vis = h.visibility[hi];
    const dew = h.dew_point_2m[hi];
    const today = d.time[0];
    let pop = null;
    for (let i = 0; i < h.time.length; i++) {
      if (h.time[i].slice(0, 10) !== today) continue;
      const p = h.precipitation_probability[i];
      if (p !== null && (pop === null || p > pop)) pop = p;
    }

    const items = [
      { icon: 'droplet', k: 'Humidity', v: `${cur.relative_humidity_2m}<small>%</small>`, sub: `Dew point ${fmt.temp(dew, S.unit)}` },
      {
        icon: 'wind',
        k: 'Wind',
        v: `${fmt.wind(cur.wind_speed_10m, S.unit)}<small>${fmt.windUnit(S.unit)}</small>`,
        sub: `From ${fmt.compass(cur.wind_direction_10m)} <span class="wind-arrow" style="transform:rotate(${((cur.wind_direction_10m ?? 0) + 180).toFixed(0)}deg)">↑</span>`,
      },
      { icon: 'gust', k: 'Gusts', v: `${fmt.wind(cur.wind_gusts_10m, S.unit)}<small>${fmt.windUnit(S.unit)}</small>`, sub: 'Peak gusts' },
      { icon: 'gauge', k: 'Pressure', v: `${Math.round(cur.pressure_msl)}<small>hPa</small>`, sub: 'At sea level' },
      { icon: 'cloud', k: 'Cloud cover', v: `${cur.cloud_cover}<small>%</small>`, sub: cur.cloud_cover > 60 ? 'Mostly cloudy' : cur.cloud_cover > 25 ? 'Partly cloudy' : 'Mostly clear' },
      {
        icon: 'eye',
        k: 'Visibility',
        v: vis === null || vis === undefined ? '—' : `${(vis / 1000).toFixed(0)}<small>km</small>`,
        sub: vis !== null && vis / 1000 < 10 ? 'Reduced by haze' : 'Clear line of sight',
      },
    ];

    if (uv !== null && uv !== undefined) {
      items.push({
        icon: 'sun',
        k: 'UV index',
        v: `${Math.round(uv)}<small style="color:${uvLvl ? uvLvl.color : 'inherit'}">${uvLvl ? uvLvl.label : ''}</small>`,
        sub: '',
        extra: `<div class="uv-bar"><div class="uv-pin" style="left:${Math.min(100, (uv / 12) * 100).toFixed(1)}%"></div></div>`,
      });
    }
    items.push({
      icon: 'umbrella',
      k: 'Rain today',
      v: `${d.precipitation_sum[0] ?? 0}<small>mm</small>`,
      sub: pop !== null ? `Chance: up to ${pop}%` : 'Expected today',
    });
    items.push({ icon: 'sunrise', k: 'Sunrise', v: fmt.hhmm(d.sunrise[0]), sub: 'Local time' });
    items.push({ icon: 'sunset', k: 'Sunset', v: fmt.hhmm(d.sunset[0]), sub: 'Local time' });

    $('detailsGrid').innerHTML = items
      .map(
        (it) =>
          `<div class="detail-item"><div class="detail-top">${icons.ui(it.icon, 15)}${it.k}</div>` +
          `<div class="detail-v">${it.v}</div>` +
          `${it.extra || (it.sub ? `<div class="detail-sub">${it.sub}</div>` : '')}</div>`,
      )
      .join('');
  }

  /* ---------------------------------------------------------------- trends */

  /** Values of `daily[key]` aligned (by date) to the given dates; null where missing. */
  function alignedSeries(daily, key, dates) {
    const map = new Map(daily.dates.map((d, i) => [d, daily[key][i]]));
    return dates.map((d) => (map.has(d) ? map.get(d) : null));
  }

  function renderTrends() {
    const daily = S.airDaily;
    const key = S.trendKey;
    const range = S.range;
    const unit = key === 'us_aqi' ? '' : 'µg/m³';
    const metric = key === 'us_aqi' ? 'AQI' : 'PM2.5';

    const today = (S.air.current.time || '').slice(0, 10);
    const pastDates = daily.dates.filter((d) => d <= today);
    const chartDates = pastDates.slice(Math.max(0, pastDates.length - range));
    const statDates = pastDates.slice(Math.max(0, pastDates.length - 2 * range));

    const places = [
      { place: S.place, daily, color: '#38bdf8' },
      ...S.compare.map((c) => ({ place: c.place, daily: c.daily, color: c.color })),
    ];

    const series = places.map((p) => ({
      name: p.place.name || 'This place',
      color: p.color,
      values: alignedSeries(p.daily, key, chartDates),
    }));

    const bands =
      key === 'us_aqi'
        ? AQI.CATEGORIES.map((c, i) => ({ from: i === 0 ? 0 : AQI.CATEGORIES[i - 1].max, to: c.max, color: c.color }))
        : [];

    charts.line($('trendChart'), { dates: chartDates, series, bands, unit, height: 250 });

    /* lead sentence (main place, 2× window for comparison) */
    const st = api.trendStats(statDates, alignedSeries(daily, key, statDates), range);
    const unitTxt = unit ? ` ${unit}` : '';
    const rangeWord = range === 7 ? 'week' : range === 30 ? 'month' : '3 months';
    let lead;
    if (st.curAvg !== null) {
      lead = `<b>${fmt.escape(S.place.name)}</b>'s ${metric} averaged <b>${st.curAvg.toFixed(1)}${unitTxt}</b> over the last ${range} days`;
      if (st.changePct !== null) {
        const up = st.changePct > 0;
        const flat = Math.abs(st.changePct) < 1;
        const cls = flat ? '' : up ? 'delta-up' : 'delta-down';
        const arrow = flat ? '→' : up ? '▲' : '▼';
        lead += ` — <span class="${cls}">${arrow} ${Math.abs(st.changePct).toFixed(0)}% ${
          flat ? 'about the same' : up ? 'higher' : 'lower'
        }</span> than the previous ${range} days.`;
        lead += flat
          ? ` In simple words: not much has changed compared with the previous ${rangeWord}.`
          : ` In simple words: the air is getting ${up ? 'worse' : 'cleaner'} than last ${rangeWord}.`;
      } else {
        lead += '. Not enough history yet to compare with the previous period.';
      }
    } else {
      lead = 'Not enough air-quality data for this place yet.';
    }
    $('trendLead').innerHTML = lead;

    /* compare chips */
    $('compareChips').innerHTML = S.compare
      .map(
        (c, i) =>
          `<span class="cmp-chip" style="--c:${c.color}"><span class="cmp-dot"></span>${fmt.escape(c.place.name)}` +
          `<button class="cmp-x" data-remove="${i}" title="Remove">×</button></span>`,
      )
      .join('');

    /* stat tiles */
    $('trendStats').innerHTML = places
      .map((p, k) => {
        const stt = k === 0 ? st : api.trendStats(statDates, alignedSeries(p.daily, key, statDates), range);
        const avgTxt = stt.curAvg === null ? '—' : stt.curAvg.toFixed(1);
        let deltaHtml = '<div class="stat-delta flat">No comparison data</div>';
        if (stt.changePct !== null) {
          const up = stt.changePct > 0;
          const flat = Math.abs(stt.changePct) < 1;
          deltaHtml =
            `<div class="stat-delta ${flat ? 'flat' : up ? 'up' : 'down'}">` +
            `${flat ? '→' : up ? '▲' : '▼'} ${Math.abs(stt.changePct).toFixed(0)}% vs previous ${range}d</div>`;
        }
        const sub =
          stt.prevAvg === null
            ? ''
            : `Prev ${stt.prevAvg.toFixed(1)}${unitTxt}` +
              (stt.worst ? ` · Worst ${stt.worst.value.toFixed(1)} (${fmt.dateLabel(stt.worst.date)})` : '');
        return (
          `<div class="stat-tile"><div class="stat-place"><span class="cmp-dot" style="background:${p.color}"></span><b>${fmt.escape(p.place.name)}</b></div>` +
          `<div class="stat-v">${avgTxt}<small>${metric === 'AQI' ? 'AQI' : unitTxt.trim()}</small></div>` +
          `${deltaHtml}<div class="stat-sub">${sub || `Last ${range} days`}</div></div>`
        );
      })
      .join('');

    /* distribution (AQI always) */
    const aqiValues = alignedSeries(daily, 'us_aqi', chartDates);
    const counts = api.categoryCounts(chartDates, aqiValues);
    charts.distribution($('trendDist'), counts, chartDates.length);
    $('distNote').textContent = `last ${range} days at this location`;
  }

  /* ---------------------------------------------------------------- hourly */

  function renderHourly() {
    const h = S.weather.hourly;
    const cur = S.weather.current;
    const ai = api.currentHourIndex(h, cur.time);
    const airIdx = new Map(S.air.hourly.time.map((t, i) => [t, i]));

    let html = '';
    for (let k = 0; k < 24 && ai + k < h.time.length; k++) {
      const i = ai + k;
      const t = h.time[i];
      const aqiIdx = airIdx.get(t);
      const aqi = aqiIdx === undefined ? null : (S.airHourlyAqi[aqiIdx] ?? null);
      const cat = AQI.category(aqi);
      html +=
        `<div class="hour-item${k === 0 ? ' is-now' : ''}">` +
        `<span class="hour-time">${k === 0 ? 'Now' : fmt.hhmm(t)}</span>` +
        icons.weather(h.weather_code[i], h.is_day[i] === 1, 34) +
        `<span class="hour-temp">${fmt.temp(h.temperature_2m[i], S.unit)}</span>` +
        `<span class="hour-pop">${h.precipitation_probability[i] > 0 ? `${h.precipitation_probability[i]}%` : ''}</span>` +
        (cat
          ? `<span class="hour-aqi" style="--c:${cat.color}" title="${shortCat(cat)}">${aqi}</span>`
          : '<span class="hour-aqi" style="visibility:hidden">·</span>') +
        `</div>`;
    }
    $('hourlyStrip').innerHTML = html;
  }

  /* ----------------------------------------------------------------- daily */

  function renderDaily() {
    const d = S.weatherDaily;
    let html = '';
    for (let i = 0; i < d.time.length; i++) {
      const date = d.time[i];
      const aqiIdx = S.airDaily.dates.indexOf(date);
      const aqi = aqiIdx === -1 ? null : S.airDaily.us_aqi[aqiIdx];
      const cat = AQI.category(aqi);
      const precip = d.precipitation_sum[i] ?? 0;
      html +=
        `<div class="day-item">` +
        `<span class="day-name">${i === 0 ? 'Today' : fmt.dayLabel(date)}</span>` +
        icons.weather(d.weather_code[i], true, 36) +
        `<span class="day-temps"><span class="day-hi">${fmt.temp(d.temperature_2m_max[i], S.unit)}</span> <span class="day-lo">${fmt.temp(d.temperature_2m_min[i], S.unit)}</span></span>` +
        `<span class="day-pop">${precip > 0 ? `${fmt.round(precip, 1)} mm` : ''}</span>` +
        (cat && aqi !== null
          ? `<span class="day-aqi" style="--c:${cat.color}" title="Avg air quality: ${shortCat(cat)}">${Math.round(aqi)}</span>`
          : `<span class="day-aqi" style="visibility:hidden">·</span>`) +
        `</div>`;
    }
    $('dailyGrid').innerHTML = html;
  }

  /* ---------------------------------------------------------------- places */

  function renderPlaces() {
    const w = S.weather;
    const p = S.place;
    const tz = (w.timezone || '').split('/').pop().replace(/_/g, ' ');

    const meta = [
      { k: 'Elevation', v: w.elevation !== undefined ? `${Math.round(w.elevation)}<small>m</small>` : '—', sub: 'Terrain height' },
      { k: 'Coordinates', v: `${p.latitude.toFixed(2)}, ${p.longitude.toFixed(2)}`, sub: 'Data point used' },
      { k: 'Time zone', v: fmt.escape(tz || '—'), sub: w.timezone || '' },
      {
        k: 'Population',
        v: p.population ? new Intl.NumberFormat(undefined, { notation: 'compact' }).format(p.population) : '—',
        sub: p.population ? 'Approx. city' : 'No data',
      },
    ];

    $('placeMeta').innerHTML = meta
      .map(
        (m) =>
          `<div class="detail-item"><div class="detail-top">${icons.ui('pin', 14)}${m.k}</div><div class="detail-v">${m.v}</div><div class="detail-sub">${m.sub}</div></div>`,
      )
      .join('');

    $('crumbList').innerHTML = crumbsHtml(p);
  }

  function renderQuickPlaces() {
    $('quickPlaces').innerHTML = CFG.quickPlaces.map((q) => `<button class="chip" type="button" data-q="${fmt.escape(q.q)}">${q.label}</button>`).join('');
  }

  /* ---------------------------------------------------------------- search */

  let searchTimer = null;
  let searchResults = [];
  let activeIdx = -1;
  let searchSeq = 0;

  async function runSearch(q) {
    const seq = ++searchSeq;
    if (!q || q.trim().length < 2) {
      searchResults = [];
      renderSearchResults();
      return;
    }
    try {
      const res = await api.searchPlaces(q);
      if (seq !== searchSeq) return;
      searchResults = res;
      activeIdx = res.length ? 0 : -1;
      renderSearchResults();
    } catch {
      if (seq === searchSeq) {
        searchResults = [];
        renderSearchResults('Search is unavailable right now.');
      }
    }
  }

  function renderSearchResults(errorMsg) {
    const ul = $('searchResults');
    const input = $('searchInput');
    if (errorMsg) {
      ul.innerHTML = `<li class="sr-empty">${fmt.escape(errorMsg)}</li>`;
      ul.hidden = false;
      input.setAttribute('aria-expanded', 'true');
      return;
    }
    if (!searchResults.length) {
      ul.hidden = true;
      input.setAttribute('aria-expanded', 'false');
      return;
    }
    ul.innerHTML = searchResults
      .map((r, i) => {
        const sub = [...new Set([r.admin2, r.admin1, r.country].filter(Boolean))].join(' · ');
        return (
          `<li class="sr-item${i === activeIdx ? ' is-active' : ''}" data-idx="${i}" role="option">` +
          `<span class="sr-flag">${fmt.flag(r.country_code)}</span><span class="sr-name">${fmt.escape(r.name)}</span>` +
          `<span class="sr-sub">${fmt.escape(sub)}</span></li>`
        );
      })
      .join('');
    ul.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  }

  function closeSearch() {
    $('searchResults').hidden = true;
    $('searchInput').setAttribute('aria-expanded', 'false');
    activeIdx = -1;
  }

  function pickResult(idx) {
    const r = searchResults[idx];
    if (!r) return;
    closeSearch();
    $('searchInput').value = '';
    searchResults = [];
    if (S.comparePick) {
      S.comparePick = false;
      setCompareMode(false);
      addCompare(r);
    } else {
      loadPlace(r);
    }
  }

  function setCompareMode(on) {
    S.comparePick = on;
    $('compareBanner').hidden = !on;
    $('searchInput').placeholder = on
      ? 'Search the place to compare with…'
      : 'Search any city, district or country…';
    if (on) $('searchInput').focus();
  }

  async function addCompare(place) {
    if (S.compare.length >= CFG.maxCompare) {
      showToast(`You can compare up to ${CFG.maxCompare} places — remove one first.`);
      return;
    }
    const all = [S.place, ...S.compare.map((c) => c.place)];
    if (all.some((p) => Math.abs(p.latitude - place.latitude) < 0.02 && Math.abs(p.longitude - place.longitude) < 0.02)) {
      showToast('That place is already on the chart.');
      return;
    }
    try {
      const air = await api.fetchAir(place.latitude, place.longitude);
      const daily = api.aggregateDaily(air.hourly);
      S.compare.push({ place, daily, color: CFG.compareColors[S.compare.length % CFG.compareColors.length] });
      saveCompare();
      renderTrends();
    } catch {
      showToast('Could not load data for that place.');
    }
  }

  function saveCompare() {
    try {
      localStorage.setItem(CFG.localStorageKeys.compare, JSON.stringify(S.compare.map((c) => c.place)));
    } catch {
      /* fine */
    }
  }

  /** Re-add previously pinned comparison places after a reload. */
  async function restoreCompare() {
    let stored = [];
    try {
      stored = JSON.parse(localStorage.getItem(CFG.localStorageKeys.compare) || '[]');
    } catch {
      stored = [];
    }
    if (!Array.isArray(stored)) return;

    for (const place of stored.slice(0, CFG.maxCompare)) {
      if (!place || !Number.isFinite(place.latitude)) continue;
      const dup = [S.place, ...S.compare.map((c) => c.place)].some(
        (p) => p && Math.abs(p.latitude - place.latitude) < 0.02 && Math.abs(p.longitude - place.longitude) < 0.02,
      );
      if (dup) continue;
      try {
        const air = await api.fetchAir(place.latitude, place.longitude);
        S.compare.push({
          place,
          daily: api.aggregateDaily(air.hourly),
          color: CFG.compareColors[S.compare.length % CFG.compareColors.length],
        });
      } catch {
        /* skip places that fail to load */
      }
    }
    if (S.compare.length) renderTrends();
  }

  /* ------------------------------------------------------------------ wire */

  function wireEvents() {
    /* search */
    const input = $('searchInput');
    input.addEventListener('input', () => {
      clearTimeout(searchTimer);
      const q = input.value;
      searchTimer = setTimeout(() => void runSearch(q), 260);
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (!searchResults.length) return;
        e.preventDefault();
        activeIdx = e.key === 'ArrowDown' ? (activeIdx + 1) % searchResults.length : (activeIdx - 1 + searchResults.length) % searchResults.length;
        renderSearchResults();
      } else if (e.key === 'Enter') {
        if (activeIdx >= 0) {
          e.preventDefault();
          pickResult(activeIdx);
        }
      } else if (e.key === 'Escape') {
        closeSearch();
        if (S.comparePick) setCompareMode(false);
      }
    });
    $('searchResults').addEventListener('click', (e) => {
      const li = e.target.closest('.sr-item');
      if (li) pickResult(Number(li.dataset.idx));
    });
    document.addEventListener('click', (e) => {
      if (!$('searchBox').contains(e.target)) closeSearch();
    });

    /* geolocate */
    $('btnGeo').addEventListener('click', () => {
      if (!navigator.geolocation) {
        showToast('Geolocation is not supported by this browser.');
        return;
      }
      const btn = $('btnGeo');
      btn.classList.add('is-busy');
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const { latitude, longitude } = pos.coords;
            let place;
            try {
              place = await api.reversePlace(latitude, longitude);
            } catch {
              place = { name: 'My location', admin1: null, admin2: null, country: null, country_code: null, latitude, longitude, feature_code: null, population: null };
            }
            await loadPlace(place);
          } finally {
            btn.classList.remove('is-busy');
          }
        },
        () => {
          btn.classList.remove('is-busy');
          showToast('Location permission was denied or unavailable.');
        },
        { timeout: 10000, maximumAge: 600000 },
      );
    });

    /* unit toggle */
    $('unitToggle').addEventListener('click', () => {
      S.unit = S.unit === 'C' ? 'F' : 'C';
      localStorage.setItem(CFG.localStorageKeys.unit, S.unit);
      $('unitToggle').textContent = `°${S.unit}`;
      if (S.weather) renderAll();
    });

    /* trend chips */
    $('modeChips').addEventListener('click', (e) => {
      const btn = e.target.closest('.chip');
      if (!btn) return;
      S.trendKey = btn.dataset.mode;
      [...$('modeChips').querySelectorAll('.chip')].forEach((c) => c.classList.toggle('is-on', c === btn));
      if (S.airDaily) renderTrends();
    });
    $('rangeChips').addEventListener('click', (e) => {
      const btn = e.target.closest('.chip');
      if (!btn) return;
      S.range = Number(btn.dataset.range);
      [...$('rangeChips').querySelectorAll('.chip')].forEach((c) => c.classList.toggle('is-on', c === btn));
      if (S.airDaily) renderTrends();
    });

    /* compare */
    $('btnAddCompare').addEventListener('click', () => {
      if (S.compare.length >= CFG.maxCompare) {
        showToast(`You can compare up to ${CFG.maxCompare} places — remove one first.`);
        return;
      }
      setCompareMode(true);
    });
    $('compareCancel').addEventListener('click', () => setCompareMode(false));
    $('compareChips').addEventListener('click', (e) => {
      const btn = e.target.closest('.cmp-x');
      if (!btn || !S.airDaily) return;
      S.compare.splice(Number(btn.dataset.remove), 1);
      S.compare.forEach((c, i) => {
        c.color = CFG.compareColors[i % CFG.compareColors.length];
      });
      saveCompare();
      renderTrends();
    });

    /* quick places */
    $('quickPlaces').addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-q]');
      if (!btn) return;
      try {
        const res = await api.searchPlaces(btn.dataset.q);
        if (res.length) loadPlace(res[0]);
      } catch {
        showToast('Search is unavailable right now.');
      }
    });

    /* toast retry */
    $('toastRetry').addEventListener('click', () => {
      hideToast();
      if (S.place) loadPlace(S.place);
    });
  }

  /* ------------------------------------------------------------------ boot */

  function placeFromUrl() {
    const p = new URLSearchParams(location.search);
    const lat = Number.parseFloat(p.get('lat'));
    const lon = Number.parseFloat(p.get('lon'));
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    return {
      name: p.get('name') || 'Pinned place',
      admin1: p.get('admin1'),
      admin2: p.get('admin2'),
      country: p.get('country'),
      country_code: p.get('cc'),
      latitude: lat,
      longitude: lon,
      feature_code: null,
      population: null,
    };
  }

  function boot() {
    renderQuickPlaces();
    wireEvents();
    $('unitToggle').textContent = `°${S.unit}`;

    let stored = null;
    try {
      stored = JSON.parse(localStorage.getItem(CFG.localStorageKeys.place) || 'null');
    } catch {
      stored = null;
    }
    const start = placeFromUrl() || (stored && Number.isFinite(stored.latitude) ? stored : null) || CFG.defaultPlace;
    loadPlace(start);

    setInterval(() => {
      if (S.place && !document.hidden) loadPlace(S.place, { silent: true });
    }, 10 * 60 * 1000);
  }

  boot();
})();
