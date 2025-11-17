'use client'

import React from 'react'

interface ModalSkeletonProps {
  showHeader?: boolean
  showFooter?: boolean
}

const ModalSkeleton: React.FC<ModalSkeletonProps> = ({ 
  showHeader = true, 
  showFooter = true 
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-4">
      {showHeader && (
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="skeleton h-6 w-32" />
            <div className="skeleton w-6 h-6 rounded" />
          </div>
        </div>
      )}
      
      <div className="p-6 space-y-4">
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-4 w-3/4" />
        <div className="skeleton h-4 w-1/2" />
        
        <div className="space-y-3 mt-6">
          <div className="skeleton h-10 w-full" />
          <div className="skeleton h-10 w-full" />
        </div>
      </div>
      
      {showFooter && (
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
          <div className="skeleton h-10 w-20" />
          <div className="skeleton h-10 w-24" />
        </div>
      )}
    </div>
  )
}

export default ModalSkeleton