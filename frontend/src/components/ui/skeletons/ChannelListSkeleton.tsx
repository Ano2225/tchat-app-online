'use client'

import React from 'react'

interface ChannelListSkeletonProps {
  count?: number
}

const ChannelListSkeleton: React.FC<ChannelListSkeletonProps> = ({ count = 4 }) => {
  return (
    <div className="space-y-2 p-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center space-x-3 p-3 rounded-lg">
          <div className="skeleton w-5 h-5 flex-shrink-0" />
          <div className="flex-1 space-y-1">
            <div className="skeleton h-4 w-20" />
            <div className="skeleton h-3 w-32" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default ChannelListSkeleton