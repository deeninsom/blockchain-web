"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

const data = [
  { date: "Jan 1", shipments: 120, scans: 240, documents: 100 },
  { date: "Jan 5", shipments: 150, scans: 280, documents: 140 },
  { date: "Jan 10", shipments: 200, scans: 350, documents: 180 },
  { date: "Jan 15", shipments: 180, scans: 320, documents: 170 },
  { date: "Jan 20", shipments: 220, scans: 400, documents: 210 },
  { date: "Jan 25", shipments: 250, scans: 450, documents: 240 },
  { date: "Jan 30", shipments: 280, scans: 500, documents: 270 },
]

export function OverviewChart() {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.2 0 0)" />
        <XAxis dataKey="date" stroke="oklch(0.6 0 0)" />
        <YAxis stroke="oklch(0.6 0 0)" />
        <Tooltip
          contentStyle={{
            backgroundColor: "oklch(0.15 0 0)",
            border: "1px solid oklch(0.2 0 0)",
            borderRadius: "8px",
          }}
          labelStyle={{ color: "oklch(0.95 0 0)" }}
        />
        <Line
          type="monotone"
          dataKey="shipments"
          stroke="oklch(0.65 0.22 41.116)"
          dot={false}
          strokeWidth={2}
          name="Shipments"
        />
        <Line
          type="monotone"
          dataKey="scans"
          stroke="oklch(0.6 0.118 184.704)"
          dot={false}
          strokeWidth={2}
          name="Scans"
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
