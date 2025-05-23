import { supabase } from '../../../lib/supabase';
import { LetterContent } from '../types';
import { Letter } from '../../../types/database';

/**
 * إنشاء خطاب جديد
 */
export async function createLetter(letterData: {
  user_id: string;
  template_id: string;
  content: LetterContent;
  status?: 'draft' | 'completed';
  number?: number;
  year?: number;
  creator_name?: string;
  verification_url?: string;
}) {
  const { data, error } = await supabase
    .from('letters')
    .insert({
      user_id: letterData.user_id,
      template_id: letterData.template_id,
      content: letterData.content,
      status: letterData.status || 'draft',
      number: letterData.number,
      year: letterData.year,
      creator_name: letterData.creator_name,
      verification_url: letterData.verification_url
    })
    .select('*, letter_templates(*)')
    .single();

  if (error) throw error;
  return data as Letter;
}

/**
 * تحديث خطاب موجود
 */
export async function updateLetter(id: string, letterData: Partial<Letter>) {
  const { data, error } = await supabase
    .from('letters')
    .update(letterData)
    .eq('id', id)
    .select('*, letter_templates(*)')
    .single();

  if (error) throw error;
  return data as Letter;
}

/**
 * حذف خطاب
 */
export async function deleteLetter(id: string) {
  const { error } = await supabase
    .from('letters')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
}

/**
 * الحصول على خطاب بواسطة المعرف
 */
export async function getLetter(id: string) {
  const { data, error } = await supabase
    .from('letters')
    .select('*, letter_templates(*)')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as Letter;
}

/**
 * الحصول على جميع خطابات المستخدم
 */
export async function getUserLetters(userId: string, options?: {
  status?: 'draft' | 'completed';
  sortField?: 'created_at' | 'number';
  sortDirection?: 'asc' | 'desc';
}) {
  let query = supabase
    .from('letters')
    .select('*, letter_templates(*)')
    .eq('user_id', userId);
  
  // تطبيق فلتر الحالة إذا تم تحديده
  if (options?.status) {
    query = query.eq('status', options.status);
  }

  // تطبيق الترتيب
  const field = options?.sortField || 'created_at';
  const direction = options?.sortDirection || 'desc';
  query = query.order(field, { ascending: direction === 'asc' });

  const { data, error } = await query;

  if (error) throw error;
  return data as Letter[];
}

export default {
  createLetter,
  updateLetter,
  deleteLetter,
  getLetter,
  getUserLetters
};