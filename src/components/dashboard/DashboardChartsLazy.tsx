"use client";

import dynamic from "next/dynamic";

interface MonthlyPoint { name: string; seances: number; fiches: number; }
interface FilierePoint { filiere: string; _count: { id: number }; }

/* Skeleton affiché instantanément pendant le téléchargement de Recharts.
   Occupe exactement la place des vrais graphiques → pas de saut de mise en page
   et l'écran se remplit tout de suite (meilleur Speed Index). */
function ChartsSkeleton() {
  const card: React.CSSProperties = {
    background: "white", borderRadius: "12px", padding: "24px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)", minHeight: "296px",
  };
  const shimmer: React.CSSProperties = {
    background: "linear-gradient(90deg,#F3F4F6 25%,#E9EBEF 37%,#F3F4F6 63%)",
    backgroundSize: "400% 100%",
    animation: "cc-shimmer 1.4s ease infinite",
    borderRadius: "8px",
  };
  return (
    <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: "20px" }}>
      <style>{`@keyframes cc-shimmer{0%{background-position:100% 0}100%{background-position:-100% 0}}`}</style>
      <div style={card}>
        <div style={{ ...shimmer, width: "40%", height: "16px", marginBottom: "20px" }} />
        <div style={{ ...shimmer, width: "100%", height: "200px" }} />
      </div>
      <div style={card}>
        <div style={{ ...shimmer, width: "60%", height: "16px", marginBottom: "20px" }} />
        <div style={{ ...shimmer, width: "150px", height: "150px", borderRadius: "50%", margin: "0 auto" }} />
      </div>
    </div>
  );
}

const DashboardCharts = dynamic(() => import("./DashboardCharts"), {
  ssr: false,
  loading: () => <ChartsSkeleton />,
});

export default function DashboardChartsLazy(props: {
  monthlyData: MonthlyPoint[];
  filiereData: FilierePoint[];
  totalSeances: number;
}) {
  return <DashboardCharts {...props} />;
}
