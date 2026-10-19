/* AirScope — AQI categories, health guidance, and small number helpers. */
window.AirScope = window.AirScope || {};

AirScope.AQI = (() => {
  /* US EPA breakpoints. `color` is tuned for a dark UI. */
  const CATEGORIES = [
    {
      max: 50,
      label: 'Good',
      color: '#22c55e',
      simple: 'The air is clean today — a great day to be outside.',
      checklist: [
        { t: 'Enjoy time outdoors', ok: true },
        { t: 'Open windows and air the house', ok: true },
        { t: 'Mask — not needed', ok: true },
      ],
      advice: [
        'Air is clean today. Great time for outdoor exercise, walks and open windows.',
        'No mask needed. Sensitive people can be outside without concern.',
      ],
    },
    {
      max: 100,
      label: 'Moderate',
      color: '#eab308',
      simple: "The air is okay — most people won't notice anything.",
      checklist: [
        { t: 'Normal outdoor activity is fine', ok: true },
        { t: 'Long workouts if you are very sensitive', ok: false },
        { t: 'Mask — not needed', ok: true },
      ],
      advice: [
        'Acceptable for most people. Air is a little polluted but not harmful to the general public.',
        'Unusually sensitive people (asthma, allergies) may notice mild symptoms on long outdoor exertion.',
        'Windows and normal outdoor activity are fine.',
      ],
    },
    {
      max: 150,
      label: 'Unhealthy for Sensitive Groups',
      color: '#f97316',
      simple: 'Kids, older people, and anyone with asthma or heart trouble should take it easy outside today.',
      checklist: [
        { t: 'Long outdoor exertion for sensitive groups', ok: false },
        { t: 'Light activity for everyone else is fine', ok: true },
        { t: 'Mask — not needed for most', ok: true },
      ],
      advice: [
        'Sensitive groups — children, elderly, pregnant women, asthma/heart patients — should limit prolonged outdoor exertion.',
        'Everyone else is mostly fine, but consider a mask for long commutes.',
        'Keep windows closed during peak traffic hours.',
      ],
    },
    {
      max: 200,
      label: 'Unhealthy',
      color: '#ef4444',
      simple: 'The air is bad today — even healthy people may cough or get a scratchy throat. Try to stay indoors.',
      checklist: [
        { t: 'Wear a mask outside (N95)', ok: true },
        { t: 'Outdoor workouts — move them inside', ok: false },
        { t: 'Keep windows closed', ok: false },
        { t: 'Air purifier on if you have one', ok: true },
      ],
      advice: [
        'Everyone may begin to feel effects: coughing, irritated eyes and throat, reduced stamina.',
        'Reduce outdoor exercise — especially children should skip outdoor sports.',
        'Wear an N95 mask outdoors, keep windows closed and run an air purifier if you have one.',
      ],
    },
    {
      max: 300,
      label: 'Very Unhealthy',
      color: '#a855f7',
      simple: 'The air is seriously polluted. Best to stay inside with the windows closed.',
      checklist: [
        { t: 'Stay indoors as much as you can', ok: true },
        { t: 'N95 mask if you must go out', ok: true },
        { t: 'Outdoor sports and play', ok: false },
        { t: 'Windows sealed, purifier on max', ok: true },
      ],
      advice: [
        'Health alert — the air is seriously polluted. Avoid outdoor activity where you can.',
        'N95 mask outdoors, windows sealed, purifier on maximum.',
        'Schools should move sports and assemblies indoors. People with lung/heart disease should stay home.',
      ],
    },
    {
      max: 500,
      label: 'Hazardous',
      color: '#9f1239',
      simple: 'Dangerous air today. Stay inside and keep windows and doors sealed.',
      checklist: [
        { t: 'Stay indoors — all day', ok: true },
        { t: 'Seal windows and doors', ok: true },
        { t: 'Run purifiers continuously', ok: true },
        { t: 'Any time outdoors', ok: false },
      ],
      advice: [
        'Emergency conditions. Everyone should remain indoors with windows and doors sealed.',
        'Run air purifiers continuously; if you must go out, wear an N95 mask the entire time.',
        'Consider relocating temporarily if you can — long exposure is dangerous for everyone.',
      ],
    },
  ];

  function category(aqi) {
    if (aqi === null || aqi === undefined || Number.isNaN(aqi)) return null;
    for (const c of CATEGORIES) if (aqi <= c.max) return c;
    return CATEGORIES[CATEGORIES.length - 1];
  }

  /** 0..1 position of an AQI value on the piecewise gauge scale. */
  function gaugeFraction(aqi) {
    if (aqi === null || aqi === undefined) return 0;
    const caps = [50, 100, 150, 200, 300, 500];
    let prev = 0;
    for (const cap of caps) {
      if (aqi <= cap) return (prev + (aqi - prev) / (cap - prev) * (cap - prev)) / 500;
      prev = cap;
    }
    return 1;
  }

  /** Multiplier of a value against a WHO guideline; null if either is missing. */
  function whoMultiple(value, who) {
    if (value === null || value === undefined || !who) return null;
    return value / who;
  }

  function multipleColor(mult) {
    if (mult === null) return '#64748b';
    if (mult <= 1) return '#22c55e';
    if (mult <= 2) return '#eab308';
    if (mult <= 4) return '#f97316';
    if (mult <= 8) return '#ef4444';
    return '#a855f7';
  }

  function cigarettesPerDay(pm25) {
    if (pm25 === null || pm25 === undefined) return null;
    return pm25 / window.AirScope.CFG.pm25PerCigarette;
  }

  /* ------------------------------------------------------------------------
   * US EPA sub-index tables & AQI computation.
   * PM bands are the 2024 revision (µg/m³, 24h); gases are converted to their
   * EPA units (O₃/NO₂/SO₂ in ppb, CO in ppm) before lookup, exactly like the
   * official AQI worksheet. We compute the AQI from the pollutant
   * concentrations we display so the number is transparent & explainable.
   * ---------------------------------------------------------------------- */
  const US_TABLES = {
    pm2_5: {
      label: 'PM2.5',
      human: 'fine smoke particles (PM2.5)',
      unit: 'µg/m³',
      bands: [
        [0, 9.0, 0, 50],
        [9.1, 35.4, 51, 100],
        [35.5, 55.4, 101, 150],
        [55.5, 125.4, 151, 200],
        [125.5, 225.4, 201, 300],
        [225.5, 325.4, 301, 400],
        [325.5, 500.4, 401, 500],
      ],
    },
    pm10: {
      label: 'PM10',
      human: 'dust and pollen (PM10)',
      unit: 'µg/m³',
      bands: [
        [0, 54, 0, 50],
        [55, 154, 51, 100],
        [155, 254, 101, 150],
        [255, 354, 151, 200],
        [355, 424, 201, 300],
        [425, 504, 301, 400],
        [505, 604, 401, 500],
      ],
    },
    ozone: {
      label: 'O₃',
      human: 'ozone, the smog gas (O₃)',
      unit: 'µg/m³',
      conv: (v) => v / 2.0, /* ppb */
      bands: [
        [0, 54, 0, 50],
        [55, 70, 51, 100],
        [71, 85, 101, 150],
        [86, 105, 151, 200],
        [106, 200, 201, 300],
        [201, 404, 301, 500],
      ],
    },
    nitrogen_dioxide: {
      label: 'NO₂',
      human: 'vehicle fumes (NO₂)',
      unit: 'µg/m³',
      conv: (v) => v / 1.88, /* ppb */
      bands: [
        [0, 53, 0, 50],
        [54, 100, 51, 100],
        [101, 360, 101, 150],
        [361, 649, 151, 200],
        [650, 1249, 201, 300],
        [1250, 2049, 301, 500],
      ],
    },
    sulphur_dioxide: {
      label: 'SO₂',
      human: 'coal & oil smoke (SO₂)',
      unit: 'µg/m³',
      conv: (v) => v / 2.62, /* ppb */
      bands: [
        [0, 35, 0, 50],
        [36, 75, 51, 100],
        [76, 185, 101, 150],
        [186, 304, 151, 200],
        [305, 604, 201, 300],
        [605, 1004, 301, 500],
      ],
    },
    carbon_monoxide: {
      label: 'CO',
      human: 'burning fuel gas (CO)',
      unit: 'µg/m³',
      conv: (v) => v / 1145, /* ppm */
      bands: [
        [0, 4.4, 0, 50],
        [4.5, 9.4, 51, 100],
        [9.5, 12.4, 101, 150],
        [12.5, 15.4, 151, 200],
        [15.5, 30.4, 201, 300],
        [30.5, 50.4, 301, 500],
      ],
    },
  };

  function subIndex(key, rawValue) {
    const t = US_TABLES[key];
    if (!t || rawValue === null || rawValue === undefined) return null;
    const v = t.conv ? t.conv(rawValue) : rawValue;
    for (const [lo, hi, aLo, aHi] of t.bands) {
      if (v >= lo && v <= hi) return Math.round(aLo + ((aHi - aLo) / (hi - lo)) * (v - lo));
    }
    return v > t.bands[t.bands.length - 1][1] ? 500 : null;
  }

  /**
   * AQI (0–500) = highest sub-index across pollutants, plus which pollutant drove it.
   * `pollutants` uses Open-Meteo field names: pm2_5, pm10, ozone, ...
   */
  function computeAqi(pollutants) {
    let best = null;
    for (const key of Object.keys(US_TABLES)) {
      const sub = subIndex(key, pollutants[key]);
      if (sub === null) continue;
      if (!best || sub > best.sub) {
        best = { key, sub, value: pollutants[key], label: US_TABLES[key].label, human: US_TABLES[key].human, unit: US_TABLES[key].unit };
      }
    }
    if (!best) return { aqi: null, driver: null };
    return { aqi: Math.min(500, Math.max(0, best.sub)), driver: best };
  }

  return { CATEGORIES, category, gaugeFraction, whoMultiple, multipleColor, cigarettesPerDay, US_TABLES, subIndex, computeAqi };
})();

