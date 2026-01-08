'use client'

import { useState } from "react";
import { RefreshCw } from "lucide-react";

interface PlotData {
  id: number;
  name: string;
  ndvi: number;
  status: "kritis" | "buruk" | "sedang" | "baik" | "sangat_baik";
  x: number;
  y: number;
  width: number;
  height: number;
}

const generatePlots = (): PlotData[] => {
  const plots: PlotData[] = [];
  for (let i = 1; i <= 45; i++) {
    const ndvi = Math.random() * 0.7 + 0.3;
    let status: PlotData["status"];
    if (ndvi < 0.4) status = "kritis";
    else if (ndvi < 0.5) status = "buruk";
    else if (ndvi < 0.6) status = "sedang";
    else if (ndvi < 0.75) status = "baik";
    else status = "sangat_baik";

    plots.push({
      id: i,
      name: `Lahan ${i}`,
      ndvi,
      status,
      x: ((i - 1) % 9) * 11 + 2,
      y: Math.floor((i - 1) / 9) * 18 + 5,
      width: 10,
      height: 16,
    });
  }
  return plots;
};

const getStatusColor = (status: PlotData["status"]) => {
  switch (status) {
    case "kritis":
      return "#ef4444";
    case "buruk":
      return "#f97316";
    case "sedang":
      return "#eab308";
    case "baik":
      return "#84cc16";
    case "sangat_baik":
      return "#22c55e";
  }
};

const getStatusLabel = (status: PlotData["status"]) => {
  switch (status) {
    case "kritis":
      return "Kritis";
    case "buruk":
      return "Buruk";
    case "sedang":
      return "Sedang";
    case "baik":
      return "Baik";
    case "sangat_baik":
      return "Sangat Baik";
  }
};

const legendItems = [
  { status: "kritis" as const, label: "Kritis", color: "bg-red-500" },
  { status: "sedang" as const, label: "Sedang", color: "bg-yellow-500" },
  { status: "baik" as const, label: "Baik", color: "bg-lime-500" },
  { status: "sangat_baik" as const, label: "Sangat Baik", color: "bg-green-500" },
];

export const NDVIMap = () => {
  const [plots] = useState(() => generatePlots());
  const [hoveredPlot, setHoveredPlot] = useState<PlotData | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent, plot: PlotData) => {
    const rect = e.currentTarget.closest("svg")?.getBoundingClientRect();
    if (rect) {
      setTooltipPos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
    setHoveredPlot(plot);
  };

  const kritisCount = plots.filter((p) => p.status === "kritis").length;
  const sedangCount = plots.filter((p) => p.status === "sedang" || p.status === "buruk").length;
  const baikCount = plots.filter((p) => p.status === "baik").length;
  const sangatBaikCount = plots.filter((p) => p.status === "sangat_baik").length;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Peta NDVI</h3>
        <button 
          className="flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm font-medium transition-colors"
          style={{ backgroundColor: '#2E4E2A' }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
        >
          <RefreshCw className="w-4 h-4" />
          Refresh Data
        </button>
      </div>

      <div className="relative bg-gradient-to-br from-emerald-900/20 via-teal-800/30 to-green-900/20 rounded-xl overflow-hidden">
        <svg
          viewBox="0 0 100 100"
          className="w-full h-80 cursor-crosshair"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Background pattern */}
          <defs>
            <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100" height="100" fill="url(#grid)" />

          {/* Plots */}
          {plots.map((plot) => (
            <g key={plot.id}>
              <rect
                x={plot.x}
                y={plot.y}
                width={plot.width}
                height={plot.height}
                fill={getStatusColor(plot.status)}
                opacity={hoveredPlot?.id === plot.id ? 1 : 0.8}
                stroke={hoveredPlot?.id === plot.id ? "white" : "none"}
                strokeWidth={hoveredPlot?.id === plot.id ? 0.5 : 0}
                rx="0.5"
                className="transition-all duration-200 cursor-pointer"
                onMouseMove={(e) => handleMouseMove(e, plot)}
                onMouseLeave={() => setHoveredPlot(null)}
              />
              <text
                x={plot.x + plot.width / 2}
                y={plot.y + plot.height / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-white text-[2.5px] font-medium pointer-events-none"
              >
                {plot.id}
              </text>
            </g>
          ))}

          {/* Zoom controls placeholder */}
          <g className="cursor-pointer">
            <rect x="2" y="2" width="5" height="5" rx="0.5" fill="rgba(255,255,255,0.9)" />
            <text x="4.5" y="5" textAnchor="middle" className="fill-gray-700 text-[3px] font-bold">+</text>
          </g>
        </svg>

        {/* Tooltip */}
        {hoveredPlot && (
          <div
            className="absolute z-10 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg p-3 shadow-lg pointer-events-none"
            style={{
              left: Math.min(tooltipPos.x + 10, 280),
              top: tooltipPos.y - 80,
            }}
          >
            <div className="text-sm font-semibold text-gray-900 mb-1">
              {hoveredPlot.name}
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between gap-4">
                <span className="text-gray-600">NDVI:</span>
                <span className="font-medium text-gray-900">{hoveredPlot.ndvi.toFixed(3)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-600">Status:</span>
                <span className="font-medium" style={{ color: getStatusColor(hoveredPlot.status) }}>
                  {getStatusLabel(hoveredPlot.status)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Legend Bar */}
      <div className="mt-4 flex rounded-lg overflow-hidden text-xs font-medium">
        <div className="bg-red-500 text-white px-4 py-2 flex-1 text-center">
          Kritis<br /><span className="font-bold">{kritisCount}</span>
        </div>
        <div className="bg-yellow-500 text-white px-4 py-2 flex-1 text-center">
          Sedang<br /><span className="font-bold">{sedangCount}</span>
        </div>
        <div className="bg-lime-500 text-white px-4 py-2 flex-1 text-center">
          Baik<br /><span className="font-bold">{baikCount}</span>
        </div>
        <div className="bg-green-500 text-white px-4 py-2 flex-1 text-center">
          Sangat Baik<br /><span className="font-bold">{sangatBaikCount}</span>
        </div>
      </div>
    </div>
  );
};

