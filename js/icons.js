/* AirScope — inline SVG weather icons + small UI icons. */
window.AirScope = window.AirScope || {};

AirScope.icons = (() => {
  const SUN = '#fbbf24';
  const CLOUD = '#cfd9e8';
  const CLOUD_BACK = '#8fa0b8';
  const RAIN = '#38bdf8';
  const SNOW = '#e6f4ff';

  const CLOUD_SHAPES =
    '<circle cx="35" cy="30" r="11"/><circle cx="21" cy="34.5" r="8.5"/>' +
    '<circle cx="43.5" cy="34.5" r="7"/><rect x="12.5" y="33" width="38" height="10.5" rx="5.25"/>';

  function cloud(fill, { dx = 0, dy = 0, s = 1, opacity = 1 } = {}) {
    const cx = 32 + dx;
    const cy = 33 + dy;
    return `<g transform="translate(${cx} ${cy}) scale(${s}) translate(-32 -33)" fill="${fill}" opacity="${opacity}">${CLOUD_SHAPES}</g>`;
  }

  function sunCore(cx, cy, r, { rayInner = 4.5, rayOuter = 8, width = 3 } = {}) {
    let rays = '';
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      const x1 = cx + Math.cos(a) * (r + rayInner);
      const y1 = cy + Math.sin(a) * (r + rayInner);
      const x2 = cx + Math.cos(a) * (r + rayOuter);
      const y2 = cy + Math.sin(a) * (r + rayOuter);
      rays += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${SUN}" stroke-width="${width}" stroke-linecap="round"/>`;
    }
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${SUN}"/>${rays}`;
  }

  function moonCore(cx, cy, r) {
    return (
      `<defs><mask id="asMoon"><rect x="${cx - r - 4}" y="${cy - r - 4}" width="${(r + 4) * 2}" height="${(r + 4) * 2}" fill="black"/>` +
      `<circle cx="${cx}" cy="${cy}" r="${r}" fill="white"/>` +
      `<circle cx="${cx + r * 0.55}" cy="${cy - r * 0.42}" r="${r * 0.92}" fill="black"/></mask></defs>` +
      `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#dbe4f0" mask="url(#asMoon)"/>`
    );
  }

  function rainDrops(xs, y, len, { dy2 = 2.5, width = 3, fill = RAIN } = {}) {
    return xs
      .map(
        (x) =>
          `<line x1="${x}" y1="${y}" x2="${x - dy2}" y2="${y + len}" stroke="${fill}" stroke-width="${width}" stroke-linecap="round"/>`,
      )
      .join('');
  }

  function snowDots(xs, y, { r = 2.6, fill = SNOW } = {}) {
    return xs.map((x, i) => `<circle cx="${x}" cy="${y + (i % 2) * 4}" r="${r}" fill="${fill}"/>`).join('');
  }

  const BOLT = `<path d="M34 39.5 27 50h5.6l-3.4 9.5 10.6-13.5h-5.4l4-6.5Z" fill="#facc15"/>`;

  /* Map WMO weather codes into icon "groups". */
  function group(code) {
    if (code === 0 || code === 1) return 'clear';
    if (code === 2) return 'partly';
    if (code === 3) return 'overcast';
    if (code === 45 || code === 48) return 'fog';
    if (code >= 51 && code <= 57) return 'drizzle';
    if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
    if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
    if (code >= 95) return 'thunder';
    return 'partly';
  }

  function condition(code) {
    if (code === null || code === undefined) return '—';
    if (code === 0) return 'Clear sky';
    if (code === 1) return 'Mainly clear';
    if (code === 2) return 'Partly cloudy';
    if (code === 3) return 'Overcast';
    if (code === 45 || code === 48) return 'Fog';
    if (code >= 51 && code <= 55) return 'Drizzle';
    if (code === 56 || code === 57) return 'Freezing drizzle';
    if (code >= 61 && code <= 65) return 'Rain';
    if (code === 66 || code === 67) return 'Freezing rain';
    if (code >= 71 && code <= 75) return 'Snowfall';
    if (code === 77) return 'Snow grains';
    if (code >= 80 && code <= 82) return 'Rain showers';
    if (code === 85 || code === 86) return 'Snow showers';
    if (code >= 95) return 'Thunderstorm';
    return '—';
  }

  /** Full weather icon for a WMO code. */
  function weather(code, isDay = true, size = 64) {
    const g = group(code);
    let inner = '';
    const night = !isDay;

    if (g === 'clear') inner = night ? moonCore(32, 32, 13.5) : sunCore(32, 32, 11.5);
    else if (g === 'partly')
      inner =
        (night ? moonCore(23, 22, 8) : sunCore(23, 22, 7.5, { rayInner: 3.5, rayOuter: 6, width: 2.5 })) +
        cloud(CLOUD, { dx: 4, dy: 3 });
    else if (g === 'overcast') inner = cloud(CLOUD_BACK, { dx: -4, dy: -8, s: 0.82, opacity: 0.9 }) + cloud(CLOUD, { dx: 3, dy: 2 });
    else if (g === 'fog')
      inner =
        cloud(CLOUD, { dy: -9, s: 0.95 }) +
        [46, 51.5, 57]
          .map(
            (y, i) =>
              `<line x1="${i === 1 ? 14 : 18}" y1="${y}" x2="${i === 1 ? 50 : 46}" y2="${y}" stroke="#9fb0c7" stroke-width="3" stroke-linecap="round"/>`,
          )
          .join('');
    else if (g === 'drizzle') inner = cloud(CLOUD, { dy: -6 }) + rainDrops([25, 39], 44, 4, { width: 2.6 });
    else if (g === 'rain') inner = cloud(CLOUD, { dy: -6 }) + rainDrops([22, 32, 42], 44, 8);
    else if (g === 'snow') inner = cloud(CLOUD, { dy: -6 }) + snowDots([22, 32, 42], 46);
    else if (g === 'thunder') inner = cloud(CLOUD, { dy: -8 }) + BOLT;

    return `<svg viewBox="0 0 64 64" width="${size}" height="${size}" fill="none" aria-hidden="true">${inner}</svg>`;
  }

  /* ---- small stroke icons for labels ------------------------------------- */

  const UI = {
    droplet: '<path d="M12 3.5s6 6.2 6 10.3a6 6 0 0 1-12 0C6 9.7 12 3.5 12 3.5Z"/>',
    wind: '<path d="M3 8h10a3 3 0 1 0-3-3M3 12h14a3 3 0 1 1-3 3M3 16h7a2.5 2.5 0 1 1-2.5 2.5"/>',
    gust: '<path d="M3 9h9a2.5 2.5 0 1 0-2.5-2.5M3 14h13a2.5 2.5 0 1 1-2.5 2.5M3 19h6"/>',
    gauge: '<path d="M5 19a9 9 0 1 1 14 0"/><path d="M12 13.5 15.5 9"/>',
    cloud: '<path d="M7 18h10a4 4 0 0 0 .8-7.92A5.5 5.5 0 0 0 7.1 9.6 4.5 4.5 0 0 0 7 18Z"/>',
    eye: '<path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="2.7"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.8M12 18.7v2.8M2.5 12h2.8M18.7 12h2.8M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
    umbrella: '<path d="M12 3a9 9 0 0 1 9 9H3a9 9 0 0 1 9-9Z"/><path d="M12 12v6a2.5 2.5 0 0 0 5 0"/>',
    sunrise: '<path d="M4 18h16M7 14.5a5 5 0 0 1 10 0"/><path d="M12 4v5.5M9.6 6.4 12 4l2.4 2.4"/>',
    sunset: '<path d="M4 18h16M7 14.5a5 5 0 0 1 10 0"/><path d="M12 9.5V4M9.6 7.1 12 9.5l2.4-2.4"/>',
    thermo: '<path d="M10 4a2 2 0 0 1 4 0v9.3a4 4 0 1 1-4 0Z"/>',
    pin: '<path d="M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11Z"/><circle cx="12" cy="10" r="2.6"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    mask: '<path d="M4 9c3-2 6-2.5 8-2.5S17 7 20 9c0 6-3.5 9.5-8 9.5S4 15 4 9Z"/><path d="M8.5 11.5h2M13.5 11.5h2"/>',
    camera: '<path d="M4 8.5h2.6l1.5-2.2h7.8l1.5 2.2H20A1.5 1.5 0 0 1 21.5 10v7A1.5 1.5 0 0 1 20 18.5H4A1.5 1.5 0 0 1 2.5 17v-7A1.5 1.5 0 0 1 4 8.5Z"/><circle cx="12" cy="13.2" r="3.2"/>',
  };

  function ui(name, size = 16) {
    return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${UI[name] || ''}</svg>`;
  }

  return { weather, condition, ui, group };
})();
