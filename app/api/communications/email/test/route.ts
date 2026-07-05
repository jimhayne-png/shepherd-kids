import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/communications/email/resend";
import { buildTestEmail } from "@/lib/communications/email/templates";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const to = String(body.to ?? "").trim();

    if (!to) {
      return NextResponse.json(
        { error: "Missing test recipient email." },
        { status: 400 }
      );
    }

    const branding = {
      churchName: String(body.churchName ?? "Lighthouse Baptist Church"),
      logoUrl: body.logoUrl ? String(body.logoUrl) : undefined,
      primaryColor: String(body.primaryColor ?? "#7B2CBF"),
    };

    const email = buildTestEmail(branding);

    const result = await sendEmail({
      to,
      subject: email.subject,
      html: email.html,
      text: email.text,
      replyTo: body.replyTo ? String(body.replyTo) : undefined,
    });

    return NextResponse.json({
      ok: true,
      message: "Test email sent.",
      result,
    });
  } catch (error) {
    console.error("[Email Test] Failed:", error);

    return NextResponse.json(
      {
        error: "Failed to send test email.",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}