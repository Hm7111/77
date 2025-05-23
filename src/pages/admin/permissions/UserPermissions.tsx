import { useState, useEffect } from 'react';
import { 
  UserCog, 
  Key, 
  Search, 
  Edit, 
  Save, 
  X,
  Check,
  AlertCircle,
  Shield
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/auth';
import { useToast } from '../../../hooks/useToast';
import { User, Permission } from '../../../types/database';
import { BranchSelector } from '../../../components/branches/BranchSelector';
import { DEFAULT_PERMISSIONS } from '../../../lib/auth';

export function UserPermissions() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  
  const [users, setUsers] = useState<User[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string | null>(null);
  
  // User editing states
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [defaultUserPermissions, setDefaultUserPermissions] = useState<string[]>([]);
  
  // Load users and permissions
  useEffect(() => {
    if (isAdmin) {
      loadUsers();
      loadPermissions();
    }
  }, [isAdmin, selectedBranchFilter]);
  
  // Filter users based on search term
  const filteredUsers = users.filter(user => 
    user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.branch?.name && user.branch.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  
  // Load users from database
  async function loadUsers() {
    try {
      setIsLoading(true);
      let query = supabase
        .from('users')
        .select('*, branches(*)');
        
      if (selectedBranchFilter) {
        query = query.eq('branch_id', selectedBranchFilter);
      }
      
      const { data, error } = await query;
        
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء تحميل المستخدمين',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
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
  
  // Handle editing user permissions
  function handleEditUser(user: User) {
    setSelectedUser(user);
    setUserPermissions(user.permissions || []);
    // Set default permissions based on role
    const defaultPerms = user.role === 'admin' 
      ? DEFAULT_PERMISSIONS.admin 
      : DEFAULT_PERMISSIONS.user;
    
    // Convert permission codes to IDs
    const defaultPermIds = permissions
      .filter(p => defaultPerms.includes(p.code))
      .map(p => p.id);
    
    setDefaultUserPermissions(defaultPermIds);
    setShowUserDialog(true);
  }
  
  // Toggle permission selection
  function togglePermission(permissionId: string) {
    setUserPermissions(prev => {
      if (prev.includes(permissionId)) {
        return prev.filter(id => id !== permissionId);
      } else {
        return [...prev, permissionId];
      }
    });
  }
  
  // Check if a permission is included in default permissions
  function isDefaultPermission(permissionId: string) {
    return defaultUserPermissions.includes(permissionId);
  }
  
  // Save user permissions
  async function saveUserPermissions() {
    if (!selectedUser) return;
    
    try {
      setIsLoading(true);
      
      const { error } = await supabase
        .from('users')
        .update({
          permissions: userPermissions,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedUser.id);
        
      if (error) throw error;
      
      toast({
        title: 'تم الحفظ',
        description: 'تم تحديث صلاحيات المستخدم بنجاح',
        type: 'success'
      });
      
      loadUsers();
      setShowUserDialog(false);
    } catch (error) {
      console.error('Error saving user permissions:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء حفظ صلاحيات المستخدم',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  }
  
  // Group permissions by category for display
  const permissionsByCategory = permissions.reduce((groups, permission) => {
    const parts = permission.code.split(':');
    const category = parts[1]; // Use resource as category
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
      {/* User permissions dialog */}
      {showUserDialog && selectedUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-3xl w-full">
            <div className="flex items-center justify-between p-5 border-b dark:border-gray-800">
              <h2 className="text-xl font-semibold flex items-center">
                <UserCog className="h-5 w-5 ml-2 text-primary" />
                إدارة صلاحيات {selectedUser.full_name}
              </h2>
              <button
                onClick={() => setShowUserDialog(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-5">
              {/* User info */}
              <div className="mb-6 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">البريد الإلكتروني</p>
                    <p className="font-medium">{selectedUser.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">الفرع</p>
                    <p className="font-medium">
                      {selectedUser.branch?.name || 'غير محدد'}
                      {selectedUser.branch?.code && ` (${selectedUser.branch.code})`}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">الدور</p>
                    <p className="font-medium">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        selectedUser.role === 'admin'
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                      }`}>
                        {selectedUser.role === 'admin' ? 'مدير' : 'مستخدم'}
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">الحالة</p>
                    <p className="font-medium">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        selectedUser.is_active
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {selectedUser.is_active ? 'مفعل' : 'معطل'}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
              
              <h3 className="font-medium text-lg mb-4 flex items-center">
                <Key className="h-4 w-4 ml-1 text-primary" />
                تخصيص الصلاحيات
              </h3>
              
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
                  {/* Permission categories */}
                  {Object.entries(permissionsByCategory).map(([category, categoryPermissions]) => (
                    <div key={category} className="mb-4 last:mb-0">
                      <h4 className="font-medium mb-2 text-gray-900 dark:text-white">{category}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {categoryPermissions.map(permission => {
                          const isDefault = isDefaultPermission(permission.id);
                          const isSelected = userPermissions.includes(permission.id);
                          
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
                                  صلاحية افتراضية من دور {selectedUser.role === 'admin' ? 'المدير' : 'المستخدم'}
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
            </div>
            
            <div className="p-5 border-t dark:border-gray-800 flex justify-end">
              <button
                onClick={() => setShowUserDialog(false)}
                className="px-4 py-2 border dark:border-gray-700 rounded-lg mr-2"
              >
                إلغاء
              </button>
              <button
                onClick={saveUserPermissions}
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
                    <Save className="h-4 w-4" />
                    <span>حفظ الصلاحيات</span>
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
            <UserCog className="h-6 w-6 text-primary" />
            صلاحيات المستخدمين
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            إدارة صلاحيات المستخدمين وتخصيصها حسب الاحتياجات
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="بحث في المستخدمين..."
              className="w-full md:w-auto pl-3 pr-10 py-2 border dark:border-gray-700 rounded-lg"
            />
          </div>
          
          <BranchSelector
            value={selectedBranchFilter}
            onChange={setSelectedBranchFilter}
            placeholder="جميع الفروع"
            showAll
            className="min-w-[200px]"
          />
        </div>
      </div>
      
      {/* Users list */}
      {isLoading && users.length === 0 ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-t-primary border-b-transparent border-l-primary border-r-transparent"></div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-lg border dark:border-gray-800 shadow-sm overflow-hidden">
          {filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <UserCog className="h-16 w-16 text-gray-300 dark:text-gray-700 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">لا يوجد مستخدمون</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4 text-center max-w-md">
                {searchTerm || selectedBranchFilter 
                  ? 'لم يتم العثور على مستخدمين يطابقون معايير البحث الحالية.'
                  : 'لا يوجد مستخدمون في النظام حالياً.'}
              </p>
              {(searchTerm || selectedBranchFilter) && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedBranchFilter(null);
                  }}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  عرض جميع المستخدمين
                </button>
              )}
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900/50 text-right">
                <tr>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">اسم المستخدم</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">البريد الإلكتروني</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">الفرع</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">الدور</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">الصلاحيات المخصصة</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {filteredUsers.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                    <td className="px-4 py-4">
                      <div className="font-medium text-gray-900 dark:text-white">{user.full_name}</div>
                    </td>
                    <td className="px-4 py-4 text-gray-600 dark:text-gray-400">
                      {user.email}
                    </td>
                    <td className="px-4 py-4">
                      {user.branches ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                          {user.branches.name} ({user.branches.code})
                        </span>
                      ) : (
                        <span className="text-gray-500 dark:text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.role === 'admin'
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                      }`}>
                        {user.role === 'admin' ? 'مدير' : 'مستخدم'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {user.permissions && user.permissions.length > 0 ? (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                          {user.permissions.length} صلاحية إضافية
                        </span>
                      ) : (
                        <span className="text-gray-500 dark:text-gray-400">الافتراضية فقط</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center">
                        <button
                          onClick={() => handleEditUser(user)}
                          className="p-2 text-gray-500 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                          title="تعديل الصلاحيات"
                        >
                          <Key className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}