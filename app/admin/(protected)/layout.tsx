"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const TABS = [
  { href: "/admin/bookings", label: "Bookings" },
  { href: "/admin/reviews", label: "Reviews" },
  { href: "/admin/car-rentals", label: "Car Rentals" },
  { href: "/admin/vehicles", label: "Vehicles" },
  { href: "/admin/trending", label: "Trending" },
  { href: "/admin/drop-rates", label: "Drop Rates" },
];

export default function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="admin-shell">
      <div className="admin-header">
        <div className="admin-logo">
          Assam <span>Wild</span> Safari{" "}
          <span style={{ fontSize: "0.7rem", opacity: 0.5, fontWeight: 400, letterSpacing: "0.15em", textTransform: "uppercase" }}>
            Admin
          </span>
        </div>
        <button className="admin-logout" onClick={() => signOut({ callbackUrl: "/admin/login" })}>
          Logout
        </button>
      </div>

      <div className="admin-tabs">
        {TABS.map((tab) => (
          <Link key={tab.href} href={tab.href} className={`tab-btn${pathname === tab.href ? " active" : ""}`}>
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="admin-body">{children}</div>
    </div>
  );
}
