import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/Tabs'
import { Settings as SettingsIcon, FileText, PenTool, Tag, User, Server, Building } from 'lucide-react'
import { TemplateGallery } from '../../components/templates/TemplateGallery'
import { useAuth } from '../../lib/auth'
import { TemplateZonesTab } from './SettingsContent/TemplateZonesTab'
import { Branches } from './Branches'
import { UserProfile } from '../../components/profile/UserProfile'

export function Settings() {
  const [activeTab, setActiveTab] = useState('profile')
  const { isAdmin } = useAuth()

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
            <SettingsIcon className="h-6 w-6" />
            الإعدادات
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            إدارة إعدادات النظام وتخصيصه
          </p>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-8 flex items-center gap-1 px-1 overflow-x-auto hide-scrollbar pb-px">
          <TabsTrigger
            value="profile"
            className="flex items-center gap-2 py-3"
          >
            <User className="h-4 w-4" />
            <span>الملف الشخصي</span>
          </TabsTrigger>
          <TabsTrigger
            value="templates"
            className="flex items-center gap-2 py-3"
          >
            <FileText className="h-4 w-4" />
            <span>قوالب الخطابات</span>
          </TabsTrigger>
          <TabsTrigger
            value="template-zones"
            className="flex items-center gap-2 py-3"
          >
            <PenTool className="h-4 w-4" />
            <span>مناطق الكتابة</span>
          </TabsTrigger>
          {isAdmin && (
            <>
              <TabsTrigger
                value="branches"
                className="flex items-center gap-2 py-3"
              >
                <Building className="h-4 w-4" />
                <span>إدارة الفروع</span>
              </TabsTrigger>
              <TabsTrigger
                value="template-categories"
                className="flex items-center gap-2 py-3"
              >
                <Tag className="h-4 w-4" />
                <span>تصنيفات القوالب</span>
              </TabsTrigger>
              <TabsTrigger
                value="app-settings"
                className="flex items-center gap-2 py-3"
              >
                <Server className="h-4 w-4" />
                <span>إعدادات النظام</span>
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <UserProfile />
        </TabsContent>
        
        <TabsContent value="templates" className="space-y-4">
          <TemplateGallery isAdmin={isAdmin} />
        </TabsContent>
        
        <TabsContent value="template-zones" className="space-y-4">
          <TemplateZonesTab />
        </TabsContent>

        <TabsContent value="branches" className="space-y-4">
          <Branches />
        </TabsContent>
        
        {isAdmin && (
          <>
            <TabsContent value="template-categories" className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-900/30 dark:text-yellow-300">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                  هذه الميزة قيد التطوير
                </h3>
                <p className="text-sm">
                  ستتمكن قريبًا من إدارة تصنيفات القوالب لتنظيم القوالب وتسهيل الوصول إليها.
                </p>
              </div>
            </TabsContent>
            <TabsContent value="app-settings" className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-900/30 dark:text-yellow-300">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                  هذه الميزة قيد التطوير
                </h3>
                <p className="text-sm">
                  ستتمكن قريبًا من تخصيص إعدادات النظام مثل شعار المؤسسة والألوان والإعدادات العامة.
                </p>
              </div>
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  )
}