import { NextResponse } from "next/server";
import db from "../../../../lib/db";
import { getCurrentUser } from "../../../../lib/session";
import { isPro } from "../../../../lib/billing";
import { sendEmail } from "../../../../lib/email";
import { checkRateLimit } from "../../../../lib/rateLimit";
import { isWorkspaceOwner, createInvite, activeMemberCount, MAX_TEAM_MEMBERS } from "../../../../lib/team";

export async function POST(req) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  if (!isWorkspaceOwner(user.userId)) {
    return NextResponse.json(
      { error: "Only the workspace owner can invite teammates." },
      { status: 403 }
    );
  }

  if (!isPro(user.userId)) {
    return NextResponse.json(
      { error: "Team members are a Pro feature. Upgrade at /billing to invite collaborators." },
      { status: 403 }
    );
  }

  const rl = checkRateLimit(`team-invite:${user.userId}`, { limit: 20, windowMs: 60 * 60 * 1000 });
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many invites sent. Try again later." }, { status: 429 });
  }

  const { email } = await req.json();
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
  }
  if (email.toLowerCase() === user.email.toLowerCase()) {
    return NextResponse.json({ error: "You can't invite yourself." }, { status: 400 });
  }

  if (activeMemberCount(user.userId) >= MAX_TEAM_MEMBERS) {
    return NextResponse.json(
      { error: `Teams are capped at ${MAX_TEAM_MEMBERS} members right now.` },
      { status: 403 }
    );
  }

  const existingInvite = db
    .prepare(
      `SELECT tm.* FROM team_members tm JOIN teams t ON t.id = tm.team_id
       WHERE t.owner_user_id = ? AND tm.email = ? AND tm.status IN ('pending','active')`
    )
    .get(user.userId, email.toLowerCase());
  if (existingInvite) {
    return NextResponse.json({ error: "That person already has an invite or is already a member." }, { status: 400 });
  }

  const token = createInvite(user.userId, email);
  const origin = req.headers.get("origin") || "http://localhost:3000";
  const acceptUrl = `${origin}/team/accept?token=${token}`;

  await sendEmail({
    to: email,
    subject: `${user.email} invited you to collaborate on Community Scheduler`,
    text: `${user.email} invited you to join their workspace on Community Scheduler.\n\nAccept the invite (expires in 7 days): ${acceptUrl}\n\nYou'll need an account with this email address (${email}) to accept — sign up first if you don't have one yet.`,
  });

  return NextResponse.json({ ok: true });
}
