import type { Metadata } from "next";
import { BookingWizard } from "@/components/booking/BookingWizard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Бронирование",
  description: "Забронируйте дом в загородном клубе Evergreen Community.",
};

export default function BookingPage() {
  return <BookingWizard />;
}
