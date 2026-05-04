"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";

const anonClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type LetterData = {
  eventType: "birthday" | "anniversary" | "spiritual_birthday";
  firstName: string;
  lastName: string;
  isMilestone: boolean;
  milestoneYears: number | null;
  years: number | null;
  eventDate: string;
  churchName: string;
};

function getOrdinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function buildBirthdayLetter(data: LetterData): string {
  const { firstName, isMilestone, milestoneYears, years, churchName } = data;

  if (isMilestone && milestoneYears) {
    return `Dear ${firstName},

On behalf of Pastor and your entire ${churchName} family, we want to wish you a very special Happy Birthday! Today is no ordinary celebration — you are turning ${getOrdinal(milestoneYears)}, and that is truly a milestone worth honoring.

We thank God for the ${milestoneYears} wonderful years He has blessed you with, and for the blessing you have been to so many people in our congregation and community. Your life is a testimony to His faithfulness, and we are so grateful to call you part of our church family.

May this birthday be filled with joy, love, and the warmth of those who cherish you. We are praying for God's richest blessings upon you in this new year of your life.

With much love and celebration,`;
  }

  return `Dear ${firstName},

On behalf of your pastor and the entire ${churchName} family, we want to wish you a truly wonderful Happy Birthday! Birthdays are a beautiful reminder of God's gift of life, and we are so grateful that He placed you in our church family.

You are a blessing to everyone around you, and we thank the Lord for the joy and faithfulness you bring to our congregation. As you celebrate this special day, may you feel the love of God surrounding you and the prayers of your church family lifting you up.

May this coming year bring you great joy, good health, and an ever-deepening walk with the Lord.

With love and blessings,`;
}

function buildSpiritualBirthdayLetter(data: LetterData): string {
  const { firstName, isMilestone, milestoneYears, years, churchName } = data;

  if (isMilestone && milestoneYears) {
    return `Dear ${firstName},

On behalf of your pastor and the entire ${churchName} family, we want to celebrate a truly sacred milestone with you — the ${getOrdinal(milestoneYears)} anniversary of the day you gave your life to Christ.

${milestoneYears} years of walking with Jesus is a powerful testimony to His faithfulness and your steadfast commitment to Him. Your spiritual journey has been a blessing and an encouragement to everyone in our congregation, and we praise God for the transformation He has worked in your life.

As you reflect on these ${milestoneYears} wonderful years of faith, may you be filled with gratitude for how far He has brought you, and with great anticipation for all He still has in store. We are praying that this anniversary deepens your love for God and strengthens your walk with Him.

With great joy and admiration,`;
  }

  const yearsText = years ? `${years} ${years === 1 ? "year" : "years"} ago` : "on a special day";
  return `Dear ${firstName},

On behalf of your pastor and the entire ${churchName} family, we want to celebrate your Spiritual Birthday — the precious day ${yearsText} when you gave your life to Jesus Christ.

This is one of the most significant days of your life, and we rejoice with you and with all of heaven in remembering it. The decision you made to follow Christ has forever changed your eternity, and your faith has been a light and a blessing to everyone around you.

On this special anniversary of your walk with God, may you be reminded of His great love for you, His faithfulness throughout your journey, and His promise to never leave or forsake you.

We are so grateful to have you as part of our church family.

With much love and celebration,`;
}

function buildAnniversaryLetter(data: LetterData): string {
  const { firstName, isMilestone, milestoneYears, years, churchName } = data;

  if (isMilestone && milestoneYears) {
    return `Dear ${firstName} and Family,

What a wonderful occasion! On behalf of your pastor and the entire ${churchName} family, we want to extend our warmest congratulations on your ${getOrdinal(milestoneYears)} wedding anniversary.

${getOrdinal(milestoneYears)} years of marriage is a beautiful testament to God's faithfulness, your steadfast love for one another, and your commitment to the covenant you made before God. Your marriage has been an inspiration and a blessing to all who know you, and we are deeply grateful for the example you set for our congregation.

We are lifting you up in prayer today, asking the Lord to continue blessing your union with His grace, joy, and renewed love for one another in the years ahead.

With warmest congratulations and deep admiration,`;
  }

  const yearsText = years ? `${years} ${years === 1 ? "year" : "years"} of` : "another year of";
  return `Dear ${firstName} and Family,

On behalf of your pastor and the entire ${churchName} family, we want to send you our warmest congratulations on your wedding anniversary! What a joy it is to celebrate ${yearsText} marriage with you.

Your love for one another and your commitment to your family are a beautiful reflection of God's love, and they are a true blessing to our entire church community. We are so thankful for the example of faithfulness and devotion that you bring to our congregation.

On this special day, we are praying for God's continued blessing upon your marriage — that He would renew your love, strengthen your bond, and fill your home with His peace and joy.

With warmest congratulations and many blessings,`;
}

