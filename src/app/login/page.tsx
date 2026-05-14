import Link from "next/link";
import { isAuthConfigured } from "@/lib/authSession";
import { loginAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const rawFrom = typeof sp.from === "string" ? sp.from : undefined;
  const from =
    rawFrom &&
    rawFrom.startsWith("/") &&
    !rawFrom.startsWith("//") &&
    !rawFrom.includes("://") &&
    !rawFrom.includes("@")
      ? rawFrom
      : "/queues";
  const configured = isAuthConfigured();

  return (
    <div className="page">
      <p className="top-links">
        <Link className="top-link" href="/">
          Home
        </Link>
      </p>
      <h1>Sign in</h1>
      <p className="sub">Internal access for Follow-up System MVP.</p>

      {!configured ? (
        <p className="import-error" role="alert">
          Authentication is not configured. Set{" "}
          <code className="queue-muted">APP_PASSWORD</code> and{" "}
          <code className="queue-muted">AUTH_COOKIE_SECRET</code> in the environment
          (see <code className="queue-muted">.env.example</code>).
        </p>
      ) : (
        <>
          {sp.error === "1" ? (
            <p className="import-error" role="alert">
              Incorrect password.
            </p>
          ) : null}
          {sp.error === "config" ? (
            <p className="import-error" role="alert">
              Server configuration is incomplete.
            </p>
          ) : null}
          <form action={loginAction} className="import-form">
            <input type="hidden" name="from" value={from} />
            <div className="import-form-row">
              <label className="import-form-label" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="phone-search-input"
              />
            </div>
            <div className="import-form-actions">
              <button type="submit" className="import-preview-btn">
                Sign in
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
