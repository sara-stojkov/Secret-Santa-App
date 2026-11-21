import nodemailer from "nodemailer";

export type SantaEmail = {
  to: { name: string; email: string };
  receiverName: string;
  budget?: string;
  exchangeDate?: string;
  message?: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildHtml(mail: SantaEmail): string {
  const lines: string[] = [];
  if (mail.budget) lines.push(`<li><strong>Budžet:</strong> ${escapeHtml(mail.budget)}</li>`);
  if (mail.exchangeDate) {
    lines.push(`<li><strong>Razmena poklona:</strong> ${escapeHtml(mail.exchangeDate)}</li>`);
  }

  return `
<div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #222;">
  <h2 style="color: #b3202a;">🎅 Tajni Deda Mraz</h2>
  <p>Zdravo ${escapeHtml(mail.to.name)}!</p>
  <p>Poklon ove godine kupuješ osobi:</p>
  <p style="font-size: 24px; font-weight: bold; text-align: center; margin: 24px 0; padding: 16px; background: #fbeaea; border-radius: 8px;">
    🎁 ${escapeHtml(mail.receiverName)}
  </p>
  ${lines.length ? `<ul>${lines.join("")}</ul>` : ""}
  ${mail.message ? `<p style="white-space: pre-line;">${escapeHtml(mail.message)}</p>` : ""}
  <p style="color: #666; font-size: 13px;">Pssst, ovo je tajna. Nemoj nikome da otkriješ koga si izvukao/la!</p>
</div>`;
}

function buildText(mail: SantaEmail): string {
  return [
    `Zdravo ${mail.to.name}!`,
    "",
    `Poklon ove godine kupuješ osobi: ${mail.receiverName}`,
    mail.budget ? `Budžet: ${mail.budget}` : "",
    mail.exchangeDate ? `Razmena poklona: ${mail.exchangeDate}` : "",
    mail.message ? `\n${mail.message}` : "",
    "",
    "Pssst, ovo je tajna. Nemoj nikome da otkriješ koga si izvukao/la!",
  ]
    .filter((line, i, all) => line !== "" || all[i - 1] !== "")
    .join("\n");
}

function createTransport() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) {
    throw new Error("Nedostaju SMTP_USER ili SMTP_PASS u podešavanjima servera.");
  }

  const port = Number(process.env.SMTP_PORT || 465);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port,
    secure: port === 465, // 465 = SSL od starta, 587 = STARTTLS
    auth: { user, pass },
  });
}

export type Mailer = {
  send: (mail: SantaEmail) => Promise<void>;
  close: () => void;
};

/** Otvara jednu SMTP vezu koja se koristi za sve mejlove u jednom izvlačenju. */
export function createMailer(): Mailer {
  const transport = createTransport();
  const from = {
    name: process.env.SENDER_NAME || "Tajni Deda Mraz",
    address: process.env.SMTP_FROM || (process.env.SMTP_USER as string),
  };

  return {
    async send(mail) {
      await transport.sendMail({
        from,
        to: { name: mail.to.name, address: mail.to.email },
        subject: "🎅 Tajni Deda Mraz: koga si izvukao/la",
        text: buildText(mail),
        html: buildHtml(mail),
      });
    },
    close: () => transport.close(),
  };
}
