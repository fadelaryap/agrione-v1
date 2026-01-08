import { Sprout, Target, MapPin, BarChart3 } from "lucide-react";
import { MetricCard } from "./MetricCard";

export const ProductionSection = () => {
  return (
    <div className="mb-6 animate-fade-in" style={{ animationDelay: "0.2s" }}>
      <div className="section-title">
        <Sprout className="w-5 h-5 text-success" />
        <span>Produksi & Produktivitas</span>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Produksi"
          value="1,391 ton"
          trend={{ value: "+25.5%", isPositive: true, label: "vs periode sebelumnya" }}
          icon={Sprout}
          iconColor="text-success"
          iconBgColor="bg-success/10"
        />
        
        <MetricCard
          title="Produktivitas"
          value="5.8 ton/ha"
          subtitle="Rata-rata per hektar"
          icon={Target}
          iconColor="text-info"
          iconBgColor="bg-info/10"
        />
        
        <MetricCard
          title="Total Area"
          value="239.95 ha"
          subtitle="Lahan aktif"
          icon={MapPin}
          iconColor="text-warning"
          iconBgColor="bg-warning/10"
        />
        
        <div className="card-metric group">
          <div className="flex items-start justify-between mb-3">
            <span className="text-sm text-muted-foreground font-medium">Perbandingan</span>
            <div className="bg-primary/10 p-2 rounded-lg transition-transform group-hover:scale-110">
              <BarChart3 className="w-4 h-4 text-primary" />
            </div>
          </div>
          
          <div className="mb-2">
            <span className="text-2xl lg:text-3xl font-bold text-foreground">Site A: 6.2 ton/ha</span>
          </div>
          
          <div className="space-y-1 text-xs">
            <div className="badge-success inline-block">🏆 Terbaik</div>
            <p className="text-muted-foreground">Site B: 5.6 ton/ha • Site D: 5.5 ton/ha</p>
          </div>
        </div>
      </div>
    </div>
  );
};
