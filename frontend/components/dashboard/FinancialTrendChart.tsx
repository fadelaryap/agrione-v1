import { DollarSign } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const data = [
  { month: "Mar", cost: 65, margin: 25, revenue: 90 },
  { month: "Apr", cost: 70, margin: 28, revenue: 98 },
  { month: "Mei", cost: 75, margin: 30, revenue: 105 },
  { month: "Jun", cost: 72, margin: 32, revenue: 104 },
  { month: "Jul", cost: 78, margin: 35, revenue: 113 },
  { month: "Agu", cost: 76, margin: 33, revenue: 109 },
  { month: "Sep", cost: 80, margin: 38, revenue: 118 },
  { month: "Okt", cost: 82, margin: 36, revenue: 118 },
  { month: "Nov", cost: 84, margin: 40, revenue: 124 },
  { month: "Des", cost: 83, margin: 38, revenue: 121 },
  { month: "Jan", cost: 85, margin: 35, revenue: 120 },
];

export const FinancialTrendChart = () => {
  return (
    <div className="card-metric mb-6 animate-fade-in" style={{ animationDelay: "0.7s" }}>
      <div className="section-title mb-4">
        <DollarSign className="w-5 h-5 text-success" />
        <span>Trend Finansial 12 Bulan Terakhir</span>
      </div>
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="revenue" 
              stroke="hsl(142, 72%, 45%)" 
              strokeWidth={2}
              dot={{ r: 3 }}
              name="Revenue (IDR)"
            />
            <Line 
              type="monotone" 
              dataKey="cost" 
              stroke="hsl(38, 92%, 50%)" 
              strokeWidth={2}
              dot={{ r: 3 }}
              name="Cost (IDR)"
            />
            <Line 
              type="monotone" 
              dataKey="margin" 
              stroke="hsl(0, 84%, 60%)" 
              strokeWidth={2}
              dot={{ r: 3 }}
              name="Margin (IDR)"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
