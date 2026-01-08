import { Link } from "react-router-dom";
import { TopNavBar } from "@/components/dashboard/TopNavBar";
import { GreetingSection } from "@/components/dashboard/GreetingSection";
import { KPISection } from "@/components/dashboard/KPISection";
import { FieldIntelligence } from "@/components/dashboard/FieldIntelligence";
import { ProductionAnalytics } from "@/components/dashboard/ProductionAnalytics";
import { ProductionMap } from "@/components/dashboard/ProductionMap";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { Users } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation Bar */}
      <TopNavBar userName="Kenichiro Nugroho" location="Baturaja, Indonesia" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        {/* Greeting Section with Status Badges */}
        <GreetingSection userName="Kenichiro" />
        
        {/* Quick Navigation to PM Dashboard */}
        <div className="flex items-center gap-3 mb-5">
          <Link
            to="/pm"
            className="flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 text-foreground rounded-lg text-sm font-medium transition-colors"
          >
            <Users className="w-4 h-4" />
            Lihat Dashboard Project Manager
          </Link>
        </div>
        
        {/* Key Performance Indicators */}
        <KPISection />
        
        {/* Field Intelligence Section */}
        <FieldIntelligence />
        
        {/* Production Analytics Charts */}
        <ProductionAnalytics />
        
        {/* Production Map - Enlarged for better interaction */}
        <div className="mb-6">
          <ProductionMap />
        </div>
        
        {/* Quick Actions FAB */}
        <QuickActions />
      </div>
    </div>
  );
};

export default Index;
