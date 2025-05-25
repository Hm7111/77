import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { NotificationBadge } from '../../features/notifications/components'

export function AdminLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6 transition-colors duration-300">
          <Outlet />
        </main>
      </div>
    </div>
  )
}