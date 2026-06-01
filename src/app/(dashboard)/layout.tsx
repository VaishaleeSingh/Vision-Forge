import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'
import SessionWrapper from '@/components/SessionWrapper'
import { DashboardProvider } from '@/components/layout/DashboardContext'
import GlobalSearchModal from '@/components/layout/GlobalSearchModal'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <SessionWrapper>
      <DashboardProvider>
        <div className="flex h-screen overflow-hidden bg-beige-100">
          <Sidebar />
          <div className="flex flex-col flex-1 overflow-hidden">
            <Header />
            <main className="flex-1 overflow-y-auto p-4 md:p-6">
              {children}
            </main>
          </div>
        </div>
        <GlobalSearchModal />
      </DashboardProvider>
    </SessionWrapper>
  )
}
