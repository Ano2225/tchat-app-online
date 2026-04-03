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

const severityStyles: Record<ErrorSeverity, {
  icon: React.ElementType
  bg: string
  border: string
  text: string
  iconColor: string
  titleColor: string
}> = {
  error: {
    icon: XCircle,
    bg: 'rgba(239,68,68,0.08)',
    border: 'rgba(239,68,68,0.3)',
    text: 'var(--danger)',
    iconColor: 'var(--danger)',
    titleColor: 'var(--danger)',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'rgba(245,158,11,0.08)',
    border: 'rgba(245,158,11,0.3)',
    text: 'var(--amber)',
    iconColor: 'var(--amber)',
    titleColor: 'var(--amber)',
  },
  info: {
    icon: Info,
    bg: 'var(--accent-dim)',
    border: 'var(--accent)',
    text: 'var(--text-secondary)',
    iconColor: 'var(--accent)',
    titleColor: 'var(--accent-text)',
  },
  success: {
    icon: AlertCircle,
    bg: 'rgba(34,197,94,0.08)',
    border: 'rgba(34,197,94,0.3)',
    text: 'var(--online)',
    iconColor: 'var(--online)',
    titleColor: 'var(--online)',
  },
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
  duration = 5000,
}) => {
  const [isVisible, setIsVisible] = React.useState(true)

  const handleClose = React.useCallback(() => {
    setIsVisible(false)
    setTimeout(() => { onClose?.() }, 300)
  }, [onClose])

  React.useEffect(() => {
    if (autoClose && duration > 0) {
      const timer = setTimeout(handleClose, duration)
      return () => clearTimeout(timer)
    }
  }, [autoClose, duration, handleClose])

  const s = severityStyles[severity]
  const Icon = s.icon

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className={`rounded-xl p-4 ${className}`}
          style={{ background: s.bg, border: `1px solid ${s.border}` }}
          role="alert"
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0" style={{ color: s.iconColor }}>
              <Icon className="w-5 h-5" />
            </div>

            <div className="flex-1 min-w-0">
              {title && (
                <h3 className="text-sm font-semibold mb-1" style={{ color: s.titleColor }}>
                  {title}
                </h3>
              )}
              <p className="text-sm" style={{ color: s.text }}>
                {message}
              </p>

              {onRetry && (
                <button
                  onClick={onRetry}
                  className="mt-3 text-sm font-medium hover:underline focus:outline-none"
                  style={{ color: s.iconColor }}
                >
                  {retryText}
                </button>
              )}
            </div>

            {dismissible && (
              <button
                onClick={handleClose}
                className="flex-shrink-0 transition-opacity hover:opacity-60"
                style={{ color: s.text }}
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
