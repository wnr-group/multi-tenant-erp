"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

export type DayAttendance = {
  day: string;
  percent: number;
};

interface WeeklyAttendanceChartProps {
  data: DayAttendance[];
}

export function WeeklyAttendanceChart({ data }: WeeklyAttendanceChartProps) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="day" tick={{ fontSize: 12 }} />
        <YAxis
          domain={[60, 100]}
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
        <Line
          type="monotone"
          dataKey="percent"
          name="Attendance"
          stroke="#10b981"
          strokeWidth={2}
          dot={{ r: 4, fill: "#10b981" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