export default function LetterPage({ params }: { params: Promise<{ logId: string }> }) {
  const { logId } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [letter, setLetter] = useState<LetterData | null>(null);
  const [pastorName, setPastorName] = useState("");

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/"); return; }

      // Fetch log entry
      const { data: log } = await anonClient
        .from("birthday_anniversary_log")
        .select("*")
        .eq("id", logId)
        .maybeSingle();

      if (!log) { setError("Letter not found."); setLoading(false); return; }

      const { data: member } = await anonClient
        .from("members")
        .select("first_name, last_name, birthdate, anniversary, spiritual_birthday")
        .eq("id", log.member_id)
        .maybeSingle();

      if (!member) { setError("Member not found."); setLoading(false); return; }

      const { data: church } = await anonClient
        .from("churches")
        .select("name")
        .eq("id", log.church_id)
        .maybeSingle();

      setLetter({
        eventType: log.event_type,
        firstName: member.first_name,
        lastName: member.last_name,
        isMilestone: log.is_milestone,
        milestoneYears: log.milestone_years,
        years: log.milestone_years ?? null,
        eventDate: log.event_date,
        churchName: church?.name ?? "Our Church",
      });

      // Mark letter as generated
      await anonClient
        .from("birthday_anniversary_log")
        .update({ letter_generated_at: new Date().toISOString() })
        .eq("id", logId);

      setLoading(false);
    }
    init();
  }, [logId]);

  function handlePrint() {
    window.print();
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-400" style={{ fontFamily: "Georgia, serif" }}>Preparing letter…</p>
      </div>
    );
  }

  if (error || !letter) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-500 mb-4">{error || "Unable to load letter."}</p>
          <button onClick={() => router.back()} className="text-sm text-green-700 hover:underline">← Go back</button>
        </div>
      </div>
    );
  }

  const letterBody = letter.eventType === "birthday"
    ? buildBirthdayLetter(letter)
    : letter.eventType === "anniversary"
    ? buildAnniversaryLetter(letter)
    : buildSpiritualBirthdayLetter(letter);

  const dateStr = new Date(letter.eventDate + "T00:00:00").toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });

  const eventLabel = letter.eventType === "birthday"
    ? (letter.isMilestone && letter.milestoneYears ? `${getOrdinal(letter.milestoneYears)} Birthday` : "Birthday")
    : letter.eventType === "anniversary"
    ? (letter.isMilestone && letter.milestoneYears ? `${getOrdinal(letter.milestoneYears)} Anniversary` : "Anniversary")
    : (letter.isMilestone && letter.milestoneYears ? `${letter.milestoneYears} Years in Faith` : "Spiritual Birthday");

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; background: white; }
          .letter-page { box-shadow: none !important; border: none !important; margin: 0 !important; padding: 1in 1in 1.25in !important; max-width: none !important; min-height: 100vh; }
          @page { margin: 0; size: letter; }
        }
      `}</style>

      {/* Print button bar */}
      <div className="no-print fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => window.close()}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            ← Close
          </button>
          <div>
            <p className="text-sm font-semibold text-gray-800">{letter.firstName} {letter.lastName} — {eventLabel}</p>
            <p className="text-xs text-gray-400">{letter.churchName} · {dateStr}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Pastor name (for letter)</label>
            <input
              type="text"
              value={pastorName}
              onChange={(e) => setPastorName(e.target.value)}
              placeholder="Rev. John Smith"
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-700 w-48"
            />
          </div>
          <button
            onClick={handlePrint}
            className="px-5 py-2 rounded-lg font-bold text-sm text-white hover:opacity-90 transition-opacity"
            style={{ backgroundColor: "#F28C28" }}
          >
            🖨 Print Letter
          </button>
        </div>
      </div>

      {/* Letter */}
      <div className="min-h-screen bg-gray-100 pt-20 pb-12 no-print-bg">
        <div
          className="letter-page bg-white shadow-xl mx-auto"
          style={{
            maxWidth: "8.5in",
            minHeight: "11in",
            padding: "1in 1in 1.25in",
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: "12pt",
            lineHeight: "1.75",
            color: "#1a1a1a",
          }}
        >
          {/* Church name header */}
          <div style={{ marginBottom: "0.4in", borderBottom: "2px solid #1A4A2E", paddingBottom: "16px" }}>
            <p style={{ fontSize: "18pt", fontWeight: "bold", color: "#1A4A2E", margin: 0 }}>{letter.churchName}</p>
          </div>

          {/* Date */}
          <p style={{ marginBottom: "0.35in", color: "#374151" }}>{dateStr}</p>

          {/* Letter body */}
          <div style={{ whiteSpace: "pre-line", marginBottom: "0.5in" }}>{letterBody}</div>

          {/* Signature block */}
          <div style={{ marginTop: "0.4in" }}>
            {/* Signature line */}
            <div style={{ borderBottom: "1px solid #374151", width: "2.5in", marginBottom: "6px" }}>&nbsp;</div>
            <p style={{ margin: "4px 0 0", fontSize: "11pt", color: "#374151" }}>
              {pastorName || "Pastor"}
            </p>
            <p style={{ margin: "2px 0 0", fontSize: "11pt", color: "#374151" }}>{letter.churchName}</p>
          </div>

          {/* Milestone seal (decorative) */}
          {letter.isMilestone && letter.milestoneYears && (
            <div style={{ position: "absolute", right: "1in", bottom: "1.5in", width: "80px", height: "80px", borderRadius: "50%", border: "3px solid #F28C28", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: "18pt", fontWeight: "bold", color: "#F28C28", lineHeight: 1 }}>{letter.milestoneYears}</p>
              <p style={{ margin: 0, fontSize: "7pt", color: "#F28C28", lineHeight: 1.2 }}>{letter.eventType === "spiritual_birthday" ? "IN FAITH" : "YEARS"}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
