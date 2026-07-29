"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { useBookingStore } from "@/stores/booking";
import { useUserStore } from "@/stores/user";
import { submitBooking } from "@/lib/booking";
import { PHONE_RE, TELEGRAM_RE } from "@/lib/validators";

const schema = z.object({
  name: z.string().min(1, "Введите имя").max(100),
  phone: z.string().regex(PHONE_RE, "Формат: +79... (11-15 цифр)"),
  telegram: z.string().regex(TELEGRAM_RE, "5-32 символа, буквы, цифры, _").optional().or(z.literal("")),
  guest_num: z.number().min(1).max(8),
});

type FormData = z.infer<typeof schema>;

const EXTRA_OPTIONS = [
  { key: "banya", label: "Баня", price: 500 },
  { key: "manhal", label: "Мангал", price: 300 },
  { key: "fishing", label: "Рыбалка", price: 200 },
] as const;

export function BookingForm() {
  const store = useBookingStore();
  const { selectedHouse, checkIn, checkOut, quote } = store;
  const setIdentity = useUserStore((s) => s.setIdentity);
  const identity = useUserStore((s) => s.identity);
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      guest_num: 1,
      name: identity?.name ?? "",
      phone: identity?.phone ?? "",
      telegram: identity?.telegram ?? "",
    },
  });

  const onSubmit = async (data: FormData) => {
    if (!selectedHouse || !checkIn || !checkOut) return;
    setSubmitting(true);
    try {
      const result = await submitBooking({
        house: selectedHouse.id,
        check_in: checkIn,
        check_out: checkOut,
        name: data.name,
        phone: data.phone,
        telegram: data.telegram,
        guest_num: data.guest_num,
        options: store.options,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        // Save identity for reuse across forms
        setIdentity(data.name, data.phone, data.telegram ?? "");
        toast.success("Заявка отправлена! Мы свяжемся с вами.");
        store.reset();
        router.push("/booking/?submitted=1");
      }
    } catch {
      toast.error("Ошибка сети.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-white">Данные для бронирования</h2>
          {quote && (
            <p className="text-base-content/60 text-sm">
              {quote.nights} ночей ·{" "}
              <span className="text-primary font-semibold">{quote.total.toLocaleString("ru-RU")} ₽</span>
            </p>
          )}
        </div>
        <button
          onClick={() => store.setStep("dates")}
          className="text-base-content/60 hover:text-white transition-colors text-sm flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Назад
        </button>
      </div>

      {/* Summary */}
      {quote && (
        <div className="glass-card mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-base-content/70">{quote.nights} ночей × {quote.price_per_night.toLocaleString("ru-RU")} ₽</span>
            <span>{quote.subtotal.toLocaleString("ru-RU")} ₽</span>
          </div>
          {quote.extras_total > 0 && (
            <div className="flex justify-between items-center mb-2">
              <span className="text-base-content/70">Доп. опции</span>
              <span>{quote.extras_total.toLocaleString("ru-RU")} ₽</span>
            </div>
          )}
          <div className="flex justify-between items-center pt-2 border-t border-white/10">
            <span className="font-semibold text-white">Итого</span>
            <span className="text-2xl font-bold text-primary">{quote.total.toLocaleString("ru-RU")} ₽</span>
          </div>
        </div>
      )}

      {/* Extras */}
      <div className="glass-card mb-6">
        <h3 className="text-white font-medium mb-3">Дополнительные услуги</h3>
        <div className="space-y-2">
          {EXTRA_OPTIONS.map((opt) => (
            <label key={opt.key} className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={store.options[opt.key]}
                onChange={() => store.toggleOption(opt.key)}
                className="w-5 h-5 rounded border-white/20 bg-surface-2 accent-primary cursor-pointer"
              />
              <span className="text-white">{opt.label}</span>
              <span className="text-base-content/50 text-sm ml-auto">+{opt.price} ₽</span>
            </label>
          ))}
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5 text-base-content/70">Ваше имя</label>
          <input {...register("name")} placeholder="Иван" className="form-input" />
          {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5 text-base-content/70">Телефон</label>
          <input {...register("phone")} type="tel" placeholder="+79001234567" className="form-input" />
          {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5 text-base-content/70">Telegram (необязательно)</label>
          <input {...register("telegram")} placeholder="@username" className="form-input" />
          {errors.telegram && <p className="text-red-400 text-xs mt-1">{errors.telegram.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5 text-base-content/70">Гостей</label>
          <select {...register("guest_num", { valueAsNumber: true })} className="form-select">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          {errors.guest_num && <p className="text-red-400 text-xs mt-1">{errors.guest_num.message}</p>}
        </div>

        <button type="submit" disabled={submitting} className="btn-submit mt-6">
          {submitting ? "Отправка..." : "Отправить заявку"}
        </button>
      </form>
    </div>
  );
}
