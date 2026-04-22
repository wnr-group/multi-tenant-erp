"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

export type HomeworkData = {
  submitted: number;
  pending: number;
};

interface HomeworkChartProps {
  data: HomeworkData;
}

const COLOR_MAP: Record<string, string> = {
  Submitted: "#10b981",
  Pending: "#f43f5e",
};

export function HomeworkChart({ data }: HomeworkChartProps) {
  const chartData = [
    { name: "Submitted", value: data.submitted },
    { name: "Pending", value: data.pending },
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
          <span className="text-2xl font-bold text-foreground">{data.submitted}%</span>
          <span className="text-xs text-muted-foreground">Submitted</span>
        </div>
      </div>
      <div className="flex gap-4 mt-2">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          <span className="text-xs text-muted-foreground">Submitted</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
          <span className="text-xs text-muted-foreground">Pending</span>
        </div>
      </div>
    </div>
  );
}
