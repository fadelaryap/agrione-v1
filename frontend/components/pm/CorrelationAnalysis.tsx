'use client'

import { format } from "date-fns";
import { id } from "date-fns/locale";

interface CorrelationCard {
  title: string;
  correlation: number;
  description: string;
  insights: string[];
}

const correlations: CorrelationCard[] = [
  {
    title: "NDVI vs Laporan Lapangan",
    correlation: 0.82,
    description: "Korelasi kuat antara NDVI dan kondisi lapangan yang dilaporkan SPV",
    insights: [
      "Laporan SPV dapat diandalkan",
      "NDVI dapat digunakan untuk validasi",
      "Discrepancies perlu investigasi lebih lanjut",
    ],
  },
  {
    title: "Pertumbuhan vs Input Pupuk",
    correlation: 0.65,
    description: "Korelasi sedang antara jumlah pupuk dan pertumbuhan tanaman",
    insights: [
      "Efisiensi pemupukan dapat ditingkatkan",
      "Waktu aplikasi pupuk berpengaruh signifikan",
      "Perlu optimasi dosis berdasarkan fase tanam",
    ],
  },
  {
    title: "Penyakit vs Fase Tanam",
    correlation: -0.58,
    description: "Korelasi negatif: penyakit lebih sering terjadi pada fase tertentu",
    insights: [
      "Fase vegetatif lebih rentan",
      "Perlu peningkatan monitoring pada fase kritis",
      "Preventive action lebih efektif",
    ],
  },
];

const getCorrelationColor = (value: number) => {
  if (value >= 0.7) return "bg-green-100 text-green-700";
  if (value >= 0.4) return "bg-yellow-100 text-yellow-700";
  if (value >= 0) return "bg-orange-100 text-orange-700";
  return "bg-red-100 text-red-700";
};

export const CorrelationAnalysis = () => {
  const today = format(new Date(), "EEEE, dd MMMM yyyy", { locale: id });

  return (
    <div className="space-y-6">
      <div className="rounded-2xl p-6 text-white" style={{ backgroundColor: '#2E4E2A' }}>
        <h2 className="text-2xl font-bold mb-2">
          Analisis Korelasi Data
        </h2>
        <p className="text-white/80 text-sm" style={{ opacity: 0.9 }}>
          Analisis hubungan antar variabel • {today}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {correlations.map((card, index) => (
          <div
            key={card.title}
            className="bg-white border border-gray-200 rounded-xl p-5 shadow-lg"
          >
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{card.title}</h3>
              <span
                className={`px-3 py-1.5 rounded-lg text-sm font-bold ${getCorrelationColor(card.correlation)}`}
              >
                {card.correlation > 0 ? "+" : ""}
                {card.correlation.toFixed(2)}
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-4">{card.description}</p>
            <div>
              <p className="text-xs font-semibold text-gray-900 mb-2">Insights:</p>
              <ul className="space-y-1.5">
                {card.insights.map((insight, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: '#2E4E2A' }} />
                    {insight}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

