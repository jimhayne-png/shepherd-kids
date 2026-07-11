"use client";

import Link from "next/link";
import AppShell from "@/components/layout/AppShell";

const GOLD   = "#D4AF37";
const MUTED  = "#A9A9B8";
const CARD   = "#120A1F";
const PURPLE = "#7B2CBF";
const PURPLE2 = "#9D4EDD";

type HubCard = {
  title: string;
  description: string;
  action: string;
  href: string;
  comingSoon?: boolean;
};

const HUB_CARDS: HubCard[] = [
  {
    title: "Children's Lesson Plan",
    description: "Send lesson summaries, memory verses, conversation starters, and special notes.",
    action: "Open Lesson Plan",
    href: "/dashboard/children-ministry/parent-update/lesson-plan",
  },
  {
    title: "First-Visit Follow-Up",
    description: "Welcome new families after their first visit.",
    action: "Open Follow-Up",
    href: "/dashboard/children-ministry/followup",
  },
  {
    title: "Visitor Journey Emails",
    description: 'Send "Glad You Returned" or "We Missed You" messages.',
    action: "Open Visitor Journey",
    href: "/dashboard/children-ministry/visitor-journey",
  },
  {
    title: "Birthday Emails",
    description: "Send birthday and spiritual birthday messages to parents.",
    action: "Open Birthdays",
    href: "/dashboard/children-ministry/birthdays",
  },
  {
    title: "Annual Family Safety Review",
    description: "Send secure family-information review links.",
    action: "Open Safety Reviews",
    href: "/dashboard/children-ministry/family-safety-review",
  },
  {
    title: "Certificate Delivery",
    description: "Send completed certificates directly to parents.",
    action: "Open Certificates",
    href: "/dashboard/children-ministry/certificates",
  },
  {
    title: "Email History",
    description: "Review communication activity sent through ShepherdKids.",
    action: "Coming Soon",
    href: "#",
    comingSoon: true,
  },
];

export default function ParentCommunicationPage() {
  return (
    <AppShell navItems={[]}>
      {/* Hero */}
      <div style={{ padding: "40px 32px 32px", background: "linear-gradient(135deg, #08060D 0%, #1C0A30 100%)" }}>
        <p style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.06em", color: GOLD, marginBottom: "6px", textTransform: "uppercase" }}>
          ShepherdKids
        </p>
        <h1 style={{ fontSize: "28px", fontWeight: 700, color: "#ffffff", margin: "0 0 6px", fontFamily: "Georgia, serif" }}>
          Parent Communication
        </h1>
        <p style={{ fontSize: "13px", color: MUTED, margin: 0 }}>
          Communicate with parents about their children, milestones, and ministry care.
        </p>
      </div>

      <div style={{ backgroundColor: "#0A0814", minHeight: "100vh", padding: "32px" }}>
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {HUB_CARDS.map(card => (
            <div
              key={card.title}
              style={{
                background: CARD,
                border: `1px solid ${card.comingSoon ? "rgba(255,255,255,0.08)" : "rgba(212,175,55,0.22)"}`,
                borderRadius: "16px",
                padding: "24px",
                display: "flex",
                flexDirection: "column",
                gap: "14px",
                opacity: card.comingSoon ? 0.65 : 1,
              }}
            >
              <div style={{ flex: 1 }}>
                <p style={{
                  fontWeight: 700,
                  color: card.comingSoon ? MUTED : "#ffffff",
                  fontSize: "15px",
                  margin: "0 0 8px",
                  fontFamily: "Georgia, serif",
                }}>
                  {card.title}
                </p>
                <p style={{ color: MUTED, fontSize: "13px", lineHeight: 1.55, margin: 0 }}>
                  {card.description}
                </p>
              </div>

              {card.comingSoon ? (
                <span style={{
                  alignSelf: "flex-start",
                  display: "inline-block",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: MUTED,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  borderRadius: "8px",
                  padding: "5px 12px",
                }}>
                  Coming Soon
                </span>
              ) : (
                <Link
                  href={card.href}
                  style={{
                    alignSelf: "flex-start",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#ffffff",
                    background: `linear-gradient(135deg, ${PURPLE}, ${PURPLE2})`,
                    borderRadius: "8px",
                    padding: "6px 14px",
                    textDecoration: "none",
                  }}
                >
                  {card.action} →
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
