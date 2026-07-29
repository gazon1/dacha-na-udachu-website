"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { register } from "@/lib/auth";
import { useUserStore } from "@/stores/user";
import { PHONE_RE, TELEGRAM_RE } from "@/lib/validators";

const schema = z.object({
  name: z.string().min(1, "Введите имя").max(100),
  phone: z.string().regex(PHONE_RE, "Формат: +79... (11-15 цифр)"),
  telegram: z.string().regex(TELEGRAM_RE, "5-32 символа").optional().or(z.literal("")),
});

type FormData = z.infer<typeof schema>;

interface SaveAccountModalProps {
  onClose: () => void;
  onSaved: () => void;
}

export function SaveAccountModal({ onClose, onSaved }: SaveAccountModalProps) {
  const setIdentity = useUserStore((s) => s.setIdentity);
  const identity = useUserStore((s) => s.identity);
  const [loading, setLoading] = useState(false);

  const { register: reg, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: identity?.name ?? "",
      phone: identity?.phone ?? "",
      telegram: identity?.telegram ?? "",
    },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    const result = await register(data.name, data.phone);
    setLoading(false);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    setIdentity(result.name, result.phone, data.telegram ?? "", result.token);
    toast.success("Аккаунт сохранён! Теперь ваш голос не потеряется.");
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-surface-2 rounded-2xl p-6 w-full max-w-sm border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold">Сохранить аккаунт</h3>
          <button onClick={onClose} className="text-base-content/50 hover:text-white">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <p className="text-base-content/60 text-sm mb-4">
          Введите ваши данные — мы сохраним аккаунт, чтобы вы могли управлять голосом даже если куки сотрутся.
        </p>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div>
            <input {...reg("name")} placeholder="Ваше имя *" className="form-input text-sm w-full" />
            {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <input {...reg("phone")} placeholder="+79001234567" className="form-input text-sm w-full" />
            {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone.message}</p>}
          </div>
          <div>
            <input {...reg("telegram")} placeholder="@Telegram" className="form-input text-sm w-full" />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "..." : "Сохранить"}
          </button>
          <button type="button" onClick={onClose} className="btn-ghost w-full text-sm">
            Пропустить
          </button>
        </form>
      </div>
    </div>
  );
}
