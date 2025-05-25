import { Task, TaskLog, TaskAttachment, TaskStatus, TaskPriority, User, Branch } from '../../../types/database';

export type { Task, TaskLog, TaskAttachment, TaskStatus, TaskPriority };

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
}

export interface TaskFilters {
  status?: TaskStatus | 'all';
  priority?: TaskPriority | 'all';
  assigned_to?: string | null;
  branch_id?: string | null;
  search?: string;
  timeframe?: 'all' | 'today' | 'week' | 'month' | 'overdue';
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
}

export interface TaskLogWithRelations extends TaskLog {
  user?: User;
  task?: Task;
}

export interface TaskAttachmentWithRelations extends TaskAttachment {
  user?: User;
}