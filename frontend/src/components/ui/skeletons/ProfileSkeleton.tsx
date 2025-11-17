'use client'

import React from 'react'

const ProfileSkeleton: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center space-x-4">
        <div className="skeleton w-20 h-20 rounded-full" />
        <div className="space-y-2">
          <div className="skeleton h-6 w-32" />
          <div className="skeleton h-4 w-24" />
        </div>
      </div>
      
      <div className="space-y-4">
        <div className="skeleton h-5 w-20" />
        <div className="space-y-3">
          <div className="skeleton h-10 w-full" />
          <div className="skeleton h-10 w-full" />
          <div className="skeleton h-10 w-full" />
        </div>
      </div>
      
      <div className="flex space-x-3">
        <div className="skeleton h-10 w-24" />
        <div className="skeleton h-10 w-24" />
      </div>
    </div>
  )
}

export default ProfileSkeleton