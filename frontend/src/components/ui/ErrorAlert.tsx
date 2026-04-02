'use client'

import React from 'react'
import { AlertCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export type ErrorSeverity = 'error' | 'warning' | 'info' | 'success'

interface ErrorAlertProps {
  message: string
  severity?: ErrorSeverity
  title?: string
  onClose?: () => void
  onRetry?: () => void
  retryText?: string
  className?: string
  dismissible?: boolean
  autoClose?: boolean
  duration?: number
}

const ErrorAlert: React.FC<ErrorAlertProps> = ({
  message,
  severity = 'error',
  title,
  onClose,
  onRetry,
  retryText = 'Réessayer',
  className = '',
  dismissible = true,
  autoClose = false,
  duration = 5000
}) => {
  const [isVisible, setIsVisible] = React.useState(true)

  const handleClose = React.useCallback(() => {
    setIsVisible(false)
    setTimeout(() => {
      onClose?.()
    }, 300)
  }, [onClose])

  React.useEffect(() => {
    if (autoClose && duration > 0) {
      const timer = setTimeout(() => {
        handleClose()
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [autoClose, duration, handleClose])

  const config = {
    error: {
      icon: XCircle,
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      borderColor: 'border-red-200 dark:border-red-800',
      textColor: 'text-red-800 dark:text-red-200',
      iconColor: 'text-red-500 dark:text-red-400',
      titleColor: 'text-red-900 dark:text-red-100'
    },
    warning: {
      icon: AlertTriangle,
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
      borderColor: 'border-yellow-200 dark:border-yellow-800',
      textColor: 'text-yellow-800 dark:text-yellow-200',
      iconColor: 'text-yellow-500 dark:text-yellow-400',
      titleColor: 'text-yellow-900 dark:text-yellow-100'
    },
    info: {
      icon: Info,
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      borderColor: 'border-blue-200 dark:border-blue-800',
      textColor: 'text-blue-800 dark:text-blue-200',
      iconColor: 'text-blue-500 dark:text-blue-400',
      titleColor: 'text-blue-900 dark:text-blue-100'
    },
    success: {
      icon: AlertCircle,
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      borderColor: 'border-green-200 dark:border-green-800',
      textColor: 'text-green-800 dark:text-green-200',
      iconColor: 'text-green-500 dark:text-green-400',
      titleColor: 'text-green-900 dark:text-green-100'
    }
  }

  const { icon: Icon, bgColor, borderColor, textColor, iconColor, titleColor } = config[severity]

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className={`${bgColor} ${borderColor} border rounded-xl p-4 ${className}`}
          role="alert"
        >
          <div className="flex items-start gap-3">
            <div className={`flex-shrink-0 ${iconColor}`}>
              <Icon className="w-5 h-5" />
            </div>
            
            <div className="flex-1 min-w-0">
              {title && (
                <h3 className={`text-sm font-semibold ${titleColor} mb-1`}>
                  {title}
                </h3>
              )}
              <p className={`text-sm ${textColor}`}>
                {message}
              </p>
              
              {onRetry && (
                <button
                  onClick={onRetry}
                  className={`mt-3 text-sm font-medium ${iconColor} hover:underline focus:outline-none`}
                >
                  {retryText}
                </button>
              )}
            </div>

            {dismissible && (
              <button
                onClick={handleClose}
                className={`flex-shrink-0 ${textColor} hover:${iconColor} transition-colors`}
                aria-label="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default ErrorAlert

