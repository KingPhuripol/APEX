"use client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface SurvivalPoint {
  label: string;
  probability: number; // 0–1
}

interface SurvivalChartProps {
  data: SurvivalPoint[];
}

const COLORS = ["#22d3ee", "#06b6d4", "#0891b2", "#0e7490"];

export default function SurvivalChart({ data }: SurvivalChartProps) {
  return (
    <ResponsiveContainer width="100%" height={120}>
      <BarChart
        data={data}
        margin={{ top: 4, right: 4, bottom: 4, left: -24 }}
        barCategoryGap="30%"
      >
        <XAxis
          dataKey="label"
          tick={{ fill: "#6b7280", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v) => `${Math.round(v * 100)}%`}
          tick={{ fill: "#6b7280", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          domain={[0, 1]}
          ticks={[0, 0.5, 1]}
        />
        <Tooltip
          formatter={(v: number) => [`${Math.round(v * 100)}%`, "Survival"]}
          contentStyle={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            fontSize: 11,
            color: "#0a1628",
          }}
          cursor={{ fill: "rgba(15,23,42,0.04)" }}
        />
        <Bar dataKey="probability" radius={[4, 4, 0, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
