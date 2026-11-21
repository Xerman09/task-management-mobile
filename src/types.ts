export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'completed' | (string & {});
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskRecurrence = 'none' | 'daily' | 'weekdays' | 'weekly' | 'monthly' | 'specific_days';

export interface Subtask {
  id: number;
  task_id: number;
  title: string;
  is_completed: boolean;
  position: number;
}

export interface Tag {
  id: number;
  name: string;
  color: string;
}

export interface ProjectStatus {
  id: number;
  project_id: number;
  slug: string;
  label: string;
  color: string;
  position: number;
  is_completed: boolean;
}

export interface Project {
  id: number;
  folder_id?: number | null;
  folder_name?: string | null;
  folder_color?: string | null;
  name: string;
  description?: string | null;
  color: string;
  statuses?: ProjectStatus[];
}

export interface Folder {
  id: number;
  name: string;
  color: string;
}

export interface Task {
  id: number;
  project_id?: number | null;
  project_name?: string | null;
  project_color?: string | null;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  category?: string | null;
  due_date?: string | null;
  recurrence?: TaskRecurrence;
  recurrence_days?: string | null;
  estimated_minutes?: number | null;
  subtasks: Subtask[];
  tags?: Tag[];
  comments_count?: number;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'member' | 'viewer';
}

export interface TaskComment {
  id: number;
  task_id: number;
  user_id?: number;
  user_name?: string;
  body: string;
  created_at: string;
}

export interface AutomationRule {
  id: number;
  name: string;
  trigger_type: string;
  trigger_value?: string | null;
  action_type: string;
  action_value?: string | null;
  is_active: boolean;
}

export interface WebhookConfig {
  id: number;
  name: string;
  provider: 'discord' | 'slack' | 'custom';
  webhook_url: string;
  events: string[];
  is_active: boolean;
}

