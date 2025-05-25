import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { Search, User } from 'lucide-react';

interface UserSelectorProps {
  value: string;
  onChange: (userId: string | null) => void;
  error?: string;
  placeholder?: string;
  className?: string;
  branchId?: string | null;
}

/**
 * مكون اختيار المستخدمين
 */
export function UserSelector({
  value,
  onChange,
  error,
  placeholder = 'اختر موظف',
  className = '',
  branchId
}: UserSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(value || null);
  
  // جلب المستخدمين
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users-for-tasks', branchId],
    queryFn: async () => {
      let query = supabase
        .from('users')
        .select('id, full_name, email, role, branch:branch_id(id, name, code)')
        .eq('is_active', true);
      
      if (branchId) {
        query = query.eq('branch_id', branchId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 60000 // 1 minute
  });
  
  // تحديد المستخدم المختار
  const selectedUser = users.find(user => user.id === selectedUserId);
  
  // تصفية المستخدمين حسب البحث
  const filteredUsers = searchTerm
    ? users.filter(user =>
        user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : users;
  
  // تحديث المستخدم المختار عند تغيير القيمة من الخارج
  useEffect(() => {
    if (value !== selectedUserId) {
      setSelectedUserId(value || null);
    }
  }, [value]);
  
  // اختيار مستخدم
  const handleSelectUser = (userId: string) => {
    setSelectedUserId(userId);
    onChange(userId);
    setShowDropdown(false);
  };

  return (
    <div className={`relative ${className}`}>
      <div
        className={`border ${error ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'} rounded-md hover:border-primary focus-within:ring-1 focus-within:ring-primary/20 focus-within:border-primary cursor-pointer`}
        onClick={() => setShowDropdown(!showDropdown)}
      >
        <div className="flex items-center px-3 py-2">
          <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center ml-2">
            <User className="h-4 w-4 text-primary" />
          </div>
          
          {selectedUser ? (
            <div className="flex-1 flex items-center justify-between">
              <div>
                <p className="font-medium">{selectedUser.full_name}</p>
                <p className="text-xs text-gray-500">{selectedUser.email}</p>
              </div>
              <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded">
                {selectedUser.role === 'admin' ? 'مدير' : 'مستخدم'}
                {selectedUser.branch?.code && ` - ${selectedUser.branch.code}`}
              </span>
            </div>
          ) : (
            <span className="text-gray-500">{placeholder}</span>
          )}
        </div>
      </div>
      
      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
      
      {showDropdown && (
        <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-lg">
          <div className="p-2">
            <div className="relative mb-2">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-3 pr-10 py-2 border border-gray-300 dark:border-gray-700 rounded-md text-sm"
                placeholder="بحث..."
                onClick={(e) => e.stopPropagation()}
                autoFocus
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            </div>
            
            <div className="max-h-60 overflow-y-auto">
              {isLoading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary mx-auto"></div>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  {searchTerm ? 'لا توجد نتائج مطابقة' : 'لا يوجد مستخدمين'}
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredUsers.map((user) => (
                    <div
                      key={user.id}
                      className={`flex items-center px-3 py-2 rounded-md cursor-pointer ${
                        selectedUserId === user.id
                          ? 'bg-primary/10 text-primary'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectUser(user.id);
                      }}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 ${
                        selectedUserId === user.id
                          ? 'bg-primary/20 text-primary'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                      }`}>
                        <User className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{user.full_name}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                      {user.branch && (
                        <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full">
                          {user.branch.code}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}