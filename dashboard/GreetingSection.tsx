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
    <div className="bg-card rounded-xl p-5 mb-5 border border-border">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <span>👋</span>
            <span>{formattedDate}</span>
          </div>
          <h1 className="text-xl lg:text-2xl font-bold text-foreground mb-1">
            {getGreeting()}, Pak {userName}
          </h1>
          <p className="text-sm text-muted-foreground">
            Berikut ringkasan eksekutif untuk operasional Musim Tanam 1. Performa secara keseluruhan{" "}
            <span className="text-success font-medium">berjalan sesuai rencana</span> dengan{" "}
            <span className="text-warning font-medium">2 hal yang memerlukan perhatian</span>.
          </p>
        </div>

        {/* Status Badges */}
        <div className="flex items-center gap-3">
          {/* Sesuai Rencana */}
          <div className="flex flex-col items-center bg-success/10 border border-success/30 rounded-xl px-4 py-3 min-w-[80px]">
            <CheckCircle2 className="w-5 h-5 text-success mb-1" />
            <span className="text-xl font-bold text-success">4</span>
            <span className="text-[10px] text-muted-foreground">Sesuai Rencana</span>
          </div>

          {/* Perlu Perhatian */}
          <div className="flex flex-col items-center bg-warning/10 border border-warning/30 rounded-xl px-4 py-3 min-w-[80px]">
            <AlertTriangle className="w-5 h-5 text-warning mb-1" />
            <span className="text-xl font-bold text-warning">2</span>
            <span className="text-[10px] text-muted-foreground">Perlu Perhatian</span>
          </div>

          {/* Tingkat Pertumbuhan */}
          <div className="flex flex-col items-center bg-info/10 border border-info/30 rounded-xl px-4 py-3 min-w-[80px]">
            <TrendingUp className="w-5 h-5 text-info mb-1" />
            <span className="text-xl font-bold text-info">+4.8%</span>
            <span className="text-[10px] text-muted-foreground">Tingkat Pertumbuhan</span>
          </div>
        </div>
      </div>
    </div>
  );
};
