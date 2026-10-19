/* AirScope — Open-Meteo data access + aggregation into daily series. */
window.AirScope = window.AirScope || {};

AirScope.api = (() => {
  const CFG = AirScope.CFG;
  const airCache = new Map();

  function qs(params) {
    return Object.entries(params)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');
  }

  const RETRY_STATUS = new Set([429, 500, 502, 503, 504]);

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  /** Fetch JSON with two retries and backoff — Open-Meteo occasionally rate-limits. */
  async function getJSON(url, attempt = 0) {
    let res;
    try {
      res = await fetch(url);
    } catch {
      if (attempt < 2) {
        await sleep(700 * (attempt + 1) ** 2);
        return getJSON(url, attempt + 1);
      }
      throw new Error('Could not reach the data service. Check your internet connection and try again.');
    }
    if (!res.ok) {
      if (RETRY_STATUS.has(res.status) && attempt < 2) {
        const after = Number(res.headers.get('retry-after'));
        const wait = Number.isFinite(after) && after > 0 ? Math.min(after * 1000, 5000) : 700 * (attempt + 1) ** 2;
        await sleep(wait);
        return getJSON(url, attempt + 1);
      }
      throw new Error(
        res.status === 429
          ? 'The data service is busy right now. Please try again in a minute.'
          : `The data service returned ${res.status}. Try again.`,
      );
    }
    return res.json();
  }

  /* ------------------------------------------------------------ geocoding */

  async function searchPlaces(q) {
    const query = (q || '').trim();
    if (query.length < 2) return [];
    const url = `${CFG.endpoints.geocode}?${qs({ name: query, count: 8, language: 'en', format: 'json' })}`;
    const data = await getJSON(url);
    return (data.results || []).map((r) => ({
      name: r.name,
      admin1: r.admin1 || null,
      admin2: r.admin2 || null,
      admin3: r.admin3 || null,
      country: r.country || null,
      country_code: r.country_code || null,
      latitude: r.latitude,
      longitude: r.longitude,
      feature_code: r.feature_code || null,
      population: r.population || null,
    }));
  }

  /** Best-effort reverse geocode for the "My location" button (free, keyless). */
  async function reversePlace(latitude, longitude) {
    const url = `${CFG.endpoints.reverse}?${qs({ latitude, longitude, localityLanguage: 'en' })}`;
    const d = await getJSON(url);
    const city = d.city || null;
    const locality = d.locality || d.localityName || null;
    return {
      name: locality && locality !== city ? locality : city || d.principalSubdivision || 'My location',
      admin2: city && city !== locality ? city : null,
      admin1: d.principalSubdivision || null,
      country: d.countryName || null,
      country_code: d.countryCode || null,
      latitude,
      longitude,
      feature_code: null,
      population: null,
    };
  }

  /* ------------------------------------------------------------- fetching */

  function weatherUrl(lat, lon) {
    return `${CFG.endpoints.weather}?${qs({
      latitude: lat,
      longitude: lon,
      timezone: 'auto',
      forecast_days: 7,
      current:
        'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m',
      hourly: 'temperature_2m,precipitation_probability,weather_code,uv_index,visibility,is_day,dew_point_2m',
      daily:
        'weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_sum,wind_speed_10m_max',
    })}`;
  }

  function airUrl(lat, lon) {
    return `${CFG.endpoints.air}?${qs({
      latitude: lat,
      longitude: lon,
      timezone: 'auto',
      past_days: 92,
      forecast_days: 7,
      current: 'us_aqi,european_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,dust',
      hourly: 'pm2_5,pm10,ozone,nitrogen_dioxide,sulphur_dioxide,carbon_monoxide',
    })}`;
  }

  function fetchWeather(lat, lon) {
    return getJSON(weatherUrl(lat, lon));
  }

  async function fetchAir(lat, lon, { force = false } = {}) {
    const key = `${Number(lat).toFixed(3)},${Number(lon).toFixed(3)}`;
    if (!force && airCache.has(key)) return airCache.get(key);
    const data = await getJSON(airUrl(lat, lon));
    if (airCache.size > 12) airCache.clear();
    airCache.set(key, data);
    return data;
  }

  /* ---------------------------------------------------------- aggregation */

  /** Hourly arrays → per-day averages. Missing values are ignored. */
  function aggregateDaily(hourly) {
    const keys = Object.keys(hourly).filter((k) => k !== 'time');
    const dates = [];
    const index = new Map();
    const sums = {};
    const counts = {};
    const hours = [];
    keys.forEach((k) => {
      sums[k] = [];
      counts[k] = [];
    });

    const n = hourly.time.length;
    for (let i = 0; i < n; i++) {
      const d = hourly.time[i].slice(0, 10);
      let j = index.get(d);
      if (j === undefined) {
        j = dates.length;
        index.set(d, j);
        dates.push(d);
        hours.push(0);
        keys.forEach((k) => {
          sums[k].push(0);
          counts[k].push(0);
        });
      }
      let hasAny = false;
      for (const k of keys) {
        const v = hourly[k][i];
        if (v !== null && v !== undefined) {
          sums[k][j] += v;
          counts[k][j] += 1;
          hasAny = true;
        }
      }
      if (hasAny) hours[j] += 1;
    }

    const out = { dates, hours };
    keys.forEach((k) => {
      out[k] = dates.map((_, j) => (counts[k][j] ? Math.round((sums[k][j] / counts[k][j]) * 10) / 10 : null));
    });

    /* Daily US AQI computed from the daily-average concentrations (EPA method). */
    out.us_aqi = dates.map((_, j) =>
      AirScope.AQI.computeAqi({
        pm2_5: out.pm2_5?.[j],
        pm10: out.pm10?.[j],
        ozone: out.ozone?.[j],
        nitrogen_dioxide: out.nitrogen_dioxide?.[j],
        sulphur_dioxide: out.sulphur_dioxide?.[j],
        carbon_monoxide: out.carbon_monoxide?.[j],
      }).aqi,
    );

    return out;
  }

  /** US AQI for each hourly row (used by the next-24-hours strip). */
  function hourlyAqi(hourly) {
    return hourly.time.map((_, i) =>
      AirScope.AQI.computeAqi({
        pm2_5: hourly.pm2_5?.[i],
        pm10: hourly.pm10?.[i],
        ozone: hourly.ozone?.[i],
        nitrogen_dioxide: hourly.nitrogen_dioxide?.[i],
        sulphur_dioxide: hourly.sulphur_dioxide?.[i],
        carbon_monoxide: hourly.carbon_monoxide?.[i],
      }).aqi,
    );
  }

  /** Average / previous-period / change / extremes over aligned date+value arrays. */
  function trendStats(dates, values, rangeDays) {
    const n = values.length;
    const curStart = Math.max(0, n - rangeDays);
    const prevStart = Math.max(0, n - 2 * rangeDays);
    const cur = values.slice(curStart);
    const prev = values.slice(prevStart, curStart);

    const avg = (arr) => {
      const f = arr.filter((v) => v !== null && v !== undefined);
      return f.length ? f.reduce((a, b) => a + b, 0) / f.length : null;
    };

    const curAvg = avg(cur);
    const prevAvg = avg(prev);
    const changePct = curAvg !== null && prevAvg !== null && prevAvg > 0 ? ((curAvg - prevAvg) / prevAvg) * 100 : null;

    let worst = null;
    let best = null;
    cur.forEach((v, i) => {
      if (v === null || v === undefined) return;
      const date = dates[curStart + i];
      if (!worst || v > worst.value) worst = { value: v, date };
      if (!best || v < best.value) best = { value: v, date };
    });

    return { curAvg, prevAvg, changePct, worst, best };
  }

  /** Day counts per AQI category across aligned date + AQI arrays. */
  function categoryCounts(dates, values) {
    const buckets = AirScope.AQI.CATEGORIES.map((c) => ({ label: c.label, color: c.color, days: 0 }));
    values.forEach((v) => {
      if (v === null || v === undefined) return;
      const cat = AirScope.AQI.category(v);
      if (cat) buckets[AirScope.AQI.CATEGORIES.indexOf(cat)].days += 1;
    });
    return buckets;
  }

  /** Index of the hourly slot active right now (times are local ISO strings). */
  function currentHourIndex(hourly, currentTime) {
    if (!hourly || !hourly.time || !hourly.time.length) return 0;
    if (currentTime) {
      const slot = `${currentTime.slice(0, 13)}:00`;
      const exact = hourly.time.indexOf(slot);
      if (exact !== -1) return exact;
      for (let i = hourly.time.length - 1; i >= 0; i--) {
        if (hourly.time[i] <= currentTime) return i;
      }
    }
    return 0;
  }

  return {
    searchPlaces,
    reversePlace,
    fetchWeather,
    fetchAir,
    aggregateDaily,
    hourlyAqi,
    trendStats,
    categoryCounts,
    currentHourIndex,
  };
})();
