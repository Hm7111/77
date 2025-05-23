import { supabase } from '../../../lib/supabase';
import type { Template, TemplateZone } from '../../../types/database';

export async function getTemplates(isActive: boolean = true): Promise<Template[]> {
  const { data, error } = await supabase
    .from('letter_templates')
    .select('*')
    .eq('is_active', isActive)
    .order('name');

  if (error) throw error;
  return data || [];
}

export async function getTemplateById(id: string): Promise<Template> {
  const { data, error } = await supabase
    .from('letter_templates')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function getTemplateZones(templateId: string): Promise<TemplateZone[]> {
  const { data, error } = await supabase
    .from('template_zones')
    .select('*')
    .eq('template_id', templateId)
    .order('created_at');

  if (error) throw error;
  return data || [];
}

export default {
  getTemplates,
  getTemplateById,
  getTemplateZones
};