'use client'

import { AlertTriangle, CheckCircle2, MapPin, Wheat, TrendingUp } from "lucide-react";

export const RiskAlertSection = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
      {/* Risiko & Alert Strategis */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-lg">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <span className="text-sm font-semibold text-gray-900">Risiko & Alert Strategis</span>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-xs text-gray-600 mb-1">Lahan Berisiko</p>
            <p className="text-3xl font-bold text-gray-900">6 lahan</p>
            <p className="text-xs text-red-600">13.3% dari total</p>
          </div>
          
          <div className="space-y-2">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="w-3.5 h-3.5 text-amber-600" />
                <span className="text-xs font-medium">Site Bermasalah</span>
              </div>
              <p className="text-xs text-gray-600">• Site A • Site C</p>
            </div>
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Wheat className="w-3.5 h-3.5 text-red-600" />
                <span className="text-xs font-medium">Prediksi Gagal Panen</span>
              </div>
              <p className="text-xs text-gray-600">2 lahan berpotensi gagal tanpa intervensi</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Status Eksekusi Rekomendasi */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-lg">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle2 className="w-5 h-5 text-green-600" />
          <span className="text-sm font-semibold text-gray-900">Status Eksekusi Rekomendasi</span>
        </div>
        
        <div className="flex items-start gap-6">
          <div>
            <p className="text-xs text-gray-600 mb-1">Eksekusi Rate</p>
            <p className="text-4xl font-bold text-gray-900">84.4%</p>
            <p className="text-xs text-gray-600">38 / 45 rekomendasi</p>
          </div>
          
          <div className="flex-1 space-y-3">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-3.5 h-3.5 text-green-600" />
                <span className="text-xs font-medium">Dampak terhadap Hasil</span>
              </div>
              <p className="text-xs text-gray-600">Meningkatkan produktivitas 8%</p>
            </div>
            
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-gray-600">Progress Eksekusi</span>
                <span className="font-medium text-gray-900">84.4%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-600 h-2 rounded-full" style={{ width: '84.4%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
