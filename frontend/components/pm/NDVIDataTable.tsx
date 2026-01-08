'use client'

import { format } from "date-fns";
import { id } from "date-fns/locale";

interface NDVIData {
  lahan: string;
  ndvi: number;
  status: "kritis" | "buruk" | "sedang" | "baik" | "sangat_baik";
  lastUpdate: Date;
}

const generateNDVIData = (): NDVIData[] => {
  const data: NDVIData[] = [];
  for (let i = 1; i <= 45; i++) {
    const ndvi = Math.random() * 0.7 + 0.3;
    let status: NDVIData["status"];
    if (ndvi < 0.4) status = "kritis";
    else if (ndvi < 0.5) status = "buruk";
    else if (ndvi < 0.6) status = "sedang";
    else if (ndvi < 0.75) status = "baik";
    else status = "sangat_baik";

    data.push({
      lahan: i === 45 ? "Field 1" : String(i),
      ndvi,
      status,
      lastUpdate: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
    });
  }
  return data.sort((a, b) => b.ndvi - a.ndvi);
};

const getStatusBadge = (status: NDVIData["status"]) => {
  const styles = {
    kritis: "bg-red-100 text-red-700",
    buruk: "bg-orange-100 text-orange-700",
    sedang: "bg-yellow-100 text-yellow-700",
    baik: "bg-lime-100 text-lime-700",
    sangat_baik: "bg-green-100 text-green-700",
  };
  const labels = {
    kritis: "Kritis",
    buruk: "Buruk",
    sedang: "Sedang",
    baik: "Baik",
    sangat_baik: "Sangat Baik",
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
};

export const NDVIDataTable = () => {
  const data = generateNDVIData();

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-lg">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Data NDVI per Lahan</h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Lahan</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">NDVI</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Status</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Update Terakhir</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <tr key={index} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                <td className="py-3 px-4 text-sm text-gray-900 font-medium">{item.lahan}</td>
                <td className="py-3 px-4 text-sm text-gray-900">{item.ndvi.toFixed(3)}</td>
                <td className="py-3 px-4">{getStatusBadge(item.status)}</td>
                <td className="py-3 px-4 text-sm text-gray-600">
                  {format(item.lastUpdate, "dd MMM yyyy HH:mm", { locale: id })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

