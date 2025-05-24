import { useState } from 'react';
import { X } from 'lucide-react';
import { Letter } from '../types';
import { ApprovalRequestForm } from './ApprovalRequestForm';

interface ApprovalRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  letter: Letter | null;
  onSuccess?: () => void;
}

/**
 * نافذة طلب الموافقة
 */
export function ApprovalRequestModal({ isOpen, onClose, letter, onSuccess }: ApprovalRequestModalProps) {
  if (!isOpen || !letter) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg max-w-lg w-full overflow-hidden shadow-xl">
        <div className="p-4 border-b dark:border-gray-800 flex items-center justify-between">
          <h3 className="text-lg font-semibold">طلب موافقة على الخطاب</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-4">
          <ApprovalRequestForm 
            letter={letter}
            onClose={onClose}
            onSuccess={onSuccess}
          />
        </div>
      </div>
    </div>
  );
}