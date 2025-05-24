import { WorkflowStatusBadge } from '../../features/workflow/components/WorkflowStatusBadge';
import { WorkflowState } from '../../types/database';

interface WorkflowStatusProps {
  status: WorkflowState | string | null | undefined;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  withIcon?: boolean;
}

/**
 * مكون لعرض حالة سير العمل
 * يستخدم WorkflowStatusBadge من مكتبة المكونات
 */
export function WorkflowStatus(props: WorkflowStatusProps) {
  return <WorkflowStatusBadge {...props} />;
}