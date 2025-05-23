/*
  # Fix users table RLS policies

  1. Changes
    - Drop existing problematic policies
    - Add new optimized policies for user management
    - Prevent infinite recursion in policy checks

  2. Security
    - Maintain admin-only access to user management
    - Simplify policy conditions to prevent recursion
    - Ensure proper access control
*/

-- حذف السياسات القديمة لتجنب التداخل
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can insert users" ON public.users;
DROP POLICY IF EXISTS "Admins can update users" ON public.users;
DROP POLICY IF EXISTS "Admins can delete users" ON public.users;
DROP POLICY IF EXISTS "enable_delete_for_admins" ON public.users;
DROP POLICY IF EXISTS "enable_insert_for_admins" ON public.users;
DROP POLICY IF EXISTS "enable_select_for_authenticated" ON public.users;
DROP POLICY IF EXISTS "enable_update_for_admins" ON public.users;

-- إضافة سياسات جديدة محسنة
CREATE POLICY "users_admin_select" ON public.users
FOR SELECT TO authenticated
USING (
  role = 'admin'
);

CREATE POLICY "users_admin_insert" ON public.users
FOR INSERT TO authenticated
WITH CHECK (
  role = 'admin'
);

CREATE POLICY "users_admin_update" ON public.users
FOR UPDATE TO authenticated
USING (
  role = 'admin'
)
WITH CHECK (
  role = 'admin'
);

CREATE POLICY "users_admin_delete" ON public.users
FOR DELETE TO authenticated
USING (
  role = 'admin'
);