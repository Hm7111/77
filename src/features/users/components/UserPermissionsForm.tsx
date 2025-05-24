import { useState, useEffect } from 'react';
import { User, Permission } from '../types';
import { Shield, Check, Lock } from 'lucide-react';
import { DEFAULT_PERMISSIONS } from '../../../lib/auth';

interface UserPermissionsFormProps {
  user: User;
  permissions: Permission[];
  onSubmit: (userId: string, permissions: string[]) => Promise<boolean>;
  isLoading: boolean;
}

/**
 * نموذج إدارة صلاحيات المستخدم
 */
export function UserPermissionsForm({ user, permissions, onSubmit, isLoading }: UserPermissionsFormProps) {
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(user.permissions || []);
  const [defaultPermissions, setDefaultPermissions] = useState<string[]>([]);
  
  // تحديد الصلاحيات الافتراضية بناءً على دور المستخدم
  useEffect(() => {
    // الحصول على الصلاحيات الافتراضية بناءً على الدور
    const defaultPerms = user.role === 'admin' 
      ? DEFAULT_PERMISSIONS.admin 
      : DEFAULT_PERMISSIONS.user;
    
    // تحويل رموز الصلاحيات إلى معرفات
    const defaultPermIds = permissions
      .filter(p => defaultPerms.includes(p.code))
      .map(p => p.id);
    
    setDefaultPermissions(defaultPermIds);
  }, [user.role, permissions]);
  
  // تبديل اختيار الصلاحية
  const togglePermission = (permissionId: string) => {
    setSelectedPermissions(prev => {
      if (prev.includes(permissionId)) {
        return prev.filter(id => id !== permissionId);
      } else {
        return [...prev, permissionId];
      }
    });
  };
  
  // التحقق مما إذا كانت الصلاحية مدرجة في الصلاحيات الافتراضية
  const isDefaultPermission = (permissionId: string) => {
    return defaultPermissions.includes(permissionId);
  };
  
  // معالجة تقديم النموذج
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(user.id, selectedPermissions);
  };
  
  // تجميع الصلاحيات حسب الفئة
  const permissionsByCategory = permissions.reduce((groups, permission) => {
    const parts = permission.code.split(':');
    const category = parts[1]; // استخدام المورد كفئة
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(permission);
    return groups;
  }, {} as Record<string, Permission[]>);
  
  // ترجمة فئة الصلاحية إلى العربية
  const translateCategory = (category: string): string => {
    const translations: Record<string, string> = {
      'letters': 'الخطابات',
      'templates': 'القوالب',
      'users': 'المستخدمين',
      'branches': 'الفروع',
      'settings': 'الإعدادات',
      'system': 'النظام',
      'audit_logs': 'سجلات الأحداث',
      'approvals': 'الموافقات'
    };
    
    return translations[category] || category;
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="mb-4">
        <div className="text-sm mb-2">
          <span className="flex items-center mb-1">
            <div className="h-3 w-3 bg-gray-200 dark:bg-gray-700 rounded-sm ml-1"></div>
            <span className="text-gray-500 dark:text-gray-400">صلاحيات افتراضية للدور</span>
          </span>
          <span className="flex items-center">
            <div className="h-3 w-3 bg-primary/20 rounded-sm ml-1"></div>
            <span className="text-gray-500 dark:text-gray-400">صلاحيات إضافية للمستخدم</span>
          </span>
        </div>
      </div>
      
      <div className="border dark:border-gray-800 rounded-lg">
        <div className="max-h-96 overflow-y-auto p-4 space-y-4">
          {/* فئات الصلاحيات */}
          {Object.entries(permissionsByCategory).map(([category, categoryPermissions]) => (
            <div key={category} className="mb-4 last:mb-0">
              <h4 className="font-medium mb-2 text-gray-900 dark:text-white">{translateCategory(category)}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {categoryPermissions.map(permission => {
                  const isDefault = isDefaultPermission(permission.id);
                  const isSelected = selectedPermissions.includes(permission.id);
                  
                  return (
                    <div 
                      key={permission.id}
                      onClick={() => togglePermission(permission.id)}
                      className={`p-3 rounded-lg cursor-pointer ${
                        isDefault 
                          ? 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                          : isSelected
                            ? 'bg-primary/10 dark:bg-primary/20 border border-primary/50'
                            : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-medium text-gray-900 dark:text-white">{permission.name}</div>
                        <div className={`h-5 w-5 rounded border flex items-center justify-center ${
                          isSelected || isDefault
                            ? 'bg-primary border-primary text-white'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}>
                          {(isSelected || isDefault) && (
                            <Check className="h-3 w-3" />
                          )}
                        </div>
                      </div>
                      <div className="text-xs font-mono bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded inline-block">
                        {permission.code}
                      </div>
                      {isDefault && (
                        <span className="block text-xs text-purple-600 dark:text-purple-400 mt-1">
                          <Shield className="h-3 w-3 inline mr-1" />
                          صلاحية افتراضية من دور {user.role === 'admin' ? 'المدير' : 'المستخدم'}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="flex justify-end pt-4">
        <button
          type="submit"
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 flex items-center gap-2"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              <span>جارِ الحفظ...</span>
            </>
          ) : (
            <>
              <Lock className="h-4 w-4" />
              <span>حفظ الصلاحيات</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}