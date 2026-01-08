'use client'

import { useState } from "react";
import { PMSidebar } from "@/components/pm/PMSidebar";
import { PMHeader } from "@/components/pm/PMHeader";
import { PMQuickInsights } from "@/components/pm/PMQuickInsights";
import { NDVIMap } from "@/components/pm/NDVIMap";
import { NDVIDataTable } from "@/components/pm/NDVIDataTable";
import { CorrelationAnalysis } from "@/components/pm/CorrelationAnalysis";
import { AIPredictions } from "@/components/pm/AIPredictions";
import { RecommendationGenerator } from "@/components/pm/RecommendationGenerator";
import { PMDashboard } from "@/components/pm/PMDashboard";

type ActivePage = "dashboard" | "peta-ndvi" | "analisis-korelasi" | "ai-dss" | "generator-rekomendasi";

const ProjectManager = () => {
  const [activePage, setActivePage] = useState<ActivePage>("dashboard");

  const renderContent = () => {
    switch (activePage) {
      case "dashboard":
        return <PMDashboard onNavigate={setActivePage} />;
      case "peta-ndvi":
        return (
          <div className="space-y-6">
            <div className="rounded-2xl p-6 text-white" style={{ backgroundColor: '#2E4E2A' }}>
              <h2 className="text-2xl font-bold mb-2">
                Peta NDVI & Analisis Vegetasi
              </h2>
              <p className="text-white/80 text-sm" style={{ opacity: 0.9 }}>
                Visualisasi kesehatan tanaman berdasarkan NDVI
              </p>
            </div>
            <PMQuickInsights />
            <NDVIMap />
            <NDVIDataTable />
          </div>
        );
      case "analisis-korelasi":
        return <CorrelationAnalysis />;
      case "ai-dss":
        return <AIPredictions />;
      case "generator-rekomendasi":
        return <RecommendationGenerator />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-white flex">
      <PMSidebar activePage={activePage} onPageChange={setActivePage} />
      <div className="flex-1 flex flex-col">
        <PMHeader userName="Ahmad Wijaya" />
        <main className="flex-1 p-6 overflow-auto bg-gray-50">
          <div className="max-w-6xl mx-auto">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default ProjectManager;
