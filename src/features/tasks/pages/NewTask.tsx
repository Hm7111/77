import { useNavigate } from 'react-router-dom';
import { ArrowRight, Plus } from 'lucide-react';
import { TaskForm } from '../components/TaskForm';
import { useTaskActions } from '../hooks/useTaskActions';
import { TaskFormData } from '../types';
import { useToast } from '../../../hooks/useToast';

/**
 * صفحة إنشاء مهمة جديدة
 */
export function NewTask() {
  const navigate = useNavigate();
  const { createTask, isCreateLoading } = useTaskActions();
  const { toast } = useToast();

  const handleSubmit = async (formData: TaskFormData) => {
    try {
      await createTask(formData, {
        onSuccess: () => {
          toast({
            title: 'تم الإنشاء',
            description: 'تم إنشاء المهمة بنجاح',
            type: 'success'
          });
          
          navigate('/admin/tasks');
        }
      });
    } catch (error) {
      console.error('Error creating task:', error);
      
      toast({
        title: 'خطأ',
        description: 'فشل في إنشاء المهمة',
        type: 'error'
      });
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center gap-x-2 mb-6">
        <button
          onClick={() => navigate('/admin/tasks')}
          className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <ArrowRight className="h-5 w-5" />
        </button>
        <h1 className="text-2xl font-bold">إنشاء مهمة جديدة</h1>
      </div>
      
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow border dark:border-gray-800 p-6">
        <TaskForm
          onSubmit={handleSubmit}
          isLoading={isCreateLoading}
        />
      </div>
    </div>
  );
}