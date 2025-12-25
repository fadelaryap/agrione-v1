'use client'

import MobileBottomNav from '@/components/layout/MobileBottomNav'

export default function LapanganLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 pb-16 lg:pb-0">
      {children}
      <MobileBottomNav />
    </div>
  )
}

