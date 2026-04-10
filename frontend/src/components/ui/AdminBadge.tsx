import React from 'react'
import { BadgeCheck } from 'lucide-react'

interface AdminBadgeProps {
  className?: string
  title?: string
}

const AdminBadge: React.FC<AdminBadgeProps> = ({
  className = '',
  title = 'Compte admin certifie',
}) => (
  <span className="inline-flex items-center" title={title} role="img" aria-label={title}>
    <BadgeCheck
      className={`w-3.5 h-3.5 ${className}`.trim()}
      style={{ color: 'var(--accent)' }}
    />
  </span>
)

export default AdminBadge
