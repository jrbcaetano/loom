import { NextResponse } from "next/server";
import { archiveEvent, getEventById, updateEvent } from "@/features/events/server";

type RouteParams = {
  params: Promise<{ eventId: string }>;
};

export async function GET(_request: Request, { params }: RouteParams) {
  const { eventId } = await params;

  try {
    const event = await getEventById(eventId);
    return NextResponse.json({ event });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch event";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { eventId } = await params;

  try {
    const body = await request.json();
    await updateEvent(eventId, body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update event";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { eventId } = await params;

  try {
    await archiveEvent(eventId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to archive event";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
