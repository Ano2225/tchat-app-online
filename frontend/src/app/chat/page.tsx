"use client"

import React from 'react'
import { useAuthStore } from '@/store/authStore'

const ChatPage = () => {
  const user = useAuthStore((state) => state.user );
  console.log(user)
  return (
    <div>
      <h1>hello {user ? user.username : 'Visiteur '}</h1>
    </div>
  )
}

export default ChatPage
