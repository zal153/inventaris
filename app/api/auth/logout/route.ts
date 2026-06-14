import { NextResponse, type NextRequest } from "next/server";
import { deleteSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  await deleteSession();
  const origin = request.nextUrl.origin;
  return NextResponse.redirect(new URL("/login", origin));
}
