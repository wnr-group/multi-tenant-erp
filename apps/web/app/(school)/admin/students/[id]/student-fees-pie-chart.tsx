"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface Props {
  totalPaid: number;
  outstanding: number;
}

const COLORS = ["#10b981", "#f43f5e"];

export function FeesPieChart({ totalPaid, outstanding }: Props) {
  if (totalPaid === 0 && outstanding === 0) return null;

  const data = [
    { name: "Paid", value: totalPaid },
    { name: "Pending", value: outstanding },
  ].filter((d) => d.value > 0);

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fee Summary</p>
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={48}
            outerRadius={72}
            paddingAngle={data.length > 1 ? 3 : 0}
            dataKey="value"
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => [`₹${Number(value).toLocaleString("en-IN")}`, ""]}
          />
          <Legend
            formatter={(value, entry: any) =>
              `${value}: ₹${(entry.payload.value as number).toLocaleString("en-IN")}`
            }
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
