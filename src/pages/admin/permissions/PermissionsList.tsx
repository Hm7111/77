import { useState, useEffect } from 'react';
import { 
  Key, 
  Plus, 
  Search, 
  Edit, 
  Trash, 
  Save, 
  X,
  AlertCircle,
  Lock
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/auth';
import { useToast } from '../../../hooks/useToast';
import { Permission } from '../../../types/database';

export function PermissionsList() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [filteredPermissions, setFilteredPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editingPermission, setEditingPermission] = useState<Permission | null>(null);
  
  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [code, setCode] = useState('');
  
  useEffect(() => {
    if (isAdmin) {
      loadPermissions();
    }
  }, [isAdmin]);
  
  // Filter permissions when search term or permissions list changes
  useEffect(() => {
    if (permissions) {
      const filtered = permissions.filter(
        permission => 
          permission.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          permission.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (permission.description && permission.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredPermissions(filtered);
    }
  }, [permissions, searchTerm]);
  
  async function loadPermissions() {
    try {
      setIsLoading(true);
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
    } finally {
      setIsLoading(false);
    }
  }
  
  function handleAddPermission() {
    setEditingPermission(null);
    setName('');
    setDescription('');
    setCode('');
    setShowDialog(true);
  }
  
  function handleEditPermission(permission: Permission) {
    setEditingPermission(permission);
    setName(permission.name);
    setDescription(permission.description || '');
    setCode(permission.code);
    setShowDialog(true);
  }
  
  async function handleSavePermission() {
    if (!name || !code) {
      toast({
        title: 'حقول إلزامية',
        description: 'يرجى ملء جميع الحقول المطلوبة',
        type: 'warning'
      });
      return;
    }
    
    // Validate code format (action:resource[:scope])
    const codePattern = /^[a-z]+:[a-z_]+(?::[a-z_]+)?$/;
    if (!codePattern.test(code)) {
      toast({
        title: 'خطأ في الكود',
        description: 'يجب أن يكون الكود بتنسيق action:resource[:scope]',
        type: 'error'
      });
      return;
    }
    
    try {
      setIsLoading(true);
      
      const permissionData = {
        name,
        description,
        code
      };
      
      if (editingPermission) {
        // Update existing permission
        const { error } = await supabase
          .from('permissions')
          .update(permissionData)
          .eq('id', editingPermission.id);
          
        if (error) throw error;
        
        toast({
          title: 'تم التحديث',
          description: 'تم تحديث الصلاحية بنجاح',
          type: 'success'
        });
      } else {
        // Create new permission
        const { error } = await supabase
          .from('permissions')
          .insert(permissionData);
          
        if (error) {
          if (error.code === '23505') { // Unique constraint violation
            toast({
              title: 'خطأ',
              description: 'كود الصلاحية مستخدم بالفعل',
              type: 'error'
            });
            return;
          }
          throw error;
        }
        
        toast({
          title: 'تم الإنشاء',
          description: 'تم إنشاء الصلاحية بنجاح',
          type: 'success'
        });
      }
      
      loadPermissions();
      setShowDialog(false);
    } catch (error) {
      console.error('Error saving permission:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء حفظ الصلاحية',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  }
  
  async function handleDeletePermission(permissionId: string) {
    try {
      // Check if permission is used in any roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('id, name, permissions');
        
      if (rolesError) throw rolesError;
      
      const rolesUsingPermission = roles?.filter(role => 
        role.permissions && role.permissions.includes(permissionId)
      );
      
      if (rolesUsingPermission && rolesUsingPermission.length > 0) {
        const roleNames = rolesUsingPermission.map(r => r.name).join(', ');
        toast({
          title: 'لا يمكن الحذف',
          description: `هذه الصلاحية مستخدمة في الأدوار التالية: ${roleNames}`,
          type: 'error'
        });
        return;
      }
      
      // Delete permission
      const { error } = await supabase
        .from('permissions')
        .delete()
        .eq('id', permissionId);
        
      if (error) throw error;
      
      toast({
        title: 'تم الحذف',
        description: 'تم حذف الصلاحية بنجاح',
        type: 'success'
      });
      
      loadPermissions();
    } catch (error) {
      console.error('Error deleting permission:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء حذف الصلاحية',
        type: 'error'
      });
    }
  }
  
  // Group permissions by category for display
  const permissionsByCategory = filteredPermissions.reduce((groups, permission) => {
    const category = permission.code.split(':')[1]; // Use resource as category
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(permission);
    return groups;
  }, {} as Record<string, Permission[]>);
  
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
      {/* Permission dialog */}
      {showDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-6 border-b dark:border-gray-800 pb-4">
              <h2 className="text-xl font-semibold">
                {editingPermission ? 'تعديل صلاحية' : 'إضافة صلاحية جديدة'}
              </h2>
              <button
                onClick={() => setShowDialog(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">اسم الصلاحية <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2 border dark:border-gray-700 rounded-lg"
                  placeholder="مثال: عرض الخطابات"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">كود الصلاحية <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toLowerCase())}
                  className="w-full p-2 border dark:border-gray-700 rounded-lg"
                  placeholder="مثال: view:letters"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  يجب أن يكون بتنسيق action:resource[:scope] مثل view:letters أو edit:letters:own
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">الوصف</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2 border dark:border-gray-700 rounded-lg resize-none h-24"
                  placeholder="وصف الصلاحية والغرض منها"
                />
              </div>
            </div>
            
            <div className="flex justify-end mt-6 pt-4 border-t dark:border-gray-800">
              <button
                onClick={() => setShowDialog(false)}
                className="px-4 py-2 border dark:border-gray-700 rounded-lg mr-2 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                إلغاء
              </button>
              <button
                onClick={handleSavePermission}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 flex items-center"
                disabled={isLoading}
              >
                {isLoading ? (
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
            <Key className="h-6 w-6 text-primary" />
            إدارة الصلاحيات
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            قائمة بجميع الصلاحيات المتاحة في النظام
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="بحث في الصلاحيات..."
              className="w-full md:w-auto pl-3 pr-10 py-2 border dark:border-gray-700 rounded-lg"
            />
          </div>
          
          <button
            onClick={handleAddPermission}
            className="bg-primary text-primary-foreground px-3 py-2 rounded-lg flex items-center gap-x-2 text-sm whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            <span>إضافة صلاحية</span>
          </button>
        </div>
      </div>
      
      {/* Permissions list */}
      {isLoading && permissions.length === 0 ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-t-primary border-b-transparent border-l-primary border-r-transparent"></div>
        </div>
      ) : filteredPermissions.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-lg p-8 text-center shadow-sm">
          <Key className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium mb-2">
            {searchTerm ? 'لا توجد نتائج مطابقة' : 'لا توجد صلاحيات'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4 max-w-md mx-auto">
            {searchTerm 
              ? 'لم يتم العثور على صلاحيات مطابقة لكلمة البحث. حاول استخدام كلمات مفتاحية أخرى.'
              : 'لم يتم إضافة أي صلاحيات بعد. ابدأ بإضافة الصلاحيات الأساسية للنظام.'
            }
          </p>
          
          {searchTerm ? (
            <button
              onClick={() => setSearchTerm('')}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 mr-2"
            >
              مسح البحث
            </button>
          ) : (
            <button
              onClick={handleAddPermission}
              className="px-4 py-2 bg-primary text-white rounded-lg flex items-center gap-2 mx-auto"
            >
              <Plus className="h-4 w-4" />
              <span>إضافة صلاحية</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(permissionsByCategory).map(([category, categoryPermissions]) => (
            <div 
              key={category}
              className="bg-white dark:bg-gray-900 rounded-lg border dark:border-gray-800 shadow-sm overflow-hidden"
            >
              <div className="bg-gray-50 dark:bg-gray-900/50 px-4 py-3 border-b dark:border-gray-800">
                <h2 className="font-semibold text-gray-900 dark:text-white flex items-center">
                  <Lock className="h-4 w-4 ml-2 text-primary" />
                  {category}
                </h2>
              </div>
              
              <div className="p-4">
                <div className="space-y-3">
                  {categoryPermissions.map(permission => (
                    <div 
                      key={permission.id}
                      className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-medium text-gray-900 dark:text-white">{permission.name}</div>
                        <div className="flex items-center">
                          <button
                            onClick={() => handleEditPermission(permission)}
                            className="p-1 text-gray-500 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                            title="تعديل"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`هل أنت متأكد من حذف صلاحية "${permission.name}"؟`)) {
                                handleDeletePermission(permission.id);
                              }
                            }}
                            className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                            title="حذف"
                          >
                            <Trash className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <div className="text-xs font-mono bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded inline-block">
                        {permission.code}
                      </div>
                      {permission.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                          {permission.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Information cards */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 rounded-lg p-4 text-blue-800 dark:text-blue-300">
          <h3 className="font-bold text-lg mb-2">تنسيق كود الصلاحيات</h3>
          <p className="text-sm">
            يتكون كود الصلاحية من ثلاثة أجزاء: <code className="px-1 bg-blue-100 dark:bg-blue-900/50 rounded">action:resource[:scope]</code>
            <br />
            <strong>Action:</strong> العملية مثل view، create، edit، delete
            <br />
            <strong>Resource:</strong> المورد مثل letters، users، templates
            <br />
            <strong>Scope:</strong> نطاق الصلاحية (اختياري) مثل own
          </p>
        </div>
        
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900/30 rounded-lg p-4 text-green-800 dark:text-green-300">
          <h3 className="font-bold text-lg mb-2">أمثلة على الصلاحيات</h3>
          <ul className="text-sm space-y-1 list-disc mr-4">
            <li><code className="px-1 bg-green-100 dark:bg-green-900/50 rounded">view:letters</code> - عرض جميع الخطابات</li>
            <li><code className="px-1 bg-green-100 dark:bg-green-900/50 rounded">edit:letters:own</code> - تعديل الخطابات الخاصة بالمستخدم فقط</li>
            <li><code className="px-1 bg-green-100 dark:bg-green-900/50 rounded">create:users</code> - إنشاء مستخدمين جدد</li>
            <li><code className="px-1 bg-green-100 dark:bg-green-900/50 rounded">delete:templates</code> - حذف القوالب</li>
          </ul>
        </div>
        
        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-900/30 rounded-lg p-4 text-purple-800 dark:text-purple-300">
          <h3 className="font-bold text-lg mb-2">إرشادات الصلاحيات</h3>
          <ul className="text-sm space-y-1 list-disc mr-4">
            <li>حدد اسم الصلاحية ووصفها بوضوح</li>
            <li>استخدم كلمات بسيطة ومفهومة</li>
            <li>اتبع تنسيق الكود المحدد</li>
            <li>تأكد من عدم وجود تكرار في الصلاحيات</li>
            <li>استخدم النطاق (scope) عند الحاجة للتمييز بين الصلاحيات العامة والخاصة</li>
          </ul>
        </div>
      </div>
    </div>
  );
}