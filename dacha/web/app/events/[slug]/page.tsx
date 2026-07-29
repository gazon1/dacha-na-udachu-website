import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { fetchEvent } from "@/lib/events";
import { RsvpWidget } from "@/components/event/RsvpWidget";
import { AttendeesList } from "@/components/event/AttendeesList";
import { DriversSection } from "@/components/event/DriversSection";
import { Countdown } from "@/components/event/Countdown";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  // Find event by slug — fetch events list
  const events = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/events/?upcoming=true`).then(r => r.json()).catch(() => []);
  const event = events.find((e: { slug: string }) => e.slug === slug);
  if (!event) return {};
  return {
    title: event.title,
    description: event.summary,
    openGraph: { title: event.title, type: "article" },
  };
}

export default async function EventPage({ params }: Props) {
  const { slug } = await params;

  // Find event by slug
  const events = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/events/?upcoming=true`,
    { next: { revalidate: 60 } }
  ).then(r => r.json()).catch(() => []);
  const event = events.find((e: { slug: string }) => e.slug === slug);

  if (!event) notFound();

  const startDateTime = event.start_time
    ? `${event.start_date}T${event.start_time}`
    : `${event.start_date}`;

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="mb-8">
        <Link href="/events/" className="back-link mb-6 inline-flex">
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Все события
        </Link>

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex-1">
            {event.special_tag && (
              <span className="badge-event mb-3">{event.special_tag}</span>
            )}
            <h1 className="text-4xl font-bold text-white mb-3">{event.title}</h1>

            <div className="flex flex-wrap gap-4 text-base-content/60 text-sm mb-4">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-base">calendar_today</span>
                {new Date(event.start_date).toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" })}
              </span>
              {event.start_time && (
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-base">schedule</span>
                  {event.start_time}
                </span>
              )}
              {event.venue && (
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-base">place</span>
                  {event.venue}
                </span>
              )}
            </div>

            {event.summary && (
              <p className="text-base-content/70 mb-4 max-w-2xl">{event.summary}</p>
            )}

            {event.show_countdown && event.expected_temperature && (
              <div className="glass-card inline-flex items-center gap-4 mb-4">
                <Countdown targetDate={startDateTime} />
                {event.expected_temperature && (
                  <span className="text-base-content/50 text-sm">{event.expected_temperature}</span>
                )}
              </div>
            )}

            {event.weather_note && (
              <p className="text-base-content/50 text-sm italic mb-4">{event.weather_note}</p>
            )}
          </div>

          {/* RSVP sidebar */}
          <div className="w-full md:w-72 shrink-0">
            <RsvpWidget
              eventId={event.id}
              rsvpCapacity={event.rsvp_capacity}
              totalAttending={event.total_attending}
            />
          </div>
        </div>

        {event.map_link && (
          <a href={event.map_link} target="_blank" rel="noopener noreferrer" className="btn-ghost text-sm mt-4 inline-flex">
            <span className="material-symbols-outlined text-base">map</span>
            Открыть карту
          </a>
        )}
      </div>

      {/* Body grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content — attendees */}
        <div className="lg:col-span-2 space-y-8">
          <div className="glass-card">
            <h2 className="section-heading mb-4">
              <span className="material-symbols-outlined text-primary">group</span>
              Кто идёт ({event.total_attending})
            </h2>
            <AttendeesList eventId={event.id} />
          </div>
        </div>

        {/* Sidebar — carpool */}
        <div className="glass-card">
          <h2 className="section-heading mb-4">
            <span className="material-symbols-outlined text-primary">directions_car</span>
            Попутчики
          </h2>
          <DriversSection eventId={event.id} />
        </div>
      </div>

      {/* .ics download */}
      <div className="mt-8">
        <a
          href={`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/events/${event.id}/ical/`}
          download
          className="btn-ghost inline-flex items-center gap-2 text-sm"
        >
          <span className="material-symbols-outlined text-base">calendar_month</span>
          Скачать в календарь (.ics)
        </a>
      </div>
    </div>
  );
}
