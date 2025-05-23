import { Header } from '../components/layout/Header'
import { Sidebar } from '../components/layout/Sidebar'

export function Letters() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6">
          <h1 className="text-2xl font-bold mb-6">إدارة الخطابات</h1>
          {/* سيتم إضافة محتوى إدارة الخطابات في المرحلة القادمة */}
        </main>
      </div>
    </div>
  )
}