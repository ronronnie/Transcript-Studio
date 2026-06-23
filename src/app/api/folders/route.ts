import { NextResponse } from "next/server";

import { createFolder, listFolders } from "@/lib/db";

/** List the user's folders. */
export async function GET() {
  const folders = await listFolders();
  return NextResponse.json({ folders });
}

/** Create a folder. */
export async function POST(request: Request) {
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

  const folder = await createFolder(name);
  return NextResponse.json({ folder }, { status: 201 });
}
