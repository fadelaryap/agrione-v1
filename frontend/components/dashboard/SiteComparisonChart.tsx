import { BarChart3 } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const data = [
  { site: "Site A", produksi: 420, produktivitas: 6.2 },
  { site: "Site B", produksi: 380, produktivitas: 5.6 },
  { site: "Site C", produksi: 350, produktivitas: 5.3 },
  { site: "Site D", produksi: 410, produktivitas: 5.5 },
  { site: "Site E", produksi: 330, produktivitas: 5.1 },
];

export const SiteComparisonChart = () => {
  return (
    <div className="card-metric mb-6 animate-fade-in" style={{ animationDelay: "0.6s" }}>
      <div className="section-title mb-4">
        <BarChart3 className="w-5 h-5 text-primary" />
        <span>Perbandingan Antar Site</span>
      </div>
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
            <XAxis 
              dataKey="site" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: 'hsl(220, 9%, 46%)' }}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: 'hsl(220, 9%, 46%)' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(0, 0%, 100%)',
                border: '1px solid hsl(220, 13%, 91%)',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
              }}
            />
            <Legend />
            <Bar 
              dataKey="produksi" 
              fill="hsl(220, 70%, 50%)" 
              radius={[4, 4, 0, 0]}
              name="Produksi (ton)"
            />
            <Bar 
              dataKey="produktivitas" 
              fill="hsl(142, 72%, 45%)" 
              radius={[4, 4, 0, 0]}
              name="Produktivitas (ton/ha)"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
