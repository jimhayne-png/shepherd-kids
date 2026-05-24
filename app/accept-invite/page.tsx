"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

function AcceptInviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const departmentId = searchParams.get("department_id");

  const [status, setStatus] = useState<"loading" | "ready" | "setting_up" | "done" | "error">("loading");
  const [deptName, setDeptName] = useState("");
  const [churchName, setChurchName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/"); return; }
      if (!departmentId) {
        setErrorMsg("Invalid invitation link — no department specified.");
        setStatus("error");
        return;
      }
      const res = await fetch(`/api/shepherd/accept?department_id=${departmentId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? "Something went wrong.");
        setStatus("error");
        return;
      }
      setDeptName(data.department_name);
      setChurchName(data.church_name);
      setStatus("ready");
    }
    init();
  }, [departmentId, router]);

  async function handleAccept() {
    setStatus("setting_up");
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/"); return; }
    const res = await fetch("/api/shepherd/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ department_id: departmentId }),
    });
    const data = await res.json();
    if (!res.ok) {
      setErrorMsg(data.error ?? "Setup failed. Please try again.");
      setStatus("error");
      return;
    }
    setStatus("done");
    setTimeout(() => router.replace(`/shepherd/${departmentId}`), 1200);
  }

  if (status === "loading") {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f9f7f4" }}>
        <p style={{ fontFamily: "Georgia, serif", color: "#9ca3af" }}>Loading…</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f9f7f4", padding: "24px" }}>
        <div style={{ maxWidth: "400px", textAlign: "center" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>⚠️</div>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: "22px", color: "#1f2937", marginBottom: "12px", fontWeight: "normal" }}>
            Something went wrong
          </h1>
          <p style={{ fontFamily: "Georgia, serif", color: "#6b7280", fontSize: "15px" }}>{errorMsg}</p>
        </div>
      </div>
    );
  }

  if (status === "done") {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f9f7f4" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "56px", marginBottom: "16px" }}>✅</div>
          <p style={{ fontFamily: "Georgia, serif", color: "#1A4A2E", fontSize: "18px" }}>Taking you to your dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100dvh", background: "#f9f7f4", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 20px" }}>
      <div style={{ width: "100%", maxWidth: "460px" }}>
        <div style={{ background: "#1A4A2E", borderRadius: "16px 16px 0 0", padding: "40px 32px", textAlign: "center" }}>
          <img
            src="/shepherdwell-logo.png"
            alt="ShepherdWell"
            style={{ width: "80px", height: "80px", borderRadius: "50%", objectFit: "cover", margin: "0 auto 16px", display: "block", border: "2px solid rgba(255,255,255,0.25)" }}
          />
          <h1 style={{ color: "white", margin: 0, fontSize: "22px", fontFamily: "Georgia, serif", fontWeight: "normal" }}>
            Welcome to ShepherdWell
          </h1>
          <p style={{ color: "rgba(255,255,255,0.7)", margin: "8px 0 0", fontSize: "15px", fontFamily: "Georgia, serif" }}>
            {churchName}
          </p>
        </div>

        <div style={{ background: "white", borderRadius: "0 0 16px 16px", padding: "36px 32px", border: "1px solid #e5e7eb", borderTop: "none" }}>
          <div style={{ textAlign: "center", marginBottom: "28px" }}>
            <div style={{ fontSize: "40px", marginBottom: "12px" }}>🐑</div>
            <h2 style={{ fontFamily: "Georgia, serif", fontSize: "20px", color: "#1A4A2E", fontWeight: "normal", margin: "0 0 12px" }}>
              You've been invited to lead
            </h2>
            <p style={{ fontFamily: "Georgia, serif", fontSize: "24px", fontWeight: "bold", color: "#1f2937", margin: 0 }}>
              {deptName}
            </p>
          </div>

          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "12px", padding: "20px", marginBottom: "28px" }}>
            <p style={{ fontFamily: "Georgia, serif", fontSize: "14px", color: "#166534", lineHeight: "1.7", margin: 0 }}>
              As a ministry shepherd, you'll help ensure every member of {deptName} receives
              a personal touch each month — through emails, phone calls, and handwritten notes.
              ShepherdWell will show you exactly who needs what each month.
            </p>
          </div>

          <button
            onClick={handleAccept}
            disabled={status === "setting_up"}
            style={{
              width: "100%",
              padding: "18px",
              background: status === "setting_up" ? "#4b7a5e" : "#1A4A2E",
              color: "white",
              border: "none",
              borderRadius: "12px",
              fontSize: "17px",
              fontFamily: "Georgia, serif",
              fontWeight: "bold",
              cursor: status === "setting_up" ? "not-allowed" : "pointer",
            }}
          >
            {status === "setting_up" ? "Setting up your account…" : "Go to My Dashboard →"}
          </button>

          <p style={{ textAlign: "center", fontFamily: "Georgia, serif", fontSize: "12px", color: "#9ca3af", marginTop: "20px", lineHeight: "1.6" }}>
            "Be shepherds of God's flock that is under your care" — 1 Peter 5:2
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f9f7f4" }}>
          <p style={{ fontFamily: "Georgia, serif", color: "#9ca3af" }}>Loading…</p>
        </div>
      }
    >
      <AcceptInviteContent />
    </Suspense>
  );
}
