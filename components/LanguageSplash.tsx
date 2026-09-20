"use client";

import { useI18n } from "@/lib/i18n/I18nProvider";

/**
 * First-visit language picker, ported from lang.js's `buildSplash()`.
 * Shown once until a language is chosen (persisted to localStorage), then
 * available again via the floating "Change Language" button.
 */
export function LanguageSplash() {
  const { showSplash, setLang, languages, t } = useI18n();

  if (!showSplash) return null;

  const primary = languages.filter((l) => l.primary);
  const other = languages.filter((l) => !l.primary);

  return (
    <div
      id="lang-splash"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 20000,
        background: "rgba(5,13,6,0.97)",
        backdropFilter: "blur(10px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem 1.2rem",
      }}
    >
      <div style={{ width: "100%", maxWidth: 560, textAlign: "center" }}>
        <div
          style={{
            fontSize: "0.65rem",
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            color: "var(--gold, #b5943b)",
            fontWeight: 700,
            marginBottom: "0.6rem",
          }}
        >
          {t("lp_title")}
        </div>
        <p
          style={{
            color: "rgba(255,255,255,0.5)",
            fontSize: "0.9rem",
            marginBottom: "2rem",
          }}
        >
          {t("lp_subtitle")}
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "0.75rem",
            marginBottom: "1.5rem",
          }}
        >
          {primary.map((l) => (
            <button
              key={l.code}
              onClick={() => setLang(l.code)}
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "#fff",
                padding: "1.1rem 0.8rem",
                cursor: "pointer",
                borderRadius: 6,
                textAlign: "left",
              }}
            >
              <div style={{ fontSize: "1.15rem", fontWeight: 700, lineHeight: 1.2 }}>
                {l.native}
              </div>
              <div
                style={{
                  fontSize: "0.65rem",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.45)",
                }}
              >
                {l.name}
              </div>
            </button>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.8rem",
            color: "rgba(255,255,255,0.25)",
            fontSize: "0.65rem",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            margin: "1rem 0",
          }}
        >
          <span style={{ flex: 1, borderTop: "1px solid rgba(255,255,255,0.1)" }} />
          {t("lp_other")}
          <span style={{ flex: 1, borderTop: "1px solid rgba(255,255,255,0.1)" }} />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "0.6rem",
          }}
        >
          {other.map((l) => (
            <button
              key={l.code}
              onClick={() => setLang(l.code)}
              style={{
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.8)",
                padding: "0.7rem 0.5rem",
                cursor: "pointer",
                borderRadius: 6,
                fontSize: "0.95rem",
              }}
            >
              {l.native}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Floating "Change Language" button, ported from lang.js's injectChangeLangBtn(). */
export function LanguageChangeButton({ hidden = false }: { hidden?: boolean }) {
  const { t, openSplash } = useI18n();

  if (hidden) return null;

  return (
    <button
      title="Change Language"
      onClick={openSplash}
      style={{
        position: "fixed",
        bottom: "1.2rem",
        right: "1.2rem",
        zIndex: 9000,
        background: "rgba(13,26,15,0.92)",
        border: "1px solid rgba(201,163,79,0.4)",
        color: "#c9a34f",
        fontSize: "0.65rem",
        fontWeight: 700,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        padding: "0.55rem 1rem",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        backdropFilter: "blur(8px)",
        borderRadius: 20,
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" />
      </svg>
      {t("lp_change")}
    </button>
  );
}
