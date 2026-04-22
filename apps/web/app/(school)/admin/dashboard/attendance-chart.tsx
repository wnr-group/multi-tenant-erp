"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

export type AttendanceData = {
  present: number;
  absent: number;
};

interface AttendanceChartProps {
  data: AttendanceData;
}

const COLOR_MAP: Record<string, string> = {
  Present: "#10b981",
  Absent: "#f43f5e",
};

export function AttendanceChart({ data }: AttendanceChartProps) {
  const chartData = [
    { name: "Present", value: data.present },
    { name: "Absent", value: data.absent },
  ];

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <ResponsiveContainer width={180} height={180}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              dataKey="value"
              startAngle={90}
              endAngle={-270}
            >
              {chartData.map((entry) => (
                <Cell key={entry.name} fill={COLOR_MAP[entry.name]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => typeof value === "number" ? `${value}%` : value} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-bold text-foreground">{data.present}%</span>
          <span className="text-xs text-muted-foreground">Present</span>
        </div>
      </div>
      <div className="flex gap-4 mt-2">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          <span className="text-xs text-muted-foreground">Present</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
          <span className="text-xs text-muted-foreground">Absent</span>
        </div>
      </div>
    </div>
  );
}
