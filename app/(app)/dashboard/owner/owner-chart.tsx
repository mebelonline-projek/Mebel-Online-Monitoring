"use client";

import { useMemo } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { DashboardMonthlyData } from "@/lib/transactions";
import { formatCurrency } from "@/lib/formatters";

interface Props {
  data: DashboardMonthlyData[];
  period?: string;
}

export function OwnerChart({ data, period = "monthly" }: Props) {
  const chartData = useMemo(
    () =>
      data.map((d) => ({
        name: d.monthLabel,
        Omzet: d.revenue,
        "Laba Kotor": d.grossProfit,
        "Laba Bersih": d.netProfit,
      })),
    [data]
  );

  const formatRupiah = (value: number) => {
    if (value >= 1_000_000_000) return `Rp ${(value / 1_000_000_000).toFixed(1)}M`;
    if (value >= 1_000_000) return `Rp ${(value / 1_000_000).toFixed(0)}JT`;
    return `Rp ${value.toLocaleString("id-ID")}`;
  };

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ name: string; value: number; color: string }>;
    label?: string;
  }) => {
    if (!active || !payload) return null;
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
        <p className="text-xs font-bold text-muted-foreground mb-2">{label}</p>
        {payload.map((p) => (
          <p key={p.name} className="text-sm" style={{ color: p.color }}>
            {p.name}: {formatCurrency(p.value)}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="rounded-2xl overflow-hidden glass-panel p-6">
      <h3 className="text-xl font-bold text-foreground mb-6">
        Revenue & Profit Overview
      </h3>
      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart
          data={chartData}
          margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border)"
            opacity={0.3}
          />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            axisLine={{ stroke: "var(--border)" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            axisLine={{ stroke: "var(--border)" }}
            tickLine={false}
            tickFormatter={formatRupiah}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: "12px", color: "var(--muted-foreground)" }}
          />
          <Bar
            dataKey="Omzet"
            fill="#800000"
            radius={[4, 4, 0, 0]}
            barSize={20}
            opacity={0.85}
          />
          <Line
            type="monotone"
            dataKey="Laba Kotor"
            stroke="#818cf8"
            strokeWidth={2}
            dot={{ r: 4, fill: "#818cf8" }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="Laba Bersih"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ r: 4, fill: "#3b82f6" }}
            activeDot={{ r: 6 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}