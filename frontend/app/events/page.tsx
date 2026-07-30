import type { Metadata } from "next";
import Link from "next/link";
import { fetchEvents, type Event } from "@/lib/events";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "События",
  description: "Мероприятия загородного клуба Evergreen Community.",
};

export default async function EventsPage() {
  const events = await fetchEvents(true);

  if (!events.length) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <span className="material-symbols-outlined text-5xl text-base-content/30 mb-4 block">event</span>
        <p className="text-base-content/60">Скоро здесь появятся события</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-white mb-8">События</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map((event: Event) => (
          <Link key={event.id} href={`/events/${event.slug}/`} className="event-card">
            <div className="event-card-body">
              <div className="flex items-start justify-between mb-3">
                {event.special_tag && (
                  <span className="badge-event">{event.special_tag}</span>
                )}
                {event.show_countdown && (
                  <span className="text-xs text-base-content/40">{event.expected_temperature}</span>
                )}
              </div>
              <h2 className="text-xl font-bold text-white mb-2">{event.title}</h2>
              <p className="text-base-content/60 text-sm mb-4 line-clamp-2">{event.summary}</p>
              <div className="flex items-center gap-2 text-base-content/50 text-sm mt-auto">
                <span className="material-symbols-outlined text-base">calendar_today</span>
                <span>
                  {new Date(event.start_date).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}
                  {event.venue && <> · {event.venue}</>}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-3">
                <span className="badge-event">
                  <span className="material-symbols-outlined text-xs">how_to_vote</span>
                  {event.going_count} идут
                </span>
                {event.rsvp_capacity && (
                  <span className="text-base-content/40 text-xs">
                    {event.total_attending}/{event.rsvp_capacity}
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
