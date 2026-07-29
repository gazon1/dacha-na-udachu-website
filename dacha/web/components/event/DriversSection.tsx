"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  fetchCarpoolSection,
  addDriver,
  addCarpoolRequest,
  addTaxiPool,
  joinRide,
  joinTaxi,
  type CarpoolSection,
} from "@/lib/events";
import { useUserStore } from "@/stores/user";
import { useAppMutation } from "@/hooks/useAppMutation";
import { PHONE_RE, TELEGRAM_RE } from "@/lib/validators";

// ── Schemas ──────────────────────────────────────────────────────────────────

const driverSchema = z.object({
  name: z.string().min(1),
  phone: z.string().regex(PHONE_RE),
  telegram: z.string().regex(TELEGRAM_RE).optional().or(z.literal("")),
  car_model: z.string().min(1),
  car_type: z.string(),
  seats_total: z.number().int().min(1).max(8),
  departure_date: z.string(),
  departure_time: z.string().optional(),
  departure_location: z.string().min(1),
  return_date: z.string().optional(),
  return_time: z.string().optional(),
  notes: z.string().optional(),
  contact_preference: z.string(),
});

const requestSchema = z.object({
  name: z.string().min(1),
  phone: z.string().regex(PHONE_RE),
  telegram: z.string().regex(TELEGRAM_RE).optional().or(z.literal("")),
  pickup_location: z.string().min(1),
  seats_needed: z.number().int().min(1).max(8),
  can_share_gas: z.boolean(),
  flexible_time: z.boolean(),
  notes: z.string().optional(),
});

const taxiSchema = z.object({
  organizer: z.string().min(1),
  telegram: z.string().regex(TELEGRAM_RE).optional().or(z.literal("")),
  pickup_location: z.string().min(1),
  departure_date: z.string(),
  departure_time: z.string(),
  max_passengers: z.number().int().min(1).max(8),
  estimated_price: z.number(),
  service: z.string(),
  notes: z.string().optional(),
});

const joinSchema = z.object({
  name: z.string().min(1),
  phone: z.string().regex(PHONE_RE),
  telegram: z.string().regex(TELEGRAM_RE).optional().or(z.literal("")),
  pickup_location: z.string().min(1),
  seats: z.number().int().min(1).max(8),
  notes: z.string().optional(),
});

type DriverForm = z.infer<typeof driverSchema>;
type RequestForm = z.infer<typeof requestSchema>;
type TaxiForm = z.infer<typeof taxiSchema>;
type JoinForm = z.infer<typeof joinSchema>;

type Tab = "cars" | "search" | "taxi";

