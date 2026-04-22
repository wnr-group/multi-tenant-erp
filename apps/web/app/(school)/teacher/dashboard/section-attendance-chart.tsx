"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

export type SectionAttendance = {
  section: string;
  percent: number;
};

interface SectionAttendanceChartProps {
  data: SectionAttendance[];
}

export function SectionAttendanceChart({ data }: SectionAttendanceChartProps) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="section" tick={{ fontSize: 12 }} />
        <YAxis
          domain={[0, 100]}
          tickFormatter={(v) => `${v}%`}
          tick={{ fontSize: 12 }}
        />
        <Tooltip formatter={(value) => typeof value === "number" ? `${value}%` : value} />
        <ReferenceLine
          y={75}
          stroke="#f59e0b"
          strokeDasharray="4 4"
          label={{ value: "75%", position: "insideTopRight", fontSize: 11, fill: "#f59e0b" }}
        />
        <Bar dataKey="percent" name="Attendance" fill="#6366f1" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
