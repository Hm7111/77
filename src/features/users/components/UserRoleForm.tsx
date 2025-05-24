import { useState, useEffect } from 'react';
import { UserRole, Permission } from '../types';
import { useFormValidation } from '../../../hooks/useFormValidation';
import { Check, Lock } from 'lucide-react';

interface UserRoleFormProps {
  role?: UserRole;
  permissions: Permission[];
  onSubmit: (roleData: Partial<UserRole>) => Promise<UserRole | null>;
  isLoading: boolean;
}

/**
 * نموذج إنشاء وتعديل دور المستخدم
 */
export function UserRoleForm({ role, permissions, onSubmit, isLoading }: UserRoleFormProps) {
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(role?.permissions || []);
  
  // إعداد التحقق من صحة النموذج
  const {
    values,
    errors,
    handleChange,
    handleBlur,
    handleSubmit,
    resetForm
  } = useFormValidation(
    {
      name: role?.name || '',
      description: role?.description || ''
    },
    {
      name: {
        required: 'اسم الدور مطلوب'
      }
    }
  );
  
  // إعادة تعيين النموذج عند تغيير الدور
  useEffect(() => {
    if (role) {
      resetForm({
        name: role.name,
        description: role.description || ''
      });
      setSelectedPermissions(role.permissions || []);
    } else {
      resetForm({
        name: '',
        description: ''
      });
      setSelectedPermissions([]);
    }
  }, [role, resetForm]);
  
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
  
  // معالجة تقديم النموذج
  const handleFormSubmit = async (formValues: any) => {
    await onSubmit({
      name: formValues.name,
      description: formValues.description,
      permissions: selectedPermissions
    });
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
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">اسم الدور <span className="text-red-500">*</span></label>
        <input
          type="text"
          name="name"
          value={values.name}
          onChange={handleChange}
          onBlur={handleBlur}
          className={`w-full p-2 border rounded-lg ${
            errors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
          }`}
          placeholder="مثال: مدير قسم"
        />
        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-1">الوصف</label>
        <textarea
          name="description"
          value={values.description}
          onChange={handleChange}
          onBlur={handleBlur}
          className="w-full p-2 border dark:border-gray-700 rounded-lg resize-none h-24"
          placeholder="وصف الدور وصلاحياته"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-2">الصلاحيات</label>
        <div className="border dark:border-gray-700 rounded-lg p-4 max-h-96 overflow-y-auto">
          {Object.entries(permissionsByCategory).map(([category, perms]) => (
            <div key={category} className="mb-6 last:mb-0">
              <h3 className="font-medium mb-3 text-primary dark:text-primary-foreground flex items-center">
                <Lock className="h-4 w-4 mr-1" />
                {translateCategory(category)}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {perms.map(permission => (
                  <div 
                    key={permission.id}
                    className={`p-3 rounded-lg border dark:border-gray-700 cursor-pointer ${
                      selectedPermissions.includes(permission.id)
                        ? 'bg-primary/10 dark:bg-primary/20 border-primary'
                        : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                    onClick={() => togglePermission(permission.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className={`h-5 w-5 rounded border flex items-center justify-center ${
                          selectedPermissions.includes(permission.id) 
                            ? 'bg-primary border-primary text-white' 
                            : 'border-gray-300 dark:border-gray-600'
                        }`}>
                          {selectedPermissions.includes(permission.id) && (
                            <Check className="h-3 w-3" />
                          )}
                        </div>
                        <span className="mr-2 font-medium">{permission.name}</span>
                      </div>
                    </div>
                    {permission.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mr-7">
                        {permission.description}
                      </p>
                    )}
                    <div className="text-xs font-mono bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 mt-2 px-2 py-1 rounded inline-block">
                      {permission.code}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          اختر الصلاحيات التي سيتمتع بها أصحاب هذا الدور
        </p>
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
              <span>حفظ الدور</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}