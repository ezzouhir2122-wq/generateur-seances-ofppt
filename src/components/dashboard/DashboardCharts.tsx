"use client";

import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";

interface MonthlyPoint { name: string; seances: number; fiches: number; }
interface FilierePoint { filiere: string; _count: { id: number }; }

const PIE_COLORS = ["#3B82F6", "#22C55E", "#F97316", "#A855F7", "#EAB308"];

export default function DashboardCharts({
  monthlyData,
  filiereData,
  totalSeances,
}: {
  monthlyData: MonthlyPoint[];
  filiereData: FilierePoint[];
  totalSeances: number;
}) {
  const pieData = filiereData.map((f) => ({
    name: f.filiere.length > 22 ? f.filiere.slice(0, 22) + "…" : f.filiere,
    value: totalSeances > 0 ? Math.round((f._count.id / totalSeances) * 100) : 0,
  }));

  return (
    <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: "20px" }}>
      {/* Line chart */}
      <div style={{ background: "white", borderRadius: "12px", padding: "24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
          <h3 style={{ fontSize: "15px", fontWeight: 600, color: "#111827", letterSpacing: "-0.01em" }}>
            Aperçu des activités
          </h3>
          <span style={{ fontSize: "11px", color: "#6B7280", border: "1px solid #E5E7EB", padding: "3px 10px", borderRadius: "6px" }}>
            6 derniers mois ↓
          </span>
        </div>
        <div style={{ display: "flex", gap: "20px", marginBottom: "16px" }}>
          {[
            { color: "#3B82F6", label: "Séances générées" },
            { color: "#22C55E", label: "Fiches pédagogiques" },
          ].map((l) => (
            <div key={l.label} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{ width: "24px", height: "2px", background: l.color, borderRadius: "1px" }} />
              <span style={{ fontSize: "11px", color: "#6B7280" }}>{l.label}</span>
            </div>
          ))}
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={monthlyData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: "#9CA3AF", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#9CA3AF", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: "white", border: "1px solid #E5E7EB", borderRadius: "8px", fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
              labelStyle={{ color: "#111827", fontWeight: 600 }}
            />
            <Line type="monotone" dataKey="seances" stroke="#3B82F6" strokeWidth={2} dot={{ r: 4, fill: "#3B82F6", stroke: "white", strokeWidth: 2 }} name="Séances" />
            <Line type="monotone" dataKey="fiches" stroke="#22C55E" strokeWidth={2} dot={{ r: 4, fill: "#22C55E", stroke: "white", strokeWidth: 2 }} name="Fiches" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Donut chart */}
      <div style={{ background: "white", borderRadius: "12px", padding: "24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <h3 style={{ fontSize: "15px", fontWeight: 600, color: "#111827", letterSpacing: "-0.01em", marginBottom: "16px" }}>
          Répartition par filière
        </h3>
        {pieData.length > 0 ? (
          <>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <ResponsiveContainer width={180} height={150}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" innerRadius={50} outerRadius={72} paddingAngle={3} startAngle={90} endAngle={-270}>
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => [`${v}%`]} contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E5E7EB" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
              {pieData.map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                    <span style={{ fontSize: "12px", color: "#374151" }}>{item.name}</span>
                  </div>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "#111827" }}>{item.value}%</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "48px 0", color: "#9CA3AF", fontSize: "12px", lineHeight: 1.6 }}>
            Aucune filière disponible.<br />
            Générez des séances pour voir la répartition.
          </div>
        )}
      </div>
    </div>
  );
}
