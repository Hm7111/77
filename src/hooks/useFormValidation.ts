import { useState, useCallback } from 'react';

export type ValidationRules<T> = {
  [K in keyof T]?: {
    required?: boolean | string;
    minLength?: [number, string];
    maxLength?: [number, string];
    pattern?: [RegExp, string];
    custom?: [(value: any) => boolean, string];
    validate?: (value: any, formValues: T) => string | null;
  };
};

export type ValidationErrors<T> = {
  [K in keyof T]?: string;
};

/**
 * هوك مخصص للتحقق من صحة النماذج
 * يوفر وظائف للتحقق من صحة الحقول وإدارة أخطاء التحقق
 */
export function useFormValidation<T extends Record<string, any>>(
  initialValues: T,
  validationRules: ValidationRules<T>
) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<ValidationErrors<T>>({});
  const [touched, setTouched] = useState<Record<keyof T, boolean>>({} as Record<keyof T, boolean>);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * التحقق من صحة حقل واحد
   */
  const validateField = useCallback(
    (name: keyof T, value: any): string | null => {
      const rules = validationRules[name];
      if (!rules) return null;

      // التحقق من الحقل المطلوب
      if (rules.required) {
        const isEmptyValue = value === undefined || value === null || value === '';
        if (isEmptyValue) {
          return typeof rules.required === 'string'
            ? rules.required
            : 'هذا الحقل مطلوب';
        }
      }

      // التحقق من الحد الأدنى للطول
      if (rules.minLength && value?.length < rules.minLength[0]) {
        return rules.minLength[1];
      }

      // التحقق من الحد الأقصى للطول
      if (rules.maxLength && value?.length > rules.maxLength[0]) {
        return rules.maxLength[1];
      }

      // التحقق من النمط
      if (rules.pattern && !rules.pattern[0].test(value)) {
        return rules.pattern[1];
      }

      // التحقق المخصص
      if (rules.custom && !rules.custom[0](value)) {
        return rules.custom[1];
      }

      // دالة التحقق المخصصة
      if (rules.validate) {
        const error = rules.validate(value, values);
        if (error) return error;
      }

      return null;
    },
    [validationRules, values]
  );

  /**
   * التحقق من صحة جميع الحقول
   */
  const validateForm = useCallback((): boolean => {
    const newErrors: ValidationErrors<T> = {};
    let isValid = true;

    // التحقق من كل حقل
    Object.keys(validationRules).forEach((key) => {
      const fieldName = key as keyof T;
      const error = validateField(fieldName, values[fieldName]);
      
      if (error) {
        newErrors[fieldName] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [validateField, validationRules, values]);

  /**
   * معالجة تغيير قيمة الحقل
   */
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement> | { target: { name: string; value: any } }) => {
      const { name, value, type } = e.target;
      const fieldName = name as keyof T;
      
      // معالجة خاصة لحقول الاختيار
      const newValue = type === 'checkbox' && e instanceof Event
        ? (e.target as HTMLInputElement).checked
        : value;
      
      setValues((prev) => ({
        ...prev,
        [fieldName]: newValue,
      }));
      
      // تحديث حالة اللمس
      if (!touched[fieldName]) {
        setTouched((prev) => ({
          ...prev,
          [fieldName]: true,
        }));
      }
      
      // التحقق من صحة الحقل عند التغيير
      const error = validateField(fieldName, newValue);
      setErrors((prev) => ({
        ...prev,
        [fieldName]: error,
      }));
    },
    [touched, validateField]
  );

  /**
   * تعيين قيمة حقل برمجياً
   */
  const setValue = useCallback(
    (name: keyof T, value: any, shouldValidate = true) => {
      setValues((prev) => ({
        ...prev,
        [name]: value,
      }));
      
      if (shouldValidate) {
        const error = validateField(name, value);
        setErrors((prev) => ({
          ...prev,
          [name]: error,
        }));
      }
    },
    [validateField]
  );

  /**
   * معالجة فقدان التركيز للحقل
   */
  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const { name } = e.target;
      const fieldName = name as keyof T;
      
      // تحديث حالة اللمس
      setTouched((prev) => ({
        ...prev,
        [fieldName]: true,
      }));
      
      // التحقق من صحة الحقل عند فقدان التركيز
      const error = validateField(fieldName, values[fieldName]);
      setErrors((prev) => ({
        ...prev,
        [fieldName]: error,
      }));
    },
    [validateField, values]
  );

  /**
   * معالجة تقديم النموذج
   */
  const handleSubmit = useCallback(
    (onSubmit: (values: T) => void | Promise<void>) => async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
      
      // التحقق من صحة جميع الحقول
      const isValid = validateForm();
      
      // تحديث حالة اللمس لجميع الحقول
      const allTouched = Object.keys(validationRules).reduce(
        (acc, key) => ({
          ...acc,
          [key]: true,
        }),
        {} as Record<keyof T, boolean>
      );
      
      setTouched(allTouched);
      
      if (isValid) {
        try {
          await onSubmit(values);
        } catch (error) {
          console.error('Form submission error:', error);
        }
      }
      
      setIsSubmitting(false);
    },
    [validateForm, validationRules, values]
  );

  /**
   * إعادة تعيين النموذج
   */
  const resetForm = useCallback(
    (newValues = initialValues) => {
      setValues(newValues);
      setErrors({});
      setTouched({} as Record<keyof T, boolean>);
      setIsSubmitting(false);
    },
    [initialValues]
  );

  return {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    setValue,
    validateForm,
    resetForm,
    setValues
  };
}