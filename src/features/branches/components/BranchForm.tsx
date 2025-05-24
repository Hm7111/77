import { useState, useEffect } from 'react';
import { Branch } from '../types';
import { useFormValidation } from '../../../hooks/useFormValidation';

interface BranchFormProps {
  branch?: Branch;
  onSubmit: (branchData: any) => Promise<void>;
  isLoading: boolean;
}

/**
 * نموذج إنشاء وتعديل الفرع
 */
export function BranchForm({ branch, onSubmit, isLoading }: BranchFormProps) {
  // إعداد التحقق من صحة النموذج
  const {
    values,
    errors,
    handleChange,
    handleBlur,
    handleSubmit,
    resetForm
  } = useFormValidation(
    {
      name: branch?.name || '',
      city: branch?.city || '',
      code: branch?.code || '',
      is_active: branch?.is_active !== false
    },
    {
      name: {
        required: 'اسم الفرع مطلوب'
      },
      city: {
        required: 'اسم المدينة مطلوب'
      },
      code: {
        required: 'رمز الفرع مطلوب',
        minLength: [2, 'رمز الفرع يجب أن يكون من 2 إلى 5 أحرف'],
        maxLength: [5, 'رمز الفرع يجب أن يكون من 2 إلى 5 أحرف'],
        pattern: [/^[A-Za-z0-9]+$/, 'رمز الفرع يجب أن يحتوي على أحرف إنجليزية وأرقام فقط']
      }
    }
  );
  
  // إعادة تعيين النموذج عند تغيير الفرع
  useEffect(() => {
    if (branch) {
      resetForm({
        name: branch.name,
        city: branch.city,
        code: branch.code,
        is_active: branch.is_active !== false
      });
    } else {
      resetForm({
        name: '',
        city: '',
        code: '',
        is_active: true
      });
    }
  }, [branch, resetForm]);
  
  // تحويل رمز الفرع إلى أحرف كبيرة
  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    const event = {
      ...e,
      target: {
        ...e.target,
        name: 'code',
        value
      }
    };
    handleChange(event);
  };
  
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">اسم الفرع <span className="text-red-500">*</span></label>
        <input
          type="text"
          name="name"
          value={values.name}
          onChange={handleChange}
          onBlur={handleBlur}
          className={`w-full p-2 border rounded-lg ${
            errors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
          }`}
          placeholder="أدخل اسم الفرع"
          required
        />
        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">المدينة <span className="text-red-500">*</span></label>
        <input
          type="text"
          name="city"
          value={values.city}
          onChange={handleChange}
          onBlur={handleBlur}
          className={`w-full p-2 border rounded-lg ${
            errors.city ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
          }`}
          placeholder="أدخل اسم المدينة"
          required
        />
        {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">رمز الفرع <span className="text-red-500">*</span></label>
        <input
          type="text"
          name="code"
          value={values.code}
          onChange={handleCodeChange}
          onBlur={handleBlur}
          className={`w-full p-2 border rounded-lg ${
            errors.code ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
          }`}
          placeholder="مثال: RYD"
          maxLength={5}
          required
        />
        {errors.code && <p className="text-red-500 text-xs mt-1">{errors.code}</p>}
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          رمز الفرع يجب أن يكون من 2 إلى 5 أحرف إنجليزية أو أرقام (مثل RYD لفرع الرياض)
        </p>
      </div>
      
      <div className="flex items-center">
        <input
          type="checkbox"
          id="is-active"
          name="is_active"
          checked={values.is_active}
          onChange={(e) => {
            const event = {
              ...e,
              target: {
                ...e.target,
                name: 'is_active',
                value: e.target.checked
              }
            };
            handleChange(event);
          }}
          className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
        />
        <label htmlFor="is-active" className="mr-2 block text-sm">
          فرع مفعّل
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