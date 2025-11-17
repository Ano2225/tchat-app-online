'use client'

import React from 'react'

interface UserListSkeletonProps {
  count?: number
}

const UserListSkeleton: React.FC<UserListSkeletonProps> = ({ count = 5 }) => {
  return (
    <div className="space-y-2 p-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center space-x-3 p-2 rounded-lg">
          <div className="skeleton w-8 h-8 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-1">
            <div className="skeleton h-4 w-24" />
            <div className="skeleton h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default UserListSkeleton