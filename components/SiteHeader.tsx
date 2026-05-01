import Link from "next/link";
import type { Session } from "next-auth";
import { signOut } from "@/auth";

interface Props {
  session: Session | null;
}

export default function SiteHeader({ session }: Props) {
  const user = session?.user;

  return (
    <header style={headerStyle}>
      <Link href="/" style={brandStyle}>
        Telescope
      </Link>
      <nav style={navStyle}>
        {user ? (
          <>
            <span style={emailStyle}>{user.email ?? user.name}</span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button type="submit" style={linkButtonStyle}>
                Sign out
              </button>
            </form>
          </>
        ) : (
          <Link href="/login" style={linkStyle}>
            Sign in
          </Link>
        )}
      </nav>
    </header>
  );
}

const headerStyle: React.CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  zIndex: 50,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "12px 20px",
  background:
    "linear-gradient(to bottom, rgba(0,0,0,0.65), rgba(0,0,0,0))",
  pointerEvents: "none",
};

const brandStyle: React.CSSProperties = {
  color: "#e5ecff",
  textDecoration: "none",
  fontSize: 14,
  fontWeight: 600,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  pointerEvents: "auto",
};

const navStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 16,
  pointerEvents: "auto",
};

const linkStyle: React.CSSProperties = {
  color: "#9ec0ff",
  textDecoration: "none",
  fontSize: 13,
};

const linkButtonStyle: React.CSSProperties = {
  background: "transparent",
  border: "none",
  padding: 0,
  color: "#9ec0ff",
  fontSize: 13,
  cursor: "pointer",
  fontFamily: "inherit",
};

const emailStyle: React.CSSProperties = {
  color: "#7e8aac",
  fontSize: 12,
};
