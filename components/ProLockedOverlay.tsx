"use client";

type Props = { mode?: "page" | "section" };

export function ProLockedOverlay({ mode = "page" }: Props) {
  const inner = (
    <div className="text-center px-10 py-10 max-w-xs">
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center text-2xl mx-auto mb-4"
        style={{ backgroundColor: "#F28C2818" }}
      >
        🔒
      </div>
      <p className="text-base font-bold text-gray-900 mb-1">Upgrade to unlock — $10/month</p>
      <p className="text-sm text-gray-500 mb-5">Get access to premium ministry tools</p>
      <button
        className="px-7 py-2.5 rounded-xl font-semibold text-sm text-white hover:opacity-90 transition-opacity"
        style={{ backgroundColor: "#F28C28" }}
      >
        Learn More
      </button>
    </div>
  );

  if (mode === "section") {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-white/95 backdrop-blur-sm rounded-2xl z-10">
        {inner}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center bg-gray-50 py-20">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        {inner}
      </div>
    </div>
  );
}
