'use client'

import { AlertTriangle, TrendingUp, Leaf, MapPin } from "lucide-react";

const stats = [
  { label: "Total Lahan", value: "45", icon: MapPin, color: "text-[#2E4E2A]" },
  { label: "Lahan Sehat", value: "24", icon: Leaf, color: "text-green-600" },
  { label: "Lahan Sedang", value: "5", icon: TrendingUp, color: "text-yellow-600" },
  { label: "Lahan Berisiko", value: "16", icon: AlertTriangle, color: "text-red-600" },
];

export const PMQuickInsights = () => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className="bg-white border border-gray-200 rounded-xl p-4 shadow-lg flex items-center gap-4"
          >
            <div className={`p-3 rounded-xl bg-gray-50 ${stat.color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-600">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

