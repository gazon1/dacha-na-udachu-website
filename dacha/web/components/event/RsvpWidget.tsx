"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { fetchMyRSVP, submitRSVP, cancelRSVP, type RSVPState } from "@/lib/events";
import { useUserStore } from "@/stores/user";
import { PHONE_RE, TELEGRAM_RE } from "@/lib/validators";
import { SaveAccountModal } from "./SaveAccountModal";

const schema = z.object({
  name: z.string().min(1, "Введите имя").max(100),
  phone: z.string().regex(PHONE_RE, "Формат: +79... (11-15 цифр)").optional().or(z.literal("")),
  telegram: z.string().regex(TELEGRAM_RE, "5-32 символа").optional().or(z.literal("")),
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
  const [showSaveModal, setShowSaveModal] = useState(false);
  const setIdentity = useUserStore((s) => s.setIdentity);
  const identity = useUserStore((s) => s.identity);

  const { data: rsvp } = useQuery<RSVPState>({
    queryKey: ["rsvp", eventId],
    queryFn: () => fetchMyRSVP(eventId),
  });

  const voteMutation = useMutation({
    mutationFn: (data: FormData) => submitRSVP(eventId, data),
    onSuccess: (result) => {
      if (result.error) {
        toast.error(result.error);
      } else {
        const formData = voteMutation.variables as FormData | undefined;
        if (formData?.name) {
          setIdentity(formData.name, formData.phone ?? "", formData.telegram ?? "");
        }
        toast.success(
          result.status === "going" ? "Вы идёте! 🎉" :
          result.status === "maybe" ? "Возможно, увидимся!" : "Отмечено"
        );
        queryClient.invalidateQueries({ queryKey: ["rsvp", eventId] });
        queryClient.invalidateQueries({ queryKey: ["attendees", eventId] });
        queryClient.invalidateQueries({ queryKey: ["event", eventId] });
        setShowForm(false);
        // Offer to save account if no token yet and status is going/maybe
        if (!identity?.token && result.status !== "not_going") {
          setShowSaveModal(true);
        }
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

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      status: "going",
      guests_count: 1,
      name: identity?.name ?? "",
      phone: identity?.phone ?? "",
      telegram: identity?.telegram ?? "",
    },
  });

  if (rsvp?.voted && rsvp.status) {
    return (
      <div className="glass-card">
        <div className="flex items-center gap-3 mb-4">
          <span className="material-symbols-outlined text-primary text-xl">check_circle</span>
          <div>
            <p className="text-white font-medium">{rsvp.name}</p>
            <p className="text-base-content/50 text-sm">
              {rsvp.status === "going" ? "Идёте" : rsvp.status === "maybe" ? "Возможно" : "Не идёте"}
            </p>
          </div>
        </div>
        <button
          onClick={() => cancelMutation.mutate()}
          disabled={cancelMutation.isPending}
          className="btn-ghost w-full"
        >
          {cancelMutation.isPending ? "..." : "Отменить RSVP"}
        </button>
      </div>
    );
  }

  if (!showForm) {
    return (
      <div className="space-y-3">
        <button onClick={() => setShowForm(true)} className="btn-rsvp w-full">
          <span className="material-symbols-outlined text-lg">how_to_vote</span>
          Я пойду!
        </button>
        {rsvpCapacity && (
          <p className="text-center text-base-content/40 text-xs">
            {totalAttending} / {rsvpCapacity} записалось
          </p>
        )}
      </div>
    );
  }

  if (showForm) {
    return (
      <>
        <div className="glass-card">
          <form onSubmit={handleSubmit((d) => voteMutation.mutate(d))} className="space-y-4">
            <div>
              <input {...register("name")} placeholder="Ваше имя *" className="form-input" />
              {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
            </div>

            <div className="flex gap-2">
              {(["going", "maybe", "not_going"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => reset((prev) => ({ ...prev!, status: s }))}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                    s === "going"
                      ? "bg-primary/20 border-primary/30 text-primary"
                      : s === "maybe"
                      ? "bg-white/5 border-white/10 text-white/70"
                      : "bg-white/5 border-white/10 text-white/50"
                  }`}
                >
                  {s === "going" ? "Иду" : s === "maybe" ? "Возможно" : "Не иду"}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <input {...register("phone")} placeholder="+79001234567" className="form-input text-sm" />
                {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone.message}</p>}
              </div>
              <div className="flex-1">
                <input {...register("telegram")} placeholder="@username" className="form-input text-sm" />
              </div>
            </div>

            <div>
              <label className="text-base-content/60 text-sm mb-1 block">Гостей с собой</label>
              <input
                type="number"
                {...register("guests_count", { valueAsNumber: true })}
                min={0}
                max={10}
                className="form-input"
              />
            </div>

            <div className="flex gap-2">
              <button type="submit" disabled={voteMutation.isPending} className="btn-rsvp flex-1">
                {voteMutation.isPending ? "..." : "Подтвердить"}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">
                Отмена
              </button>
            </div>
          </form>
        </div>
        {showSaveModal && (
          <SaveAccountModal
            onClose={() => setShowSaveModal(false)}
            onSaved={() => setShowSaveModal(false)}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div className="space-y-3">
        <button onClick={() => setShowForm(true)} className="btn-rsvp w-full">
          <span className="material-symbols-outlined text-lg">how_to_vote</span>
          Я пойду!
        </button>
        {rsvpCapacity && (
          <p className="text-center text-base-content/40 text-xs">
            {totalAttending} / {rsvpCapacity} записалось
          </p>
        )}
      </div>
      {showSaveModal && (
        <SaveAccountModal
          onClose={() => setShowSaveModal(false)}
          onSaved={() => setShowSaveModal(false)}
        />
      )}
    </>
  );
}
