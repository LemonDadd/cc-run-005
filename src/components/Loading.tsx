export function Loading({ label = "加载中…" }: { label?: string }) {
  return (
    <div className="center grow" style={{ flexDirection: "column", gap: 18 }}>
      <div className="float" style={{ fontSize: 80 }} aria-hidden>
        🐟
      </div>
      <div className="muted" style={{ fontSize: 22, fontWeight: 700 }}>
        {label}
      </div>
    </div>
  );
}
