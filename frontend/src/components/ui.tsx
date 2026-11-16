/**
 * Componentes visuales reutilizables del panel RAU.
 * Gráficos con Recharts + tarjetas e insignias con Tailwind.
 */
import type { ReactNode } from 'react';
import {
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, BarChart, Bar,   LineChart, Line, ReferenceLine,
} from 'recharts';

/* ─── Paleta semántica (misma en toda la app) ─── */
export const COLORS = {
  brand: '#2444D8',
  brandSoft: '#3D5AFE',
  cyan: '#4DB7E5',
  good: '#16A34A',
  warn: '#F59E0B',
  bad: '#DC2626',
  grid: '#E5E9F5',
  axis: '#94A3B8',
};

export const RISK_COLOR: Record<string, string> = {
  ALTO: COLORS.bad,
  MEDIO: COLORS.warn,
  BAJO: COLORS.good,
};

/* ─── Tarjeta base ─── */
export function Card({ title, subtitle, action, children, className = '' }: {
  title?: string; subtitle?: string; action?: ReactNode; children: ReactNode; className?: string;
}) {
  return (
    <section className={`rounded-2xl bg-white border border-slate-200/70 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(36,68,216,0.06)] p-6 ${className}`}>
      {(title || action) && (
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            {title && <h3 className="font-display text-[17px] font-semibold text-slate-900 not-italic">{title}</h3>}
            {subtitle && <p className="text-[13px] text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/* ─── KPI ─── */
export function KpiCard({ icon, label, value, hint, tone = 'brand' }: {
  icon: ReactNode; label: string; value: string; hint?: string; tone?: 'brand' | 'good' | 'warn' | 'bad' | 'cyan';
}) {
  const tones: Record<string, string> = {
    brand: 'bg-[#2444D8]/10 text-[#2444D8]',
    good: 'bg-green-600/10 text-green-700',
    warn: 'bg-amber-500/15 text-amber-700',
    bad: 'bg-red-600/10 text-red-700',
    cyan: 'bg-sky-500/10 text-sky-700',
  };
  return (
    <div className="rounded-2xl bg-white border border-slate-200/70 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(36,68,216,0.06)] p-5 flex flex-col gap-4 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(36,68,216,0.12)] transition-all">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-slate-500">{label}</span>
        <span className={`h-9 w-9 rounded-xl flex items-center justify-center ${tones[tone]}`}>{icon}</span>
      </div>
      <div className="font-display text-[34px] leading-none font-semibold text-slate-900 tracking-tight">{value}</div>
      {hint && <div className="text-[12px] text-slate-500">{hint}</div>}
    </div>
  );
}

/* ─── Insignia de riesgo ─── */
export function RiskBadge({ level }: { level?: string }) {
  const l = String(level || 'BAJO').toUpperCase();
  const map: Record<string, string> = {
    ALTO: 'bg-red-50 text-red-700 ring-red-600/20',
    MEDIO: 'bg-amber-50 text-amber-700 ring-amber-600/25',
    BAJO: 'bg-green-50 text-green-700 ring-green-600/20',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${map[l] || map.BAJO}`}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: RISK_COLOR[l] || COLORS.good }} />
      Riesgo {l.toLowerCase()}
    </span>
  );
}

/* ─── Insignia de estado de publicación ─── */
export function StatusBadge({ status }: { status?: string }) {
  const s = String(status || '').toUpperCase();
  const map: Record<string, [string, string]> = {
    APROBADO: ['Publicado', 'bg-green-50 text-green-700 ring-green-600/20'],
    PENDIENTE_REVISION: ['En revisión', 'bg-amber-50 text-amber-700 ring-amber-600/25'],
    PENDIENTE_ANALISIS: ['En análisis', 'bg-sky-50 text-sky-700 ring-sky-600/20'],
    RECHAZADO: ['Rechazado', 'bg-red-50 text-red-700 ring-red-600/20'],
  };
  const [label, cls] = map[s] || [status || '—', 'bg-slate-100 text-slate-600 ring-slate-500/20'];
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${cls}`}>{label}</span>;
}

/* ─── Barra de score de toxicidad ─── */
export function ScoreBar({ score = 0, showLabel = true }: { score?: number; showLabel?: boolean }) {
  const pct = Math.max(0, Math.min(100, Math.round(score * 100)));
  const color = score >= 0.7 ? COLORS.bad : score >= 0.4 ? COLORS.warn : COLORS.good;
  return (
    <div className="flex items-center gap-3 min-w-[140px]">
      <div className="h-2 flex-1 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
      {showLabel && <span className="text-[12px] font-semibold tabular-nums w-10 text-right" style={{ color }}>{pct}%</span>}
    </div>
  );
}

/* ─── Avatar con iniciales (sin servicios externos) ─── */
export function Avatar({ name = '?', size = 40 }: { name?: string; size?: number }) {
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase() || '?';
  const palette = ['#2444D8', '#4DB7E5', '#7C3AED', '#0EA5E9', '#16A34A', '#DB2777', '#EA580C'];
  const hash = [...name].reduce((a, c) => a + c.charCodeAt(0), 0);
  const bg = palette[hash % palette.length];
  return (
    <div className="rounded-full flex items-center justify-center text-white font-semibold shrink-0 shadow-sm"
      style={{ width: size, height: size, background: `linear-gradient(135deg, ${bg}, ${bg}CC)`, fontSize: size * 0.36 }}>
      {initials}
    </div>
  );
}

/* ─── Tooltip común ─── */
function ChartTooltip({ active, payload, label, suffix = '' }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl bg-slate-900/95 text-white px-3 py-2 text-[12px] shadow-xl">
      {label !== undefined && <div className="opacity-70 mb-1">{label}</div>}
      {payload.map((p: any) => (
        <div key={p.dataKey || p.name} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.payload?.fill }} />
          <span>{p.name}: <b>{p.value}{suffix}</b></span>
        </div>
      ))}
    </div>
  );
}

const axisProps = { stroke: COLORS.axis, fontSize: 11, tickLine: false, axisLine: false } as const;

/* ─── Columnas: actividad por día ─── */
export function ActivityArea({ data }: { data: Array<{ day: string; total: number }> }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }} barCategoryGap="28%">
        <defs>
          <linearGradient id="gCol" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COLORS.brandSoft} />
            <stop offset="100%" stopColor={COLORS.brand} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={COLORS.grid} vertical={false} />
        <XAxis dataKey="day" {...axisProps} interval="preserveStartEnd" minTickGap={24} />
        <YAxis allowDecimals={false} {...axisProps} />
        <Tooltip cursor={{ fill: 'rgba(36,68,216,0.05)' }} content={<ChartTooltip />} />
        <Bar isAnimationActive={false} dataKey="total" name="Casos" fill="url(#gCol)" radius={[6, 6, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ─── Dona: distribución por nivel de riesgo ─── */
export function RiskDonut({ data }: { data: Array<{ name: string; value: number; color: string }> }) {
  const total = data.reduce((a, d) => a + d.value, 0);
  return (
    <div className="flex flex-wrap items-center justify-center gap-5">
      <div className="relative w-[156px] h-[156px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={total ? data : [{ name: 'Sin datos', value: 1, color: COLORS.grid }]} dataKey="value" innerRadius={52} outerRadius={74} paddingAngle={total ? 3 : 0} stroke="none">
              {(total ? data : [{ color: COLORS.grid }]).map((d: any, i: number) => <Cell key={i} fill={d.color} />)}
            </Pie>
            {total > 0 && <Tooltip content={<ChartTooltip />} />}
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="font-display text-3xl font-semibold text-slate-900">{total}</span>
          <span className="text-[11px] text-slate-500">casos</span>
        </div>
      </div>
      <ul className="space-y-3 flex-1 min-w-[120px]">
        {data.map(d => (
          <li key={d.name} className="flex items-center justify-between text-[13px]">
            <span className="flex items-center gap-2 text-slate-600"><span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />{d.name}</span>
            <span className="font-semibold text-slate-900 tabular-nums ml-4">{d.value}<span className="text-slate-400 font-normal ml-1">({total ? Math.round(d.value / total * 100) : 0}%)</span></span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ─── Barras horizontales: incidentes por curso ─── */
export function CourseBars({ data }: { data: Array<{ curso: string; incidentes: number }> }) {
  const sorted = [...data].sort((a, b) => b.incidentes - a.incidentes).slice(0, 8);
  return (
    <ResponsiveContainer width="100%" height={Math.max(180, sorted.length * 44)}>
      <BarChart data={sorted} layout="vertical" margin={{ top: 0, right: 24, left: 8, bottom: 0 }} barCategoryGap={10}>
        <defs>
          <linearGradient id="gBar" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={COLORS.brand} />
            <stop offset="100%" stopColor={COLORS.cyan} />
          </linearGradient>
        </defs>
        <XAxis type="number" hide allowDecimals={false} />
        <YAxis type="category" dataKey="curso" width={150} {...axisProps} tick={{ fill: '#475569', fontSize: 12 }} />
        <Tooltip cursor={{ fill: 'rgba(36,68,216,0.05)' }} content={<ChartTooltip />} />
        <Bar isAnimationActive={false} dataKey="incidentes" name="Incidentes" fill="url(#gBar)" radius={[0, 8, 8, 0]} label={{ position: 'right', fill: '#0f172a', fontSize: 12, fontWeight: 600 }} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ─── Medidor semicircular (0–100) ─── */
export function Gauge({ value, label, color }: { value: number; label: string; color?: string }) {
  const v = Math.max(0, Math.min(100, value));
  const c = color || (v >= 70 ? COLORS.bad : v >= 40 ? COLORS.warn : COLORS.good);
  const arc = 'M 20 110 A 80 80 0 0 1 180 110';
  return (
    <div className="w-full flex flex-col items-center">
      <svg viewBox="0 0 200 124" className="w-full max-w-[260px]">
        <path d={arc} fill="none" stroke="#EEF2FB" strokeWidth="16" strokeLinecap="round" />
        <path d={arc} fill="none" stroke={c} strokeWidth="16" strokeLinecap="round" pathLength={100}
          strokeDasharray={`${v} 100`} style={{ transition: 'stroke-dasharray 900ms ease' }} />
        <text x="100" y="96" textAnchor="middle" fontSize="30" fontWeight="600" fill={c} fontFamily="Space Grotesk, sans-serif">{v.toFixed(1)}%</text>
        <text x="100" y="116" textAnchor="middle" fontSize="11" fill="#64748B">{label}</text>
      </svg>
    </div>
  );
}

/* ─── Línea de scores con umbral ─── */
export function ScoreLine({ data, threshold = 0.7 }: { data: Array<{ label: string; score: number }>; threshold?: number }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: -20, bottom: 0 }}>
        <CartesianGrid stroke={COLORS.grid} vertical={false} />
        <XAxis dataKey="label" {...axisProps} />
        <YAxis domain={[0, 100]} {...axisProps} tickFormatter={(v) => `${v}`} />
        <Tooltip content={<ChartTooltip suffix="%" />} />
        <ReferenceLine y={threshold * 100} stroke={COLORS.bad} strokeDasharray="5 4" label={{ value: 'umbral', position: 'insideTopRight', fill: COLORS.bad, fontSize: 11 }} />
        <Line isAnimationActive={false} type="monotone" dataKey="score" name="Toxicidad" stroke={COLORS.brand} strokeWidth={2.5} dot={{ r: 4, fill: '#fff', strokeWidth: 2 }} activeDot={{ r: 6 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

/* ─── Ilustración del banner (original, sin recursos externos) ─── */
export function HeroIllustration() {
  return (
    <svg viewBox="0 0 260 170" className="w-full h-full" aria-hidden="true">
      <circle cx="200" cy="40" r="46" fill="white" opacity="0.08" />
      <circle cx="60" cy="150" r="60" fill="white" opacity="0.06" />
      {/* hojas decorativas */}
      <path d="M232 150c-6-30 4-58 22-74-2 28-6 52-22 74z" fill="white" opacity="0.18" />
      <path d="M244 160c-20-16-26-38-20-60 12 18 20 38 20 60z" fill="white" opacity="0.12" />
      {/* tarjeta de foro */}
      <g transform="rotate(-6 110 85)">
        <rect x="34" y="28" width="150" height="118" rx="14" fill="white" opacity="0.95" />
        <rect x="48" y="44" width="70" height="8" rx="4" fill="#C7D2FE" />
        {/* burbuja aprobada */}
        <rect x="48" y="62" width="100" height="26" rx="9" fill="#DCFCE7" />
        <rect x="58" y="72" width="60" height="6" rx="3" fill="#86EFAC" />
        <circle cx="136" cy="75" r="7" fill="#16A34A" />
        <path d="M132.5 75l2.5 2.5 4.5-5" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {/* burbuja retenida */}
        <rect x="48" y="96" width="100" height="26" rx="9" fill="#FEE2E2" />
        <rect x="58" y="106" width="52" height="6" rx="3" fill="#FCA5A5" />
        <circle cx="136" cy="109" r="7" fill="#DC2626" />
        <path d="M133 106l6 6M139 106l-6 6" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      </g>
      {/* escudo del agente */}
      <g transform="translate(160 62)">
        <path d="M34 0l32 12v24c0 22-14 38-32 46C16 74 2 58 2 36V12z" fill="#FFFFFF" />
        <path d="M34 8l24 9v19c0 17-10 29-24 36-14-7-24-19-24-36V17z" fill="#4DB7E5" />
        <path d="M22 38l9 9 16-18" stroke="white" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      {/* destellos */}
      <path d="M150 22l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="white" opacity="0.9" />
      <path d="M222 108l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="white" opacity="0.7" />
    </svg>
  );
}

/* ─── Semana actual (calendario del panel derecho) ─── */
export function WeekStrip() {
  const hoy = new Date();
  const lunes = new Date(hoy);
  lunes.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7));
  const dias = Array.from({ length: 7 }, (_, i) => { const d = new Date(lunes); d.setDate(lunes.getDate() + i); return d; });
  const mesTxt = hoy.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
  const mes = mesTxt.charAt(0).toUpperCase() + mesTxt.slice(1);
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[13px] font-semibold text-slate-900">{mes}</span>
        <span className="text-[11px] rounded-full bg-accent/10 text-accent px-2.5 py-0.5 font-semibold">Esta semana</span>
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {dias.map(d => {
          const esHoy = d.toDateString() === hoy.toDateString();
          return (
            <div key={d.toISOString()} className={`rounded-xl py-2 text-center transition-colors ${esHoy ? 'bg-accent text-white shadow-lg shadow-accent/30' : 'bg-slate-50 text-slate-600'}`}>
              <div className={`text-[10px] capitalize ${esHoy ? 'text-white/80' : 'text-slate-400'}`}>{d.toLocaleDateString('es-CO', { weekday: 'short' }).replace('.', '')}</div>
              <div className="text-[14px] font-semibold">{d.getDate()}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
