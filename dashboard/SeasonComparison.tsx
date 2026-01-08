import { CalendarDays, Check, Circle, TrendingUp } from "lucide-react";

const seasons = [
  { id: 1, name: "MT 1 2024", value: "5.2 ton/ha", status: "completed", icon: Check },
  { id: 2, name: "MT 2 2024", value: "5.5 ton/ha", status: "completed", icon: Check },
  { id: 3, name: "MT 1 2025", value: "5.8 ton/ha", status: "current", icon: Circle },
  { id: 4, name: "MT 2 2025", value: "6.1 ton/ha", status: "projected", icon: Circle },
];

export const SeasonComparison = () => {
  return (
    <div className="card-metric animate-fade-in" style={{ animationDelay: "0.9s" }}>
      <div className="section-title mb-4">
        <CalendarDays className="w-5 h-5 text-primary" />
        <span>Trend Produksi (Perbandingan Musim)</span>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {seasons.map((season) => {
          const Icon = season.icon;
          const isProjected = season.status === "projected";
          const isCurrent = season.status === "current";
          
          return (
            <div
              key={season.id}
              className={`rounded-xl p-4 text-center transition-all ${
                isCurrent 
                  ? "bg-info/10 border-2 border-info" 
                  : isProjected 
                    ? "bg-muted border border-border border-dashed" 
                    : "bg-success/5 border border-success/20"
              }`}
            >
              <div className={`w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center ${
                isCurrent 
                  ? "bg-info text-info-foreground" 
                  : isProjected 
                    ? "bg-muted-foreground/20 text-muted-foreground" 
                    : "bg-success text-success-foreground"
              }`}>
                <Icon className="w-4 h-4" />
              </div>
              <p className="text-xs text-muted-foreground mb-1">{season.name}</p>
              <p className="text-xl font-bold text-foreground">{season.value}</p>
              {isProjected && (
                <span className="text-[10px] text-muted-foreground">Proyeksi</span>
              )}
            </div>
          );
        })}
      </div>
      
      <div className="mt-4 flex items-center justify-center gap-2 text-sm text-success">
        <TrendingUp className="w-4 h-4" />
        <span>Trend positif: +17.3% peningkatan dalam 4 musim</span>
      </div>
    </div>
  );
};
