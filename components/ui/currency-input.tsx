"use client";

// ============================================================
// 💰 CURRENCY INPUT — Input angka dengan format ribuan saat blur
// ============================================================
// Saat fokus: tampilkan angka mentah (bisa diketik)
// Saat blur: format dengan pemisah ribuan (1.000.000)
// Value disimpan sebagai string untuk kompatibilitas dengan React state
// ============================================================

import { Input } from "@/components/ui/input";
import { useState, useCallback, type InputHTMLAttributes } from "react";

interface CurrencyInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function CurrencyInput({
  value,
  onChange,
  placeholder = "1.000.000",
  className = "",
  ...props
}: CurrencyInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  const formatDisplay = (val: string): string => {
    if (!val) return "";
    const num = parseInt(val.replace(/\D/g, ""), 10);
    if (isNaN(num)) return "";
    return num.toLocaleString("id-ID");
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    onChange(raw);
  };

  const displayValue = isFocused
    ? value
    : formatDisplay(value);

  return (
    <Input
      type="text"
      inputMode="numeric"
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={placeholder}
      className={className}
      {...props}
    />
  );
}