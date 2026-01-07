import GMLayout from '@/components/layout/GMLayout'

export default function Layout({
  children,
}: {
  children: React.ReactNode
}) {
  return <GMLayout>{children}</GMLayout>
}

