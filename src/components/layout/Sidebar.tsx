import { FileText, Home, Settings, Users, History, Building, Shield, Key, ClipboardCheck, FileCheck, ListTodo } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { cn } from '../../lib/utils'
import { useAuth } from '../../lib/auth'

export function Sidebar() {
  const location = useLocation()
  const { isAdmin, hasPermission } = useAuth()

  // Define navigation items with permission checks
  const getNavigationItems = () => {
    const items = [
      { 
        name: 'الرئيسية', 
        href: '/admin', 
        icon: Home, 
        permission: 'view:dashboard'
      },
      { 
        name: 'الخطابات', 
        href: '/admin/letters', 
        icon: FileText, 
        permission: 'view:letters'
      },
      {
        name: 'الموافقات',
        href: '/admin/approvals',
        icon: ClipboardCheck,
        permission: 'view:letters'
      },
      {
        name: 'المهام',
        href: '/admin/tasks',
        icon: ListTodo,
        permission: 'view:tasks'
      }
    ];
    
    if (isAdmin) {
      items.push(
        { 
          name: 'المستخدمين', 
          href: '/admin/users', 
          icon: Users, 
          permission: 'view:users'
        },
        { 
          name: 'الفروع', 
          href: '/admin/branches', 
          icon: Building, 
          permission: 'view:branches'
        },
        { 
          name: 'الصلاحيات', 
          href: '/admin/permissions', 
          icon: Shield, 
          permission: 'view:permissions'
        },
        { 
          name: 'سجلات الأحداث', 
          href: '/admin/audit-logs', 
          icon: History, 
          permission: 'view:audit_logs'
        }
      );
    }
    
    items.push({ 
      name: 'الإعدادات', 
      href: '/admin/settings', 
      icon: Settings, 
      permission: 'view:settings'
    });
    
    return items;
  };

  const navigation = getNavigationItems();

  return (
    <aside className="w-64 border-l border-gray-700/20 bg-[#0f172a] h-[calc(100vh-4rem)] transition-colors duration-300">
      <nav className="space-y-1">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href || 
                          (item.href !== '/admin' && location.pathname.startsWith(item.href));
                          
          // Skip items that require permissions the user doesn't have
          // Always show items for admin or if no specific permission is required
          if (item.permission && !isAdmin && !hasPermission(item.permission)) {
            return null;
          }
          
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                'flex items-center gap-x-3 px-4 py-3 text-sm font-medium',
                isActive
                  ? 'bg-primary/10 text-white border-r-4 border-primary'
                  : 'text-gray-400 hover:bg-[#1e293b] hover:text-white'
              )}
            >
              <item.icon className={`h-5 w-5 ${isActive ? 'text-primary' : ''}`} />
              {item.name}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}