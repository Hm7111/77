import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/Tabs';
import { ClipboardCheck, CheckSquare, FileCheck } from 'lucide-react';
import { ApprovalList } from '../../components/workflow/ApprovalList';

export function Approvals() {
  const [activeTab, setActiveTab] = useState('pending');

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6" />
            إدارة الموافقات
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            إدارة طلبات موافقة الخطابات ومتابعة حالتها
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="mb-6 flex items-center gap-1 px-1 overflow-x-auto hide-scrollbar pb-px bg-white dark:bg-gray-900 p-1 rounded-lg shadow-sm border dark:border-gray-800">
          <TabsTrigger
            value="pending"
            className="flex items-center gap-2 py-3 px-4"
          >
            <ClipboardCheck className="h-4 w-4" />
            <span>طلبات بانتظار موافقتي</span>
          </TabsTrigger>
          <TabsTrigger
            value="my-requests"
            className="flex items-center gap-2 py-3 px-4"
          >
            <FileCheck className="h-4 w-4" />
            <span>طلباتي</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <ApprovalList role="approver" />
        </TabsContent>
        
        <TabsContent value="my-requests">
          <ApprovalList role="requester" />
        </TabsContent>
      </Tabs>
    </div>
  );
}