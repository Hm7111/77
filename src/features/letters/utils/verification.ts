import { supabase } from '../../../lib/supabase';

interface VerificationResult {
  isValid: boolean;
  letter?: {
    id: string;
    number: number;
    year: number;
    content: any;
    created_at: string;
    verification_url: string;
    creator_name?: string;
  };
  error?: string;
}

/**
 * التحقق من صحة خطاب بواسطة رمز التحقق
 */
export async function verifyLetter(verificationCode: string): Promise<VerificationResult> {
  try {
    // استدعاء دالة التحقق على قاعدة البيانات
    const { data, error } = await supabase
      .rpc('verify_letter', { verification_code: verificationCode })
      .single();

    if (error) throw error;
    
    if (!data) {
      return {
        isValid: false,
        error: 'لا يمكن التحقق من صحة هذا الخطاب'
      };
    }
    
    return {
      isValid: true,
      letter: {
        id: data.id,
        number: data.number,
        year: data.year,
        content: data.content,
        created_at: data.created_at,
        verification_url: data.verification_url,
        creator_name: data.creator_name
      }
    };
  } catch (error) {
    console.error('Verification error:', error);
    
    return {
      isValid: false,
      error: 'حدث خطأ أثناء التحقق من الخطاب'
    };
  }
}

export default {
  verifyLetter
};