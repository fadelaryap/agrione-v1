import { TrendingUp } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";

// Seasonal Production Trend Data
const seasonalTrendData = [
  { month: "Jan", actual: 800, target: 750, baseline: 700 },
  { month: "Feb", actual: 950, target: 900, baseline: 800 },
  { month: "Mar", actual: 1100, target: 1050, baseline: 900 },
  { month: "Apr", actual: 1200, target: 1150, baseline: 1000 },
  { month: "May", actual: 1350, target: 1300, baseline: 1100 },
  { month: "Jun", actual: 1500, target: 1400, baseline: 1200 },
];

// Productivity by Cluster Data
const productivityByClusterData = [
  { name: "Cluster A", inti: 5.8, plasma: 5.2 },
  { name: "Cluster B", inti: 5.2, plasma: 4.8 },
  { name: "Cluster C", inti: 5.5, plasma: 5.0 },
  { name: "Cluster D", inti: 6.0, plasma: 5.4 },
  { name: "Cluster E", inti: 5.6, plasma: 5.1 },
];

export const ProductionAnalytics = () => {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-sm font-semibold text-gray-900">Analitik Produksi</h2>
        <span className="text-xs text-gray-600">• Performa Musiman & Perbandingan Kluster</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Tren Produksi Musiman */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#2E4E2A' }} />
              <span className="text-sm font-medium text-gray-900">Tren Produksi Musiman</span>
            </div>
            <span className="text-xs text-gray-600">vs Target MT-1</span>
          </div>

          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={seasonalTrendData}>
                <XAxis 
                  dataKey="month" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: '#6b7280' }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  domain={[0, 1600]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="actual" 
                  name="Aktual (Ton)"
                  stroke="hsl(142, 76%, 36%)" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(142, 76%, 36%)', strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="target" 
                  name="Target"
                  stroke="hsl(48, 96%, 53%)" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="baseline" 
                  name="Baseline MT-1"
                  stroke="#9ca3af" 
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-center gap-6 mt-3">
            <div className="flex items-center gap-1 text-xs">
              <div className="w-3 h-0.5 bg-success" />
              <span className="text-gray-600">Aktual (Ton)</span>
            </div>
            <div className="flex items-center gap-1 text-xs">
              <div className="w-3 h-0.5" style={{ backgroundColor: '#eab308' }} />
              <span className="text-gray-600">Target</span>
            </div>
            <div className="flex items-center gap-1 text-xs">
              <div className="w-3 h-0.5 bg-gray-400" />
              <span className="text-gray-600">Baseline MT-1</span>
            </div>
          </div>
        </div>

        {/* Produktivitas per Kluster */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-600" />
              <span className="text-sm font-medium text-gray-900">Produktivitas per Kluster</span>
            </div>
            <span className="text-xs text-gray-600">Inti vs Plasma (Ton/Ha)</span>
          </div>

          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={productivityByClusterData} barGap={4}>
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  domain={[0, 7]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Bar 
                  dataKey="inti" 
                  name="Lahan Inti" 
                  fill="hsl(142, 76%, 36%)" 
                  radius={[4, 4, 0, 0]}
                  barSize={20}
                />
                <Bar 
                  dataKey="plasma" 
                  name="Lahan Plasma" 
                  fill="hsl(48, 96%, 53%)" 
                  radius={[4, 4, 0, 0]}
                  barSize={20}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-center gap-6 mt-3">
            <div className="flex items-center gap-1 text-xs">
              <div className="w-3 h-3 rounded-sm bg-green-600" />
              <span className="text-gray-600">Lahan Inti</span>
            </div>
            <div className="flex items-center gap-1 text-xs">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#eab308' }} />
              <span className="text-gray-600">Lahan Plasma</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
