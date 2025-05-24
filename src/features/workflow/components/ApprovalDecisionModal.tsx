import { useState } from 'react';
import { X } from 'lucide-react';
import { ApprovalRequest } from '../types';
import { ApprovalDecisionForm } from './ApprovalDecisionForm';

interface ApprovalDecisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: ApprovalRequest;
  onApprove?: () => void;
  onReject?: () => void;
}

/**
 * نافذة اتخاذ قرار بشأن طلب موافقة
 */
export function ApprovalDecisionModal({ isOpen, onClose, request, onApprove, onReject }: ApprovalDecisionModalProps) {
  if (!isOpen) return null;

  const handleSuccess = () => {
    if (request.status === 'approved' && onApprove) {
      onApprove();
    } else if (request.status === 'rejected' && onReject) {
      onReject();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg max-w-lg w-full overflow-hidden shadow-xl">
        <div className="p-4 border-b dark:border-gray-800 flex items-center justify-between">
          <h3 className="text-lg font-semibold">اتخاذ قرار بشأن الخطاب</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <ApprovalDecisionForm 
          request={request}
          onClose={onClose}
          onSuccess={handleSuccess}
        />
      </div>
    </div>
  );
}