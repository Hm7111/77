import { supabase } from '../../../lib/supabase';
import type { Template, TemplateZone } from '../../../types/database';

/**
 * الحصول على جميع القوالب
 */
export async function getTemplates(isActive: boolean = true) {
  const { data, error } = await supabase
    .from('letter_templates')
    .select('*')
    .eq('is_active', isActive)
    .order('name');

  if (error) throw error;
  return (data || []) as Template[];
}

/**
 * الحصول على قالب بواسطة المعرف
 */
export async function getTemplateById(id: string) {
  const { data, error } = await supabase
    .from('letter_templates')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as Template;
}

/**
 * الحصول على مناطق الكتابة في قالب
 */
export async function getTemplateZones(templateId: string) {
  const { data, error } = await supabase
    .from('template_zones')
    .select('*')
    .eq('template_id', templateId)
    .order('created_at');

  if (error) throw error;
  return (data || []) as TemplateZone[];
}

/**
 * إنشاء قالب جديد
 */
export async function createTemplate(template: Partial<Template>) {
  const { data, error } = await supabase
    .from('letter_templates')
    .insert(template)
    .select()
    .single();

  if (error) throw error;
  return data as Template;
}

/**
 * تحديث قالب موجود
 */
export async function updateTemplate(id: string, template: Partial<Template>) {
  const { data, error } = await supabase
    .from('letter_templates')
    .update(template)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Template;
}

/**
 * حذف قالب
 */
export async function deleteTemplate(id: string) {
  // الحذف الناعم (تحديث حالة is_deleted)
  const { error } = await supabase
    .from('letter_templates')
    .update({ is_deleted: true })
    .eq('id', id);

  if (error) throw error;
  return true;
}

export default {
  getTemplates,
  getTemplateById,
  getTemplateZones,
  createTemplate,
  updateTemplate,
  deleteTemplate
};