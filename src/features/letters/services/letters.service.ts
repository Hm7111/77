import { supabase } from '../../../lib/supabase';
import { LetterDraft } from '../types/letters';
import type { Letter } from '../../../types/database';

export async function createLetter(draft: LetterDraft): Promise<Letter> {
  const { data, error } = await supabase
    .from('letters')
    .insert({
      user_id: draft.user_id,
      template_id: draft.template_id,
      content: draft.content,
      status: draft.status || 'completed',
      number: draft.number,
      year: draft.year,
      local_id: draft.local_id,
      sync_status: 'synced',
      creator_name: draft.creator_name,
      verification_url: draft.content.verification_url
    })
    .select('*, letter_templates(*)')
    .single();

  if (error) throw error;
  return data;
}

export async function updateLetter(letter: Partial<Letter>): Promise<Letter> {
  if (!letter.id) throw new Error('Letter ID is required for updates');
  
  const { data, error } = await supabase
    .from('letters')
    .update(letter)
    .eq('id', letter.id)
    .select('*, letter_templates(*)')
    .single();

  if (error) throw error;
  return data;
}

export async function deleteLetter(id: string): Promise<void> {
  const { error } = await supabase
    .from('letters')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function getLetter(id: string): Promise<Letter> {
  const { data, error } = await supabase
    .from('letters')
    .select('*, letter_templates(*)')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function getLetters(userId: string): Promise<Letter[]> {
  const { data, error } = await supabase
    .from('letters')
    .select('*, letter_templates(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export default {
  createLetter,
  updateLetter,
  deleteLetter,
  getLetter,
  getLetters
};