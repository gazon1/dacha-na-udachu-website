"use client";
import { useQuery } from "@tanstack/react-query";
import { fetchMyRSVP, type RSVPState } from "@/lib/events";
import { CarpoolReveal } from "./CarpoolReveal";
import { DriversSection } from "./DriversSection";

interface CarpoolSidebarProps {
  eventId: number;
}

export function CarpoolSidebar({ eventId }: CarpoolSidebarProps) {
  const { data: rsvp } = useQuery<RSVPState>({
    queryKey: ["rsvp", eventId],
    queryFn: () => fetchMyRSVP(eventId),
  });

  const hasVotedGoing = rsvp?.voted && (rsvp.status === "going" || rsvp.status === "maybe");

  return (
    <div className="glass-card">
      <h2 className="section-heading mb-4">
        <span className="material-symbols-outlined text-primary">directions_car</span>
        Попутчики
      </h2>
      <CarpoolReveal hasVotedGoing={!!hasVotedGoing}>
        <DriversSection eventId={eventId} />
      </CarpoolReveal>
    </div>
  );
}
