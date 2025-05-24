import { Branch } from '../../../types/database';

export interface BranchFormData {
  name: string;
  city: string;
  code: string;
  is_active?: boolean;
}

export interface BranchFilters {
  search?: string;
  is_active?: boolean;
}

export interface BranchStats {
  total: number;
  active: number;
  userCount: number;
  byBranch?: Record<string, {
    total: number;
    active: number;
    admins: number;
  }>;
}

export type { Branch };