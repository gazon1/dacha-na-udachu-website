import { z } from "zod";

export const PHONE_RE = /^\+\d{11,15}$/;
export const TELEGRAM_RE = /^[a-zA-Z0-9_]{5,32}$/;

export const phoneSchema = z
  .string()
  .regex(PHONE_RE, "Формат: +79... (11-15 цифр)")
  .optional()
  .or(z.literal(""));

export const telegramSchema = z
  .string()
  .regex(TELEGRAM_RE, "5-32 символа, буквы, цифры, _")
  .optional()
  .or(z.literal(""));

export const nameSchema = z.string().min(1, "Введите имя").max(100);
