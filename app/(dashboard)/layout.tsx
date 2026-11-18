import { auth } from '../../lib/auth'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/api/auth/signin')
  return <div style={{ maxWidth: 960, margin: '0 auto', padding: 24 }}>{children}</div>
}
