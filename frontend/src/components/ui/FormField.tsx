'use client'

import React from 'react'
import { AlertCircle } from 'lucide-react'

interface FormFieldProps {
  label: string
  name: string
  type?: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  error?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  icon?: React.ReactNode
  helperText?: string
  className?: string
  inputClassName?: string
}

const FormField: React.FC<FormFieldProps> = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  error,
  placeholder,
  required = false,
  disabled = false,
  icon,
  helperText,
  className = '',
  inputClassName = ''
}) => {
  const hasError = !!error

  return (
    <div className={`space-y-2 ${className}`}>
      <label 
        htmlFor={name}
        className="block text-sm font-medium text-gray-700 dark:text-gray-200"
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            {icon}
          </div>
        )}
        
        <input
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className={`
            w-full 
            ${icon ? 'pl-10' : 'pl-4'} 
            pr-4 py-3 
            bg-gray-50 dark:bg-white/10 
            border 
            ${hasError 
              ? 'border-red-500 dark:border-red-400 focus:ring-red-500' 
              : 'border-gray-300 dark:border-white/20 focus:ring-primary-500'
            }
            rounded-xl 
            text-gray-900 dark:text-white 
            placeholder-gray-500 dark:placeholder-gray-400 
            focus:outline-none 
            focus:ring-2 
            transition-all
            disabled:opacity-50 
            disabled:cursor-not-allowed
            ${inputClassName}
          `}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${name}-error` : helperText ? `${name}-helper` : undefined}
        />
      </div>

      {hasError && (
        <div 
          id={`${name}-error`}
          className="flex items-center gap-1 text-sm text-red-600 dark:text-red-400 animate-fade-in"
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!hasError && helperText && (
        <p 
          id={`${name}-helper`}
          className="text-sm text-gray-500 dark:text-gray-400"
        >
          {helperText}
        </p>
      )}
    </div>
  )
}

export default FormField

