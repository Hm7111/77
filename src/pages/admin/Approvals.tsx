import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/Tabs';
import { ClipboardCheck, CheckSquare } from 'lucide-react';
import { ApprovalList } from '../../components/workflow/ApprovalList';

export function Approvals() {
  const [activeTab, setActiveTab] = useState('pending');

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6" />
            إدارة الموافقات
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            إدارة طلبات موافقة الخطابات ومتابعة حالتها
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-8 flex items-center gap-1 px-1 overflow-x-auto hide-scrollbar pb-px">
          <TabsTrigger
            value="pending"
            className="flex items-center gap-2 py-3"
          >
            <ClipboardCheck className="h-4 w-4" />
            <span>طلبات بانتظار موافقتي</span>
          </TabsTrigger>
          <TabsTrigger
            value="my-requests"
            className="flex items-center gap-2 py-3"
          >
            <CheckSquare className="h-4 w-4" />
            <span>طلباتي</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          <ApprovalList role="approver" />
        </TabsContent>
        
        <TabsContent value="my-requests" className="space-y-4">
          <ApprovalList role="requester" />
        </TabsContent>
      </Tabs>
    </div>
  );
}