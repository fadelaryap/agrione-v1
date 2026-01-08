import { DollarSign, TrendingDown, Percent } from "lucide-react";
import { MetricCard } from "./MetricCard";

export const FinancialSection = () => {
  return (
    <div className="mb-6 animate-fade-in" style={{ animationDelay: "0.3s" }}>
      <div className="section-title">
        <DollarSign className="w-5 h-5 text-success" />
        <span>Finansial</span>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          title="Total Revenue"
          value="Rp 12 M"
          subtitle="Rp 50.010.386 / ha"
          icon={DollarSign}
          iconColor="text-success"
          iconBgColor="bg-success/10"
        />
        
        <MetricCard
          title="Total Cost"
          value="Rp 8.5 M"
          subtitle="Rp 35.424.031 / ha"
          trend={{ value: "-2.5%", isPositive: true, label: "deviasi anggaran" }}
          icon={TrendingDown}
          iconColor="text-info"
          iconBgColor="bg-info/10"
        />
        
        <MetricCard
          title="Margin"
          value="Rp 3.5 M"
          subtitle="29.2% margin percentage"
          icon={Percent}
          iconColor="text-warning"
          iconBgColor="bg-warning/10"
        />
      </div>
    </div>
  );
};
