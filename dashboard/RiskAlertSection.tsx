import { AlertTriangle, CheckCircle2, MapPin, Wheat, TrendingUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export const RiskAlertSection = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6 animate-fade-in" style={{ animationDelay: "0.4s" }}>
      {/* Risiko & Alert Strategis */}
      <div className="card-metric">
        <div className="section-title mb-4">
          <AlertTriangle className="w-5 h-5 text-danger" />
          <span>Risiko & Alert Strategis</span>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-danger/5 border border-danger/20 rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Lahan Berisiko</p>
            <p className="text-3xl font-bold text-foreground">6 lahan</p>
            <p className="text-xs text-danger">13.3% dari total</p>
          </div>
          
          <div className="space-y-2">
            <div className="bg-warning/5 border border-warning/20 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="w-3.5 h-3.5 text-warning" />
                <span className="text-xs font-medium">Site Bermasalah</span>
              </div>
              <p className="text-xs text-muted-foreground">• Site A • Site C</p>
            </div>
            
            <div className="bg-danger/5 border border-danger/20 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Wheat className="w-3.5 h-3.5 text-danger" />
                <span className="text-xs font-medium">Prediksi Gagal Panen</span>
              </div>
              <p className="text-xs text-muted-foreground">2 lahan berpotensi gagal tanpa intervensi</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Status Eksekusi Rekomendasi */}
      <div className="card-metric">
        <div className="section-title mb-4">
          <CheckCircle2 className="w-5 h-5 text-success" />
          <span>Status Eksekusi Rekomendasi</span>
        </div>
        
        <div className="flex items-start gap-6">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Eksekusi Rate</p>
            <p className="text-4xl font-bold text-foreground">84.4%</p>
            <p className="text-xs text-muted-foreground">38 / 45 rekomendasi</p>
          </div>
          
          <div className="flex-1 space-y-3">
            <div className="bg-success/5 border border-success/20 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-3.5 h-3.5 text-success" />
                <span className="text-xs font-medium">Dampak terhadap Hasil</span>
              </div>
              <p className="text-xs text-muted-foreground">Meningkatkan produktivitas 8%</p>
            </div>
            
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-muted-foreground">Progress Eksekusi</span>
                <span className="font-medium">84.4%</span>
              </div>
              <Progress value={84.4} className="h-2" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
