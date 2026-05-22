"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Papa from "papaparse";
import { createClient } from "@/lib/supabase/client";
import AppShell, { type NavItem } from "@/components/layout/AppShell";

const supabase = createClient();

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Members", href: "/dashboard/members" },
  { label: "Departments", href: "/dashboard/departments" },
  { label: "Attendance", href: "/dashboard/attendance" },
  { label: "Calendar", href: "/dashboard/calendar" },
  { label: "Prayer", href: "/dashboard/prayer" },
  { label: "Bulletin", href: "/dashboard/bulletin" },
  { label: "Communication Hub", href: "/dashboard/communication" },
  { label: "Visitation", href: "/dashboard/visitation" },
  { label: "Shepherd Pipeline", href: "/dashboard/shepherd" },
  { label: "Reviews", href: "/dashboard/reviews" },
  { label: "Evangelism", href: "/dashboard/evangelism" },
  { label: "Birthdays", href: "/dashboard/birthdays" },
  { label: "Tutorials", href: "/dashboard/tutorials" },
  { label: "Settings", href: "/dashboard/settings" },
];

const CSV_HEADERS = [
  "first_name","last_name","email","phone","birthdate","birth_year",
  "address","city","state","zip","member_type","status","notes",
];

const TEMPLATE_ROWS = [
  ["Jane","Smith","jane@email.com","555-0001","01/15","1985","123 Main St","Springfield","IL","62701","member","active","Joined 2020"],
  ["Bob","Johnson","bob@email.com","555-0002","03/22","","456 Oak Ave","Springfield","IL","62702","visitor","active","First visit Sunday"],
];

function downloadTemplate() {
  const rows = [CSV_HEADERS, ...TEMPLATE_ROWS];
  const csv = rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "shepherdwell-members-template.csv";
  a.click();
  URL.revokeObjectURL(a.href);
}

type ParsedRow = {
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  birthdate?: string;
  birth_year?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  member_type?: string;
  status?: string;
  notes?: string;
  _rowIndex: number;
  _hasError: boolean;
  _errorMsg: string;
};

type ImportResult = {
  imported: number;
  skipped: number;
  errors: { row: number; name: string; reason: string }[];
};

type Step = "upload" | "preview" | "results";

