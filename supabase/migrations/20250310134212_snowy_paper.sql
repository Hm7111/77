/*
  # إنشاء حساب المستخدم الأول

  1. المستخدم
    - إنشاء حساب مستخدم جديد باستخدام البريد الإلكتروني وكلمة المرور المقدمة
    - تعيين دور المستخدم كمسؤول
*/

-- إنشاء المستخدم الأول
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
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
  'csi1ksa@gmail.com',
  crypt('Hm711473683@', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"role":"admin"}',
  now(),
  now(),
  '',
  '',
  '',
  ''
);