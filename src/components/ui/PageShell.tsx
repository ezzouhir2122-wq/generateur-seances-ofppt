import Link from "next/link";
import React from "react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageShellProps {
  title: string;
  subtitle?: string;
  icon?: string;
  breadcrumb?: BreadcrumbItem[];
  action?: { label: string; href: string };
  /** Désactive le padding contenu — pour pages full-height (ex: Assistant) */
  noPadding?: boolean;
  children: React.ReactNode;
}

export default function PageShell({
  title,
  subtitle,
  icon,
  breadcrumb,
  action,
  noPadding = false,
  children,
}: PageShellProps) {
  return (
    <div
      style={{
        minHeight: "100%",
        background: "#EEF2F7",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* ── Bande header ── */}
      <div
        style={{
          background: "#003087",
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.068) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
          borderBottom: "3px solid #16A34A",
          padding: "18px 32px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          {icon && (
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                flexShrink: 0,
                background: "rgba(255,255,255,0.13)",
                border: "1px solid rgba(255,255,255,0.20)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "19px",
              }}
            >
              {icon}
            </div>
          )}
          <div>
            <h1
              style={{
                fontSize: "19px",
                fontWeight: 800,
                color: "#FFFFFF",
                letterSpacing: "-0.025em",
                lineHeight: 1.2,
                margin: 0,
              }}
            >
              {title}
            </h1>
            {subtitle && (
              <p
                style={{
                  fontSize: "12.5px",
                  color: "rgba(255,255,255,0.58)",
                  lineHeight: 1.45,
                  margin: "3px 0 0",
                }}
              >
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {action && (
          <Link
            href={action.href}
            style={{
              flexShrink: 0,
              background: "#16A34A",
              color: "#FFFFFF",
              padding: "9px 17px",
              borderRadius: "9px",
              fontSize: "12.5px",
              fontWeight: 700,
              textDecoration: "none",
              whiteSpace: "nowrap",
              boxShadow: "0 2px 10px rgba(22,163,74,0.35)",
            }}
          >
            {action.label}
          </Link>
        )}
      </div>

      {/* ── Fil d'Ariane ── */}
      {breadcrumb && breadcrumb.length > 0 && (
        <div
          style={{
            background: "#FFFFFF",
            borderBottom: "1px solid #E5E7EB",
            padding: "8px 32px",
            display: "flex",
            alignItems: "center",
            gap: "5px",
            flexShrink: 0,
          }}
        >
          {breadcrumb.map((crumb, i) => (
            <React.Fragment key={i}>
              {i > 0 && (
                <span style={{ fontSize: "11px", color: "#D1D5DB" }}>›</span>
              )}
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  style={{
                    fontSize: "11.5px",
                    color: i === breadcrumb.length - 1 ? "#111827" : "#6B7280",
                    fontWeight: i === breadcrumb.length - 1 ? 600 : 500,
                    textDecoration: "none",
                  }}
                >
                  {crumb.label}
                </Link>
              ) : (
                <span
                  style={{
                    fontSize: "11.5px",
                    color: i === breadcrumb.length - 1 ? "#111827" : "#6B7280",
                    fontWeight: i === breadcrumb.length - 1 ? 600 : 500,
                  }}
                >
                  {crumb.label}
                </span>
              )}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* ── Zone contenu ── */}
      <div
        style={
          noPadding
            ? { flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }
            : { padding: "28px 32px 60px" }
        }
      >
        {children}
      </div>
    </div>
  );
}
