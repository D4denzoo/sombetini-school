import * as React from 'react';
import { cn } from '@/lib/utils';

const inputClass =
  'flex h-11 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:border-brand-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50';

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, type, ...props }, ref) => (
  <input type={type} className={cn(inputClass, className)} ref={ref} {...props} />
));
Input.displayName = 'Input';

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => (
  <textarea className={cn(inputClass, 'h-auto min-h-[120px] py-3 leading-6', className)} ref={ref} {...props} />
));
Textarea.displayName = 'Textarea';

const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(({ className, children, ...props }, ref) => (
  <div className="relative">
    <select
      ref={ref}
      className={cn(inputClass, 'appearance-none pr-10', className)}
      {...props}
    >
      {children}
    </select>
    <svg aria-hidden viewBox="0 0 20 20" className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground">
      <path d="M6 8l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </div>
));
Select.displayName = 'Select';

function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn('mb-1.5 block text-sm font-medium text-foreground', className)} {...props} />;
}

function Field({ label, htmlFor, hint, children, className }: { label: string; htmlFor: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export { Input, Textarea, Select, Label, Field, inputClass };
