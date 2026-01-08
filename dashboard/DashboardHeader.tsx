import { Bell, Calendar, Search, Settings } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

interface DashboardHeaderProps {
  userName: string;
  userRole: string;
}

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Selamat Pagi";
  if (hour < 15) return "Selamat Siang";
  if (hour < 18) return "Selamat Sore";
  return "Selamat Malam";
};

const getMotivationalMessage = () => {
  const messages = [
    "Semangat menjalani hari! 🌟",
    "Tetap fokus pada target kita! 💪",
    "Hari ini adalah kesempatan baru! ✨",
    "Bersama kita bisa mencapai lebih! 🎯",
  ];
  return messages[Math.floor(Math.random() * messages.length)];
};

export const DashboardHeader = ({ userName, userRole }: DashboardHeaderProps) => {
  const today = new Date();
  const formattedDate = format(today, "EEEE, dd MMMM yyyy", { locale: id });

  return (
    <header className="header-gradient text-primary-foreground rounded-2xl p-6 mb-6 animate-fade-in">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 text-primary-foreground/80 text-sm mb-2">
            <Calendar className="w-4 h-4" />
            <span>{formattedDate}</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold mb-1">
            {getGreeting()}, {userName}! 👋
          </h1>
          <p className="text-primary-foreground/90 text-sm lg:text-base">
            {userRole} • {getMotivationalMessage()}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-foreground/60" />
            <input
              type="text"
              placeholder="Cari data..."
              className="bg-primary-foreground/10 border border-primary-foreground/20 rounded-xl pl-10 pr-4 py-2.5 text-sm text-primary-foreground placeholder:text-primary-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary-foreground/30 w-full lg:w-64"
            />
          </div>
          
          <button className="relative p-2.5 bg-primary-foreground/10 hover:bg-primary-foreground/20 rounded-xl transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-danger rounded-full animate-pulse-soft" />
          </button>
          
          <button className="p-2.5 bg-primary-foreground/10 hover:bg-primary-foreground/20 rounded-xl transition-colors">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};
