import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";

interface PageProps {
  searchParams?: { check?: string; error?: string };
}

export const metadata = {
  title: "Sign in — Telescope",
};

export default async function LoginPage({ searchParams }: PageProps) {
  const session = await auth();
  if (session?.user) redirect("/");

  const checkEmail = searchParams?.check === "email";
  const error = searchParams?.error;

  const googleEnabled = Boolean(
    process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
  );
  const emailEnabled = Boolean(
    process.env.EMAIL_SERVER && process.env.EMAIL_FROM
  );

  return (
    <main style={pageStyle}>
      <Link href="/" style={backLinkStyle}>
        ← Back to the sky
      </Link>
      <header style={headerStyle}>
        <h1 style={titleStyle}>Sign in</h1>
        <p style={subtitleStyle}>
          Sign in to favorite stars, mark constellations as viewed, and
          remember your location.
        </p>
      </header>

      {checkEmail && (
        <div style={infoBox}>
          Check your email for a sign-in link.
        </div>
      )}
      {error && (
        <div style={errorBox}>
          Something went wrong while signing in
          {error === "OAuthAccountNotLinked"
            ? " — that email is already linked to a different provider."
            : "."}
        </div>
      )}

      {googleEnabled && (
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/" });
          }}
        >
          <button type="submit" style={primaryButtonStyle}>
            Continue with Google
          </button>
        </form>
      )}

      {emailEnabled && (
        <>
          {googleEnabled && <div style={dividerStyle}>or</div>}
          <form
            action={async (formData: FormData) => {
              "use server";
              const email = String(formData.get("email") ?? "").trim();
              if (!email) return;
              await signIn("nodemailer", {
                email,
                redirectTo: "/",
              });
            }}
            style={emailFormStyle}
          >
            <label htmlFor="email" style={labelStyle}>
              Email address
            </label>
            <input
              id="email"
              type="email"
              name="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              style={inputStyle}
            />
            <button type="submit" style={secondaryButtonStyle}>
              Email me a sign-in link
            </button>
          </form>
        </>
      )}

      {!googleEnabled && !emailEnabled && (
        <div style={errorBox}>
          No auth providers are configured. Set <code>AUTH_GOOGLE_ID</code> /
          <code>AUTH_GOOGLE_SECRET</code> or <code>EMAIL_SERVER</code> /
          <code>EMAIL_FROM</code> in <code>.env.local</code>.
        </div>
      )}
    </main>
  );
}

const pageStyle: React.CSSProperties = {
  maxWidth: 420,
  margin: "0 auto",
  padding: "80px 24px",
  color: "#e5ecff",
  fontFamily:
    "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
  lineHeight: 1.5,
};

const backLinkStyle: React.CSSProperties = {
  display: "inline-block",
  color: "#9ec0ff",
  textDecoration: "none",
  fontSize: 13,
  marginBottom: 32,
};

const headerStyle: React.CSSProperties = { marginBottom: 28 };

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 32,
  fontWeight: 600,
  letterSpacing: "-0.01em",
};

const subtitleStyle: React.CSSProperties = {
  margin: "10px 0 0",
  color: "#98a6c9",
  fontSize: 14,
};

const primaryButtonStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "12px 16px",
  background: "#fff",
  color: "#111",
  border: "none",
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
};

const secondaryButtonStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "12px 16px",
  background: "rgba(120, 150, 220, 0.15)",
  color: "#e5ecff",
  border: "1px solid rgba(120, 150, 220, 0.4)",
  borderRadius: 8,
  fontSize: 14,
  cursor: "pointer",
};

const dividerStyle: React.CSSProperties = {
  textAlign: "center",
  color: "#7e8aac",
  fontSize: 12,
  margin: "16px 0",
  textTransform: "uppercase",
  letterSpacing: "0.1em",
};

const emailFormStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  color: "#98a6c9",
};

const inputStyle: React.CSSProperties = {
  padding: "10px 12px",
  background: "rgba(0,0,0,0.4)",
  color: "#e5ecff",
  border: "1px solid rgba(120, 150, 220, 0.3)",
  borderRadius: 8,
  fontSize: 14,
};

const infoBox: React.CSSProperties = {
  marginBottom: 16,
  padding: "12px 14px",
  background: "rgba(120, 200, 150, 0.12)",
  border: "1px solid rgba(120, 200, 150, 0.3)",
  borderRadius: 8,
  color: "#cfeedd",
  fontSize: 13,
};

const errorBox: React.CSSProperties = {
  marginBottom: 16,
  padding: "12px 14px",
  background: "rgba(220, 100, 100, 0.12)",
  border: "1px solid rgba(220, 100, 100, 0.3)",
  borderRadius: 8,
  color: "#ffd5d5",
  fontSize: 13,
};
