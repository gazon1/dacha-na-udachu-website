"use client";
import { useQuery } from "@tanstack/react-query";
import { fetchAttendees, type Attendee } from "@/lib/events";

interface AttendeesListProps {
  eventId: number;
}

export function AttendeesList({ eventId }: AttendeesListProps) {
  const { data: attendees, isLoading } = useQuery<Attendee[]>({
    queryKey: ["attendees", eventId],
    queryFn: () => fetchAttendees(eventId),
    refetchInterval: 30000, // Refresh every 30s
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 bg-surface-2 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (!attendees?.length) {
    return (
      <p className="text-base-content/40 text-sm text-center py-4">
        Пока никто не записался
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {attendees.map((a) => (
        <li key={a.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-surface-3 flex items-center justify-center text-xs font-bold text-primary">
              {a.name.charAt(0).toUpperCase()}
            </div>
            <span className="text-white text-sm">{a.name}</span>
            {a.guests_count > 0 && (
              <span className="text-base-content/40 text-xs">+{a.guests_count}</span>
            )}
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            a.status === "going"
              ? "bg-primary/20 text-primary"
              : "bg-white/10 text-white/60"
          }`}>
            {a.status === "going" ? "Идёт" : "Возможно"}
          </span>
        </li>
      ))}
    </ul>
  );
}
