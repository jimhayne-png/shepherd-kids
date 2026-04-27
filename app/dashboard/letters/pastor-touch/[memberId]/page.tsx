"use client";

import { use, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function PastorTouchLetterPage({ params }: { params: Promise<{ memberId: string }> }) {
  const { memberId } = use(params);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [body, setBody] = useState("");
  const [originalBody, setOriginalBody] = useState("");
  const [memberName, setMemberName] = useState("");
  const [churchName, setChurchName] = useState("");
  const [date, setDate] = useState("");
  const [pastorName, setPastorName] = useState("");
  const [address, setAddress] = useState("");
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError("Not authenticated"); setLoading(false); return; }

      const res = await fetch(`/api/letters/pastor-touch/${memberId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) { setError("Unable to load letter"); setLoading(false); return; }
      const data = await res.json();

      const m = data.member;
      setMemberName(`${m.first_name} ${m.last_name}`);
      setChurchName(data.churchName ?? "");
      setDate(data.date ?? "");
      setPastorName(data.pastorName ?? "Pastor");
      setAddress([m.address, [m.city, m.state].filter(Boolean).join(', '), m.zip].filter(Boolean).join('\n'));

      // Use saved edited content if available, otherwise use generated body
      const letterBody = data.savedContent ?? data.body ?? "";
      setBody(letterBody);
      setOriginalBody(data.body ?? "");
      setLoading(false);
    }
    init();
  }, [memberId]);

  function handleReset() {
    if (!confirm("Reset the letter to the original template? Your edits will be lost.")) return;
    setBody(originalBody);
    if (editorRef.current) editorRef.current.innerText = originalBody;
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
          body { margin: 0; background: white; }
          .letter-page {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 1in 1in 1.25in !important;
            max-width: none !important;
            min-height: 100vh;
          }
          @page { margin: 0; size: letter; }
        }
      `}</style>

      {/* Toolbar — hidden on print */}
      <div className="no-print fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={() => window.close()} className="text-sm text-gray-500 hover:text-gray-700 transition-colors">← Close</button>
          <div>
            <p className="text-sm font-semibold text-gray-800">{memberName} — Annual Pastor Touch</p>
            <p className="text-xs text-gray-400">{churchName} · Click letter to edit</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Pastor name (for signature)</label>
            <input
              type="text"
              value={pastorName}
              onChange={e => setPastorName(e.target.value)}
              placeholder="Rev. John Smith"
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-700 w-48"
            />
          </div>
          <button onClick={handleReset} className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            ↺ Reset
          </button>
          <button onClick={handlePrint} className="px-5 py-2 rounded-lg font-bold text-sm text-white hover:opacity-90 transition-opacity" style={{ backgroundColor: "#F28C28" }}>
            🖨 Print Letter
          </button>
        </div>
      </div>

      {/* Letter */}
      <div className="min-h-screen bg-gray-100 pt-20 pb-12">
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
            <p style={{ fontSize: "18pt", fontWeight: "bold", color: "#1A4A2E", margin: 0 }}>{churchName}</p>
          </div>

          {/* Date */}
          <p style={{ marginBottom: "0.2in", color: "#374151" }}>{date}</p>

          {/* Member address */}
          {address && (
            <div style={{ marginBottom: "0.35in", whiteSpace: "pre-line", color: "#374151" }}>{memberName}{'\n'}{address}</div>
          )}

          {/* Letter body — contentEditable */}
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={() => { if (editorRef.current) setBody(editorRef.current.innerText); }}
            style={{ whiteSpace: "pre-line", marginBottom: "0.5in", outline: "none", minHeight: "3in" }}
          >
            {body}
          </div>

          {/* Signature block */}
          <div style={{ marginTop: "0.4in" }}>
            <div style={{ borderBottom: "1px solid #374151", width: "2.5in", marginBottom: "6px" }}>&nbsp;</div>
            <p style={{ margin: "4px 0 0", fontSize: "11pt", color: "#374151" }}>{pastorName || "Pastor"}</p>
            <p style={{ margin: "2px 0 0", fontSize: "11pt", color: "#374151" }}>{churchName}</p>
          </div>
        </div>
      </div>
    </>
  );
}
