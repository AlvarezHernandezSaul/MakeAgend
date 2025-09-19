import React from 'react';
import MakeAgendLogo from '../../assets/images/MakeAgend.png';
import MLogo from '../../assets/images/M.png';

interface LogoProps {
  variant?: 'full' | 'icon';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  opacity?: number;
}

export const Logo: React.FC<LogoProps> = ({ 
  variant = 'full', 
  size = 'md', 
  className = '', 
  opacity = 1 
}) => {
  const sizeClasses = {
    sm: 'h-6',
    md: 'h-8', 
    lg: 'h-10',
    xl: 'h-12'
  };

  const logoSrc = variant === 'full' ? MakeAgendLogo : MLogo;
  const alt = variant === 'full' ? 'MakeAgend' : 'M';
  
  const baseClasses = variant === 'full' ? 'w-auto' : 'w-8 h-8 rounded-lg';
  const opacityStyle = opacity !== 1 ? { opacity } : {};

  return (
    <img 
      src={logoSrc}
      alt={alt}
      className={`${sizeClasses[size]} ${baseClasses} ${className}`}
      style={opacityStyle}
    />
  );
};

export default Logo;
