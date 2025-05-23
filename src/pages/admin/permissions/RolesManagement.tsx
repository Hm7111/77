import { useState, useEffect, useCallback } from 'react';
import { 
  Shield, 
  Plus, 
  Edit, 
  Trash, 
  Search, 
  Check, 
  X, 
  Save, 
  Users, 
  Lock,
  AlertCircle
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/auth';
import { useToast } from '../../../hooks/useToast';
import { UserRole, Permission } from '../../../types/database';
import { useQueryClient } from '@tanstack/react-query';

export function RolesManagement() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Form states
  const [roleName, setRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  
  // Load roles and permissions
  useEffect(() => {
    if (isAdmin) {
      loadRoles();
      loadPermissions();
    }
  }, [isAdmin]);
  
  // Filter roles based on search term
  const filteredRoles = roles.filter(role => 
    role.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (role.description && role.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  
  // Load roles from database
  async function loadRoles() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .order('name');
        
      if (error) throw error;
      
      console.log('Loaded roles:', data);
      setRoles(data || []);
    } catch (error) {
      console.error('Error loading roles:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء تحميل الأدوار',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  }
  
  // Load permissions from database
  async function loadPermissions() {
    try {
      const { data, error } = await supabase
        .from('permissions')
        .select('*')
        .order('code');
        
      if (error) throw error;
      setPermissions(data || []);
    } catch (error) {
      console.error('Error loading permissions:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء تحميل الصلاحيات',
        type: 'error'
      });
    }
  }
  
  // Handle adding or editing a role
  function handleEditRole(role?: UserRole) {
    if (role) {
      setSelectedRole(role);
      setRoleName(role.name);
      setRoleDescription(role.description || '');
      setSelectedPermissions(role.permissions || []);
    } else {
      setSelectedRole(null);
      setRoleName('');
      setRoleDescription('');
      setSelectedPermissions([]);
    }
    
    setShowRoleDialog(true);
  }
  
  // Toggle permission selection
  function togglePermission(permissionId: string) {
    setSelectedPermissions(prev => {
      if (prev.includes(permissionId)) {
        return prev.filter(id => id !== permissionId);
      } else {
        return [...prev, permissionId];
      }
    });
  }
  
  // Group permissions by category
  const permissionsByCategory = permissions.reduce((groups, permission) => {
    const category = permission.code.split(':')[1]; // Use resource as category
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(permission);
    return groups;
  }, {} as Record<string, Permission[]>);
  
  // Save role
  async function saveRole() {
    if (!roleName) {
      toast({
        title: 'خطأ',
        description: 'يرجى إدخال اسم الدور',
        type: 'error'
      });
      return;
    }
    
    try {
      setLoading(true);
      
      const roleData = {
        name: roleName,
        description: roleDescription,
        permissions: selectedPermissions
      };
      
      if (selectedRole) {
        // Update existing role
        const { error } = await supabase
          .from('user_roles')
          .update({
            ...roleData,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedRole.id);
          
        if (error) throw error;
        
        toast({
          title: 'تم التحديث',
          description: 'تم تحديث الدور بنجاح',
          type: 'success'
        });
      } else {
        // Create new role
        const { error } = await supabase
          .from('user_roles')
          .insert(roleData);
          
        if (error) throw error;
        
        toast({
          title: 'تم الإنشاء',
          description: 'تم إنشاء الدور بنجاح',
          type: 'success'
        });
      }
      
      // Invalidate user roles cache
      queryClient.invalidateQueries({ queryKey: ['user-roles'] });
      
      loadRoles();
      setShowRoleDialog(false);
    } catch (error) {
      console.error('Error saving role:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء حفظ الدور',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  }
  
  // Delete role
  async function deleteRole(id: string) {
    try {
      // Check if role is being used by any users by checking permissions JSON array
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, full_name, permissions');
        
      if (usersError) throw usersError;
      
      // Check if any user has this role ID in their permissions array
      const usersWithRole = users?.filter(user => 
        user.permissions && Array.isArray(user.permissions) && user.permissions.includes(id)
      );
      
      if (usersWithRole && usersWithRole.length > 0) {
        const userNames = usersWithRole.map(u => u.full_name).join(', ');
        toast({
          title: 'لا يمكن الحذف',
          description: `هذا الدور مستخدم بواسطة المستخدمين التاليين: ${userNames}`,
          type: 'error'
        });
        return;
      }
      
      // Delete the role
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      // Invalidate user roles cache
      queryClient.invalidateQueries({ queryKey: ['user-roles'] });
      
      loadRoles();
      
      toast({
        title: 'تم الحذف',
        description: 'تم حذف الدور بنجاح',
        type: 'success'
      });
    } catch (error: any) {
      console.error('Error deleting role:', error);
      toast({
        title: 'خطأ',
        description: `حدث خطأ أثناء حذف الدور: ${error?.message || 'خطأ غير معروف'}`,
        type: 'error'
      });
    }
  }
  
  // Translate permission category to Arabic
  const translateCategory = (category: string): string => {
    const translations: Record<string, string> = {
      'view': 'عرض',
      'create': 'إنشاء',
      'edit': 'تعديل',
      'delete': 'حذف',
      'manage': 'إدارة',
      'letters': 'الخطابات',
      'templates': 'القوالب',
      'users': 'المستخدمين',
      'branches': 'الفروع',
      'settings': 'الإعدادات',
      'system': 'النظام'
    };
    
    return translations[category] || category;
  };
  
  // Translate permission code to Arabic
  const translatePermission = (code: string): string => {
    const parts = code.split(':');
    const action = translateCategory(parts[0]);
    const resource = translateCategory(parts[1]);
    const scope = parts[2] ? ` (${translateCategory(parts[2])})` : '';
    
    return `${action} ${resource}${scope}`;
  };
  
  if (!isAdmin) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 text-red-700 dark:text-red-400 p-6 rounded-lg text-center">
        <AlertCircle className="h-12 w-12 mx-auto mb-4" />
        <h3 className="text-xl font-bold mb-2">غير مصرح بالوصول</h3>
        <p>هذه الصفحة متاحة فقط للمدراء.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Role management dialog */}
      {showRoleDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-3xl w-full p-6">
            <div className="flex items-center justify-between mb-6 border-b dark:border-gray-800 pb-4">
              <h2 className="text-xl font-semibold">
                {selectedRole ? 'تعديل الدور' : 'إضافة دور جديد'}
              </h2>
              <button
                onClick={() => setShowRoleDialog(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">اسم الدور <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                  className="w-full p-2 border dark:border-gray-700 rounded-lg"
                  placeholder="مثال: مدير قسم"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">الوصف</label>
                <textarea
                  value={roleDescription}
                  onChange={(e) => setRoleDescription(e.target.value)}
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
            </div>
            
            <div className="flex justify-end mt-6 pt-4 border-t dark:border-gray-800">
              <button
                onClick={() => setShowRoleDialog(false)}
                className="px-4 py-2 border dark:border-gray-700 rounded-lg mr-2 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                إلغاء
              </button>
              <button
                onClick={saveRole}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 flex items-center"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></span>
                    <span>جارِ الحفظ...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-1" />
                    <span>حفظ</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            إدارة الأدوار والصلاحيات
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            تحكم في أدوار المستخدمين وصلاحياتهم في النظام
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="بحث في الأدوار..."
              className="w-full md:w-auto pl-3 pr-10 py-2 border dark:border-gray-700 rounded-lg"
            />
          </div>
          
          <button
            onClick={() => handleEditRole()}
            className="bg-primary text-primary-foreground px-3 py-2 rounded-lg flex items-center gap-x-2 text-sm"
          >
            <Plus className="h-4 w-4" />
            <span>إضافة دور جديد</span>
          </button>
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-lg shadow-sm overflow-hidden">
        {loading && roles.length === 0 ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-t-primary border-b-transparent border-l-primary border-r-transparent"></div>
          </div>
        ) : roles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Shield className="h-16 w-16 text-gray-300 dark:text-gray-700 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">لا توجد أدوار</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4 text-center">
              لم يتم إضافة أي أدوار بعد. ابدأ بإضافة الأدوار الأساسية للنظام.
            </p>
            <button
              onClick={() => handleEditRole()}
              className="px-4 py-2 bg-primary text-white rounded-lg flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              <span>إضافة دور جديد</span>
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">اسم الدور</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">الوصف</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">الصلاحيات</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {filteredRoles.map(role => (
                <tr key={role.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                  <td className="px-4 py-4">
                    <div className="font-medium text-gray-900 dark:text-white">{role.name}</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400">{role.description}</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-1">
                      {role.permissions && role.permissions.length > 0 ? (
                        <>
                          {role.permissions.slice(0, 3).map((permId, index) => {
                            const permission = permissions.find(p => p.id === permId);
                            return permission ? (
                              <span 
                                key={permission.id} 
                                className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded"
                                title={permission.description}
                              >
                                {translatePermission(permission.code)}
                              </span>
                            ) : null;
                          })}
                          
                          {role.permissions.length > 3 && (
                            <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded">
                              +{role.permissions.length - 3}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 px-2 py-0.5 rounded">
                          بدون صلاحيات
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleEditRole(role)}
                        className="p-1.5 text-gray-500 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                        title="تعديل"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`هل أنت متأكد من حذف دور "${role.name}"؟`)) {
                            deleteRole(role.id);
                          }
                        }}
                        className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                        title="حذف"
                      >
                        <Trash className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      
      {/* Description cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 rounded-lg p-4 text-blue-800 dark:text-blue-300">
          <h3 className="font-bold text-lg mb-2">نظام الصلاحيات المرن</h3>
          <p className="text-sm">
            يتيح نظام الصلاحيات المرن (RBAC) تحديد مستويات مختلفة من الوصول لكل مستخدم عبر تعيين أدوار محددة. كل دور يتضمن مجموعة من الصلاحيات المحددة مسبقاً.
          </p>
        </div>
        
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900/30 rounded-lg p-4 text-green-800 dark:text-green-300">
          <h3 className="font-bold text-lg mb-2">أفضل الممارسات الأمنية</h3>
          <p className="text-sm">
            يطبق النظام مبدأ أقل الصلاحيات اللازمة (Principle of Least Privilege)، حيث يمنح المستخدمين فقط الصلاحيات التي يحتاجونها لأداء مهامهم، مما يعزز أمن النظام.
          </p>
        </div>
        
        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-900/30 rounded-lg p-4 text-purple-800 dark:text-purple-300">
          <h3 className="font-bold text-lg mb-2">تخصيص الصلاحيات</h3>
          <p className="text-sm">
            يمكنك إضافة أدوار مخصصة مع تحديد الصلاحيات بدقة لكل منها. ويمكن تعديل هذه الأدوار في أي وقت لتلبية احتياجات المؤسسة المتغيرة.
          </p>
        </div>
      </div>
    </div>
  );
}