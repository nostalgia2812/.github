/* charts.js — Pure Canvas/SVG chart engine, no dependencies */
'use strict';

const TAU = Math.PI * 2;

// ── Colour palette ────────────────────────────────────────────────────────────
export const PALETTE = {
  critical : '#ef4444',
  high     : '#f97316',
  medium   : '#f59e0b',
  low      : '#10b981',
  grid     : '#1e293b',
  text     : '#94a3b8',
  glow     : 'rgba(56,189,248,0.18)',
  accent   : '#38bdf8',
  providers: ['#38bdf8','#818cf8','#34d399','#f472b6','#fbbf24','#a78bfa',
              '#fb7185','#4ade80','#60a5fa','#e879f9','#f87171','#2dd4bf'],
};

// ── Shared helpers ────────────────────────────────────────────────────────────
function dpr() { return window.devicePixelRatio || 1; }

function hiresDPI(canvas) {
  const r = dpr();
  const w = canvas.clientWidth || canvas.width;
  const h = canvas.clientHeight || canvas.height;
  canvas.width  = w * r;
  canvas.height = h * r;
  canvas.getContext('2d').scale(r, r);
  return { w, h };
}

function lerp(a, b, t) { return a + (b - a) * t; }

function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

function animate(duration, cb, done) {
  const start = performance.now();
  function frame(now) {
    const t = Math.min((now - start) / duration, 1);
    cb(easeOut(t));
    if (t < 1) requestAnimationFrame(frame); else done && done();
  }
  requestAnimationFrame(frame);
}

// ── Gauge ─────────────────────────────────────────────────────────────────────
export class GaugeChart {
  constructor(canvas) {
    this.canvas = canvas;
    this._score = 0;
  }

  _colorFor(score) {
    if (score >= 85) return PALETTE.critical;
    if (score >= 60) return PALETTE.high;
    if (score >= 30) return PALETTE.medium;
    return PALETTE.low;
  }

  draw(score) {
    const prev = this._score;
    animate(700, (t) => {
      const cur = lerp(prev, score, t);
      this._render(cur);
    });
    this._score = score;
  }

  _render(score) {
    const cv = this.canvas;
    const { w, h } = hiresDPI(cv);
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, w, h);

    const cx = w / 2, cy = h * 0.58;
    const r  = Math.min(w, h) * 0.38;
    const startA = Math.PI * 0.75;
    const endA   = Math.PI * 2.25;
    const fillA  = startA + (endA - startA) * (score / 100);
    const color  = this._colorFor(score);

    // Track
    ctx.beginPath();
    ctx.arc(cx, cy, r, startA, endA);
    ctx.strokeStyle = PALETTE.grid;
    ctx.lineWidth   = 14;
    ctx.lineCap     = 'round';
    ctx.stroke();

    // Fill arc
    if (score > 0) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, startA, fillA);
      ctx.strokeStyle = color;
      ctx.lineWidth   = 14;
      ctx.lineCap     = 'round';
      // Glow
      ctx.shadowColor = color;
      ctx.shadowBlur  = 18;
      ctx.stroke();
      ctx.shadowBlur  = 0;
    }

    // Tick marks
    for (let i = 0; i <= 10; i++) {
      const a = startA + (endA - startA) * (i / 10);
      const inner = r - 20, outer = r - 10;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
      ctx.lineTo(cx + Math.cos(a) * outer, cy + Math.sin(a) * outer);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth   = 1.5;
      ctx.stroke();
    }

    // Needle
    const needleA = startA + (endA - startA) * (score / 100);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(needleA);
    ctx.beginPath();
    ctx.moveTo(0, 4);
    ctx.lineTo(r - 22, 0);
    ctx.lineTo(0, -4);
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur  = 10;
    ctx.fill();
    ctx.restore();

    // Centre circle
    ctx.beginPath();
    ctx.arc(cx, cy, 10, 0, TAU);
    ctx.fillStyle = '#1e293b';
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth   = 2;
    ctx.stroke();

    // Score text
    ctx.fillStyle   = '#e2e8f0';
    ctx.font        = `bold ${Math.round(r * 0.42)}px Inter,system-ui,sans-serif`;
    ctx.textAlign   = 'center';
    ctx.textBaseline= 'alphabetic';
    ctx.fillText(Math.round(score), cx, cy + r * 0.12);

    ctx.fillStyle   = PALETTE.text;
    ctx.font        = `${Math.round(r * 0.16)}px Inter,system-ui,sans-serif`;
    ctx.fillText('/ 100', cx, cy + r * 0.28);

    // Labels
    ctx.font        = `${Math.round(r * 0.14)}px Inter,system-ui,sans-serif`;
    ctx.fillStyle   = PALETTE.text;
    ctx.textAlign   = 'left';
    ctx.fillText('0', cx - r - 4, cy + 6);
    ctx.textAlign   = 'right';
    ctx.fillText('100', cx + r + 4, cy + 6);
  }
}

