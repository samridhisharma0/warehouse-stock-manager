import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import { lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Products } from './pages/Products';
import { Orders } from './pages/Orders';
import { Shipping } from './pages/Shipping';
import { PageTransition, getRouteDirection } from './components/PageTransition';

const CustomCursor = lazy(() =>
  import('./components/CustomCursor').then((m) => ({ default: m.CustomCursor }))
);

// Redirects authenticated users away from the auth screens.
function PublicOnly({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <>{children}</>;
}

function AnimatedRoutes() {
  const location = useLocation();
  const direction = getRouteDirection(location.pathname);

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/login" element={<PublicOnly><PageTransition direction={direction}><Login /></PageTransition></PublicOnly>} />
        <Route path="/register" element={<PublicOnly><PageTransition direction={direction}><Register /></PageTransition></PublicOnly>} />
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<PageTransition direction={direction}><Dashboard /></PageTransition>} />
          <Route path="/products" element={<PageTransition direction={direction}><Products /></PageTransition>} />
          <Route path="/orders" element={<PageTransition direction={direction}><Orders /></PageTransition>} />
          <Route path="/shipping" element={<PageTransition direction={direction}><Shipping /></PageTransition>} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <Suspense fallback={null}>
              <CustomCursor />
            </Suspense>
            <AnimatedRoutes />
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
