/* AirScope — dependency-free SVG line chart + AQI distribution bar. */
window.AirScope = window.AirScope || {};

AirScope.charts = (() => {
  const fmt = AirScope.fmt;

  /* ------------------------------------------------------------- line chart */

  function line(container, { dates, series, bands = [], unit = '', height = 240 }) {
    const W = 800;
    const H = height;
    const PAD = { l: 44, r: 16, t: 12, b: 28 };
    const n = dates.length;
    const values = series.flatMap((s) => s.values).filter((v) => v !== null && v !== undefined && isFinite(v));

    if (!n || !values.length) {
      container.innerHTML = '<div class="lc-empty">No data for this place &amp; period yet.</div>';
      return;
    }

    let domainMin;
    let domainMax;
    if (bands.length) {
      domainMin = 0;
      domainMax = Math.max(...bands.map((b) => b.to));
    } else {
      const mn = Math.min(...values);
      const mx = Math.max(...values);
      const spread = mx - mn || Math.max(mx * 0.2, 10);
      domainMin = Math.max(0, Math.floor(mn - spread * 0.35));
      domainMax = Math.ceil(mx + spread * 0.2);
    }

    const plotW = W - PAD.l - PAD.r;
    const plotH = H - PAD.t - PAD.b;
    const X = (i) => PAD.l + (n === 1 ? plotW / 2 : (i * plotW) / (n - 1));
    const Y = (v) => PAD.t + (1 - (v - domainMin) / (domainMax - domainMin || 1)) * plotH;

    let svg = '';

    /* AQI category bands */
    for (const b of bands) {
      const y1 = Y(Math.min(b.to, domainMax));
      const y2 = Y(Math.max(b.from, domainMin));
      if (y2 - y1 < 1) continue;
      svg += `<rect x="${PAD.l}" y="${y1.toFixed(1)}" width="${plotW}" height="${(y2 - y1).toFixed(1)}" fill="${b.color}" opacity="0.07"/>`;
    }

    /* horizontal grid + y labels */
    const ticks = 4;
    for (let t = 0; t <= ticks; t++) {
      const v = domainMin + (t / ticks) * (domainMax - domainMin);
      const y = Y(v);
      svg += `<line class="lc-grid" x1="${PAD.l}" y1="${y.toFixed(1)}" x2="${W - PAD.r}" y2="${y.toFixed(1)}"/>`;
      svg += `<text class="lc-label" x="${PAD.l - 8}" y="${(y + 3.5).toFixed(1)}" text-anchor="end">${Math.round(v)}</text>`;
    }

    /* x labels */
    const step = Math.max(1, Math.ceil(n / 5));
    const shown = new Set();
    for (let i = 0; i < n; i += step) shown.add(i);
    shown.add(n - 1);
    for (const i of shown) {
      svg += `<text class="lc-label" x="${X(i).toFixed(1)}" y="${H - 8}" text-anchor="${i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}">${fmt.dateLabel(dates[i])}</text>`;
    }

    /* series lines (+ soft fill for a single series) */
    const defs = '<defs><linearGradient id="lcFill" x1="0" y1="0" x2="0" y2="1">' +
      `<stop offset="0" stop-color="${series[0].color}" stop-opacity="0.28"/>` +
      `<stop offset="1" stop-color="${series[0].color}" stop-opacity="0"/></linearGradient></defs>`;

    let paths = '';
    if (series.length === 1) {
      let area = '';
      let started = false;
      series[0].values.forEach((v, i) => {
        if (v === null || v === undefined) {
          started = false;
          return;
        }
        area += started ? ` L${X(i).toFixed(1)} ${Y(v).toFixed(1)}` : `M${X(i).toFixed(1)} ${Y(v).toFixed(1)}`;
        started = true;
      });
      if (area) {
        paths += `<path d="${area} L${X(n - 1).toFixed(1)} ${Y(domainMin).toFixed(1)} L${X(0).toFixed(1)} ${Y(domainMin).toFixed(1)} Z" fill="url(#lcFill)"/>`;
      }
    }

    for (const s of series) {
      let d = '';
      let started = false;
      s.values.forEach((v, i) => {
        if (v === null || v === undefined) {
          started = false;
          return;
        }
        d += started ? ` L${X(i).toFixed(1)} ${Y(v).toFixed(1)}` : `M${X(i).toFixed(1)} ${Y(v).toFixed(1)}`;
        started = true;
      });
      if (d) paths += `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>`;
      const lastIdx = s.values.reduce((acc, v, i) => (v !== null && v !== undefined ? i : acc), -1);
      if (lastIdx >= 0) {
        paths += `<circle cx="${X(lastIdx).toFixed(1)}" cy="${Y(s.values[lastIdx]).toFixed(1)}" r="4" fill="${s.color}" stroke="#0b1120" stroke-width="2"/>`;
      }
    }

    /* hover layer */
    let hover = `<line class="lc-hover-line" x1="0" y1="${PAD.t}" x2="0" y2="${PAD.t + plotH}" opacity="0"/>`;
    series.forEach((s, k) => {
      hover += `<circle class="lc-hover-dot" data-k="${k}" r="4.5" fill="${s.color}" stroke="#0b1120" stroke-width="2" opacity="0"/>`;
    });

    container.innerHTML =
      `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Trend chart">${defs}${svg}${paths}${hover}` +
      `<rect class="lc-overlay" x="${PAD.l}" y="${PAD.t}" width="${plotW}" height="${plotH}" fill="transparent"/></svg>`;

    attachHover(container, { dates, series, X, Y, W, n, unit, PAD, plotH });
  }

  function attachHover(container, model) {
    const svg = container.querySelector('svg');
    const overlay = svg.querySelector('.lc-overlay');
    const lineEl = svg.querySelector('.lc-hover-line');
    const dots = [...svg.querySelectorAll('.lc-hover-dot')];
    const tooltip = document.getElementById('tooltip');
    const { dates, series, X, Y, W, n, unit, PAD } = model;

    function hide() {
      lineEl.setAttribute('opacity', '0');
      dots.forEach((d) => d.setAttribute('opacity', '0'));
      tooltip.hidden = true;
    }

    overlay.addEventListener('mousemove', (e) => {
      const rect = svg.getBoundingClientRect();
      const vx = ((e.clientX - rect.left) / rect.width) * W;
      let i = Math.round(((vx - PAD.l) / (W - PAD.l - PAD.r)) * Math.max(1, n - 1));
      i = Math.max(0, Math.min(n - 1, i));

      const x = X(i);
      lineEl.setAttribute('x1', x.toFixed(1));
      lineEl.setAttribute('x2', x.toFixed(1));
      lineEl.setAttribute('opacity', '1');

      dots.forEach((dot, k) => {
        const v = series[k].values[i];
        if (v === null || v === undefined) {
          dot.setAttribute('opacity', '0');
          return;
        }
        dot.setAttribute('cx', x.toFixed(1));
        dot.setAttribute('cy', Y(v).toFixed(1));
        dot.setAttribute('opacity', '1');
      });

      const rows = series
        .map((s) => {
          const v = s.values[i];
          if (v === null || v === undefined) return '';
          return `<div class="tt-row"><span class="tt-dot" style="background:${s.color}"></span>${fmt.escape(s.name)}<span class="tt-val">${fmt.round(v, 1)}${unit ? ` ${unit}` : ''}</span></div>`;
        })
        .join('');

      tooltip.innerHTML = `<div class="tt-date">${fmt.dateLabel(dates[i])}${rows ? '' : ' — no data'}</div>${rows}`;
      tooltip.hidden = false;
      const left = Math.min(e.clientX + 16, window.innerWidth - 250);
      tooltip.style.left = `${Math.max(8, left)}px`;
      tooltip.style.top = `${rect.top + 6}px`;
    });

    overlay.addEventListener('mouseleave', hide);
  }

  /* ----------------------------------------------------- distribution bar */

  function distribution(el, counts, totalDays) {
    const total = counts.reduce((a, c) => a + c.days, 0);
    if (!total) {
      el.innerHTML = '<p class="note">No AQI data for this period.</p>';
      return;
    }
    const bar = counts
      .filter((c) => c.days > 0)
      .map((c) => `<div class="dist-seg" style="width:${((c.days / total) * 100).toFixed(2)}%;background:${c.color}" title="${c.label}: ${c.days} days"></div>`)
      .join('');
    const legend = counts
      .map(
        (c) =>
          `<span class="dist-item"><span class="cmp-dot" style="background:${c.color}"></span>${c.label} <b>${c.days}d</b></span>`,
      )
      .join('');
    el.innerHTML = `<div class="dist-bar">${bar}</div><div class="dist-legend">${legend}</div><p class="note">Out of ${total} measured days in the last ${totalDays}.</p>`;
  }

  return { line, distribution };
})();
