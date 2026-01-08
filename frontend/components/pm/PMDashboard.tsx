'use client'

import { 
  Map, 
  BarChart3, 
  Brain, 
  Sparkles, 
  TrendingUp, 
  AlertTriangle, 
  Leaf, 
  MapPin,
  ArrowRight,
  CheckCircle2,
  Clock
} from "lucide-react";

type ActivePage = "peta-ndvi" | "analisis-korelasi" | "ai-dss" | "generator-rekomendasi";

interface PMDashboardProps {
  onNavigate: (page: ActivePage) => void;
}

export const PMDashboard = ({ onNavigate }: PMDashboardProps) => {
  // Summary stats
  const lahanStats = [
    { label: "Total Lahan", value: "45", icon: MapPin, color: "text-[#2E4E2A]", bg: "bg-[#2E4E2A]/10" },
    { label: "Lahan Sehat", value: "24", icon: Leaf, color: "text-green-600", bg: "bg-green-50" },
    { label: "Lahan Sedang", value: "5", icon: TrendingUp, color: "text-yellow-600", bg: "bg-yellow-50" },
    { label: "Lahan Berisiko", value: "16", icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50" },
  ];

  // Menu highlights
  const menuHighlights = [
    {
      id: "peta-ndvi" as const,
      title: "Peta & NDVI",
      icon: Map,
      color: "from-emerald-500 to-teal-600",
      summary: "Visualisasi kesehatan tanaman",
      metrics: [
        { label: "Rata-rata NDVI", value: "0.72" },
        { label: "Area Kritis", value: "8 ha" },
      ],
      alerts: 3,
    },
    {
      id: "analisis-korelasi" as const,
      title: "Analisis Korelasi",
      icon: BarChart3,
      color: "from-blue-500 to-indigo-600",
      summary: "Hubungan antar variabel produksi",
      metrics: [
        { label: "Korelasi Tertinggi", value: "0.87" },
        { label: "Variabel Aktif", value: "12" },
      ],
      alerts: 1,
    },
    {
      id: "ai-dss" as const,
      title: "AI & DSS",
      icon: Brain,
      color: "from-purple-500 to-pink-600",
      summary: "Prediksi berbasis kecerdasan buatan",
      metrics: [
        { label: "Prediksi Aktif", value: "5" },
        { label: "Akurasi Model", value: "89%" },
      ],
      alerts: 2,
    },
    {
      id: "generator-rekomendasi" as const,
      title: "Generator Rekomendasi",
      icon: Sparkles,
      color: "from-amber-500 to-orange-600",
      summary: "Rekomendasi otomatis untuk SM",
      metrics: [
        { label: "Rekomendasi Baru", value: "8" },
        { label: "Terkirim ke SM", value: "15" },
      ],
      alerts: 4,
    },
  ];

  // Recent activities
  const recentActivities = [
    { type: "alert", message: "Lahan B-12 menunjukkan penurunan NDVI signifikan", time: "10 menit lalu", urgent: true },
    { type: "recommendation", message: "Rekomendasi pemupukan dikirim ke SM Cluster Utara", time: "1 jam lalu", urgent: false },
    { type: "prediction", message: "Prediksi risiko kekeringan untuk minggu depan tersedia", time: "2 jam lalu", urgent: true },
    { type: "correlation", message: "Korelasi baru ditemukan: NDVI vs Kelembaban Tanah", time: "3 jam lalu", urgent: false },
  ];

  // Pending tasks
  const pendingTasks = [
    { title: "Review rekomendasi pemupukan Cluster Selatan", status: "pending", priority: "high" },
    { title: "Validasi prediksi AI untuk area berisiko", status: "in-progress", priority: "medium" },
    { title: "Kirim laporan mingguan ke GM", status: "pending", priority: "high" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl p-6 text-white" style={{ backgroundColor: '#2E4E2A' }}>
        <h2 className="text-2xl font-bold mb-2">
          Dashboard Project Manager
        </h2>
        <p className="text-white/80 text-sm" style={{ opacity: 0.9 }}>
          Ringkasan insight dan pelaporan dari semua modul
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {lahanStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white border border-gray-200 rounded-xl p-4 shadow-lg flex items-center gap-4">
              <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
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

      {/* Module Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {menuHighlights.map((menu) => {
          const Icon = menu.icon;
          return (
            <div 
              key={menu.id} 
              className="bg-white border border-gray-200 rounded-xl p-5 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group"
              onClick={() => onNavigate(menu.id)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${menu.color} text-white`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{menu.title}</h3>
                    <p className="text-xs text-gray-600">{menu.summary}</p>
                  </div>
                </div>
                {menu.alerts > 0 && (
                  <span className="px-2 py-1 text-xs font-medium bg-red-50 text-red-600 rounded-full">
                    {menu.alerts} alert
                  </span>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-3 mb-4">
                {menu.metrics.map((metric, idx) => (
                  <div key={idx} className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-600">{metric.label}</p>
                    <p className="text-lg font-bold text-gray-900">{metric.value}</p>
                  </div>
                ))}
              </div>
              
              <button 
                className="w-full flex items-center justify-between px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors group-hover:bg-[#2E4E2A] group-hover:text-white"
              >
                Lihat Detail
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Bottom Section: Activities & Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activities */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-lg">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4" style={{ color: '#2E4E2A' }} />
            Aktivitas Terkini
          </h3>
          <div className="space-y-3">
            {recentActivities.map((activity, idx) => (
              <div 
                key={idx} 
                className={`p-3 rounded-lg border ${
                  activity.urgent 
                    ? 'border-red-200 bg-red-50' 
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <p className="text-sm text-gray-900">{activity.message}</p>
                <p className="text-xs text-gray-600 mt-1">{activity.time}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Pending Tasks */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-lg">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" style={{ color: '#2E4E2A' }} />
            Tugas Tertunda
          </h3>
          <div className="space-y-3">
            {pendingTasks.map((task, idx) => (
              <div key={idx} className="p-3 rounded-lg border border-gray-200 bg-gray-50">
                <div className="flex items-start justify-between">
                  <p className="text-sm text-gray-900 flex-1">{task.title}</p>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                    task.priority === 'high' 
                      ? 'bg-red-50 text-red-600' 
                      : 'bg-yellow-50 text-yellow-600'
                  }`}>
                    {task.priority === 'high' ? 'Prioritas Tinggi' : 'Prioritas Sedang'}
                  </span>
                </div>
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div 
                      className="h-1.5 rounded-full transition-all"
                      style={{ 
                        width: task.status === 'in-progress' ? '50%' : '0%',
                        backgroundColor: '#2E4E2A'
                      }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    {task.status === 'in-progress' ? 'Sedang dikerjakan' : 'Menunggu'}
                  </p>
                </div>
              </div>
            ))}
          </div>
          
          {/* Overall Progress */}
          <div className="mt-4 p-3 rounded-lg bg-[#2E4E2A]/5 border border-[#2E4E2A]/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-900">Progress Mingguan</span>
              <span className="text-sm font-bold" style={{ color: '#2E4E2A' }}>67%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="h-2 rounded-full transition-all"
                style={{ width: '67%', backgroundColor: '#2E4E2A' }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

