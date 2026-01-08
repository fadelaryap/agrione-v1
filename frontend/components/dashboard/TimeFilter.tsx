import { useState } from "react";

const filters = ["Minggu", "Bulan", "Kuartal", "Tahun"];

export const TimeFilter = () => {
  const [active, setActive] = useState("Bulan");

  return (
    <div className="flex items-center gap-1 bg-muted rounded-xl p-1">
      {filters.map((filter) => (
        <button
          key={filter}
          onClick={() => setActive(filter)}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
            active === filter
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {filter}
        </button>
      ))}
    </div>
  );
};