export default function ImportMembersPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [churchId, setChurchId] = useState<string | null>(null);
  const [churchName, setChurchName] = useState<string | null>(null);

  const [step, setStep] = useState<Step>("upload");
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState("");

  useEffect(() => {
    async function init() {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!user || error) {
        console.log("Dashboard client user unavailable:", error?.message ?? null);
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setToken(session.access_token);

      const { data: cu } = await supabase
        .from("church_users")
        .select("church_id, churches(name)")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!cu) { router.replace("/onboarding"); return; }
      const ch = cu.churches as unknown as { name: string } | null;
      setChurchName(ch?.name ?? null);
      setChurchId(cu.church_id);
      setAuthLoading(false);
    }
    init();
  }, [router]);

  function parseFile(file: File) {
    if (!file.name.endsWith(".csv")) {
      alert("Please upload a .csv file.");
      return;
    }
    setFileName(file.name);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        const parsed: ParsedRow[] = results.data.map((raw, i) => {
          const firstName = (raw.first_name ?? raw["First Name"] ?? "").trim();
          const lastName = (raw.last_name ?? raw["Last Name"] ?? "").trim();
          const hasError = !firstName || !lastName;
          return {
            first_name: firstName,
            last_name: lastName,
            email: raw.email?.trim(),
            phone: raw.phone?.trim(),
            birthdate: raw.birthdate?.trim(),
            birth_year: raw.birth_year?.trim(),
            address: raw.address?.trim(),
            city: raw.city?.trim(),
            state: raw.state?.trim(),
            zip: raw.zip?.trim(),
            member_type: raw.member_type?.trim(),
            status: raw.status?.trim(),
            notes: raw.notes?.trim(),
            _rowIndex: i + 1,
            _hasError: hasError,
            _errorMsg: hasError ? "Missing first or last name" : "",
          };
        });
        setRows(parsed);
        setStep("preview");
      },
    });
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) parseFile(file);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleImport() {
    setImporting(true);
    setImportError("");

    // Re-fetch session at call time so the token is never stale or null
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const currentToken = session?.access_token ?? token;
    if (!currentToken) {
      setImportError("Session expired. Please refresh and try again.");
      setImporting(false);
      return;
    }

    const validRows = rows.filter((r) => !r._hasError).map(({ _rowIndex, _hasError, _errorMsg, ...rest }) => rest);

    const res = await fetch("/api/members/import", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${currentToken}`,
      },
      body: JSON.stringify({ rows: validRows }),
    });

    const data = await res.json();
    if (!res.ok) {
      setImportError(data.error ?? "Import failed");
      setImporting(false);
      return;
    }

    setResult(data);
    setStep("results");
    setImporting(false);
  }

  const validCount = rows.filter((r) => !r._hasError).length;
  const errorCount = rows.filter((r) => r._hasError).length;

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Loading…</div>
      </div>
    );
  }

  return (
    <AppShell navItems={navItems}>
      {/* Hero */}
      <div
        className="px-8 py-8"
        style={{ background: "linear-gradient(135deg, #1A4A2E 0%, #2D6B42 100%)" }}
      >
        <div className="flex items-center gap-3 mb-1">
          <Link href="/dashboard/members" className="text-green-300 hover:text-white text-sm transition-colors">
            ← Members
          </Link>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-green-200 text-sm mb-1">{churchName}</p>
            <h1 className="text-3xl font-bold text-white">Import Members</h1>
          </div>
          {/* Step indicator */}
          <div className="hidden sm:flex items-center gap-2">
            {(["upload","preview","results"] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{
                    backgroundColor: step === s ? "#F28C28" : (
                      (step === "preview" && s === "upload") || step === "results"
                        ? "rgba(255,255,255,0.4)"
                        : "rgba(255,255,255,0.15)"
                    ),
                    color: step === s ? "#1A4A2E" : "#fff",
                  }}
                >
                  {(step === "preview" && s === "upload") || step === "results" && s !== "results" ? "✓" : i + 1}
                </div>
                <span className="text-xs text-white/70 capitalize">{s}</span>
                {i < 2 && <span className="text-white/30 mx-1">›</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="px-8 py-8 bg-gray-50 min-h-screen">
        {/* ── STEP 1: UPLOAD ── */}
        {step === "upload" && (
          <div className="max-w-2xl">
            {/* Template download */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-6">
              <h2 className="text-base font-semibold text-gray-800 mb-1">Step 1 of 3 — Prepare your file</h2>
              <p className="text-sm text-gray-500 mb-4">
                Download the template, fill it in with your members, then upload it below.
                Required columns: <code className="text-xs bg-gray-100 px-1 rounded">first_name</code>, <code className="text-xs bg-gray-100 px-1 rounded">last_name</code>.
              </p>
              <button
                onClick={downloadTemplate}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold border-2 transition-colors hover:bg-gray-50"
                style={{ borderColor: "#1A4A2E", color: "#1A4A2E" }}
              >
                ↓ Download CSV Template
              </button>
            </div>

            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="cursor-pointer rounded-xl border-2 border-dashed transition-colors p-12 text-center"
              style={{
                borderColor: dragging ? "#1A4A2E" : "#d1d5db",
                backgroundColor: dragging ? "#f0fdf4" : "#fff",
              }}
            >
              <div className="text-5xl mb-3">📂</div>
              <p className="font-semibold text-gray-700 mb-1">
                {dragging ? "Drop it here!" : "Drag & drop your CSV file"}
              </p>
              <p className="text-sm text-gray-400">or click to browse — .csv files only</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </div>
        )}

        {/* ── STEP 2: PREVIEW ── */}
        {step === "preview" && (
          <div className="max-w-5xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-semibold text-gray-800">Preview — {fileName}</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  <span className="text-green-700 font-medium">{validCount} valid row{validCount !== 1 ? "s" : ""}</span>
                  {errorCount > 0 && (
                    <span className="text-red-600 font-medium ml-2">{errorCount} row{errorCount !== 1 ? "s" : ""} with errors</span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setStep("upload"); setRows([]); setFileName(""); }}
                  className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  ← Back
                </button>
                <button
                  onClick={handleImport}
                  disabled={importing || validCount === 0}
                  className="px-6 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-40 transition-opacity hover:opacity-90"
                  style={{ backgroundColor: "#1A4A2E" }}
                >
                  {importing ? "Importing…" : `Import ${validCount} Member${validCount !== 1 ? "s" : ""}`}
                </button>
              </div>
            </div>

            {importError && (
              <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                {importError}
              </p>
            )}

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">#</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Phone</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Birthdate</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Issue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr
                        key={row._rowIndex}
                        className="border-b border-gray-50"
                        style={{ backgroundColor: row._hasError ? "#fff5f5" : undefined }}
                      >
                        <td className="px-4 py-2.5 text-gray-400 text-xs">{row._rowIndex}</td>
                        <td className="px-4 py-2.5 font-medium text-gray-900">
                          {row.first_name || row.last_name
                            ? `${row.first_name} ${row.last_name}`.trim()
                            : <span className="text-red-400 italic">—</span>}
                        </td>
                        <td className="px-4 py-2.5 text-gray-600">{row.email || "—"}</td>
                        <td className="px-4 py-2.5 text-gray-600">{row.phone || "—"}</td>
                        <td className="px-4 py-2.5 text-gray-600">{row.birthdate || "—"}</td>
                        <td className="px-4 py-2.5">
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs capitalize">
                            {row.member_type || "member"}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`px-2 py-0.5 rounded-full text-xs capitalize ${
                            (row.status || "active") === "active"
                              ? "bg-green-50 text-green-700"
                              : "bg-gray-100 text-gray-500"
                          }`}>
                            {row.status || "active"}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          {row._hasError && (
                            <span className="text-xs text-red-600 font-medium">{row._errorMsg}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400">
                {rows.length} total rows parsed from {fileName}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 3: RESULTS ── */}
        {step === "results" && result && (
          <div className="max-w-xl">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center mb-6">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl"
                style={{ backgroundColor: result.imported > 0 ? "#F28C28" : "#fee2e2" }}
              >
                {result.imported > 0 ? "✅" : "⚠️"}
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Import Complete</h2>
              <div className="flex justify-center gap-8 mt-4">
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-700">{result.imported}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Imported</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-amber-600">{result.skipped}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Skipped (duplicate)</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-red-600">{result.errors.length}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Errors</p>
                </div>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="bg-white rounded-xl border border-red-100 shadow-sm p-6 mb-6">
                <h3 className="text-sm font-semibold text-red-700 mb-3">Failed rows</h3>
                <div className="space-y-2">
                  {result.errors.map((e) => (
                    <div key={e.row} className="flex items-start gap-3 text-sm">
                      <span className="px-2 py-0.5 bg-red-50 text-red-500 rounded text-xs font-mono flex-shrink-0">
                        Row {e.row}
                      </span>
                      <span className="text-gray-700 font-medium">{e.name}</span>
                      <span className="text-red-500 text-xs">{e.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Link
                href="/dashboard/members"
                className="flex-1 py-3 rounded-xl font-semibold text-sm text-center text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: "#1A4A2E" }}
              >
                View Members
              </Link>
              <button
                onClick={() => { setStep("upload"); setRows([]); setFileName(""); setResult(null); }}
                className="flex-1 py-3 rounded-xl font-semibold text-sm border-2 text-gray-700 border-gray-300 hover:bg-gray-50 transition-colors"
              >
                Import Another File
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