// ── Donut ─────────────────────────────────────────────────────────────────────
export class DonutChart {
  constructor(canvas) { this.canvas = canvas; }

  draw(data) {
    // data: [{label, value, color}]
    const total = data.reduce((s, d) => s + d.value, 0);
    animate(600, (t) => this._render(data, total, t));
  }

  _render(data, total, t) {
    const cv  = this.canvas;
    const { w, h } = hiresDPI(cv);
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, w, h);

    const cx = w * 0.42, cy = h / 2;
    const ro = Math.min(cx, cy) * 0.82;
    const ri = ro * 0.55;

    if (total === 0) {
      ctx.beginPath(); ctx.arc(cx, cy, ro, 0, TAU);
      ctx.strokeStyle = PALETTE.grid; ctx.lineWidth = ro - ri; ctx.stroke();
      return;
    }

    let angle = -Math.PI / 2;
    data.forEach(d => {
      const slice = (d.value / total) * TAU * t;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, ro, angle, angle + slice);
      ctx.closePath();
      ctx.fillStyle = d.color;
      ctx.shadowColor = d.color;
      ctx.shadowBlur  = 8;
      ctx.fill();
      ctx.shadowBlur  = 0;

      // Inner cut
      ctx.beginPath();
      ctx.arc(cx, cy, ri, 0, TAU);
      ctx.fillStyle = '#0f172a';
      ctx.fill();

      angle += slice;
    });

    // Centre label
    ctx.fillStyle   = '#e2e8f0';
    ctx.font        = `bold ${Math.round(ro * 0.38)}px Inter,system-ui,sans-serif`;
    ctx.textAlign   = 'center';
    ctx.textBaseline= 'middle';
    ctx.fillText(total, cx, cy - ro * 0.08);
    ctx.fillStyle   = PALETTE.text;
    ctx.font        = `${Math.round(ro * 0.17)}px Inter,system-ui,sans-serif`;
    ctx.fillText('total', cx, cy + ro * 0.18);

    // Legend (right side)
    const lx = cx + ro + 20;
    let   ly = cy - (data.length * 22) / 2;
    ctx.textAlign   = 'left';
    ctx.textBaseline= 'middle';
    data.forEach(d => {
      ctx.fillStyle = d.color;
      ctx.beginPath(); ctx.roundRect(lx, ly - 6, 12, 12, 3); ctx.fill();
      ctx.fillStyle   = '#e2e8f0';
      ctx.font        = `600 ${Math.round(ro * 0.16)}px Inter,system-ui,sans-serif`;
      ctx.fillText(`${d.label}  ${d.value}`, lx + 18, ly);
      ly += 24;
    });
  }
}

// ── Sparkline / Line chart ────────────────────────────────────────────────────
export class LineChart {
  constructor(canvas) { this.canvas = canvas; }

  draw(series, opts = {}) {
    // series: [{label, color, values:[]}]
    const allVals = series.flatMap(s => s.values);
    const mn = Math.min(...allVals, 0);
    const mx = Math.max(...allVals, 1);
    animate(500, (t) => this._render(series, mn, mx, t, opts));
  }

  _render(series, mn, mx, t, opts) {
    const cv  = this.canvas;
    const { w, h } = hiresDPI(cv);
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, w, h);

    const pad  = { top: 12, right: 12, bottom: 24, left: 32 };
    const pw   = w - pad.left - pad.right;
    const ph   = h - pad.top  - pad.bottom;
    const range= mx - mn || 1;

