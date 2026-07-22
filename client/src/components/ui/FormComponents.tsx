import { forwardRef, type ReactNode, type InputHTMLAttributes, type SelectHTMLAttributes } from 'react';

/* ═══════════════════════════════════════════════════════
   shadcn/ui-inspired form components
   Clean, composable, accessible primitives
   ═══════════════════════════════════════════════════════ */

/* ─── FormField — wraps label + input + error ─── */
interface FormFieldProps {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

export function FormField({ label, error, hint, required, children, className }: FormFieldProps) {
  return (
    <label className={`field ${className ?? ''}`}>
      <span>
        {label}
        {required && <span style={{ color: 'var(--danger)', marginLeft: 2 }}>*</span>}
      </span>
      {children}
      {hint && !error && <span className="field-hint" style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{hint}</span>}
      {error && <span className="field-error" style={{ fontSize: 12 }}>{error}</span>}
    </label>
  );
}

/* ─── Input — styled text/number input ─── */
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, ...props }, ref) => {
    if (label) {
      return (
        <FormField label={label} error={error}>
          <input ref={ref} className={`input ${error ? 'input--error' : ''} ${className ?? ''}`} {...props} />
        </FormField>
      );
    }
    return <input ref={ref} className={`input ${error ? 'input--error' : ''} ${className ?? ''}`} {...props} />;
  }
);
Input.displayName = 'Input';

/* ─── Select — styled select dropdown ─── */
interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, className, children, ...props }, ref) => {
    if (label) {
      return (
        <FormField label={label} error={error}>
          <select ref={ref} className={`input ${error ? 'input--error' : ''} ${className ?? ''}`} {...props}>
            {children}
          </select>
        </FormField>
      );
    }
    return (
      <select ref={ref} className={`input ${error ? 'input--error' : ''} ${className ?? ''}`} {...props}>
        {children}
      </select>
    );
  }
);
Select.displayName = 'Select';

/* ─── Button variants ─── */
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: ReactNode;
}

export function Button({ variant = 'primary', size = 'md', loading, children, className, disabled, ...props }: ButtonProps) {
  const classes = [
    'btn',
    variant === 'primary' ? 'btn-primary' : variant === 'ghost' ? 'btn-ghost' : variant === 'danger' ? 'btn-danger' : 'btn-outline',
    size === 'sm' ? 'btn-sm' : size === 'lg' ? 'btn-lg' : '',
    className ?? '',
  ].filter(Boolean).join(' ');

  return (
    <button className={classes} disabled={disabled || loading} {...props}>
      {loading && <span className="btn-spinner" style={{ marginRight: 6 }} />}
      {children}
    </button>
  );
}

/* ─── Label — form label ─── */
interface LabelProps {
  children: ReactNode;
  required?: boolean;
  className?: string;
  htmlFor?: string;
}

export function Label({ children, required, className, htmlFor }: LabelProps) {
  return (
    <label htmlFor={htmlFor} className={className} style={{ fontSize: 'var(--fs-sm)', fontWeight: 500, color: 'var(--ink)', display: 'block', marginBottom: 4 }}>
      {children}
      {required && <span style={{ color: 'var(--danger)', marginLeft: 2 }}>*</span>}
    </label>
  );
}

/* ─── Badge — status/label badge ─── */
interface BadgeProps {
  variant?: 'ok' | 'warn' | 'danger' | 'neutral';
  dot?: boolean;
  children: ReactNode;
  className?: string;
}

export function Badge({ variant = 'neutral', dot, children, className }: BadgeProps) {
  return (
    <span className={`pill ${variant} ${className ?? ''}`}>
      {dot && <span className="dot" />}
      {children}
    </span>
  );
}
