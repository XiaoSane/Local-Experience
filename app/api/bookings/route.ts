import { NextResponse } from "next/server";
import type { Booking } from "@/lib/types";
import { addBooking, getBookings, getExperience } from "@/lib/store";
import { todayIso } from "@/lib/engine/time";

export async function GET() {
  return NextResponse.json({ bookings: getBookings() });
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    experienceId: string;
    guests: number;
    startMin: number;
    date?: string;
    travelerName?: string;
  };

  const exp = getExperience(body.experienceId);
  if (!exp) return NextResponse.json({ error: "Unknown experience" }, { status: 404 });

  const guests = Number(body.guests);
  if (!guests || guests <= 0) {
    return NextResponse.json({ error: "Guests must be at least 1" }, { status: 400 });
  }

  if (exp.minGroup && guests < exp.minGroup) {
    return NextResponse.json(
      { error: `Requires a minimum group size of ${exp.minGroup}` },
      { status: 400 }
    );
  }

  const date = body.date ?? todayIso();
  const existingBooked = getBookings()
    .filter(
      (b) =>
        b.experienceId === exp.experienceId &&
        b.date === date &&
        b.startMin === body.startMin &&
        b.status !== "declined" &&
        b.status !== "cancelled"
    )
    .reduce((sum, b) => sum + b.guests, 0);

  if (existingBooked + guests > exp.capacity) {
    const remaining = Math.max(0, exp.capacity - existingBooked);
    return NextResponse.json(
      { error: `Over capacity: only ${remaining} place${remaining === 1 ? "" : "s"} remaining for this session` },
      { status: 409 }
    );
  }

  const booking: Booking = {
    bookingId: `b_${Math.random().toString(36).slice(2, 9)}`,
    experienceId: exp.experienceId,
    providerId: exp.providerId,
    travelerName: body.travelerName?.trim() || "Guest traveler",
    date,
    startMin: body.startMin,
    guests,
    totalPrice: exp.price * guests,
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  addBooking(booking);
  return NextResponse.json({ booking });
}
