import type { InputHTMLAttributes } from "react";
import type { FieldError } from "react-hook-form";

interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: FieldError;
}

export function FormInput({ label, error, className = "", ...props }: FormInputProps) {
  return (
    <div>
      {label && (
        <label className="text-base-content/60 text-sm mb-1 block">{label}</label>
      )}
      <input
        className={`form-input text-sm w-full ${error ? "border-error" : ""} ${className}`}
        {...props}
      />
      {error && (
        <p className="text-red-400 text-xs mt-1">{String(error.message)}</p>
      )}
    </div>
  );
}
