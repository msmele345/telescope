import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import LoginForm from "@/components/LoginForm";
import { safeReturnTo } from "@/lib/auth-policy";

export const metadata = {
  title: "Sign in — Telescope",
};

interface Props {
  searchParams: { returnTo?: string | string[] };
}

export default async function LoginPage({ searchParams }: Props) {
  const returnTo = safeReturnTo(searchParams.returnTo);
  const session = await auth();
  if (session?.user) redirect(returnTo);

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
      <LoginForm returnTo={returnTo} />
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
