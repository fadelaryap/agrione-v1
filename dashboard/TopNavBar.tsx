import { Bell, MapPin, Calendar, RefreshCw, User } from "lucide-react";

interface TopNavBarProps {
  userName: string;
  location: string;
}

export const TopNavBar = ({ userName, location }: TopNavBarProps) => {
  return (
    <header className="bg-primary text-primary-foreground px-4 lg:px-6 py-3 flex items-center justify-between">
      {/* Left: Logo & Title */}
      <div className="flex items-center gap-4 lg:gap-8">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-primary-foreground/20 rounded-full flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
          </div>
          <div className="hidden sm:block">
            <p className="font-bold text-lg">Agriculture One</p>
            <p className="text-xs text-primary-foreground/70">Dasbor Eksekutif</p>
          </div>
        </div>
        
        <div className="hidden md:flex items-center gap-2 text-sm">
          <span className="font-medium">Ringkasan Produksi Padi Korporasi</span>
          <div className="flex items-center gap-1 text-primary-foreground/70">
            <MapPin className="w-3 h-3" />
            <span className="text-xs">{location}</span>
          </div>
        </div>
      </div>

      {/* Right: Status & User */}
      <div className="flex items-center gap-3 lg:gap-4">
        {/* Musim Tanam */}
        <div className="hidden lg:flex items-center gap-2 bg-primary-foreground/10 px-3 py-1.5 rounded-lg">
          <Calendar className="w-4 h-4" />
          <div>
            <p className="text-[10px] text-primary-foreground/70">Musim Tanam</p>
            <p className="text-xs font-medium">Musim Tanam 1 (MT-1)</p>
          </div>
        </div>

        {/* Pembaruan Terakhir */}
        <div className="hidden lg:flex items-center gap-2 bg-primary-foreground/10 px-3 py-1.5 rounded-lg">
          <RefreshCw className="w-4 h-4" />
          <div>
            <p className="text-[10px] text-primary-foreground/70">Pembaruan Terakhir</p>
            <p className="text-xs font-medium">Real-time</p>
          </div>
        </div>

        {/* Notifications */}
        <button className="relative p-2 bg-primary-foreground/10 hover:bg-primary-foreground/20 rounded-lg transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-danger text-[10px] font-bold rounded-full flex items-center justify-center">
            2
          </span>
        </button>

        {/* Profil Pengguna */}
        <div className="flex items-center gap-2 bg-primary-foreground/10 px-3 py-1.5 rounded-lg">
          <User className="w-5 h-5" />
          <div className="hidden sm:block">
            <p className="text-[10px] text-primary-foreground/70">Tampilan GM</p>
            <p className="text-xs font-medium">{userName}</p>
          </div>
        </div>
      </div>
    </header>
  );
};
