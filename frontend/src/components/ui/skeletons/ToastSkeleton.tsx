'use client'

import React from 'react'

const ToastSkeleton: React.FC = () => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 max-w-sm w-full animate-slide-up">
      <div className="flex items-start space-x-3">
        <div className="skeleton w-6 h-6 rounded flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-4 w-32" />
          <div className="skeleton h-3 w-48" />
        </div>
        <div className="skeleton w-4 h-4 rounded flex-shrink-0" />
      </div>
    </div>
  )
}

export default ToastSkeleton