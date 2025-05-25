export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'task_assigned' | 'task_completed' | 'task_overdue' | 'task_updated' | 'task_comment' | 'system';
  entity_type: 'task' | 'letter' | 'approval' | 'system';
  entity_id: string;
  is_read: boolean;
  created_at: string;
}