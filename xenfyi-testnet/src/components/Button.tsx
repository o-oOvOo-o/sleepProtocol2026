import { forwardRef } from 'react';
import { clsx } from 'clsx';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, className, isLoading, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={clsx('btn', className)}
        disabled={isLoading || props.disabled}
        {...props}
      >
        {isLoading && <span className="loading loading-spinner"></span>}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
