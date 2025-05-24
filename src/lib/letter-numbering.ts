/**
 * نظام ترقيم الخطابات المركب حسب الفرع
 * يوفر هذا النظام ترقيماً فريداً لكل خطاب بناءً على الفرع والسنة
 */

import { supabase } from './supabase';
import { useAuth } from './auth';
import { useToast } from '../hooks/useToast';

/**
 * الحصول على رمز الفرع للمستخدم الحالي
 * @returns رمز الفرع
 */
export async function getBranchCode(): Promise<string> {
  try {
    // الحصول على بيانات المستخدم الحالي
    const { data: user } = await supabase.auth.getUser();
    
    if (!user.user?.id) {
      throw new Error('لم يتم العثور على المستخدم');
    }
    
    // الحصول على بيانات الفرع للمستخدم
    const { data, error } = await supabase
      .from('users')
      .select('branch_id, branches:branch_id(code, name)')
      .eq('id', user.user.id)
      .single();
    
    if (error) throw error;
    
    // استخدام رمز الفرع أو قيمة افتراضية
    if (data.branches && data.branches.code) {
      console.log('Found branch code:', data.branches.code);
      return data.branches.code;
    } else {
      console.log('No branch found, using default GEN');
      return 'GEN'; // GEN = عام (General)
    }
  } catch (error) {
    console.error('Error getting branch code:', error);
    return 'GEN'; // قيمة افتراضية في حالة الخطأ
  }
}

/**
 * الحصول على الرقم التسلسلي التالي للخطاب
 * @param branchCode رمز الفرع
 * @param year السنة
 * @returns الرقم التسلسلي التالي
 */
export async function getNextLetterNumber(branchCode: string, year: number): Promise<number> {
  try {
    // البحث عن أعلى رقم للفرع والسنة المحددين
    const { data, error } = await supabase
      .from('letters')
      .select('number, branch_code')
      .eq('branch_code', branchCode)
      .eq('year', year)
      .order('number', { ascending: false })
      .limit(1);
    
    if (error) throw error;
    
    // إذا لم يتم العثور على خطابات، ابدأ من 1
    const nextNum = data && data.length > 0 ? data[0].number + 1 : 1;
    
    return nextNum;
  } catch (error) {
    console.error('Error getting next letter number:', error);
    return 1; // ابدأ من 1 في حالة الخطأ
  }
}

/**
 * توليد مرجع فريد للخطاب
 * @param branchCode رمز الفرع
 * @param number الرقم التسلسلي
 * @param year السنة
 * @returns مرجع الخطاب المركب
 */
export function generateLetterReference(branchCode: string, number: number, year: number): string {
  return `${branchCode}-${number}/${year}`;
}

/**
 * هوك React للحصول على الرقم التالي للخطاب
 */
export function useNextLetterNumber() {
  const { toast } = useToast();
  const { dbUser } = useAuth();
  
  /**
   * الحصول على الرقم التالي للخطاب
   */
  async function loadNextNumber(): Promise<{
    branchCode: string;
    number: number;
    year: number;
    reference: string;
  }> {
    try {
      const currentYear = new Date().getFullYear();
      
      // الحصول على رمز الفرع
      let branchCode = 'GEN'; // افتراضي
      
      // إذا كان المستخدم متصل بفرع، استخدم رمز ذلك الفرع
      if (dbUser?.branch_id) {
        const { data } = await supabase
          .from('branches')
          .select('code')
          .eq('id', dbUser.branch_id)
          .single();
          
        if (data) {
          branchCode = data.code;
        }
      }
      
      // الحصول على الرقم التالي
      const nextNum = await getNextLetterNumber(branchCode, currentYear);
      
      // توليد المرجع المركب
      const reference = generateLetterReference(branchCode, nextNum, currentYear);
      
      return {
        branchCode,
        number: nextNum,
        year: currentYear,
        reference
      };
    } catch (error) {
      console.error('Error loading next number:', error);
      
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء تحميل رقم الخطاب التالي',
        type: 'warning'
      });
      
      // القيم الافتراضية في حالة الخطأ
      const currentYear = new Date().getFullYear();
      return {
        branchCode: 'GEN',
        number: 1,
        year: currentYear,
        reference: `GEN-1/${currentYear}`
      };
    }
  }
  
  return { loadNextNumber };
}