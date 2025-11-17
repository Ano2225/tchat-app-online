'use client'

import React from 'react'

const AuthFormSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 p-6">
      <div className="text-center space-y-2">
        <div className="skeleton h-8 w-48 mx-auto" />
        <div className="skeleton h-4 w-64 mx-auto" />
      </div>
      
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="skeleton h-4 w-20" />
          <div className="skeleton h-12 w-full" />
        </div>
        <div className="space-y-2">
          <div className="skeleton h-4 w-24" />
          <div className="skeleton h-12 w-full" />
        </div>
        <div className="space-y-2">
          <div className="skeleton h-4 w-32" />
          <div className="skeleton h-12 w-full" />
        </div>
      </div>
      
      <div className="skeleton h-12 w-full" />
      
      <div className="text-center">
        <div className="skeleton h-4 w-40 mx-auto" />
      </div>
    </div>
  )
}

export default AuthFormSkeleton