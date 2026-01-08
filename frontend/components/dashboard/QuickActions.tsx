'use client'

import { FileText, Download, RefreshCw, MessageSquare } from "lucide-react";

export const QuickActions = () => {
  return (
    <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-50">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-2 flex flex-col gap-2">
        <button
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          style={{ color: '#2E4E2A' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(46, 78, 42, 0.1)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = ''}
          title="Generate Laporan"
        >
          <FileText className="w-5 h-5" />
        </button>
        <button
          className="p-2 rounded-lg hover:bg-green-50 transition-colors text-green-600"
          title="Download Data"
        >
          <Download className="w-5 h-5" />
        </button>
        <button
          className="p-2 rounded-lg hover:bg-blue-50 transition-colors text-blue-600"
          title="Refresh Data"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
        <button
          className="p-2 rounded-lg hover:bg-amber-50 transition-colors text-amber-600"
          title="Feedback"
        >
          <MessageSquare className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
