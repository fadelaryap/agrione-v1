import { 
  LayoutGrid, 
  Wheat, 
  TrendingUp, 
  TrendingDown,
  DollarSign, 
  Percent, 
  CheckCircle 
} from "lucide-react";

interface KPICardProps {
  icon: React.ReactNode;
  iconBg: string;
  value: string;
  unit: string;
  label: string;
  target?: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  status?: "on-track" | "warning";
}

const KPICard = ({ icon, iconBg, value, unit, label, target, trend, status }: KPICardProps) => {
  return (
    <div className="bg-card border border-border rounded-xl p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 ${iconBg} rounded-lg flex items-center justify-center`}>
          {icon}
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
            trend.isPositive 
              ? "bg-success/10 text-success" 
              : "bg-danger/10 text-danger"
          }`}>
            {trend.isPositive ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            <span>{trend.value}</span>
          </div>
        )}
        {status === "on-track" && (
          <div className="flex items-center gap-1 text-xs font-medium text-success">
            <span>—</span>
            <span>Sesuai Target</span>
          </div>
        )}
      </div>

      <div className="mb-1">
        <span className="text-2xl lg:text-3xl font-bold text-foreground">{value}</span>
        <span className="text-sm text-muted-foreground ml-1">{unit}</span>
      </div>

      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">{label}</p>

      {target && (
        <p className="text-xs text-muted-foreground">
          Target: <span className="font-medium text-foreground">{target}</span>
        </p>
      )}
    </div>
  );
};

export const KPISection = () => {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-sm font-semibold text-foreground">Indikator Kinerja Utama</h2>
        <span className="text-xs text-muted-foreground">• Progres Musim MT-1</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KPICard
          icon={<LayoutGrid className="w-5 h-5 text-primary" />}
          iconBg="bg-primary/10"
          value="12,450"
          unit="Ha"
          label="Total Luas Tanam"
          target="13,000 Ha"
          trend={{ value: "+4.2%", isPositive: true }}
        />

        <KPICard
          icon={<Wheat className="w-5 h-5 text-success" />}
          iconBg="bg-success/10"
          value="68,750"
          unit="Ton"
          label="Estimasi Produksi"
          target="70,000 Ton"
          trend={{ value: "+6.8%", isPositive: true }}
        />

        <KPICard
          icon={<TrendingUp className="w-5 h-5 text-info" />}
          iconBg="bg-info/10"
          value="5.52"
          unit="Ton/Ha"
          label="Indeks Produktivitas"
          target="5.4 Ton/Ha"
          trend={{ value: "+2.2%", isPositive: true }}
        />

        <KPICard
          icon={<DollarSign className="w-5 h-5 text-warning" />}
          iconBg="bg-warning/10"
          value="5.6"
          unit="Jt Rp"
          label="Biaya Rata-rata/Ha"
          target="≤5.8 Jt Rp"
          trend={{ value: "-3.4%", isPositive: false }}
        />

        <KPICard
          icon={<Percent className="w-5 h-5 text-accent" />}
          iconBg="bg-accent/10"
          value="28.5"
          unit="%"
          label="Margin Kotor"
          target="≥25%"
          trend={{ value: "+1.8%", isPositive: true }}
        />

        <KPICard
          icon={<CheckCircle className="w-5 h-5 text-success" />}
          iconBg="bg-success/10"
          value="96.2"
          unit="%"
          label="Pemenuhan Pasokan"
          target="100% Target"
          status="on-track"
        />
      </div>
    </div>
  );
};
