import { WorkflowTimeline as WorkflowTimelineComponent } from '../../features/workflow/components/WorkflowTimeline';
import { Letter } from '../../types/database';

interface WorkflowTimelineProps {
  letter: Letter;
  onRefresh?: () => void;
}

/**
 * مكون لعرض الجدول الزمني لسير العمل
 * يستخدم WorkflowTimeline من مكتبة المكونات
 */
export function WorkflowTimeline(props: WorkflowTimelineProps) {
  return <WorkflowTimelineComponent {...props} />;
}