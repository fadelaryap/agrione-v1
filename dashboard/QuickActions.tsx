import { FileText, Download, RefreshCw, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

export const QuickActions = () => {
  return (
    <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-50">
      <div className="bg-card rounded-2xl shadow-lg border border-border p-2 flex flex-col gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="hover:bg-primary/10 hover:text-primary"
          title="Generate Laporan"
        >
          <FileText className="w-5 h-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="hover:bg-success/10 hover:text-success"
          title="Download Data"
        >
          <Download className="w-5 h-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="hover:bg-info/10 hover:text-info"
          title="Refresh Data"
        >
          <RefreshCw className="w-5 h-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="hover:bg-warning/10 hover:text-warning"
          title="Feedback"
        >
          <MessageSquare className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
};
