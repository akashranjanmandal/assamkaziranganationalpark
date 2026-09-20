"use client";

import Link from "next/link";
import Image from "next/image";
import { useTranslation } from "@/lib/i18n/I18nProvider";

export function Footer() {
  const t = useTranslation();
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div>
          <div className="footer-logo-group">
            <Image src="/images/logo.jpeg" alt="Assam Wild Safari" width={140} height={52} className="footer-logo-img" />
            <div className="powered-by">Powered by Manas Holidays</div>
          </div>
          <p className="footer-desc">{t("footer_desc")}</p>
          <p className="footer-contact-info" style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.5)", marginTop: "1rem" }}>
            Abhayapuri, Assam
            <br />
            Email:{" "}
            <a href="mailto:assammanas@gmail.com" style={{ color: "var(--gold)" }}>
              assammanas@gmail.com
            </a>
          </p>
        </div>
        <div>
          <div className="footer-col-title">{t("footer_col1")}</div>
          <ul className="footer-links">
            <li>
              <Link href="/itineraries#kaziranga">{t("footer_link_kaz")}</Link>
            </li>
            <li>
              <Link href="/itineraries#manas">{t("footer_link_manas")}</Link>
            </li>
            <li>
              <Link href="/reviews">{t("footer_link_reports")}</Link>
            </li>
          </ul>
        </div>
        <div>
          <div className="footer-col-title">{t("footer_col2")}</div>
          <ul className="footer-links">
            <li>
              <Link href="/booking">{t("footer_link_book")}</Link>
            </li>
            <li>
              <Link href="/itineraries">{t("footer_link_intel")}</Link>
            </li>
            <li>
              <Link href="/reviews">{t("footer_link_reviews")}</Link>
            </li>
            <li>
              <Link href="/car-rental">{t("footer_link_car")}</Link>
            </li>
          </ul>
        </div>
        <div>
          <div className="footer-col-title">{t("footer_col3")}</div>
          <ul className="footer-links">
            <li>
              <a href="tel:+919365609948">+91 93656 09948</a>
            </li>
            <li>
              <a href="tel:+919709884206">+91 97098 84206</a>
            </li>
            <li>
              <a href="https://wa.me/919365609948" target="_blank" rel="noopener">
                {t("footer_link_wa")}
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom">{t("footer_bottom")}</div>
    </footer>
  );
}
