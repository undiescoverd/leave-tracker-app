import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { memo } from 'react';

interface OptimizedAvatarProps {
  src?: string;
  alt?: string;
  fallback?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const OptimizedAvatar = memo(function OptimizedAvatar({
  src,
  alt = 'Avatar',
  fallback,
  size = 'md',
  className = '',
}: OptimizedAvatarProps) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
    xl: 'h-24 w-24',
  };

  const imageSizes = {
    sm: 32,
    md: 48,
    lg: 64,
    xl: 96,
  };

  return (
    <Avatar className={`${sizeClasses[size]} ${className}`}>
      {src ? (
        <AvatarImage 
          src={src} 
          alt={alt}
          asChild
        >
          <Image
            src={src}
            alt={alt}
            width={imageSizes[size]}
            height={imageSizes[size]}
            className="object-cover"
            sizes={`${imageSizes[size]}px`}
            priority={false}
            placeholder="blur"
            blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
          />
        </AvatarImage>
      ) : null}
      <AvatarFallback className="text-sm font-medium">
        {fallback || 'U'}
      </AvatarFallback>
    </Avatar>
  );
});

export default OptimizedAvatar;
