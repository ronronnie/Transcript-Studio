import { NextResponse } from "next/server";

import { deleteFolder, renameFolder } from "@/lib/db";

/** Rename a folder. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: { name?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json(
      { error: "Folder name is required." },
      { status: 400 }
    );
  }

  const folder = await renameFolder(id, name);
  if (!folder) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  return NextResponse.json({ folder });
}

/**
 * Delete a folder. Its transcripts are NOT deleted — the folder_id FK is
 * ON DELETE SET NULL, so they become unfiled.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const deleted = await deleteFolder(id);
  if (!deleted) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
