import React from 'react';
import { cn } from '../../lib/utils';

interface FormFieldProps {
  label?: string;
  name: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
  labelClassName?: string;
  description?: string;
  horizontal?: boolean;
}

/**
 * مكون حقل النموذج
 * يوفر تنسيقًا موحدًا لحقول النموذج مع التسمية ورسائل الخطأ
 */
export function FormField({
  label,
  name,
  error,
  required,
  children,
  className = '',
  labelClassName = '',
  description,
  horizontal = false
}: FormFieldProps) {
  const id = `field-${name}`;
  
  if (horizontal) {
    return (
      <div className={cn("flex flex-row items-start gap-4", className)}>
        {label && (
          <div className="w-1/3 pt-2">
            <label 
              htmlFor={id} 
              className={cn(
                "block text-sm font-medium text-gray-700 dark:text-gray-300",
                labelClassName
              )}
            >
              {label}
              {required && <span className="text-red-500 mr-1">*</span>}
            </label>
            {description && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {description}
              </p>
            )}
          </div>
        )}
        
        <div className="flex-1">
          {React.isValidElement(children)
            ? React.cloneElement(children as React.ReactElement, {
                id,
                name,
                'aria-invalid': error ? 'true' : 'false',
                'aria-describedby': error ? `${id}-error` : undefined,
              })
            : children}
            
          {error && (
            <p 
              id={`${id}-error`} 
              className="mt-1 text-xs text-red-500 dark:text-red-400"
            >
              {error}
            </p>
          )}
        </div>
      </div>
    );
  }
  
  return (
    <div className={className}>
      {label && (
        <label 
          htmlFor={id} 
          className={cn(
            "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1",
            labelClassName
          )}
        >
          {label}
          {required && <span className="text-red-500 mr-1">*</span>}
        </label>
      )}
      
      {description && (
        <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">
          {description}
        </p>
      )}
      
      {React.isValidElement(children)
        ? React.cloneElement(children as React.ReactElement, {
            id,
            name,
            'aria-invalid': error ? 'true' : 'false',
            'aria-describedby': error ? `${id}-error` : undefined,
          })
        : children}
        
      {error && (
        <p 
          id={`${id}-error`} 
          className="mt-1 text-xs text-red-500 dark:text-red-400"
        >
          {error}
        </p>
      )}
    </div>
  );
}