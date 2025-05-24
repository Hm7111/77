import { User, Branch, UserRole, Permission } from '../../../types/database';

export interface UserFormData {
  email: string;
  full_name: string;
  role: string;
  branch_id: string | null;
  password?: string;
  is_active?: boolean;
  permissions?: string[];
}

export interface UserFilters {
  search: string;
  branch_id?: string | null;
  role?: string;
  is_active?: boolean;
}

export interface UserStats {
  total: number;
  active: number;
  admins: number;
  users: number;
  byBranch?: Record<string, {
    total: number;
    active: number;
    admins: number;
  }>;
}

export type { User, Branch, UserRole, Permission };