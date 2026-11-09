'use client';
import { useState } from 'react';
import Icon from './Icon';

export function Stat({ label, value, icon, color = 'blue', sub, delta }) {
  return (
    <div className="card stat">
      <div className="stat-top"><span>{label}</span><span className={'chip c-' + color}><Icon name={icon} /></span></div>
      <div className="stat-val">{value}</div>
      {(sub || delta) && <div className="stat-sub">{delta}{sub}</div>}
    </div>
  );
}
export function Delta({ now, prev, invert, pct = true, digits = 0 }) {
  if (!prev && !now) return <span>— No change </span>;
  if (!prev) return <span className="up">New </span>;
  const ch = pct ? ((now - prev) / prev) * 100 : now - prev;
  if (Math.abs(ch) < 0.05) return <span>— No change </span>;
  const good = invert ? ch < 0 : ch > 0;
  return <span className={good ? 'up' : 'down'}>{ch > 0 ? '↗ Up ' : '↘ Down '}{Math.abs(ch).toFixed(digits)}{pct ? '%' : ''} </span>;
}
export function BarList({ rows, fmt = (v) => v.toLocaleString('en-US') }) {
  if (!rows || !rows.length) return <div className="empty">No data yet</div>;
  const max = Math.max(...rows.map((r) => r.value), 1);
  return <div className="bars">{rows.map((r) => <div className="bar-row" key={r.key}><div className="lbl"><span>{r.key}</span><b>{fmt(r.value)}</b></div><div className="bar-track"><div className="bar-fill" style={{ width: (r.value / max * 100) + '%' }} /></div></div>)}</div>;
}
export function DailyChart({ series }) {
  const [m, setM] = useState('clicks');
  const vals = series.map((d) => d[m]);
  const max = Math.max(4, ...vals);
  const W = 1000, H = 230, pl = 36, pb = 28, bw = (W - pl) / series.length;
  const ticks = [0, Math.round(max / 2), max];
  const lab = (i) => new Date(series[i].date + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  return (
    <div className="card">
      <div className="card-h"><Icon name="chart" />{m === 'clicks' ? 'Clicks' : 'Impressions'} per day
        <span className="r"><span className="tabs" style={{ display: 'inline-flex' }}>{['clicks', 'impressions'].map((k) => <a key={k} href="#" className={m === k ? 'on' : ''} onClick={(e) => { e.preventDefault(); setM(k); }}>{k[0].toUpperCase() + k.slice(1)}</a>)}</span></span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }} role="img" aria-label={`${m} per day`}>
        {ticks.map((t) => { const y = (H - pb) - (t / max) * (H - pb - 10); return <g key={t}><line x1={pl} x2={W} y1={y} y2={y} stroke="#eef0f3" /><text x={pl - 10} y={y + 4} textAnchor="end" fontSize="12" fill="#8a909c">{t}</text></g>; })}
        {series.map((d, i) => { const h = (d[m] / max) * (H - pb - 10); return <rect key={d.date} x={pl + i * bw + bw * 0.15} y={(H - pb) - h} width={bw * 0.7} height={h} rx="3" fill="#f0a83a"><title>{`${d.date}: ${d[m]}`}</title></rect>; })}
        {[0, Math.floor(series.length / 2), series.length - 1].map((i) => <text key={i} x={pl + i * bw + bw / 2} y={H - 6} textAnchor="middle" fontSize="12" fill="#8a909c">{lab(i)}</text>)}
      </svg>
    </div>
  );
}
