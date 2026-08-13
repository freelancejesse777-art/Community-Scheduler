import { NextResponse } from "next/server";
import { consumeEmailVerificationToken } from "../../../../lib/auth";
import { publicUrl } from "../../../../lib/publicUrl";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  const userId = consumeEmailVerificationToken(token);
  if (!userId) {
    return NextResponse.redirect(publicUrl("/dashboard?verify=invalid", req));
  }

  return NextResponse.redirect(publicUrl("/dashboard?verify=success", req));
}
