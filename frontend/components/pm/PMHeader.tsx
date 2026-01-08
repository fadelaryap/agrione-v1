'use client'

import { Bell, LogOut } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import Link from "next/link";

interface PMHeaderProps {
  userName: string;
}

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Selamat Pagi";
  if (hour < 15) return "Selamat Siang";
  if (hour < 18) return "Selamat Sore";
  return "Selamat Malam";
};

export const PMHeader = ({ userName }: PMHeaderProps) => {
  const today = new Date();
  const formattedDate = format(today, "EEEE, dd MMMM yyyy", { locale: id });

  return (
    <header className="px-6 py-4 flex items-center justify-between text-white" style={{ backgroundColor: '#2E4E2A' }}>
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-bold">
          Project Manager Dashboard
        </h1>
        <span className="text-white/70 text-sm hidden md:inline" style={{ opacity: 0.9 }}>
          • {getGreeting()}, {userName}! 👋
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-white/80 text-sm hidden lg:inline" style={{ opacity: 0.9 }}>
          {formattedDate}
        </span>
        <button className="relative p-2 rounded-lg transition-colors hover:bg-white/10">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
        </button>
        <Link
          href="/login"
          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </Link>
      </div>
    </header>
  );
};

