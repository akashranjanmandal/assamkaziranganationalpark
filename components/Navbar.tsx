"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslation } from "@/lib/i18n/I18nProvider";

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const t = useTranslation();

  const NAV_LINKS = [
    { href: "/", label: t("nav_home") },
    { href: "/itineraries", label: t("nav_itineraries") },
    { href: "/car-rental", label: t("nav_car_rental") },
    { href: "/booking", label: t("nav_booking") },
    { href: "/reviews", label: t("nav_reviews") },
  ];

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    document.documentElement.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <nav className="navbar">
        <Link href="/" className="nav-logo-group">
          <Image src="/images/logo.jpeg" alt="Assam Wild Safari" width={44} height={44} className="nav-logo-img" />
          <div className="nav-logo-text">
            <span className="nav-logo-name">
              Assam <span>Wild</span> Safari
            </span>
            <span className="nav-logo-sub">Northeast India&apos;s Premium Safari</span>
          </div>
        </Link>
        <div
          className={`hamburger${open ? " active" : ""}`}
          onClick={() => setOpen((v) => !v)}
          role="button"
          aria-label="Toggle menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </div>
      </nav>

      <ul className={`nav-links${open ? " open" : ""}`}>
        <button className="nav-close-btn" aria-label="Close menu" onClick={() => setOpen(false)}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        {NAV_LINKS.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className={pathname === link.href ? "active" : ""}
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          </li>
        ))}
        <li className="nav-cta-item">
          <Link href="/booking" className="nav-cta" onClick={() => setOpen(false)}>
            {t("nav_book_safari")}
          </Link>
        </li>
        <li className="nav-recognised">
          <span className="rec-label">
            Recognised by Department of Tourism Government Assam, and Bodoland Tourism
          </span>
          <div className="rec-logos">
            <Image src="/images/assam-logo.jpg" alt="Government of Assam" width={80} height={40} className="rec-logo" />
            <Image src="/images/bodoland.jpg" alt="Bodoland Territorial Council" width={80} height={40} className="rec-logo" />
          </div>
        </li>
      </ul>
      <div className={`nav-overlay${open ? " active" : ""}`} onClick={() => setOpen(false)} />
    </>
  );
}
