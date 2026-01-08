import { useState } from "react";
import { MapPin } from "lucide-react";

interface PlotData {
  id: string;
  name: string;
  site: string;
  area: number;
  production: number;
  productivity: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

// Mock data for agricultural plots
const plotsData: PlotData[] = [
  { id: "A1", name: "Blok A1", site: "Site A", area: 12.5, production: 81.25, productivity: 6.5, x: 5, y: 25, width: 8, height: 6 },
  { id: "A2", name: "Blok A2", site: "Site A", area: 15.0, production: 97.5, productivity: 6.5, x: 14, y: 22, width: 10, height: 8 },
  { id: "A3", name: "Blok A3", site: "Site A", area: 10.0, production: 62.0, productivity: 6.2, x: 25, y: 20, width: 7, height: 7 },
  { id: "A4", name: "Blok A4", site: "Site A", area: 8.0, production: 52.0, productivity: 6.5, x: 33, y: 18, width: 6, height: 6 },
  { id: "B1", name: "Blok B1", site: "Site B", area: 14.0, production: 78.4, productivity: 5.6, x: 8, y: 35, width: 9, height: 7 },
  { id: "B2", name: "Blok B2", site: "Site B", area: 12.0, production: 66.0, productivity: 5.5, x: 18, y: 32, width: 8, height: 8 },
  { id: "B3", name: "Blok B3", site: "Site B", area: 16.0, production: 89.6, productivity: 5.6, x: 27, y: 30, width: 10, height: 7 },
  { id: "B4", name: "Blok B4", site: "Site B", area: 11.0, production: 60.5, productivity: 5.5, x: 38, y: 28, width: 7, height: 6 },
  { id: "C1", name: "Blok C1", site: "Site C", area: 13.0, production: 58.5, productivity: 4.5, x: 12, y: 45, width: 8, height: 7 },
  { id: "C2", name: "Blok C2", site: "Site C", area: 18.0, production: 81.0, productivity: 4.5, x: 21, y: 42, width: 11, height: 9 },
  { id: "C3", name: "Blok C3", site: "Site C", area: 9.0, production: 41.4, productivity: 4.6, x: 33, y: 40, width: 6, height: 6 },
  { id: "D1", name: "Blok D1", site: "Site D", area: 20.0, production: 110.0, productivity: 5.5, x: 45, y: 22, width: 12, height: 8 },
  { id: "D2", name: "Blok D2", site: "Site D", area: 15.0, production: 82.5, productivity: 5.5, x: 58, y: 20, width: 9, height: 7 },
  { id: "D3", name: "Blok D3", site: "Site D", area: 17.0, production: 93.5, productivity: 5.5, x: 50, y: 32, width: 10, height: 8 },
  { id: "E1", name: "Blok E1", site: "Site E", area: 14.0, production: 84.0, productivity: 6.0, x: 68, y: 25, width: 8, height: 7 },
  { id: "E2", name: "Blok E2", site: "Site E", area: 11.0, production: 66.0, productivity: 6.0, x: 77, y: 22, width: 7, height: 6 },
  { id: "E3", name: "Blok E3", site: "Site E", area: 13.0, production: 78.0, productivity: 6.0, x: 70, y: 35, width: 8, height: 7 },
  { id: "F1", name: "Blok F1", site: "Site F", area: 10.0, production: 38.0, productivity: 3.8, x: 42, y: 48, width: 7, height: 6 },
  { id: "F2", name: "Blok F2", site: "Site F", area: 12.0, production: 45.6, productivity: 3.8, x: 50, y: 45, width: 8, height: 7 },
  { id: "G1", name: "Blok G1", site: "Site G", area: 16.0, production: 80.0, productivity: 5.0, x: 60, y: 42, width: 9, height: 8 },
  { id: "G2", name: "Blok G2", site: "Site G", area: 14.0, production: 70.0, productivity: 5.0, x: 70, y: 48, width: 8, height: 7 },
  { id: "H1", name: "Blok H1", site: "Site H", area: 8.0, production: 56.0, productivity: 7.0, x: 85, y: 30, width: 6, height: 5 },
  { id: "H2", name: "Blok H2", site: "Site H", area: 10.0, production: 68.0, productivity: 6.8, x: 82, y: 38, width: 7, height: 6 },
];

const getProductivityColor = (productivity: number): string => {
  if (productivity >= 6.5) return "hsl(142, 76%, 36%)"; // Dark green - excellent
  if (productivity >= 6.0) return "hsl(142, 71%, 45%)"; // Green - very good
  if (productivity >= 5.5) return "hsl(84, 81%, 44%)"; // Yellow-green - good
  if (productivity >= 5.0) return "hsl(48, 96%, 53%)"; // Yellow - average
  if (productivity >= 4.5) return "hsl(36, 100%, 50%)"; // Orange - below average
  return "hsl(0, 84%, 60%)"; // Red - poor
};

const getProductivityLabel = (productivity: number): string => {
  if (productivity >= 6.5) return "Sangat Baik";
  if (productivity >= 6.0) return "Baik";
  if (productivity >= 5.5) return "Cukup Baik";
  if (productivity >= 5.0) return "Rata-rata";
  if (productivity >= 4.5) return "Kurang";
  return "Rendah";
};

export const ProductionMap = () => {
  const [hoveredPlot, setHoveredPlot] = useState<PlotData | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent, plot: PlotData) => {
    const rect = e.currentTarget.closest('svg')?.getBoundingClientRect();
    if (rect) {
      setTooltipPos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top - 10,
      });
    }
    setHoveredPlot(plot);
  };

  const legendItems = [
    { color: "hsl(142, 76%, 36%)", label: "≥6.5 ton/ha", desc: "Sangat Baik" },
    { color: "hsl(142, 71%, 45%)", label: "6.0-6.4", desc: "Baik" },
    { color: "hsl(84, 81%, 44%)", label: "5.5-5.9", desc: "Cukup Baik" },
    { color: "hsl(48, 96%, 53%)", label: "5.0-5.4", desc: "Rata-rata" },
    { color: "hsl(36, 100%, 50%)", label: "4.5-4.9", desc: "Kurang" },
    { color: "hsl(0, 84%, 60%)", label: "<4.5", desc: "Rendah" },
  ];

  return (
    <div className="card-metric group">
      <div className="flex items-start justify-between mb-3">
        <div>
          <span className="text-sm text-muted-foreground font-medium">Peta Produktivitas Lahan</span>
          <p className="text-xs text-muted-foreground mt-1">Arahkan mouse ke lahan untuk melihat detail</p>
        </div>
        <div className="bg-primary/10 p-2 rounded-lg transition-transform group-hover:scale-110">
          <MapPin className="w-4 h-4 text-primary" />
        </div>
      </div>

      <div className="relative bg-gradient-to-br from-emerald-900/20 to-green-800/30 rounded-xl overflow-hidden border border-border/50">
        <svg
          viewBox="0 0 100 65"
          className="w-full h-80 lg:h-[420px]"
          style={{ background: "linear-gradient(135deg, hsl(142, 40%, 15%) 0%, hsl(142, 30%, 20%) 100%)" }}
        >
          {/* Background grid pattern */}
          <defs>
            <pattern id="grid" width="5" height="5" patternUnits="userSpaceOnUse">
              <path d="M 5 0 L 0 0 0 5" fill="none" stroke="hsl(142, 20%, 25%)" strokeWidth="0.1" />
            </pattern>
          </defs>
          <rect width="100" height="65" fill="url(#grid)" />

          {/* Plot polygons */}
          {plotsData.map((plot) => (
            <g key={plot.id}>
              <rect
                x={plot.x}
                y={plot.y}
                width={plot.width}
                height={plot.height}
                fill={getProductivityColor(plot.productivity)}
                stroke={hoveredPlot?.id === plot.id ? "white" : "rgba(0,0,0,0.3)"}
                strokeWidth={hoveredPlot?.id === plot.id ? 0.5 : 0.2}
                rx={0.5}
                className="cursor-pointer transition-all duration-200"
                style={{
                  filter: hoveredPlot?.id === plot.id ? "brightness(1.2)" : "none",
                  transform: hoveredPlot?.id === plot.id ? "scale(1.02)" : "scale(1)",
                  transformOrigin: `${plot.x + plot.width / 2}px ${plot.y + plot.height / 2}px`,
                }}
                onMouseMove={(e) => handleMouseMove(e, plot)}
                onMouseLeave={() => setHoveredPlot(null)}
              />
            </g>
          ))}

          {/* Site labels */}
          <text x="12" y="18" fontSize="3" fill="white" fontWeight="bold" opacity="0.7">Site A</text>
          <text x="15" y="55" fontSize="3" fill="white" fontWeight="bold" opacity="0.7">Site C</text>
          <text x="52" y="15" fontSize="3" fill="white" fontWeight="bold" opacity="0.7">Site D</text>
          <text x="75" y="18" fontSize="3" fill="white" fontWeight="bold" opacity="0.7">Site E</text>
          <text x="48" y="58" fontSize="3" fill="white" fontWeight="bold" opacity="0.7">Site F</text>
          <text x="65" y="58" fontSize="3" fill="white" fontWeight="bold" opacity="0.7">Site G</text>
          <text x="83" y="50" fontSize="3" fill="white" fontWeight="bold" opacity="0.7">Site H</text>
        </svg>

        {/* Tooltip */}
        {hoveredPlot && (
          <div
            className="absolute z-10 bg-popover/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-xl pointer-events-none transform -translate-x-1/2 -translate-y-full"
            style={{
              left: tooltipPos.x,
              top: tooltipPos.y,
              minWidth: "180px",
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: getProductivityColor(hoveredPlot.productivity) }}
              />
              <span className="font-semibold text-foreground">{hoveredPlot.name}</span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                {hoveredPlot.site}
              </span>
            </div>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Luas:</span>
                <span className="font-medium text-foreground">{hoveredPlot.area} ha</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Produksi:</span>
                <span className="font-medium text-foreground">{hoveredPlot.production.toFixed(1)} ton</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Produktivitas:</span>
                <span className="font-medium text-foreground">{hoveredPlot.productivity} ton/ha</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-border">
                <span className="text-muted-foreground">Status:</span>
                <span
                  className="font-semibold"
                  style={{ color: getProductivityColor(hoveredPlot.productivity) }}
                >
                  {getProductivityLabel(hoveredPlot.productivity)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-2 right-2 bg-popover/90 backdrop-blur-sm rounded-lg p-2 border border-border">
          <p className="text-xs font-medium text-foreground mb-1.5">Produktivitas (ton/ha)</p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            {legendItems.map((item, index) => (
              <div key={index} className="flex items-center gap-1.5">
                <div
                  className="w-3 h-3 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs text-muted-foreground whitespace-nowrap">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Map controls hint */}
        <div className="absolute top-2 left-2 bg-popover/90 backdrop-blur-sm rounded-lg px-2 py-1 border border-border">
          <span className="text-xs text-muted-foreground">Total: 239.95 ha • 23 Blok</span>
        </div>
      </div>
    </div>
  );
};