export function DriversSection({ eventId }: { eventId: number }) {
  const [tab, setTab] = useState<Tab>("cars");
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showTaxiModal, setShowTaxiModal] = useState(false);

  const { data: section, isLoading } = useQuery<CarpoolSection>({
    queryKey: ["carpool", eventId],
    queryFn: () => fetchCarpoolSection(eventId),
    refetchInterval: 15000,
  });

  const driverMut = useAppMutation({
    mutationFn: (d: DriverForm) => addDriver(eventId, d as Parameters<typeof addDriver>[1]),
    queryKeysToInvalidate: [["carpool", eventId], ["event", eventId]],
    successMessage: "Водитель добавлен!",
    onSuccessCallback: () => setShowDriverModal(false),
  });

  const requestMut = useAppMutation({
    mutationFn: (d: RequestForm) => addCarpoolRequest(eventId, d as Parameters<typeof addCarpoolRequest>[1]),
    queryKeysToInvalidate: [["carpool", eventId], ["event", eventId]],
    successMessage: "Запрос отправлен!",
    onSuccessCallback: () => setShowRequestModal(false),
  });

  const taxiMut = useAppMutation({
    mutationFn: (d: TaxiForm) => addTaxiPool(eventId, d as Parameters<typeof addTaxiPool>[1]),
    queryKeysToInvalidate: [["carpool", eventId], ["event", eventId]],
    successMessage: "Такси-пул создан!",
    onSuccessCallback: () => setShowTaxiModal(false),
  });

  const section_data = section ?? { drivers: [], carpool_requests: [], taxi_pools: [] };

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-surface-2 rounded-xl p-1">
        {(["cars", "search", "taxi"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t ? "bg-surface-3 text-white" : "text-base-content/50 hover:text-white"
            }`}
          >
            {t === "cars" ? "🚗 Водители" : t === "search" ? "🔍 Попутчики" : "🚕 Такси"}
          </button>
        ))}
      </div>

      {/* Cars tab */}
      {tab === "cars" && (
        <div className="space-y-3">
          <button onClick={() => setShowDriverModal(true)} className="btn-primary w-full">
            + Добавить поездку
          </button>
          {isLoading && <div className="space-y-2">{[1,2].map(i=><div key={i} className="h-20 bg-surface-2 rounded-xl animate-pulse" />)}</div>}
          {section_data.drivers.length === 0 && !isLoading && (
            <p className="text-center text-base-content/40 py-6">Пока нет предложений</p>
          )}
          {section_data.drivers.map((d) => (
            <DriverCard key={d.id} driver={d} eventId={eventId} />
          ))}
        </div>
      )}

      {/* Search tab */}
      {tab === "search" && (
        <div className="space-y-3">
          <button onClick={() => setShowRequestModal(true)} className="btn-ghost w-full">
            + Найти попутчика
          </button>
          {section_data.carpool_requests.length === 0 && !isLoading && (
            <p className="text-center text-base-content/40 py-6">Пока нет запросов</p>
          )}
          {section_data.carpool_requests.map((r) => (
            <RequestCard key={r.id} request={r} />
          ))}
        </div>
      )}

      {/* Taxi tab */}
      {tab === "taxi" && (
        <div className="space-y-3">
          <button onClick={() => setShowTaxiModal(true)} className="btn-secondary w-full">
            + Создать такси-пул
          </button>
          {section_data.taxi_pools.length === 0 && !isLoading && (
            <p className="text-center text-base-content/40 py-6">Пока нет такси-пулов</p>
          )}
          {section_data.taxi_pools.map((p) => (
            <TaxiPoolCard key={p.id} pool={p} eventId={eventId} />
          ))}
        </div>
      )}

      {/* Modals */}
      {showDriverModal && (
        <Modal title="Добавить поездку" onClose={() => setShowDriverModal(false)}>
          <DriverForm onSubmit={driverMut.mutate} isPending={driverMut.isPending} />
        </Modal>
      )}
      {showRequestModal && (
        <Modal title="Найти попутчика" onClose={() => setShowRequestModal(false)}>
          <RequestFormEl onSubmit={requestMut.mutate} isPending={requestMut.isPending} />
        </Modal>
      )}
      {showTaxiModal && (
        <Modal title="Создать такси-пул" onClose={() => setShowTaxiModal(false)}>
          <TaxiFormEl onSubmit={taxiMut.mutate} isPending={taxiMut.isPending} />
        </Modal>
      )}
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-surface-2 rounded-2xl p-6 w-full max-w-md border border-white/10 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold">{title}</h3>
          <button onClick={onClose} className="text-base-content/50 hover:text-white">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Cards ─────────────────────────────────────────────────────────────────────

function DriverCard({ driver, eventId }: { driver: import("@/lib/events").Driver; eventId: number }) {
  const [joining, setJoining] = useState(false);

  const joinMut = useAppMutation({
    mutationFn: (d: JoinForm) => joinRide(eventId, driver.id, d as Parameters<typeof joinRide>[2]),
    queryKeysToInvalidate: [["carpool", eventId], ["event", eventId]],
    successMessage: "Присоединились!",
    onSuccessCallback: () => setJoining(false),
  });

  if (driver.is_cancelled) return null;

  return (
    <div className="glass-card">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="text-white font-medium">{driver.name}</h4>
          <p className="text-base-content/50 text-sm">{driver.car_model}</p>
        </div>
        <div className="text-right">
          <p className="text-primary font-semibold">{driver.seats_available} мест</p>
          <p className="text-base-content/40 text-xs">{driver.departure_date}</p>
        </div>
      </div>
      {driver.departure_location && (
        <p className="text-base-content/60 text-sm mb-2">📍 {driver.departure_location}</p>
      )}
      {driver.notes && <p className="text-base-content/50 text-xs mb-3">{driver.notes}</p>}
      {!joining ? (
        <button onClick={() => setJoining(true)} className="btn-primary text-sm w-full mt-2">
          Присоединиться
        </button>
      ) : (
        <JoinFormEl onSubmit={joinMut.mutate} isPending={joinMut.isPending} onCancel={() => setJoining(false)} />
      )}
    </div>
  );
}

function RequestCard({ request }: { request: import("@/lib/events").CarpoolRequest }) {
  return (
    <div className="glass-card">
      <div className="flex items-start justify-between mb-2">
        <h4 className="text-white font-medium">{request.name}</h4>
        <span className="text-primary text-sm">нужно {request.seats_needed} мест</span>
      </div>
      {request.pickup_location && (
        <p className="text-base-content/60 text-sm mb-1">📍 {request.pickup_location}</p>
      )}
      {request.can_share_gas && (
        <span className="inline-block text-xs bg-surface-3 text-base-content/60 px-2 py-0.5 rounded-md mr-2">Могу поделиться</span>
      )}
      {request.flexible_time && (
        <span className="inline-block text-xs bg-surface-3 text-base-content/60 px-2 py-0.5 rounded-md">Время гибкое</span>
      )}
    </div>
  );
}

function TaxiPoolCard({ pool, eventId }: { pool: import("@/lib/events").TaxiPool; eventId: number }) {
  const [joining, setJoining] = useState(false);

  const joinMut = useAppMutation({
    mutationFn: (d: JoinForm) => joinTaxi(eventId, pool.id, d as Parameters<typeof joinTaxi>[2]),
    queryKeysToInvalidate: [["carpool", eventId], ["event", eventId]],
    successMessage: "Присоединились!",
    onSuccessCallback: () => setJoining(false),
  });

  return (
    <div className="glass-card">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="text-white font-medium">{pool.organizer}</h4>
          <p className="text-base-content/50 text-sm">{pool.service}</p>
        </div>
        <div className="text-right">
          <p className="text-primary font-semibold">{pool.spots_left} мест</p>
          <p className="text-base-content/40 text-xs">{pool.estimated_price} ₽</p>
        </div>
      </div>
      {pool.pickup_location && <p className="text-base-content/60 text-sm mb-1">📍 {pool.pickup_location}</p>}
      <p className="text-base-content/50 text-xs mb-3">{pool.departure_date} {pool.departure_time}</p>
      {!joining ? (
        <button onClick={() => setJoining(true)} className="btn-secondary text-sm w-full">
          Присоединиться
        </button>
      ) : (
        <JoinFormEl onSubmit={joinMut.mutate} isPending={joinMut.isPending} onCancel={() => setJoining(false)} />
      )}
    </div>
  );
}

// ── Forms ─────────────────────────────────────────────────────────────────────

function JoinFormEl({ onSubmit, isPending, onCancel }: {
  onSubmit: (d: JoinForm) => void;
  isPending: boolean;
  onCancel: () => void;
}) {
  const identity = useUserStore((s) => s.identity);
  const { register, handleSubmit } = useForm<JoinForm>({
    defaultValues: {
      seats: 1,
      name: identity?.name ?? "",
      phone: identity?.phone ?? "",
      telegram: identity?.telegram ?? "",
      pickup_location: "",
      notes: "",
    },
  });
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-2 mt-2">
      <input {...register("name")} placeholder="Ваше имя" className="form-input text-sm" />
      <input {...register("phone")} placeholder="+79001234567" className="form-input text-sm" />
      <input {...register("telegram")} placeholder="Telegram" className="form-input text-sm" />
      <input {...register("pickup_location")} placeholder="Откуда" className="form-input text-sm" />
      <input type="number" {...register("seats", { valueAsNumber: true })} placeholder="Мест" className="form-input text-sm" min={1} />
      <input {...register("notes")} placeholder="Заметки" className="form-input text-sm" />
      <div className="flex gap-2">
        <button type="submit" disabled={isPending} className="btn-primary text-sm flex-1">
          {isPending ? "..." : "Присоединиться"}
        </button>
        <button type="button" onClick={onCancel} className="btn-ghost text-sm">Отмена</button>
      </div>
    </form>
  );
}

function DriverForm({ onSubmit, isPending }: { onSubmit: (d: DriverForm) => void; isPending: boolean }) {
  const identity = useUserStore((s) => s.identity);
  const { register, handleSubmit, formState: { errors } } = useForm<DriverForm>({
    resolver: zodResolver(driverSchema),
    defaultValues: {
      contact_preference: "any",
      seats_total: 4,
      name: identity?.name ?? "",
      phone: identity?.phone ?? "",
      telegram: identity?.telegram ?? "",
    },
  });
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <input {...register("name")} placeholder="Ваше имя" className="form-input" />
      <input {...register("phone")} placeholder="+79001234567" className="form-input" />
      <input {...register("telegram")} placeholder="Telegram" className="form-input" />
      <input {...register("car_model")} placeholder="Марка и модель авто" className="form-input" />
      <input {...register("car_type")} placeholder="Тип (седан, SUV...)" className="form-input" />
      <input type="number" {...register("seats_total", { valueAsNumber: true })} placeholder="Всего мест" className="form-input" min={1} max={8} />
      <input {...register("departure_location")} placeholder="Откуда" className="form-input" />
      <div className="flex gap-2">
        <input {...register("departure_date")} type="date" className="form-input flex-1" />
        <input {...register("departure_time")} type="time" className="form-input flex-1" />
      </div>
      <input {...register("notes")} placeholder="Заметки (маршрут...)" className="form-input" />
      <button type="submit" disabled={isPending} className="btn-primary w-full">
        {isPending ? "..." : "Добавить"}
      </button>
    </form>
  );
}

function RequestFormEl({ onSubmit, isPending }: { onSubmit: (d: RequestForm) => void; isPending: boolean }) {
  const identity = useUserStore((s) => s.identity);
  const { register, handleSubmit } = useForm<RequestForm>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      can_share_gas: false,
      flexible_time: false,
      name: identity?.name ?? "",
      phone: identity?.phone ?? "",
      telegram: identity?.telegram ?? "",
    },
  });
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <input {...register("name")} placeholder="Ваше имя" className="form-input" />
      <input {...register("phone")} placeholder="+79001234567" className="form-input" />
      <input {...register("telegram")} placeholder="Telegram" className="form-input" />
      <input {...register("pickup_location")} placeholder="Откуда забрать" className="form-input" />
      <input type="number" {...register("seats_needed", { valueAsNumber: true })} placeholder="Сколько мест" className="form-input" min={1} max={8} />
      <label className="flex items-center gap-2 text-sm text-base-content/70">
        <input type="checkbox" {...register("can_share_gas")} className="accent-primary w-4 h-4" />
        Могу поделиться бензином
      </label>
      <label className="flex items-center gap-2 text-sm text-base-content/70">
        <input type="checkbox" {...register("flexible_time")} className="accent-primary w-4 h-4" />
        Время гибкое
      </label>
      <input {...register("notes")} placeholder="Заметки" className="form-input" />
      <button type="submit" disabled={isPending} className="btn-ghost w-full">
        {isPending ? "..." : "Отправить"}
      </button>
    </form>
  );
}

function TaxiFormEl({ onSubmit, isPending }: { onSubmit: (d: TaxiForm) => void; isPending: boolean }) {
  const identity = useUserStore((s) => s.identity);
  const { register, handleSubmit } = useForm<TaxiForm>({
    resolver: zodResolver(taxiSchema),
    defaultValues: {
      service: "Яндекс",
      organizer: identity?.name ?? "",
      telegram: identity?.telegram ?? "",
    },
  });
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <input {...register("organizer")} placeholder="Организатор" className="form-input" />
      <input {...register("telegram")} placeholder="Telegram" className="form-input" />
      <input {...register("pickup_location")} placeholder="Откуда" className="form-input" />
      <input {...register("service")} placeholder="Сервис (Яндекс, etc)" className="form-input" />
      <div className="flex gap-2">
        <input {...register("departure_date")} type="date" className="form-input flex-1" />
        <input {...register("departure_time")} type="time" className="form-input flex-1" />
      </div>
      <input type="number" {...register("max_passengers", { valueAsNumber: true })} placeholder="Пассажиров" className="form-input" min={1} max={8} />
      <input type="number" {...register("estimated_price", { valueAsNumber: true })} placeholder="Цена за место" className="form-input" />
      <input {...register("notes")} placeholder="Заметки" className="form-input" />
      <button type="submit" disabled={isPending} className="btn-secondary w-full">
        {isPending ? "..." : "Создать"}
      </button>
    </form>
  );
}
