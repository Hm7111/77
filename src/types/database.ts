export interface Template {
  id: string
  name: string
  description: string | null
  image_url: string
  is_active: boolean
  category_id: string | null
  variables: Array<{
    name: string
    value: string
  }>
  zones: Array<{
    name: string
    x: number
    y: number
    width: number
    height: number
    fontSize?: number
    fontFamily?: string
    alignment?: 'right' | 'center' | 'left'
  }>
  parent_id: string | null
  version: number
  created_at: string
  updated_at: string
  is_deleted?: boolean
  qr_position?: {
    x: number
    y: number
    size: number
    alignment: 'right' | 'center' | 'left'
  }
}

export interface TemplateCategory {
  id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

export interface TemplateZone {
  id: string
  template_id: string
  name: string
  x: number
  y: number
  width: number
  height: number
  font_size: number
  font_family: string
  alignment: string
  created_at: string
}

export interface TemplateVariable {
  id: string
  name: string
  description: string | null
  default_value: string | null
  type: string
  created_at: string
}

export interface Branch {
  id: string
  name: string
  city: string
  code: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// Permissions interface
export interface Permission {
  id: string
  name: string
  description: string
  code: string
  created_at: string
}

// User role with permissions
export interface UserRole {
  id: string
  name: string
  description: string
  permissions: string[] // Permission IDs
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  email: string
  full_name: string
  role: 'admin' | 'user'
  is_active: boolean
  created_at: string
  branch_id?: string | null
  branch?: Branch | null
  permissions?: string[] // Custom permissions for this user
  branches?: Branch // For expanded branch data
  updated_at?: string
}

export interface Letter {
  id: string
  user_id: string
  template_id: string | null
  template_snapshot?: {
    id: string
    name: string
    image_url: string
    variables?: Array<{
      name: string
      value: string
    }>
    zones?: Array<{
      name: string
      x: number
      y: number
      width: number
      height: number
      fontSize?: number
      fontFamily?: string
      alignment?: string
    }>
    qr_position?: {
      x: number
      y: number
      size: number
      alignment: string
    }
    version?: number
  }
  content: Record<string, any>
  status: 'draft' | 'completed'
  number: number
  year: number
  branch_code?: string // رمز الفرع
  letter_reference?: string // مرجع الخطاب المركب
  last_saved: string
  local_id: string | null
  sync_status: 'pending' | 'synced' | 'failed'
  verification_url?: string
  qr_data?: Record<string, any>
  created_at: string
  updated_at: string
  creator_name?: string
  letter_templates?: Template
  workflow_status?: WorkflowState
  approval_id?: string
  signature_id?: string
}

// New interface for audit logs
export interface AuditLog {
  id: string
  action_type: 'create' | 'update' | 'delete' | 'view'
  target_type: 'letter' | 'template' | 'user' | 'system'
  target_id: string | null
  summary: string
  details: Record<string, any>
  performed_by: string | null
  performed_at: string
  user_name: string | null
  user_role: string | null
}

// Enum for workflow states
export type WorkflowState = 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'finalized'

// Interface for signatures
export interface Signature {
  id: string
  user_id: string
  signature_url: string
  created_at: string
  updated_at: string
}

// Interface for approval requests
export interface ApprovalRequest {
  id: string
  letter_id: string
  requested_by: string
  assigned_to: string
  status: WorkflowState
  comments?: string
  created_at: string
  updated_at: string
  due_date?: string
  approved_at?: string
  rejected_at?: string
  rejection_reason?: string
}

// Interface for approval logs
export interface ApprovalLog {
  id: string
  request_id: string
  letter_id: string
  user_id: string
  action: string
  status: WorkflowState
  previous_status?: WorkflowState
  comments?: string
  created_at: string
}

export interface Database {
  public: {
    Tables: {
      letter_templates: {
        Row: Template
        Insert: Omit<Template, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Template, 'id' | 'created_at' | 'updated_at'>>
      }
      users: {
        Row: User
        Insert: Omit<User, 'id' | 'created_at'>
        Update: Partial<Omit<User, 'id' | 'created_at'>>
      }
      letters: {
        Row: Letter
        Insert: Omit<Letter, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Letter, 'id' | 'created_at' | 'updated_at'>>
      }
      branches: {
        Row: Branch
        Insert: Omit<Branch, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Branch, 'id' | 'created_at' | 'updated_at'>>
      }
      permissions: {
        Row: Permission
        Insert: Omit<Permission, 'id' | 'created_at'>
        Update: Partial<Omit<Permission, 'id' | 'created_at'>>
      }
      user_roles: {
        Row: UserRole
        Insert: Omit<UserRole, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<UserRole, 'id' | 'created_at' | 'updated_at'>>
      }
      audit_logs: {
        Row: AuditLog
        Insert: Omit<AuditLog, 'id' | 'performed_at'>
        Update: Partial<Omit<AuditLog, 'id' | 'performed_at'>>
      }
      signatures: {
        Row: Signature
        Insert: Omit<Signature, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Signature, 'id' | 'created_at' | 'updated_at'>>
      }
      approval_requests: {
        Row: ApprovalRequest
        Insert: Omit<ApprovalRequest, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<ApprovalRequest, 'id' | 'created_at' | 'updated_at'>>
      }
      approval_logs: {
        Row: ApprovalLog
        Insert: Omit<ApprovalLog, 'id' | 'created_at'>
        Update: Partial<Omit<ApprovalLog, 'id' | 'created_at'>>
      }
    }
  }
}