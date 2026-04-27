"use client";

import { use, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ShepherdLetterPage({ params }: { params: Promise<{ memberId: string }> }) {
  const { memberId } = use(params);
  const searchParams = useSearchParams();
  const ministryType = searchParams.get("ministry_type") ?? "";
  const groupId = searchParams.get("group_id") ?? "";

  const [loading, setLoading] = useState(true);
  const [html, setHtml] = useState("");
  const [originalHtml, setOriginalHtml] = useState("");
  const [memberName, setMemberName] = useState("");
  const [ministryName, setMinistryName] = useState("");
  const [volunteerName, setVolunteerName] = useState("");
  const [error, setError] = useState("");
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError("Not authenticated"); setLoading(false); return; }

      const url = `/api/letters/shepherd/${memberId}?ministry_type=${ministryType}${groupId ? `&group_id=${groupId}` : ''}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${session.access_token}` } });
      if (!res.ok) { setError("Unable to load letter"); setLoading(false); return; }
      const data = await res.json();
      setHtml(data.html ?? "");
      setOriginalHtml(data.html ?? "");
      setMemberName(`${data.member?.first_name ?? ""} ${data.member?.last_name ?? ""}`.trim());
      setMinistryName(data.ministryName ?? "");
      setVolunteerName(data.volunteerName ?? "");
      setLoading(false);
    }
    init();
  }, [memberId, ministryType, groupId]);

  function handleReset() {
    if (!confirm("Reset the letter to the original template? Your edits will be lost.")) return;
    setHtml(originalHtml);
    if (editorRef.current) editorRef.current.innerHTML = originalHtml;
  }

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

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .letter-sheet {
            box-shadow: none !important;
            border: none !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 1in !important;
          }
        }
      `}</style>

      <div className="no-print sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm">
        <div>
          <p className="font-semibold text-gray-900 text-sm">{memberName || "Letter"}</p>
          <p className="text-xs text-gray-400">{ministryName}{volunteerName ? ` · From ${volunteerName}` : ""} — Click anywhere to edit</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleReset} className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            ↺ Reset
          </button>
          <button onClick={handlePrint} className="px-5 py-2 rounded-lg text-sm font-bold text-white transition-opacity hover:opacity-90" style={{ backgroundColor: "#F28C28" }}>
            🖨️ Print
          </button>
        </div>
      </div>

      <div className="min-h-screen bg-gray-100 py-10">
        <div
          className="letter-sheet bg-white mx-auto rounded shadow-lg"
          style={{ maxWidth: "680px", padding: "72px 80px", fontFamily: "Georgia, serif", color: "#1f2937", lineHeight: "1.8", fontSize: "16px" }}
        >
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            dangerouslySetInnerHTML={{ __html: html }}
            onInput={() => { if (editorRef.current) setHtml(editorRef.current.innerHTML); }}
            style={{ outline: "none", minHeight: "400px" }}
          />
        </div>
      </div>
    </>
  );
}
