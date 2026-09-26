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
interface Stats {
  formateurs: { actifs: number; enAttente: number; desactives: number; rejetes: number };
  contenu: { seances: number; fiches: number; simulations: number; stagiaires: number; groupes: number; chats: number };
}

export default function AdminClient() {
  const [pending, setPending] = useState<Row[]>([]);
  const [approved, setApproved] = useState<Row[]>([]);
  const [suspended, setSuspended] = useState<Row[]>([]);
  const [rejected, setRejected] = useState<Row[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [f, s] = await Promise.all([
        fetch("/api/admin/formateurs").then((r) => r.json()),
        fetch("/api/admin/stats").then((r) => r.json()),
      ]);
      setPending(f.pending ?? []);
      setApproved(f.approved ?? []);
      setSuspended(f.suspended ?? []);
      setRejected(f.rejected ?? []);
      setStats(s?.formateurs ? s : null);
    } catch {
      toast.error("Impossible de charger les données.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function act(id: string, action: "approve" | "reject" | "revoke" | "reactivate" | "suspend" | "activate", name: string) {
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/formateurs/${id}/${action}`, { method: "POST" });
      if (!res.ok) throw new Error();
      toast.success(
        action === "approve" ? `${name} approuvé · email envoyé`
        : action === "reject" ? `${name} rejeté`
        : action === "revoke" ? `Accès de ${name} révoqué`
        : action === "suspend" ? `${name} désactivé`
        : action === "activate" ? `${name} réactivé`
        : `${name} réactivé`
      );
      await load(); // recharge listes + stats
    } catch {
      toast.error("Action impossible. Réessayez.");
    } finally {
      setBusy(null);
    }
  }

  const fmt = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—";

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "32px 20px 64px" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#111827", margin: 0 }}>Tableau de bord — Administration</h1>
        <p style={{ color: "#6B7280", fontSize: 14, marginTop: 4 }}>Gestion des formateurs et statistiques de la plateforme</p>
      </div>

      {/* ── Statistiques ── */}
      <section id="statistiques" style={{ marginBottom: 28, scrollMarginTop: 16 }}>
        <h2 style={sectionTitle}>Statistiques</h2>
        <div style={grid}>
          <Stat label="Formateurs actifs" value={stats?.formateurs.actifs} color="#16A34A" />
          <Stat label="En attente" value={stats?.formateurs.enAttente} color="#B45309" />
          <Stat label="Désactivés" value={stats?.formateurs.desactives} color="#6B7280" />
          <Stat label="Rejetés" value={stats?.formateurs.rejetes} color="#B91C1C" />
          <Stat label="Séances générées" value={stats?.contenu.seances} color="#003087" />
          <Stat label="Fiches générées" value={stats?.contenu.fiches} color="#003087" />
          <Stat label="Simulations" value={stats?.contenu.simulations} color="#003087" />
          <Stat label="Stagiaires" value={stats?.contenu.stagiaires} color="#6D28D9" />
          <Stat label="Groupes" value={stats?.contenu.groupes} color="#6D28D9" />
          <Stat label="Sessions Assistant IA" value={stats?.contenu.chats} color="#6D28D9" />
        </div>
      </section>

      {/* ── Formateurs ── */}
      <section id="formateurs" style={{ scrollMarginTop: 16 }}>
        <h2 style={sectionTitle}>Formateurs</h2>

        <Card title="Demandes en attente" count={pending.length} badge="#FEF3C7" badgeText="#B45309">
          {loading ? <Muted>Chargement…</Muted> : pending.length === 0 ? <Muted>Aucune demande en attente.</Muted> :
            pending.map((r) => (
              <RowLine key={r.id} r={r} sub={fmt(r.createdAt)}>
                <Btn color="#16A34A" disabled={busy === r.id} onClick={() => act(r.id, "approve", r.name)}>Approuver</Btn>
                <Btn color="#B91C1C" disabled={busy === r.id} onClick={() => act(r.id, "reject", r.name)}>Rejeter</Btn>
              </RowLine>
            ))}
        </Card>

        <Card title="Formateurs actifs" count={approved.length} badge="#EFF6FF" badgeText="#1D4ED8">
          {loading ? <Muted>Chargement…</Muted> : approved.length === 0 ? <Muted>Aucun formateur actif.</Muted> :
            approved.map((r) => (
              <RowLine key={r.id} r={r} sub={`Approuvé · ${fmt(r.approvedAt)}`}>
                <Btn color="#6B7280" outline disabled={busy === r.id} onClick={() => act(r.id, "suspend", r.name)}>Désactiver</Btn>
                <Btn color="#B91C1C" outline disabled={busy === r.id} onClick={() => act(r.id, "revoke", r.name)}>Révoquer l&apos;accès</Btn>
              </RowLine>
            ))}
        </Card>

        <Card title="Formateurs désactivés" count={suspended.length} badge="#F3F4F6" badgeText="#374151">
          {loading ? <Muted>Chargement…</Muted> : suspended.length === 0 ? <Muted>Aucun formateur désactivé.</Muted> :
            suspended.map((r) => (
              <RowLine key={r.id} r={r} sub={`Désactivé · approuvé le ${fmt(r.approvedAt)}`}>
                <Btn color="#16A34A" disabled={busy === r.id} onClick={() => act(r.id, "activate", r.name)}>Activer</Btn>
              </RowLine>
            ))}
        </Card>

        <Card title="Formateurs rejetés" count={rejected.length} badge="#FEF2F2" badgeText="#B91C1C">
          {loading ? <Muted>Chargement…</Muted> : rejected.length === 0 ? <Muted>Aucun compte rejeté.</Muted> :
            rejected.map((r) => (
              <RowLine key={r.id} r={r} sub={fmt(r.createdAt)}>
                <Btn color="#16A34A" outline disabled={busy === r.id} onClick={() => act(r.id, "reactivate", r.name)}>Réactiver</Btn>
              </RowLine>
            ))}
        </Card>
      </section>
    </div>
  );
}

/* ── Sous-composants ── */
function Stat({ label, value, color }: { label: string; value?: number; color: string }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 14, padding: "16px 18px" }}>
      <div style={{ fontSize: 26, fontWeight: 800, color, lineHeight: 1 }}>{value ?? "—"}</div>
      <div style={{ fontSize: 12, color: "#6B7280", marginTop: 6 }}>{label}</div>
    </div>
  );
}
function Card({ title, count, badge, badgeText, children }: { title: string; count: number; badge: string; badgeText: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 16, overflow: "hidden", marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 20px", borderBottom: "1px solid #F1F5F9" }}>
        <span style={{ fontWeight: 700, color: "#111827" }}>{title}</span>
        <span style={{ background: badge, color: badgeText, fontSize: 12, fontWeight: 700, borderRadius: 999, padding: "2px 10px" }}>{count}</span>
      </div>
      {children}
    </div>
  );
}
function RowLine({ r, sub, children }: { r: Row; sub: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "14px 20px", borderBottom: "1px solid #F8FAFC" }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 600, color: "#111827" }}>{r.name}</div>
        <div style={{ fontSize: 13, color: "#6B7280" }}>{r.email} · {sub}</div>
      </div>
      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>{children}</div>
    </div>
  );
}
function Btn({ color, outline, disabled, onClick, children }: { color: string; outline?: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: outline ? "transparent" : color,
      color: outline ? color : "#fff",
      border: outline ? `1px solid ${color}` : "none",
      borderRadius: 9, padding: "8px 14px", fontSize: 13, fontWeight: 700,
      cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.6 : 1, whiteSpace: "nowrap",
    }}>{children}</button>
  );
}
function Muted({ children }: { children: React.ReactNode }) {
  return <p style={{ color: "#9CA3AF", fontSize: 14, padding: "16px 20px", margin: 0 }}>{children}</p>;
}

const sectionTitle: React.CSSProperties = { fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#6B7280", margin: "0 0 12px" };
const grid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 };
