"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getSettings } from "@/lib/store";

const NAV = [
  { href: "/", icon: "\u{1F3E0}", label: "Dashboard" },
  { href: "/create", icon: "\u{1F3AC}", label: "New Video" },
  { href: "/projects", icon: "\u{1F4C1}", label: "Projects" },
  { href: "/settings", icon: "\u{2699}\u{FE0F}", label: "Settings" },
];

export default function Sidebar() {
  const path = usePathname();
  const [spent, setSpent] = useState(0);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const s = getSettings();
    setSpent(s.totalSpent);
    setCount(s.totalVideosCreated);
  }, [path]);

  if (path === "/onboarding") return null;

  return (
    <aside style={{
      position: "fixed", left: 0, top: 0, bottom: 0, width: 220,
      background: "linear-gradient(180deg, #0d1117 0%, #080b11 100%)",
      borderRight: "1px solid #151c28",
      display: "flex", flexDirection: "column", zIndex: 50,
    }}>
      {/* Logo */}
      <div style={{ padding: "24px 20px 20px", borderBottom: "1px solid #151c28" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: "linear-gradient(135deg, #2563eb, #7c3aed)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14,
          }}>R</div>
          <div>
            <h1 style={{ fontSize: 16, fontWeight: 700, color: "#fff", lineHeight: 1 }}>ReelzFactory</h1>
            <span style={{ fontSize: 10, color: "#475569", fontFamily: "monospace" }}>v2.0 beta</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: "16px 10px", display: "flex", flexDirection: "column", gap: 2 }}>
        {NAV.map((item) => {
          const active = path === item.href;
          return (
            <Link key={item.href} href={item.href} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 12px", borderRadius: 10, fontSize: 13,
              textDecoration: "none", transition: "all 0.15s",
              background: active ? "rgba(37,99,235,0.15)" : "transparent",
              color: active ? "#60a5fa" : "#64748b",
              fontWeight: active ? 600 : 400,
              borderLeft: active ? "2px solid #2563eb" : "2px solid transparent",
            }}>
              <span style={{ fontSize: 15, opacity: active ? 1 : 0.7 }}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer Stats */}
      <div style={{ padding: "16px 20px", borderTop: "1px solid #151c28" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 6 }}>
          <span style={{ color: "#475569" }}>This month</span>
          <span style={{ color: "#10b981", fontFamily: "monospace", fontWeight: 600 }}>${spent.toFixed(2)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
          <span style={{ color: "#475569" }}>Videos</span>
          <span style={{ color: "#94a3b8", fontFamily: "monospace" }}>{count}</span>
        </div>
      </div>
    </aside>
  );
}