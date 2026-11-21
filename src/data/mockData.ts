import { Folder, Project, Tag, Task, User } from '../types';
import { getTodayYMD } from '../utils/date';

const today = getTodayYMD();

export const MOCK_USER: User = {
  id: 1,
  name: 'Admin User',
  email: 'admin@taskflow.dev',
  role: 'admin',
};

export const MOCK_FOLDERS: Folder[] = [
  { id: 1, name: 'Vertex Core Systems', color: '#06b6d4' },
  { id: 2, name: 'Operations & Docs', color: '#8b5cf6' },
];

export const MOCK_PROJECTS: Project[] = [
  {
    id: 1,
    folder_id: 1,
    folder_name: 'Vertex Core Systems',
    folder_color: '#06b6d4',
    name: 'General Manager Task',
    description: 'High-priority executive & operational deliverables',
    color: '#3b82f6',
  },
  {
    id: 2,
    folder_id: 1,
    folder_name: 'Vertex Core Systems',
    folder_color: '#06b6d4',
    name: 'Development',
    description: 'Backend API, payroll settings, and mobile client',
    color: '#8b5cf6',
  },
  {
    id: 3,
    folder_id: 2,
    folder_name: 'Operations & Docs',
    folder_color: '#8b5cf6',
    name: 'NEEDED DOCUMENTATIONS',
    description: 'Database backup, cloud setup, and SOPs',
    color: '#10b981',
  },
];

export const MOCK_TAGS: Tag[] = [
  { id: 1, name: 'urgent', color: '#ef4444' },
  { id: 2, name: 'backend', color: '#8b5cf6' },
  { id: 3, name: 'mobile', color: '#06b6d4' },
  { id: 4, name: 'ops', color: '#10b981' },
];

export const MOCK_TASKS: Task[] = [
  {
    id: 101,
    project_id: 2,
    project_name: 'Development',
    project_color: '#8b5cf6',
    title: 'Attendance Tap — Add popup for failed & successful tap',
    description: 'Ensure immediate visual feedback and error reason display when employees tap attendance.',
    status: 'in_progress',
    priority: 'high',
    category: 'Development',
    due_date: today,
    recurrence: 'none',
    estimated_minutes: 90,
    comments_count: 2,
    tags: [MOCK_TAGS[1], MOCK_TAGS[2]],
    subtasks: [
      { id: 1, task_id: 101, title: 'Design toast & modal feedback state', is_completed: true, position: 1 },
      { id: 2, task_id: 101, title: 'Wire failed tap error code mapping', is_completed: true, position: 2 },
      { id: 3, task_id: 101, title: 'Test on tablet & mobile viewport', is_completed: false, position: 3 },
    ],
  },
  {
    id: 102,
    project_id: 1,
    project_name: 'General Manager Task',
    project_color: '#3b82f6',
    title: 'Linked Profile Improvements',
    description: 'Review and polish linked profile syncing across devices.',
    status: 'todo',
    priority: 'medium',
    category: 'Work',
    due_date: today,
    recurrence: 'specific_days',
    recurrence_days: 'mon,wed,fri',
    estimated_minutes: 45,
    comments_count: 1,
    tags: [MOCK_TAGS[2]],
    subtasks: [
      { id: 4, task_id: 102, title: 'Audit profile avatar caching', is_completed: false, position: 1 },
      { id: 5, task_id: 102, title: 'Verify role badge display', is_completed: false, position: 2 },
    ],
  },
  {
    id: 103,
    project_id: 3,
    project_name: 'NEEDED DOCUMENTATIONS',
    project_color: '#10b981',
    title: 'James — Database Backup Setup & Cloud Sync',
    description: 'Configure automated daily MySQL dumps and verify restore integrity.',
    status: 'review',
    priority: 'urgent',
    category: 'Operations',
    due_date: '2026-11-17',
    recurrence: 'none',
    estimated_minutes: 120,
    comments_count: 3,
    tags: [MOCK_TAGS[0], MOCK_TAGS[3]],
    subtasks: [
      { id: 6, task_id: 103, title: 'Configure cron mysqldump retention (14 days)', is_completed: true, position: 1 },
      { id: 7, task_id: 103, title: 'Test full restore onto staging MySQL', is_completed: true, position: 2 },
      { id: 8, task_id: 103, title: 'Document recovery steps in runbook', is_completed: false, position: 3 },
    ],
  },
  {
    id: 104,
    project_id: 2,
    project_name: 'Development',
    project_color: '#8b5cf6',
    title: 'Add payroll setting for overtime & night differential rate',
    description: 'Support configurable overtime multipliers and night differential time ranges.',
    status: 'todo',
    priority: 'high',
    category: 'Development',
    due_date: '2026-11-26',
    recurrence: 'none',
    estimated_minutes: 180,
    comments_count: 0,
    tags: [MOCK_TAGS[1]],
    subtasks: [
      { id: 9, task_id: 104, title: 'Add payroll_settings migration', is_completed: false, position: 1 },
      { id: 10, task_id: 104, title: 'Build settings form & validation', is_completed: false, position: 2 },
    ],
  },
  {
    id: 105,
    project_id: 1,
    project_name: 'General Manager Task',
    project_color: '#3b82f6',
    title: 'Finalize Q4 Strategic Plan & Product Catalog',
    description: 'Consolidate all Vertex product & service lines for executive sign-off.',
    status: 'completed',
    priority: 'medium',
    category: 'Work',
    due_date: '2026-11-19',
    recurrence: 'none',
    estimated_minutes: 60,
    comments_count: 4,
    tags: [],
    subtasks: [
      { id: 11, task_id: 105, title: 'Collect department updates', is_completed: true, position: 1 },
      { id: 12, task_id: 105, title: 'Export final PDF summary', is_completed: true, position: 2 },
    ],
  },
];
