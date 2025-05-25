import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthGuard } from './components/auth/AuthGuard'
import { Login } from './pages/auth/Login'
import { AdminLayout } from './components/layout/AdminLayout'
import { Dashboard } from './pages/admin/Dashboard'
import { Letters } from './pages/admin/Letters'
import { Users } from './pages/admin/Users'
import { Branches } from './pages/admin/Branches'
import { Settings } from './pages/admin/Settings'
import { VerifyLetter } from './pages/VerifyLetter'
import { AuditLogs } from './pages/admin/AuditLogs'
import { PermissionsManager } from './pages/admin/permissions'
// استيراد صفحات الخطابات من المسار الصحيح
import { LetterEditor, ViewLetter, EditLetter } from './features/letters/pages'
import { AuthProvider } from './lib/auth'
import { Approvals } from './pages/admin/Approvals' // إضافة صفحة الموافقات
// استيراد صفحات نظام المهام
import { TasksList, TaskDetails, NewTask } from './features/tasks/pages'

export function AppRoutes() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/admin" element={<AuthGuard><AdminLayout /></AuthGuard>}>
          <Route index element={<Dashboard />} />
          <Route path="letters" element={<Letters />} />
          <Route path="letters/new" element={<LetterEditor />} />
          <Route path="letters/edit/:id" element={<EditLetter />} />
          <Route path="letters/view/:id" element={<ViewLetter />} />
          <Route path="users" element={<Users />} />
          <Route path="branches" element={<Branches />} />
          <Route path="permissions" element={<PermissionsManager />} />
          <Route path="settings" element={<Settings />} />
          <Route path="audit-logs" element={<AuditLogs />} />
          <Route path="approvals" element={<Approvals />} />
          {/* إضافة مسارات نظام المهام */}
          <Route path="tasks" element={<TasksList />} />
          <Route path="tasks/new" element={<NewTask />} />
          <Route path="tasks/:id" element={<TaskDetails />} />
        </Route>
        
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/verify/:code" element={<VerifyLetter />} />
      </Routes>
    </AuthProvider>
  )
}