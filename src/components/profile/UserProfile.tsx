import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../hooks/useToast';
import { User, Eye, EyeOff, Save, UserCircle, Building } from 'lucide-react';
import { BranchSelector } from '../branches/BranchSelector';
import { SignatureUploader } from './SignatureUploader';

export function UserProfile() {
  const { dbUser } = useAuth();
  const { toast } = useToast();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  useEffect(() => {
    if (dbUser) {
      setFullName(dbUser.full_name);
      setEmail(dbUser.email);
    }
  }, [dbUser]);

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    
    if (!dbUser) {
      toast({
        title: 'خطأ',
        description: 'يجب تسجيل الدخول لتحديث الملف الشخصي',
        type: 'error'
      });
      return;
    }
    
    // التحقق من صحة البيانات
    if (newPassword && newPassword !== confirmPassword) {
      toast({
        title: 'خطأ',
        description: 'كلمة المرور الجديدة غير متطابقة مع التأكيد',
        type: 'error'
      });
      return;
    }
    
    setIsLoading(true);
    try {
      // تحديث بيانات المستخدم
      const updateData: any = {
        full_name: fullName,
        updated_at: new Date().toISOString()
      };
      
      const { error: updateError } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', dbUser.id);
        
      if (updateError) throw updateError;

      // تحديث كلمة المرور إذا تم تغييرها
      if (newPassword && currentPassword) {
        const { error: passwordError } = await supabase.auth.updateUser({
          password: newPassword
        });

        if (passwordError) throw passwordError;
        
        // إعادة تعيين حقول كلمة المرور
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
      
      toast({
        title: 'تم التحديث',
        description: 'تم تحديث الملف الشخصي بنجاح',
        type: 'success'
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء تحديث الملف الشخصي',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  }

  if (!dbUser) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">جارٍ تحميل الملف الشخصي...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* الملف الشخصي */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-900 rounded-lg border dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="p-5 border-b dark:border-gray-800">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <UserCircle className="h-5 w-5 text-primary" />
                المعلومات الشخصية
              </h3>
            </div>

            <form onSubmit={handleUpdateProfile} className="p-5 space-y-5">
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  الاسم الكامل
                </label>
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full p-2.5 rounded-lg border dark:border-gray-700 focus:ring-primary focus:border-primary"
                  required
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  البريد الإلكتروني
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  readOnly
                  className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                />
                <p className="text-xs text-gray-500 mt-1">
                  لا يمكن تغيير البريد الإلكتروني
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  الدور
                </label>
                <div className="flex items-center p-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
                  <span className={`text-sm px-3 py-1 rounded-full ${
                    dbUser.role === 'admin' 
                      ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                      : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  }`}>
                    {dbUser.role === 'admin' ? 'مدير' : 'مستخدم'}
                  </span>
                </div>
              </div>

              <div>
                <label htmlFor="branchId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  الفرع
                </label>
                <div className="flex items-center p-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
                  {dbUser.branch ? (
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-primary" />
                      <span className="text-gray-700 dark:text-gray-300">
                        {dbUser.branch.name} 
                        <span className="inline-block ml-2 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 rounded-full">
                          {dbUser.branch.code}
                        </span>
                      </span>
                    </div>
                  ) : (
                    <span className="text-gray-500">غير محدد</span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  لتغيير الفرع، يرجى التواصل مع المسؤول
                </p>
              </div>

              <div className="pt-5 border-t dark:border-gray-800">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">تغيير كلمة المرور</h4>
                
                <div className="space-y-3">
                  <div>
                    <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      كلمة المرور الحالية
                    </label>
                    <div className="relative">
                      <input
                        id="currentPassword"
                        type={showCurrentPassword ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-700 focus:ring-primary focus:border-primary pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3"
                      >
                        {showCurrentPassword ? (
                          <EyeOff className="h-5 w-5 text-gray-400" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      كلمة المرور الجديدة
                    </label>
                    <div className="relative">
                      <input
                        id="newPassword"
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-700 focus:ring-primary focus:border-primary pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3"
                      >
                        {showNewPassword ? (
                          <EyeOff className="h-5 w-5 text-gray-400" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      تأكيد كلمة المرور
                    </label>
                    <input
                      id="confirmPassword"
                      type={showNewPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-700 focus:ring-primary focus:border-primary"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg flex items-center gap-2 hover:bg-primary/90 transition"
                >
                  {isLoading ? (
                    <>
                      <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      <span>جارٍ الحفظ...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      <span>حفظ التغييرات</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* التوقيع الإلكتروني */}
        <div>
          <div className="bg-white dark:bg-gray-900 rounded-lg border dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="p-5 border-b dark:border-gray-800">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                  <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3"></path>
                </svg>
                التوقيع الإلكتروني
              </h3>
            </div>

            <div className="p-5">
              <SignatureUploader />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}