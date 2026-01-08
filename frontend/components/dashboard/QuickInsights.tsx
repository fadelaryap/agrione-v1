import { Lightbulb, TrendingUp, AlertTriangle, CheckCircle2 } from "lucide-react";

interface Insight {
  id: number;
  type: "success" | "warning" | "info";
  title: string;
  description: string;
}

const insights: Insight[] = [
  {
    id: 1,
    type: "success",
    title: "Produksi Meningkat",
    description: "Produksi bulan ini naik 25.5% dibanding periode sebelumnya. Site A memimpin dengan 6.2 ton/ha.",
  },
  {
    id: 2,
    type: "warning",
    title: "Perhatian Diperlukan",
    description: "6 lahan berisiko teridentifikasi. Site A dan C perlu monitoring intensif minggu ini.",
  },
  {
    id: 3,
    type: "info",
    title: "Rekomendasi Hari Ini",
    description: "84.4% rekomendasi sudah dieksekusi. 7 rekomendasi pending menunggu approval Anda.",
  },
];

const getInsightStyle = (type: Insight["type"]) => {
  switch (type) {
    case "success":
      return {
        bg: "bg-success/10",
        border: "border-success/30",
        icon: <TrendingUp className="w-5 h-5 text-success" />,
        iconBg: "bg-success/20",
      };
    case "warning":
      return {
        bg: "bg-warning/10",
        border: "border-warning/30",
        icon: <AlertTriangle className="w-5 h-5 text-warning" />,
        iconBg: "bg-warning/20",
      };
    case "info":
      return {
        bg: "bg-info/10",
        border: "border-info/30",
        icon: <CheckCircle2 className="w-5 h-5 text-info" />,
        iconBg: "bg-info/20",
      };
  }
};

export const QuickInsights = () => {
  return (
    <div className="mb-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Lightbulb className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="font-semibold text-foreground">Insight untuk Anda</h2>
          <p className="text-xs text-muted-foreground">Ringkasan penting yang perlu Anda ketahui hari ini</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {insights.map((insight) => {
          const style = getInsightStyle(insight.type);
          return (
            <div
              key={insight.id}
              className={`${style.bg} ${style.border} border rounded-xl p-4 transition-all duration-200 hover:shadow-md cursor-pointer`}
            >
              <div className="flex items-start gap-3">
                <div className={`${style.iconBg} p-2 rounded-lg shrink-0`}>
                  {style.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-sm mb-1">{insight.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{insight.description}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