AirScope.fmt = {
  round(n, d = 0) {
    if (n === null || n === undefined || Number.isNaN(n)) return null;
    const f = 10 ** d;
    return Math.round(n * f) / f;
  },

  temp(celsius, unit) {
    if (celsius === null || celsius === undefined) return '—';
    const v = unit === 'F' ? celsius * 1.8 + 32 : celsius;
    return `${Math.round(v)}°`;
  },

  tempUnit(unit) {
    return unit === 'F' ? '°F' : '°C';
  },

  wind(kmh, unit) {
    if (kmh === null || kmh === undefined) return null;
    return unit === 'F' ? Math.round(kmh * 0.621371) : Math.round(kmh);
  },

  windUnit(unit) {
    return unit === 'F' ? 'mph' : 'km/h';
  },

  compass(deg) {
    if (deg === null || deg === undefined) return null;
    const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    return dirs[Math.round(deg / 22.5) % 16];
  },

  hhmm(iso) {
    return typeof iso === 'string' && iso.length >= 16 ? iso.slice(11, 16) : '—';
  },

  dayLabel(dateStr, opts = {}) {
    const d = new Date(`${dateStr}T12:00:00`);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString(undefined, opts.wide ? { weekday: 'short', month: 'short', day: 'numeric' } : { weekday: 'short' });
  },

  dateLabel(dateStr) {
    const d = new Date(`${dateStr}T12:00:00`);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  },

  pct(n, d = 0) {
    if (n === null || n === undefined) return '—';
    return `${n > 0 ? '+' : ''}${n.toFixed(d)}%`;
  },

  flag(cc) {
    if (!cc || cc.length !== 2) return '📍';
    return String.fromCodePoint(...[...cc.toUpperCase()].map((ch) => 127397 + ch.charCodeAt(0)));
  },

  escape(str) {
    return String(str ?? '').replace(
      /[&<>"']/g,
      (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch],
    );
  },

  placeLabel(place) {
    const bits = [place.name, place.admin1, place.country].filter(Boolean);
    return [...new Set(bits)].join(', ');
  },

  uvLevel(uv) {
    if (uv === null || uv === undefined) return null;
    if (uv < 3) return { label: 'Low', color: '#22c55e' };
    if (uv < 6) return { label: 'Moderate', color: '#eab308' };
    if (uv < 8) return { label: 'High', color: '#f97316' };
    if (uv < 11) return { label: 'Very high', color: '#ef4444' };
    return { label: 'Extreme', color: '#a855f7' };
  },
};