    // Grid lines
    [0.25, 0.5, 0.75, 1].forEach(frac => {
      const y = pad.top + ph * (1 - frac);
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + pw, y);
      ctx.strokeStyle = PALETTE.grid; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
      ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = PALETTE.text;
      ctx.font = '10px Inter,system-ui,sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(Math.round(mn + range * frac), pad.left - 4, y + 4);
    });

    // Series
    series.forEach(s => {
      const vals = s.values;
      const n    = vals.length;
      if (n < 2) return;

      const pts = vals.map((v, i) => ({
        x: pad.left + (i / (n - 1)) * pw,
        y: pad.top  + ph * (1 - (v - mn) / range),
      }));

      const drawTo = Math.round((n - 1) * t);

      // Fill gradient
      const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + ph);
      grad.addColorStop(0, s.color + '55');
      grad.addColorStop(1, s.color + '00');
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pad.top + ph);
      pts.slice(0, drawTo + 1).forEach(p => ctx.lineTo(p.x, p.y));
      ctx.lineTo(pts[drawTo].x, pad.top + ph);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      // Line
      ctx.beginPath();
      pts.slice(0, drawTo + 1).forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
      ctx.strokeStyle = s.color;
      ctx.lineWidth   = 2;
      ctx.shadowColor = s.color;
      ctx.shadowBlur  = 6;
      ctx.stroke();
      ctx.shadowBlur  = 0;

      // Dots
      pts.slice(0, drawTo + 1).forEach(p => {
        ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, TAU);
        ctx.fillStyle = s.color; ctx.fill();
      });
    });

    // X-axis label
    if (opts.xLabels) {
      const labels = opts.xLabels;
      ctx.fillStyle = PALETTE.text;
      ctx.font = '9px Inter,system-ui,sans-serif';
      ctx.textAlign = 'center';
      labels.forEach((lbl, i) => {
        const x = pad.left + (i / (labels.length - 1)) * pw;
        ctx.fillText(lbl, x, h - 6);
      });
    }

    // Legend
    if (series.length > 1) {
      let lx = pad.left;
      series.forEach(s => {
        ctx.fillStyle = s.color;
        ctx.fillRect(lx, 2, 20, 4);
        ctx.fillStyle = PALETTE.text;
        ctx.font = '10px Inter,system-ui,sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(s.label, lx + 24, 8);
        lx += ctx.measureText(s.label).width + 44;
      });
    }
  }
}

// ── Radar ─────────────────────────────────────────────────────────────────────
export class RadarChart {
  constructor(canvas) { this.canvas = canvas; }

  draw(axes, datasets) {
    // axes: string[], datasets: [{label, color, values:[0-100]}]
    animate(700, (t) => this._render(axes, datasets, t));
  }

  _render(axes, datasets, t) {
    const cv  = this.canvas;
    const { w, h } = hiresDPI(cv);
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, w, h);

    const cx = w / 2, cy = h / 2;
    const r  = Math.min(w, h) * 0.36;
    const n  = axes.length;

    const ptAt = (i, frac) => {
      const a = (i / n) * TAU - Math.PI / 2;
      return { x: cx + Math.cos(a) * r * frac, y: cy + Math.sin(a) * r * frac };
    };

    // Web rings
    [0.25, 0.5, 0.75, 1].forEach(frac => {
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const p = ptAt(i, frac);
        i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
      }
      ctx.closePath();
      ctx.strokeStyle = PALETTE.grid;
      ctx.lineWidth   = 1;
      ctx.stroke();
    });

    // Spokes
    for (let i = 0; i < n; i++) {
      const p = ptAt(i, 1);
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(p.x, p.y);
      ctx.strokeStyle = PALETTE.grid; ctx.lineWidth = 1; ctx.stroke();
    }

    // Axis labels
    ctx.fillStyle   = PALETTE.text;
    ctx.font        = `bold 10px Inter,system-ui,sans-serif`;
    ctx.textBaseline= 'middle';
    for (let i = 0; i < n; i++) {
      const p = ptAt(i, 1.18);
      ctx.textAlign = p.x < cx - 4 ? 'right' : p.x > cx + 4 ? 'left' : 'center';
      ctx.fillText(axes[i], p.x, p.y);
    }

    // Datasets
    datasets.forEach((ds, di) => {
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const frac = (ds.values[i] / 100) * t;
        const p    = ptAt(i, frac);
        i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
      }
      ctx.closePath();
      ctx.fillStyle   = ds.color + '33';
      ctx.fill();
      ctx.strokeStyle = ds.color;
      ctx.lineWidth   = 2;
      ctx.shadowColor = ds.color;
      ctx.shadowBlur  = 8;
      ctx.stroke();
      ctx.shadowBlur  = 0;
    });

    // Legend
    let lx = 8, ly = h - 14;
    datasets.forEach(ds => {
      ctx.fillStyle = ds.color;
      ctx.fillRect(lx, ly - 4, 14, 4);
      ctx.fillStyle = PALETTE.text;
      ctx.font = '10px Inter,system-ui,sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(ds.label, lx + 18, ly);
      lx += ctx.measureText(ds.label).width + 36;
    });
  }
}

