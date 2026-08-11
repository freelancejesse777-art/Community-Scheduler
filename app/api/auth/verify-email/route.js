import { NextResponse } from "next/server";
import { consumeEmailVerificationToken } from "../../../../lib/auth";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  const userId = consumeEmailVerificationToken(token);
  if (!userId) {
    return NextResponse.redirect(
      new URL("/dashboard?verify=invalid", req.url)
    );
  }

  return NextResponse.redirect(new URL("/dashboard?verify=success", req.url));
}
