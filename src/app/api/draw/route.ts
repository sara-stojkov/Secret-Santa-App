import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { draw, DrawError, type Participant, type Restriction } from "@/lib/draw";
import { createMailer, type Mailer } from "@/lib/email";

export const runtime = "nodejs";

const MAX_PARTICIPANTS = 50;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Body = {
  password?: unknown;
  participants?: unknown;
  restrictions?: unknown;
  budget?: unknown;
  exchangeDate?: unknown;
  message?: unknown;
};

function passwordMatches(given: unknown): boolean {
  const expected = process.env.APP_PASSWORD;
  if (!expected) return true; // lozinka nije podešena
  if (typeof given !== "string") return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function optionalText(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim().slice(0, max);
  return trimmed || undefined;
}

function bad(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return bad("Neispravan zahtev.");
  }

  if (!passwordMatches(body.password)) {
    return bad("Pogrešna lozinka.", 401);
  }

  if (!Array.isArray(body.participants)) return bad("Nedostaje lista učesnika.");
  if (body.participants.length > MAX_PARTICIPANTS) {
    return bad(`Najviše ${MAX_PARTICIPANTS} učesnika.`);
  }

  const participants: Participant[] = [];
  for (const raw of body.participants) {
    const name = optionalText((raw as { name?: unknown })?.name, 80);
    const email = optionalText((raw as { email?: unknown })?.email, 200)?.toLowerCase();
    if (!name || !email || !EMAIL_RE.test(email)) {
      return bad(`Neispravan unos učesnika: ${name ?? "(bez imena)"}.`);
    }
    participants.push({ name, email });
  }

  if (new Set(participants.map((p) => p.email)).size !== participants.length) {
    return bad("Isti mejl je unet više puta.");
  }

  const restrictions: Restriction[] = [];
  if (body.restrictions !== undefined) {
    if (!Array.isArray(body.restrictions)) return bad("Neispravna ograničenja.");
    for (const pair of body.restrictions) {
      if (!Array.isArray(pair) || pair.length !== 2) return bad("Neispravna ograničenja.");
      restrictions.push([Number(pair[0]), Number(pair[1])]);
    }
  }

  // Prvo proveravamo podešavanja mejla, da ne izvlačimo uzalud.
  let mailer: Mailer;
  try {
    mailer = createMailer();
  } catch (e) {
    console.error(e);
    return bad(e instanceof Error ? e.message : "Mejl nije podešen na serveru.", 500);
  }

  let assignments;
  try {
    assignments = draw(participants, restrictions);
  } catch (e) {
    if (e instanceof DrawError) return bad(e.message, 422);
    throw e;
  }

  const budget = optionalText(body.budget, 80);
  const exchangeDate = optionalText(body.exchangeDate, 80);
  const message = optionalText(body.message, 1000);

  // Šaljemo jedan po jedan da ne prekoračimo limite servisa.
  // Odgovor namerno NE sadrži ko je koga izvukao.
  const failed: string[] = [];
  try {
    for (const { giver, receiver } of assignments) {
      try {
        await mailer.send({
          to: giver,
          receiverName: receiver.name,
          budget,
          exchangeDate,
          message,
        });
      } catch (e) {
        console.error(`Slanje mejla nije uspelo za ${giver.email}:`, e);
        failed.push(giver.name);
      }
    }
  } finally {
    mailer.close();
  }

  if (failed.length > 0) {
    return NextResponse.json(
      {
        error: `Mejl nije stigao do: ${failed.join(", ")}. Proveri podešavanja i pokreni izvlačenje ponovo.`,
        sent: assignments.length - failed.length,
        failed,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ sent: assignments.length });
}
