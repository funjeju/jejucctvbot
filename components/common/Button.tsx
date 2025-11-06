
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
  size?: 'normal' | 'large';
  fullWidth?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'normal',
  fullWidth = false,
  ...props
}) => {
  const baseStyles = 'font-bold rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition duration-300 ease-in-out disabled:opacity-50';
  
  const variantStyles = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-400',
  };

  const sizeStyles = {
    normal: 'py-2 px-4 text-sm',
    large: 'py-3 px-6 text-base',
  };

  const widthStyles = fullWidth ? 'w-full' : '';

  const className = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${widthStyles} ${props.className || ''}`;

  return (
    <button {...props} className={className}>
      {children}
    </button>
  );
};

export default Button;
