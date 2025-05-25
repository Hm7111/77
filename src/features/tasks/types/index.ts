import { Task, TaskLog, TaskAttachment, TaskStatus, TaskPriority, User, Branch, TaskComment, TaskNotification, TaskReport } from '../../../types/database';

export type { Task, TaskLog, TaskAttachment, TaskStatus, TaskPriority, TaskComment, TaskNotification, TaskReport };

// واجهات إضافية خاصة بنظام المهام

export interface TaskFormData {
  title: string;
  description?: string;
  assigned_to?: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  due_date?: string | null;
  notes?: string | null;
  branch_id?: string | null;
  // دعم تعيين مهمة لأكثر من شخص
  assignees?: string[] | null;
  // ربط المهمة بمشروع أو خطاب أو جهة
  project_id?: string | null;
  letter_id?: string | null;
  entity_id?: string | null;
  entity_type?: 'project' | 'department' | 'letter';
}

export interface TaskFilters {
  status?: TaskStatus | 'all';
  priority?: TaskPriority | 'all';
  assigned_to?: string | null;
  branch_id?: string | null;
  search?: string;
  timeframe?: 'all' | 'today' | 'week' | 'month' | 'overdue';
  // تصفية إضافية حسب المشروع أو الخطاب أو الجهة
  project_id?: string | null;
  letter_id?: string | null;
  entity_id?: string | null;
  // تصفية حسب التقييم
  rating?: number | null;
}

export interface TaskUpdate {
  id: string;
  status?: TaskStatus;
  notes?: string;
  priority?: TaskPriority;
  assigned_to?: string | null;
  due_date?: string | null;
  description?: string;
  title?: string;
  // تحديثات للميزات الجديدة
  assignees?: string[] | null;
  project_id?: string | null;
  letter_id?: string | null;
  entity_id?: string | null;
  rating?: number | null;
  rating_notes?: string | null;
}

export interface TaskComment {
  task_id: string;
  notes: string;
}

export interface TaskSummary {
  total: number;
  new: number;
  inProgress: number;
  completed: number;
  rejected: number;
  postponed: number;
  overdue: number;
}

export interface TaskWithRelations extends Task {
  creator?: User;
  assignee?: User;
  branch?: Branch;
  logs?: TaskLog[];
  attachments?: TaskAttachment[];
  comments?: TaskComment[];
  notifications?: TaskNotification[];
}

export interface TaskLogWithRelations extends TaskLog {
  user?: User;
  task?: Task;
}

export interface TaskAttachmentWithRelations extends TaskAttachment {
  user?: User;
}

export interface TaskCommentWithRelations extends TaskComment {
  user?: User;
}

export interface TaskNotificationWithRelations extends TaskNotification {
  user?: User;
  task?: Task;
}

export interface TaskReportData {
  userId?: string;
  branchId?: string;
  startDate: string;
  endDate: string;
  reportType: 'user' | 'team' | 'branch' | 'system';
}