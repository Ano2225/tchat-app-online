'use client'

import React from 'react'

interface ChatSkeletonProps {
  count?: number
}

const ChatSkeleton: React.FC<ChatSkeletonProps> = ({ count = 3 }) => {
  return (
    <div className="space-y-4 p-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex space-x-3 animate-fade-in">
          <div className="skeleton w-10 h-10 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center space-x-2">
              <div className="skeleton h-4 w-20" />
              <div className="skeleton h-3 w-16" />
            </div>
            <div className="space-y-1">
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-4 w-3/4" />
              {i % 3 === 0 && <div className="skeleton h-4 w-1/2" />}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default ChatSkeleton