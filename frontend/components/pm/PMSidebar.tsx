'use client'

import { Map, BarChart3, Brain, Sparkles, LayoutDashboard } from "lucide-react";

type ActivePage = "dashboard" | "peta-ndvi" | "analisis-korelasi" | "ai-dss" | "generator-rekomendasi";

interface PMSidebarProps {
  activePage: ActivePage;
  onPageChange: (page: ActivePage) => void;
}

const menuItems = [
  { id: "dashboard" as const, label: "Dashboard", icon: LayoutDashboard },
  { id: "peta-ndvi" as const, label: "Peta & NDVI", icon: Map },
  { id: "analisis-korelasi" as const, label: "Analisis Korelasi", icon: BarChart3 },
  { id: "ai-dss" as const, label: "AI & DSS", icon: Brain },
  { id: "generator-rekomendasi" as const, label: "Generator Rekomendasi", icon: Sparkles },
];

export const PMSidebar = ({ activePage, onPageChange }: PMSidebarProps) => {
  return (
    <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
          MENU
        </span>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onPageChange(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "text-white shadow-md"
                  : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
              }`}
              style={isActive ? { backgroundColor: '#2E4E2A' } : {}}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
};

