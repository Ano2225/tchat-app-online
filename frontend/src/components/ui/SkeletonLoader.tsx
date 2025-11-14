import type { FC } from 'react';

interface SkeletonLoaderProps {
  variant?: 'text' | 'circle' | 'rectangle' | 'message' | 'channel' | 'user';
  className?: string;
  count?: number;
}

const SkeletonLoader: FC<SkeletonLoaderProps> = ({ 
  variant = 'rectangle', 
  className = '',
  count = 1 
}) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'text':
        return 'h-4 w-full rounded';
      case 'circle':
        return 'h-10 w-10 rounded-full';
      case 'rectangle':
        return 'h-20 w-full rounded-lg';
      case 'message':
        return 'h-16 w-full rounded-lg';
      case 'channel':
        return 'h-14 w-full rounded-lg';
      case 'user':
        return 'h-12 w-full rounded-lg';
      default:
        return 'h-20 w-full rounded-lg';
    }
  };

  const items = Array.from({ length: count }, (_, i) => i);

  return (
    <>
      {items.map((i) => (
        <div
          key={i}
          className={`skeleton ${getVariantClasses()} ${className}`}
          role="status"
          aria-label="Loading..."
        />
      ))}
    </>
  );
};

export default SkeletonLoader;