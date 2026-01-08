'use client'

import { Sparkles, Send, Edit2 } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

interface Recommendation {
  id: number;
  title: string;
  urgency: "tinggi" | "sedang" | "rendah";
  confidence: number;
  area: number;
  impact: string;
  generatedAt: Date;
  actions: string;
}

const recommendations: Recommendation[] = [
  {
    id: 1,
    title: "Prediksi stres air dalam 5-7 hari",
    urgency: "tinggi",
    confidence: 85,
    area: 44,
    impact: "Optimasi hasil",
    generatedAt: new Date(),
    actions: "Tingkatkan frekuensi irigasi; Monitor NDVI harian; Koordinasi dengan SM untuk eksekusi",
  },
  {
    id: 2,
    title: "Waktu panen optimal: 15-20 hari lagi",
    urgency: "rendah",
    confidence: 92,
    area: 9,
    impact: "Optimasi hasil",
    generatedAt: new Date(),
    actions: "Persiapkan peralatan panen; Koordinasi jadwal dengan SM; Monitor kualitas gabah",
  },
  {
    id: 3,
    title: "Risiko gagal panen 15% tanpa intervensi",
    urgency: "sedang",
    confidence: 78,
    area: 8,
    impact: "Dapat mencegah gagal panen",
    generatedAt: new Date(),
    actions: "Pemupukan tambahan diperlukan; Pengendalian hama intensif; Review dengan SM dan GM",
  },
];

const getUrgencyBadge = (level: Recommendation["urgency"]) => {
  const styles = {
    tinggi: "bg-red-100 text-red-700",
    sedang: "bg-yellow-100 text-yellow-700",
    rendah: "bg-green-100 text-green-700",
  };
  const labels = {
    tinggi: "Urgensi Tinggi",
    sedang: "Urgensi Sedang",
    rendah: "Urgensi Rendah",
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${styles[level]}`}>
      {labels[level]}
    </span>
  );
};

const getCardBorder = (level: Recommendation["urgency"]) => {
  switch (level) {
    case "tinggi":
      return "border-l-4 border-l-red-500";
    case "sedang":
      return "border-l-4 border-l-yellow-500";
    case "rendah":
      return "border-l-4 border-l-green-500";
  }
};

export const RecommendationGenerator = () => {
  const today = format(new Date(), "EEEE, dd MMMM yyyy", { locale: id });

  return (
    <div className="space-y-6">
      <div className="rounded-2xl p-6 text-white relative overflow-hidden" style={{ backgroundColor: '#2E4E2A' }}>
        <div className="relative z-10">
          <h2 className="text-2xl font-bold mb-2">
            Generator Rekomendasi untuk SM
          </h2>
          <p className="text-white/80 text-sm" style={{ opacity: 0.9 }}>
            Generate dan kirim rekomendasi ke Site Manager • {today}
          </p>
        </div>
        <Sparkles className="absolute right-6 top-1/2 -translate-y-1/2 w-16 h-16 text-white/20" />
      </div>

      {/* Stats & Actions */}
      <div className="flex items-center justify-between">
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-lg">
          <p className="text-xs text-gray-600 mb-1">Total Rekomendasi</p>
          <p className="text-2xl font-bold text-gray-900">{recommendations.length}</p>
        </div>
        <button 
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Sparkles className="w-4 h-4" />
          Generate Semua
        </button>
      </div>

      {/* Recommendation Cards */}
      <div className="space-y-4">
        {recommendations.map((rec, index) => (
          <div
            key={rec.id}
            className={`bg-white border border-gray-200 rounded-xl p-5 shadow-lg ${getCardBorder(rec.urgency)}`}
          >
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-base font-semibold text-gray-900">{rec.title}</h3>
              {getUrgencyBadge(rec.urgency)}
            </div>

            <p className="text-sm text-gray-600 mb-3">
              AI prediction dengan confidence {rec.confidence}%
            </p>

            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-xs font-semibold text-gray-900 mb-2">Rekomendasi Tindakan:</p>
              <p className="text-sm text-gray-600">{rec.actions}</p>
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
              <span>
                Area: <span className="font-semibold text-gray-900">{rec.area}</span>
              </span>
              <span>
                Dampak:{" "}
                <span className="font-semibold text-green-600">{rec.impact}</span>
              </span>
              <span>
                Generated:{" "}
                <span className="font-semibold text-gray-900">
                  {format(rec.generatedAt, "dd MMM yyyy HH:mm", { locale: id })}
                </span>
              </span>
            </div>

            <div className="flex gap-3">
              <button 
                className="flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm font-medium transition-colors"
                style={{ backgroundColor: '#2E4E2A' }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              >
                <Send className="w-4 h-4" />
                Kirim ke SM
              </button>
              <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-900 hover:bg-gray-50 transition-colors">
                <Edit2 className="w-4 h-4" />
                Edit
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

