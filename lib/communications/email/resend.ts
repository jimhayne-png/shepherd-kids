import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
const defaultFromEmail =
  process.env.RESEND_FROM_EMAIL || "Shepherd Kids <notifications@shepherdkids.com>";

if (!resendApiKey) {
  console.warn("[ShepherdKids Email] RESEND_API_KEY is not set.");
}

export const resend = resendApiKey ? new Resend(resendApiKey) : null;

export type SendEmailParams = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
};

export async function sendEmail({
  to,
  subject,
  html,
  text,
  from,
  replyTo,
}: SendEmailParams) {
  if (!resend) {
    throw new Error("Email service is not configured. Missing RESEND_API_KEY.");
  }

  const result = await resend.emails.send({
    from: from || defaultFromEmail,
    to,
    subject,
    html,
    text,
    replyTo,
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data;
}