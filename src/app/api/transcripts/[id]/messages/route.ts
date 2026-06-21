import { NextResponse } from "next/server";

import { listMessages } from "@/lib/db";

/** Load the chat history for a transcript (oldest first). */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const messages = await listMessages(id);
  return NextResponse.json({ messages });
}
