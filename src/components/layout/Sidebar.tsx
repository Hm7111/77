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
    <aside className="w-64 border-l border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 h-[calc(100vh-4rem)] p-4 transition-colors duration-300">
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
                'flex items-center gap-x-3 px-3 py-2 text-sm font-medium rounded-lg',
                isActive
                  ? 'bg-gray-200/50 dark:bg-gray-800/50 text-gray-900 dark:text-gray-100'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200/50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-gray-100'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}