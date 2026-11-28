"use client";

export default function OfflineActions() {
  return (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
      <button
        type="button"
        className="btn solid"
        onClick={() => window.location.reload()}
      >
        Try again <span className="arw">↻</span>
      </button>
    </div>
  );
}
