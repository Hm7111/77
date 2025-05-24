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
  byCity?: Record<string, number>;
}

export type { Branch };