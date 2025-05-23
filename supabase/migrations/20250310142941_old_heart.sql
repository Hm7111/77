/*
  # إنشاء المستخدم الأول (المدير)

  1. التغييرات
    - إنشاء مستخدم مدير افتراضي
    - تعيين الصلاحيات الأساسية

  2. ملاحظات
    - يجب تغيير كلمة المرور بعد أول تسجيل دخول
    - البريد الإلكتروني: admin@example.com
    - كلمة المرور: Admin123!
*/

-- إنشاء المستخدم في جدول المصادقة
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@example.com',
  crypt('Admin123!', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"مدير النظام"}',
  now(),
  now(),
  '',
  '',
  '',
  ''
) ON CONFLICT DO NOTHING;

-- إضافة المستخدم إلى جدول المستخدمين
INSERT INTO public.users (
  id,
  email,
  full_name,
  role,
  is_active
) 
SELECT 
  id,
  email,
  raw_user_meta_data->>'full_name',
  'admin',
  true
FROM auth.users 
WHERE email = 'admin@example.com'
ON CONFLICT DO NOTHING;