"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";

interface Row {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  approvedAt: string | null;
}

export default function AdminClient() {
  const [pending, setPending] = useState<Row[]>([]);
  const [approved, setApproved] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/formateurs");
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { pending: Row[]; approved: Row[] };
      setPending(data.pending);
      setApproved(data.approved);
    } catch {
      toast.error("Impossible de charger les demandes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function act(id: string, action: "approve" | "reject", name: string) {
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/formateurs/${id}/${action}`, { method: "POST" });
      if (!res.ok) throw new Error();
      const row = pending.find((r) => r.id === id);
      setPending((p) => p.filter((r) => r.id !== id));
      if (action === "approve" && row) {
        setApproved((a) => [{ ...row, approvedAt: new Date().toISOString() }, ...a]);
        toast.success(`${name} approuvé · email envoyé`);
      } else {
        toast.success(`${name} rejeté`);
      }
    } catch {
      toast.error("Action impossible. Réessayez.");
    } finally {
      setBusy(null);
    }
  }

  const fmt = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—";

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 20px" }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#111827", margin: 0 }}>Administration</h1>
        <p style={{ color: "#6B7280", fontSize: 14, marginTop: 4 }}>Demandes d&apos;accès des formateurs</p>
      </div>

      {/* Demandes en attente */}
      <section style={card}>
        <div style={cardHeader}>
          <span style={{ fontWeight: 700, color: "#111827" }}>Demandes en attente</span>
          <span style={badge}>{pending.length}</span>
        </div>
        {loading ? (
          <p style={muted}>Chargement…</p>
        ) : pending.length === 0 ? (
          <p style={muted}>Aucune demande en attente.</p>
        ) : (
          pending.map((r) => (
            <div key={r.id} style={rowStyle}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: "#111827" }}>{r.name}</div>
                <div style={{ fontSize: 13, color: "#6B7280" }}>{r.email} · {fmt(r.createdAt)}</div>
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <button disabled={busy === r.id} onClick={() => act(r.id, "approve", r.name)} style={btn("#16A34A")}>
                  Approuver
                </button>
                <button disabled={busy === r.id} onClick={() => act(r.id, "reject", r.name)} style={btn("#B91C1C")}>
                  Rejeter
                </button>
              </div>
            </div>
          ))
        )}
      </section>

      {/* Formateurs actifs */}
      <section style={{ ...card, marginTop: 20 }}>
        <div style={cardHeader}>
          <span style={{ fontWeight: 700, color: "#111827" }}>Formateurs actifs</span>
          <span style={{ ...badge, background: "#EFF6FF", color: "#1D4ED8" }}>{approved.length}</span>
        </div>
        {loading ? (
          <p style={muted}>Chargement…</p>
        ) : approved.length === 0 ? (
          <p style={muted}>Aucun formateur actif.</p>
        ) : (
          approved.map((r) => (
            <div key={r.id} style={rowStyle}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: "#111827" }}>{r.name}</div>
                <div style={{ fontSize: 13, color: "#6B7280" }}>{r.email}</div>
              </div>
              <div style={{ fontSize: 12, color: "#16A34A", flexShrink: 0 }}>Approuvé · {fmt(r.approvedAt)}</div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}

const card: React.CSSProperties = {
  background: "#fff", border: "1px solid #E5E7EB", borderRadius: 16, overflow: "hidden",
};
const cardHeader: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 10, padding: "16px 20px", borderBottom: "1px solid #F1F5F9",
};
const badge: React.CSSProperties = {
  background: "#FEF3C7", color: "#B45309", fontSize: 12, fontWeight: 700, borderRadius: 999, padding: "2px 10px",
};
const rowStyle: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "14px 20px",
  borderBottom: "1px solid #F8FAFC",
};
const muted: React.CSSProperties = { color: "#9CA3AF", fontSize: 14, padding: "16px 20px", margin: 0 };
const btn = (bg: string): React.CSSProperties => ({
  background: bg, color: "#fff", border: "none", borderRadius: 9, padding: "8px 14px",
  fontSize: 13, fontWeight: 700, cursor: "pointer",
});
