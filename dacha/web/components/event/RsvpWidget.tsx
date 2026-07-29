"use client";
import { cancelRSVP, fetchMyRSVP, submitRSVP, type RSVPState } from "@/lib/events";
import { useUserStore } from "@/stores/user";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";
import { TelegramLoginButton } from "@/components/auth/TelegramLoginButton";

const schema = z.object({
  name: z.string().min(1, "Введите имя").max(100),
  telegram: z.string().optional().or(z.literal("")),
  status: z.enum(["going", "maybe", "not_going"]),
  guests_count: z.number().int().min(0).max(10),
});

type FormData = z.infer<typeof schema>;

interface RsvpWidgetProps {
  eventId: number;
  rsvpCapacity: number | null;
  totalAttending: number;
}

export function RsvpWidget({ eventId, rsvpCapacity, totalAttending }: RsvpWidgetProps) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const identity = useUserStore((s) => s.identity);

  const { data: rsvp } = useQuery<RSVPState>({
    queryKey: ["rsvp", eventId],
    queryFn: () => fetchMyRSVP(eventId),
  });


  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      status: "going",
      guests_count: 0,
      name: identity?.telegram_first_name ?? "",
      telegram: identity?.telegram_username ?? "",
    },
  });

  const guestsCount = watch("guests_count");
  const currentStatus = watch("status");

  // Автозаполнение при изменении стора пользователя
  useEffect(() => {
    if (identity) {
      if (identity.telegram_first_name) setValue("name", identity.telegram_first_name);
      if (identity.telegram_username) setValue("telegram", identity.telegram_username);
    }
  }, [identity, setValue]);

  const voteMutation = useMutation({
    mutationFn: (data: FormData) => submitRSVP(eventId, data),
    onSuccess: (result) => {
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(
          result.status === "going" ? "Вы идёте! 🎉" :
            result.status === "maybe" ? "Возможно, увидимся!" : "Отмечено"
        );
        queryClient.invalidateQueries({ queryKey: ["rsvp", eventId] });
        queryClient.invalidateQueries({ queryKey: ["attendees", eventId] });
        queryClient.invalidateQueries({ queryKey: ["event", eventId] });
        setShowForm(false);
      }
    },
    onError: () => toast.error("Ошибка сети"),
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelRSVP(eventId),
    onSuccess: (result) => {
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("RSVP отменён");
        queryClient.invalidateQueries({ queryKey: ["rsvp", eventId] });
        queryClient.invalidateQueries({ queryKey: ["attendees", eventId] });
        queryClient.invalidateQueries({ queryKey: ["event", eventId] });
      }
    },
    onError: () => toast.error("Ошибка сети"),
  });

  // If not authenticated, show Telegram login prompt
  if (!identity) {
    return (
      <div className="glass-card space-y-3">
        <p className="text-base-content/70 text-sm text-center">
          Чтобы записаться, войдите через Telegram
        </p>
        <TelegramLoginButton
          botUsername={process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? ""}
          onAuth={() => {}}
        />
      </div>
    );
  }

  if (rsvp?.voted && rsvp.status) {
    return (
      <div className="glass-card flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-2xl">check_circle</span>
          <div>
            <p className="text-white font-medium">{rsvp.name}</p>
            <p className="text-base-content/50 text-xs">
              {rsvp.status === "going" ? "✨ Вы идёте" : rsvp.status === "maybe" ? "🤔 Возможно" : "❌ Не идёте"}
            </p>
          </div>
        </div>
        <button
          onClick={() => cancelMutation.mutate()}
          disabled={cancelMutation.isPending}
          className="btn-ghost text-xs py-1.5 px-3 h-auto"
        >
          {cancelMutation.isPending ? "..." : "Изменить"}
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        <button onClick={() => setShowForm(true)} className="btn-rsvp w-full shadow-lg hover:scale-[1.01] transition-transform">
          <span className="material-symbols-outlined text-lg">how_to_vote</span>
          Я пойду!
        </button>
        {rsvpCapacity && (
          <p className="text-center text-base-content/40 text-xs">
            {totalAttending} / {rsvpCapacity} записалось
          </p>
        )}
      </div>

      {showForm && (
        <div className="glass-card mt-3 animate-fadeIn space-y-4 border border-primary/20">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <h4 className="text-white font-medium text-sm">Подтверждение участия</h4>
            <button onClick={() => setShowForm(false)} className="text-base-content/40 hover:text-white">
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>

          <form onSubmit={handleSubmit((d) => voteMutation.mutate(d))} className="space-y-4">
            {/* Статусы (Иду / Возможно / Не иду) */}
            <div className="grid grid-cols-3 gap-1.5 bg-surface-2 p-1 rounded-xl">
              {(
                [
                  { id: "going", label: "Иду", icon: "check" },
                  { id: "maybe", label: "Может", icon: "help" },
                  { id: "not_going", label: "Не иду", icon: "close" },
                ] as const
              ).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setValue("status", s.id)}
                  className={`py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${currentStatus === s.id
                    ? "bg-primary text-white shadow-sm"
                    : "text-base-content/60 hover:text-white"
                    }`}
                >
                  <span className="material-symbols-outlined text-sm">{s.icon}</span>
                  {s.label}
                </button>
              ))}
            </div>

            {/* Имя */}
            <div>
              <input {...register("name")} placeholder="Ваше имя *" className="form-input text-sm" />
              {errors.name && <p className="text-red-400 text-xs mt-1 pl-1">{errors.name.message}</p>}
            </div>

            {/* Telegram */}
            <input {...register("telegram")} placeholder="@username" className="form-input text-sm" />

            {/* Удобный выбор гостей (Stepper вместо скучного инпута) */}
            <div className="flex items-center justify-between bg-surface-2/50 px-3 py-2 rounded-xl border border-white/5">
              <span className="text-xs text-base-content/70">Гостей с собой</span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setValue("guests_count", Math.max(0, guestsCount - 1))}
                  disabled={guestsCount <= 0}
                  className="w-7 h-7 rounded-lg bg-surface-3 flex items-center justify-center text-white disabled:opacity-30 hover:bg-surface-3/80"
                >
                  -
                </button>
                <span className="text-sm font-medium text-white w-4 text-center">{guestsCount}</span>
                <button
                  type="button"
                  onClick={() => setValue("guests_count", Math.min(10, guestsCount + 1))}
                  disabled={guestsCount >= 10}
                  className="w-7 h-7 rounded-lg bg-surface-3 flex items-center justify-center text-white disabled:opacity-30 hover:bg-surface-3/80"
                >
                  +
                </button>
              </div>
            </div>

            {/* Кнопки действий */}
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={voteMutation.isPending} className="btn-rsvp flex-1 text-sm py-2.5">
                {voteMutation.isPending ? "Сохранение..." : "Подтвердить"}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-ghost text-sm px-4">
                Отмена
              </button>
            </div>
          </form>
        </div>
      )}

    </>
  );
}