"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { fetchMyRSVP, submitRSVP, cancelRSVP, type RSVPState } from "@/lib/events";

const PHONE_RE = /^\+\d{11,15}$/;
const TELEGRAM_RE = /^[a-zA-Z0-9_]{5,32}$/;

const schema = z.object({
  name: z.string().min(1, "Введите имя").max(100),
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
        toast.success(
          result.status === "going" ? "Вы идёте! 🎉" :
          result.status === "maybe" ? "Возможно, увидимся!" : "Отмечено"
        );
        queryClient.invalidateQueries({ queryKey: ["rsvp", eventId] });
        queryClient.invalidateQueries({ queryKey: ["attendees", eventId] });
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
      }
    },
    onError: () => toast.error("Ошибка сети"),
  });

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { status: "going", guests_count: 1 },
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

  return (
    <div className="glass-card">
      <form onSubmit={handleSubmit((d) => voteMutation.mutate(d))} className="space-y-4">
        <div>
          <input {...register("name")} placeholder="Ваше имя" className="form-input" />
          {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
        </div>

        <div className="flex gap-2">
          {(["going", "maybe", "not_going"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => reset({ ...Object.fromEntries(Object.entries({ status: s, guests_count: 1 })), name: "" })}
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
  );
}
