import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  trend?: {
    value: string;
    isPositive: boolean;
    label?: string;
  };
  icon: LucideIcon;
  iconColor?: string;
  iconBgColor?: string;
}

export const MetricCard = ({
  title,
  value,
  subtitle,
  trend,
  icon: Icon,
  iconColor = "text-primary",
  iconBgColor = "bg-primary/10",
}: MetricCardProps) => {
  return (
    <div className="card-metric group">
      <div className="flex items-start justify-between mb-3">
        <span className="text-sm text-muted-foreground font-medium">{title}</span>
        <div className={`${iconBgColor} p-2 rounded-lg transition-transform group-hover:scale-110`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
      </div>
      
      <div className="mb-2">
        <span className="text-2xl lg:text-3xl font-bold text-foreground">{value}</span>
      </div>
      
      {subtitle && (
        <p className="text-xs text-muted-foreground mb-2">{subtitle}</p>
      )}
      
      {trend && (
        <div className={`flex items-center gap-1 text-xs font-medium ${trend.isPositive ? "text-success" : "text-danger"}`}>
          {trend.isPositive ? (
            <TrendingUp className="w-3.5 h-3.5" />
          ) : (
            <TrendingDown className="w-3.5 h-3.5" />
          )}
          <span>{trend.value}</span>
          {trend.label && <span className="text-muted-foreground ml-1">{trend.label}</span>}
        </div>
      )}
    </div>
  );
};
