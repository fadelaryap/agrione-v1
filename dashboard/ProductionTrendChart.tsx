import { TrendingUp } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const data = [
  { month: "Mar", produksi: 800 },
  { month: "Apr", produksi: 950 },
  { month: "Mei", produksi: 1100 },
  { month: "Jun", produksi: 1050 },
  { month: "Jul", produksi: 1200 },
  { month: "Agu", produksi: 1150 },
  { month: "Sep", produksi: 1300 },
  { month: "Okt", produksi: 1250 },
  { month: "Nov", produksi: 1350 },
  { month: "Des", produksi: 1280 },
  { month: "Jan", produksi: 1391 },
];

export const ProductionTrendChart = () => {
  return (
    <div className="card-metric mb-6 animate-fade-in" style={{ animationDelay: "0.5s" }}>
      <div className="section-title mb-4">
        <TrendingUp className="w-5 h-5 text-success" />
        <span>Trend Produksi 12 Bulan Terakhir</span>
      </div>
      
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorProduksi" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(142, 72%, 45%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(142, 72%, 45%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
            <XAxis 
              dataKey="month" 
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
              labelStyle={{ fontWeight: 600 }}
            />
            <Area
              type="monotone"
              dataKey="produksi"
              stroke="hsl(142, 72%, 45%)"
              strokeWidth={3}
              fill="url(#colorProduksi)"
              name="Produksi (ton)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      
      <div className="flex justify-center mt-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="w-3 h-3 rounded-full bg-success" />
          <span>Produksi (ton)</span>
        </div>
      </div>
    </div>
  );
};
