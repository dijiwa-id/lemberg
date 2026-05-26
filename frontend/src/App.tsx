import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { lazy, Suspense } from "react";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ScrollToTop } from "./components/ScrollToTop";
import { SplashScreen } from "./components/SplashScreen";
import { AuthProvider, RequireAuth } from "./lib/auth";
import { CartProvider } from "./lib/useCart";

const LandingPage = lazy(() => import("./pages/LandingPage"));
const Admin = lazy(() => import("./pages/Admin"));
const DynamicPage = lazy(() => import("./pages/DynamicPage"));
const ReservationPage = lazy(() => import("./pages/ReservationPage"));
const CartPage = lazy(() => import("./pages/CartPage"));
const LoginPage = lazy(() => import("./pages/admin/LoginPage"));

function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-ink-900)] px-6 text-[var(--color-bone-100)]">
      <div className="max-w-md text-center">
        <span className="label-eyebrow text-[var(--color-bone-500)]">404</span>
        <h1 className="mt-4 font-display text-5xl font-light italic text-[var(--color-pearl-300)]">
          Out of vintage.
        </h1>
        <p className="mt-6 body-editorial text-[var(--color-bone-300)]">
          This page is not in the cellar.
        </p>
        <Link
          to="/"
          className="mt-8 inline-flex items-center gap-3 border border-[var(--color-bone-300)]/40 px-7 py-3 label-eyebrow text-[var(--color-bone-100)] transition-colors hover:bg-[var(--color-bone-50)] hover:text-[var(--color-ink-900)]"
        >
          Return home
        </Link>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ScrollToTop />
        <AuthProvider>
          <CartProvider>
            <Suspense fallback={<SplashScreen />}>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/page/:slug" element={<DynamicPage />} />
                <Route path="/reservation" element={<ReservationPage />} />
                <Route path="/cart" element={<CartPage />} />
                {/* Login route MUST come before /admin/* so the more-specific
                    path wins. React Router v6 sorts by specificity, but listing
                    it first makes intent obvious to a future reader. */}
                <Route path="/admin/login" element={<LoginPage />} />
                <Route
                  path="/admin/*"
                  element={
                    <RequireAuth>
                      <Admin />
                    </RequireAuth>
                  }
                />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