// ── Horizontal bar chart ──────────────────────────────────────────────────────
export class HBarChart {
  constructor(canvas) { this.canvas = canvas; }

  draw(bars) {
    // bars: [{label, value, max, color}]
    animate(500, (t) => this._render(bars, t));
  }

  _render(bars, t) {
    const cv  = this.canvas;
    const { w, h } = hiresDPI(cv);
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, w, h);

    const lw   = 110;
    const pad  = 10;
    const barH = Math.min(22, (h - pad * (bars.length + 1)) / bars.length);

    bars.forEach((b, i) => {
      const y    = pad + i * (barH + pad);
      const frac = (b.value / (b.max || 100)) * t;
      const bw   = (w - lw - pad) * frac;

      // Label
      ctx.fillStyle   = PALETTE.text;
      ctx.font        = `12px Inter,system-ui,sans-serif`;
      ctx.textAlign   = 'right';
      ctx.textBaseline= 'middle';
      ctx.fillText(b.label.slice(0, 14), lw - 8, y + barH / 2);

      // Track
      ctx.fillStyle = PALETTE.grid;
      ctx.beginPath(); ctx.roundRect(lw, y, w - lw - pad, barH, 4); ctx.fill();

      // Fill
      if (bw > 0) {
        ctx.fillStyle   = b.color;
        ctx.shadowColor = b.color;
        ctx.shadowBlur  = 6;
        ctx.beginPath(); ctx.roundRect(lw, y, bw, barH, 4); ctx.fill();
        ctx.shadowBlur  = 0;
      }

      // Value
      ctx.fillStyle   = '#e2e8f0';
      ctx.textAlign   = 'left';
      ctx.fillText(b.value, lw + bw + 6, y + barH / 2);
    });
  }
}

// ── Heatmap ───────────────────────────────────────────────────────────────────
export class HeatMap {
  constructor(canvas) { this.canvas = canvas; }

  draw(rows, cols, data) {
    // data: 2d array [row][col] = 0-100
    const cv  = this.canvas;
    const { w, h } = hiresDPI(cv);
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, w, h);

    const pad   = { top: 20, left: 60, right: 10, bottom: 20 };
    const cw    = (w - pad.left - pad.right)  / cols.length;
    const rh    = (h - pad.top  - pad.bottom) / rows.length;

    // Col headers
    ctx.fillStyle   = PALETTE.text;
    ctx.font        = '9px Inter,system-ui,sans-serif';
    ctx.textAlign   = 'center';
    cols.forEach((c, j) => ctx.fillText(c.slice(0,6), pad.left + j * cw + cw / 2, pad.top - 6));

    // Row labels
    ctx.textAlign   = 'right';
    rows.forEach((r, i) => ctx.fillText(r.slice(0,8), pad.left - 6, pad.top + i * rh + rh / 2 + 4));

    // Cells
    rows.forEach((_, i) => {
      cols.forEach((__, j) => {
        const v   = data[i]?.[j] ?? 0;
        const x   = pad.left + j * cw;
        const y   = pad.top  + i * rh;
        const col = v >= 85 ? PALETTE.critical : v >= 60 ? PALETTE.high : v >= 30 ? PALETTE.medium : v > 0 ? PALETTE.low : PALETTE.grid;
        const alpha = 0.15 + (v / 100) * 0.85;
        ctx.fillStyle = col + Math.round(alpha * 255).toString(16).padStart(2,'0');
        ctx.beginPath(); ctx.roundRect(x + 2, y + 2, cw - 4, rh - 4, 3); ctx.fill();
        if (v > 0) {
          ctx.fillStyle   = '#e2e8f0';
          ctx.font        = `bold 9px Inter,system-ui,sans-serif`;
          ctx.textAlign   = 'center';
          ctx.textBaseline= 'middle';
          ctx.fillText(v, x + cw / 2, y + rh / 2);
        }
      });
    });
  }
}
