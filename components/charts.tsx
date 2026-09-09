"use client";

import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
  PieChart, Pie, Legend, AreaChart, Area, CartesianGrid,
} from "recharts";

const PIE_COLORS = ["#4f46e5", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#64748b", "#f97316", "#84cc16", "#06b6d4"];

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  boxShadow: "0 4px 16px rgba(15,23,42,0.08)",
  fontSize: 12,
};

export function BarChartCard({ data, xKey, bars }: {
  data: Array<Record<string, unknown>>; xKey: string; bars: Array<{ key: string; color: string; name: string }>;
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
        <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(79,70,229,0.06)" }} />
        {bars.map((b) => (
          <Bar key={b.key} dataKey={b.key} name={b.name} fill={b.color} radius={[6, 6, 0, 0]} maxBarSize={38} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DonutChart({ data, height = 260 }: { data: Array<{ name: string; value: number }>; height?: number }) {
  const filtered = data.filter((d) => d.value > 0);
  if (filtered.length === 0) {
    return <div className="h-[260px] flex items-center justify-center text-sm text-ink-400">No data yet</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={filtered} dataKey="value" nameKey="name" innerRadius="52%" outerRadius="80%" paddingAngle={2} strokeWidth={0}>
          {filtered.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function AreaTrend({ data, series }: {
  data: Array<Record<string, unknown>>; series: Array<{ key: string; color: string; name: string }>;
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <defs>
          {series.map((s) => (
            <linearGradient key={s.key} id={`g-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity={0.28} />
              <stop offset="100%" stopColor={s.color} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
        <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
        <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} />
        {series.map((s) => (
          <Area key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={2} fill={`url(#g-${s.key})`} />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
