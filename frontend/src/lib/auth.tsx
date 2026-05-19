import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import {
  type AuthUser,
  discardToken,
  fetchMe,
  login as apiLogin,
  persistToken,
  registerAdmin,
  TOKEN_KEY,
} from "../services/api";

interface AuthContextValue {
  user: AuthUser | null;
  /** True while the initial `/me` verification is in flight on first mount. */
  loading: boolean;
  /** Username / password sign-in. Throws on credential failure. */
  signIn: (username: string, password: string) => Promise<void>;
  /** Bootstrap (first-time setup) — register + auto sign-in. */
  signUpFirstAdmin: (username: string, password: string) => Promise<void>;
  /** Clear the token + state. */
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Auth provider. Mounted once at the app root so every route can access the
 * current user. The first thing it does is check whether a token already
 * sits in localStorage and, if so, verifies it with `/api/auth/me`. That
 * call's response either confirms the session or — if it 401s — the API
 * client clears the token automatically (interceptor in services/api.ts).
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = readStoredToken();
    if (!token) {
      setLoading(false);
      return;
    }
    let alive = true;
    fetchMe()
      .then((u) => {
        if (alive) setUser(u);
      })
      .catch(() => {
        // Interceptor already cleared the bad token. Falling through to a
        // null user, the RequireAuth guard will route to /admin/login.
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const signIn = useCallback(async (username: string, password: string) => {
    const { access_token } = await apiLogin(username.trim(), password);
    persistToken(access_token);
    const me = await fetchMe();
    setUser(me);
  }, []);

  const signUpFirstAdmin = useCallback(
    async (username: string, password: string) => {
      await registerAdmin(username.trim(), password);
      // Roll straight into sign-in so the editor never sees a blank state
      // between "account created" and "logged in".
      const { access_token } = await apiLogin(username.trim(), password);
      persistToken(access_token);
      const me = await fetchMe();
      setUser(me);
    },
    []
  );

  const signOut = useCallback(() => {
    discardToken();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, signIn, signUpFirstAdmin, signOut }),
    [user, loading, signIn, signUpFirstAdmin, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}

/* ─────────────────────────────────────────────────────────────────── */

interface RequireAuthProps {
  children: ReactNode;
  /** A render-prop fallback for the initial-load phase. Defaults to a quiet
   *  full-screen placeholder so the studio doesn't flash login → admin. */
  loadingFallback?: ReactNode;
}

/**
 * Route guard — checks the auth context and either renders the protected
 * subtree, redirects to /admin/login, or shows a quiet placeholder while
 * the initial `/me` request is in flight.
 */
export function RequireAuth({ children, loadingFallback }: RequireAuthProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <>
        {loadingFallback ?? (
          <div className="flex h-screen w-screen items-center justify-center bg-[var(--color-ink-950)]" />
        )}
      </>
    );
  }

  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/admin/login?next=${next}`} replace />;
  }

  return <>{children}</>;
}

/* ─────────────────────────────────────────────────────────────────── */

function readStoredToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}
