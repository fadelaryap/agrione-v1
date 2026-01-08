import { AlertCircle, CheckCircle2, Activity } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

const data = [
  { name: "Sehat", value: 85, color: "hsl(142, 72%, 45%)" },
  { name: "Sedang", value: 10, color: "hsl(38, 92%, 50%)" },
  { name: "Berisiko", value: 5, color: "hsl(0, 84%, 60%)" },
];

const recommendationData = [
  { month: "Jul", eksekusi: 28, pending: 12 },
  { month: "Agu", eksekusi: 32, pending: 10 },
  { month: "Sep", eksekusi: 35, pending: 8 },
  { month: "Okt", eksekusi: 38, pending: 7 },
  { month: "Nov", eksekusi: 40, pending: 6 },
  { month: "Des", eksekusi: 38, pending: 7 },
];

export const RiskDistributionChart = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6 animate-fade-in" style={{ animationDelay: "0.8s" }}>
      {/* Distribusi Risiko Lahan */}
      <div className="card-metric">
        <div className="section-title mb-4">
          <Activity className="w-5 h-5 text-warning" />
          <span>Distribusi Risiko Lahan</span>
        </div>
        
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
                label={({ name, value }) => `${name} ${value}%`}
                labelLine={false}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        <div className="flex justify-center gap-4 mt-2">
          {data.map((item, index) => (
            <div key={index} className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-muted-foreground">{item.name} {item.value}%</span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Trend Eksekusi Rekomendasi */}
      <div className="card-metric">
        <div className="section-title mb-4">
          <CheckCircle2 className="w-5 h-5 text-success" />
          <span>Trend Eksekusi Rekomendasi</span>
        </div>
        
        <div className="space-y-3">
          {recommendationData.map((item, index) => (
            <div key={index} className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-8">{item.month}</span>
              <div className="flex-1 flex h-6 rounded-full overflow-hidden bg-muted">
                <div 
                  className="bg-success transition-all"
                  style={{ width: `${(item.eksekusi / (item.eksekusi + item.pending)) * 100}%` }}
                />
                <div 
                  className="bg-warning transition-all"
                  style={{ width: `${(item.pending / (item.eksekusi + item.pending)) * 100}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground w-16 text-right">
                {item.eksekusi}/{item.eksekusi + item.pending}
              </span>
            </div>
          ))}
        </div>
        
        <div className="flex justify-center gap-6 mt-4">
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full bg-success" />
            <span className="text-muted-foreground">Dieksekusi</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full bg-warning" />
            <span className="text-muted-foreground">Pending</span>
          </div>
        </div>
      </div>
    </div>
  );
};
