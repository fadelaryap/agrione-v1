import { format } from "date-fns";
import { id } from "date-fns/locale";
import { CheckCircle2, AlertTriangle, TrendingUp } from "lucide-react";

interface GreetingSectionProps {
  userName: string;
}

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Selamat Pagi";
  if (hour < 15) return "Selamat Siang";
  if (hour < 18) return "Selamat Sore";
  return "Selamat Malam";
};

export const GreetingSection = ({ userName }: GreetingSectionProps) => {
  const today = new Date();
  const formattedDate = format(today, "EEEE, dd MMMM yyyy", { locale: id });

  return (
    <div className="bg-white rounded-xl p-5 mb-5 border border-gray-200 shadow-lg">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-gray-600 text-sm mb-1">
            <span>👋</span>
            <span>{formattedDate}</span>
          </div>
          <h1 className="text-xl lg:text-2xl font-bold text-gray-900 mb-1">
            {getGreeting()}, Pak {userName}
          </h1>
          <p className="text-sm text-gray-600">
            Berikut ringkasan eksekutif untuk operasional Musim Tanam 1. Performa secara keseluruhan{" "}
            <span className="text-green-600 font-medium">berjalan sesuai rencana</span> dengan{" "}
            <span className="text-amber-600 font-medium">2 hal yang memerlukan perhatian</span>.
          </p>
        </div>

        {/* Status Badges */}
        <div className="flex items-center gap-3">
          {/* Sesuai Rencana */}
          <div className="flex flex-col items-center bg-green-50 border border-green-200 rounded-xl px-4 py-3 min-w-[80px]">
            <CheckCircle2 className="w-5 h-5 text-green-600 mb-1" />
            <span className="text-xl font-bold text-green-600">4</span>
            <span className="text-[10px] text-gray-600">Sesuai Rencana</span>
          </div>

          {/* Perlu Perhatian */}
          <div className="flex flex-col items-center bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 min-w-[80px]">
            <AlertTriangle className="w-5 h-5 text-amber-600 mb-1" />
            <span className="text-xl font-bold text-amber-600">2</span>
            <span className="text-[10px] text-gray-600">Perlu Perhatian</span>
          </div>

          {/* Tingkat Pertumbuhan */}
          <div className="flex flex-col items-center border rounded-xl px-4 py-3 min-w-[80px]" style={{ backgroundColor: 'rgba(46, 78, 42, 0.1)', borderColor: '#2E4E2A' }}>
            <TrendingUp className="w-5 h-5 mb-1" style={{ color: '#2E4E2A' }} />
            <span className="text-xl font-bold" style={{ color: '#2E4E2A' }}>+4.8%</span>
            <span className="text-[10px] text-gray-600">Tingkat Pertumbuhan</span>
          </div>
        </div>
      </div>
    </div>
  );
};
