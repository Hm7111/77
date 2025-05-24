import { useState, useEffect } from 'react';
import { User, Branch, UserRole } from '../types';
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
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('user');
  const [branchId, setBranchId] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // إعادة تعيين النموذج عند تغيير المستخدم
  useEffect(() => {
    if (user) {
      setEmail(user.email);
      setFullName(user.full_name);
      setRole(user.role);
      setBranchId(user.branch_id);
      setPassword('');
      setIsActive(user.is_active !== false);
    } else {
      setEmail('');
      setFullName('');
      setRole('user');
      setBranchId(null);
      setPassword('');
      setIsActive(true);
    }
  }, [user]);
  
  // التحقق من صحة النموذج
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!email) {
      newErrors.email = 'البريد الإلكتروني مطلوب';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'البريد الإلكتروني غير صالح';
    }
    
    if (!fullName) {
      newErrors.full_name = 'الاسم الكامل مطلوب';
    }
    
    if (!role) {
      newErrors.role = 'الدور مطلوب';
    }
    
    if (!branchId) {
      newErrors.branch_id = 'الفرع مطلوب';
    }
    
    if (!user && !password) {
      newErrors.password = 'كلمة المرور مطلوبة';
    } else if (password && password.length < 6) {
      newErrors.password = 'كلمة المرور يجب ألا تقل عن 6 أحرف';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // معالجة تقديم النموذج
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    const userData = {
      email,
      full_name: fullName,
      role,
      branch_id: branchId,
      password,
      is_active: isActive
    };
    
    onSubmit(userData);
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">البريد الإلكتروني <span className="text-red-500">*</span></label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
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
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
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
          value={branchId} 
          onChange={(value) => setBranchId(value)}
          required
          error={errors.branch_id}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">الدور <span className="text-red-500">*</span></label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
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
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
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