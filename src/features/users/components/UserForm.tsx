import { useState, useEffect } from 'react';
import { User, Branch, UserRole } from '../types';
import { useFormValidation } from '../../../hooks/useFormValidation';
import { BranchSelector } from '../../../components/branches/BranchSelector';
import { Eye, EyeOff } from 'lucide-react';

interface UserFormProps {
  user?: User;
  onSubmit: (userData: any) => Promise<void>;
  isLoading: boolean;
  branches: Branch[];
  roles: UserRole[];
}

/**
 * نموذج إنشاء وتعديل المستخدم
 */
export function UserForm({ user, onSubmit, isLoading, branches, roles }: UserFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  
  // إعداد التحقق من صحة النموذج
  const {
    values,
    errors,
    handleChange,
    handleBlur,
    handleSubmit,
    setValue,
    resetForm
  } = useFormValidation(
    {
      email: user?.email || '',
      full_name: user?.full_name || '',
      role: user?.role || 'user',
      branch_id: user?.branch_id || null,
      password: '',
      is_active: user?.is_active !== false
    },
    {
      email: {
        required: 'البريد الإلكتروني مطلوب',
        pattern: [/\S+@\S+\.\S+/, 'البريد الإلكتروني غير صالح']
      },
      full_name: {
        required: 'الاسم الكامل مطلوب'
      },
      role: {
        required: 'الدور مطلوب'
      },
      branch_id: {
        required: 'الفرع مطلوب'
      },
      password: {
        required: user ? false : 'كلمة المرور مطلوبة',
        minLength: [6, 'كلمة المرور يجب ألا تقل عن 6 أحرف']
      }
    }
  );
  
  // إعادة تعيين النموذج عند تغيير المستخدم
  useEffect(() => {
    if (user) {
      resetForm({
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        branch_id: user.branch_id,
        password: '',
        is_active: user.is_active !== false
      });
    } else {
      resetForm({
        email: '',
        full_name: '',
        role: 'user',
        branch_id: null,
        password: '',
        is_active: true
      });
    }
  }, [user, resetForm]);
  
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">البريد الإلكتروني <span className="text-red-500">*</span></label>
        <input
          type="email"
          name="email"
          value={values.email}
          onChange={handleChange}
          onBlur={handleBlur}
          className={`w-full p-2 border rounded-lg ${
            errors.email ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
          }`}
          required
        />
        {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">الاسم الكامل <span className="text-red-500">*</span></label>
        <input
          type="text"
          name="full_name"
          value={values.full_name}
          onChange={handleChange}
          onBlur={handleBlur}
          className={`w-full p-2 border rounded-lg ${
            errors.full_name ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
          }`}
          required
        />
        {errors.full_name && <p className="text-red-500 text-xs mt-1">{errors.full_name}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">الفرع <span className="text-red-500">*</span></label>
        <BranchSelector 
          value={values.branch_id} 
          onChange={(value) => setValue('branch_id', value)}
          required
          error={errors.branch_id}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">الدور <span className="text-red-500">*</span></label>
        <select
          name="role"
          value={values.role}
          onChange={handleChange}
          onBlur={handleBlur}
          className={`w-full p-2 border rounded-lg ${
            errors.role ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
          }`}
          required
        >
          <option value="user">مستخدم</option>
          <option value="admin">مدير</option>
          {/* عرض الأدوار المخصصة من قاعدة البيانات */}
          {roles.filter(r => r.name !== 'مدير' && r.name !== 'مستخدم').map(roleItem => (
            <option key={roleItem.id} value={roleItem.name}>
              {roleItem.name} {roleItem.permissions?.length === 0 ? '(بدون صلاحيات)' : ''}
            </option>
          ))}
        </select>
        {errors.role && <p className="text-red-500 text-xs mt-1">{errors.role}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          {user ? 'كلمة المرور (اتركها فارغة إذا لم ترد تغييرها)' : 'كلمة المرور'} {!user && <span className="text-red-500">*</span>}
        </label>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            value={values.password}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`w-full p-2 border rounded-lg pr-10 ${
              errors.password ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
            }`}
            required={!user}
            minLength={6}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 flex items-center pr-3"
          >
            {showPassword ? (
              <EyeOff className="h-5 w-5 text-gray-400" />
            ) : (
              <Eye className="h-5 w-5 text-gray-400" />
            )}
          </button>
        </div>
        {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
      </div>
      
      <div className="flex items-center">
        <input
          type="checkbox"
          id="is-active"
          name="is_active"
          checked={values.is_active}
          onChange={(e) => setValue('is_active', e.target.checked)}
          className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
        />
        <label htmlFor="is-active" className="mr-2 block text-sm">
          حساب نشط
        </label>
      </div>

      <div className="flex justify-end gap-x-2 pt-4">
        <button
          type="submit"
          className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-70"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span>جارٍ الحفظ...</span>
            </>
          ) : (
            <span>حفظ</span>
          )}
        </button>
      </div>
    </form>
  );
}