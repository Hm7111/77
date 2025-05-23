import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/Tabs';
import { Shield, Key, UserCog } from 'lucide-react';
import { RolesManagement } from './RolesManagement';
import { PermissionsList } from './PermissionsList';
import { UserPermissions } from './UserPermissions';
import { useAuth } from '../../../lib/auth';

export function PermissionsManager() {
  const [activeTab, setActiveTab] = useState('roles');
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-8 rounded-lg shadow text-center">
        <div className="mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold mb-2">غير مصرح بالوصول</h2>
        <p>عذراً، هذه الصفحة متاحة فقط للمستخدمين ذوي صلاحيات المدير.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
            <Shield className="h-6 w-6" />
            إدارة الصلاحيات
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            إدارة أدوار المستخدمين وصلاحياتهم في النظام
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-8 flex items-center gap-1 px-1 overflow-x-auto hide-scrollbar pb-px">
          <TabsTrigger
            value="roles"
            className="flex items-center gap-2 py-3"
          >
            <Shield className="h-4 w-4" />
            <span>الأدوار</span>
          </TabsTrigger>
          <TabsTrigger
            value="permissions"
            className="flex items-center gap-2 py-3"
          >
            <Key className="h-4 w-4" />
            <span>الصلاحيات</span>
          </TabsTrigger>
          <TabsTrigger
            value="user-permissions"
            className="flex items-center gap-2 py-3"
          >
            <UserCog className="h-4 w-4" />
            <span>صلاحيات المستخدمين</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="space-y-4">
          <RolesManagement />
        </TabsContent>
        
        <TabsContent value="permissions" className="space-y-4">
          <PermissionsList />
        </TabsContent>
        
        <TabsContent value="user-permissions" className="space-y-4">
          <UserPermissions />
        </TabsContent>
      </Tabs>
    </div>
  );
}