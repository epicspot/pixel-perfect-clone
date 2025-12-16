import { Suspense, lazy, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { hasRouteAccess, UserRole, roleRoutePermissions } from "@/lib/permissions";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LoadingProgress, LoadingSpinner } from "@/components/ui/loading-progress";
import { useGlobalLoading } from "@/hooks/useLoadingProgress";
import { useInterfaceTheme } from "@/hooks/useInterfaceTheme";

// Lazy load all pages for code-splitting
const Index = lazy(() => import("./pages/Index"));
const Tickets = lazy(() => import("./pages/Tickets"));
const Voyages = lazy(() => import("./pages/Voyages"));
const Rapports = lazy(() => import("./pages/Rapports"));
const ReportAgency = lazy(() => import("./pages/ReportAgency"));
const ReportRoutes = lazy(() => import("./pages/ReportRoutes"));
const ReportCashiers = lazy(() => import("./pages/ReportCashiers"));
const Parametres = lazy(() => import("./pages/Parametres"));
const Admin = lazy(() => import("./pages/Admin"));
const Maintenance = lazy(() => import("./pages/Maintenance"));
const Carburant = lazy(() => import("./pages/Carburant"));
const ClotureCaisse = lazy(() => import("./pages/ClotureCaisse"));
const Staff = lazy(() => import("./pages/Staff"));
const Depenses = lazy(() => import("./pages/Depenses"));
const Paie = lazy(() => import("./pages/Paie"));
const VehicleCostDashboard = lazy(() => import("./pages/VehicleCostDashboard"));
const Comptabilite = lazy(() => import("./pages/Comptabilite"));
const TicketScan = lazy(() => import("./pages/TicketScan"));
const SuiviSouches = lazy(() => import("./pages/SuiviSouches"));
const AuditLogs = lazy(() => import("./pages/AuditLogs"));
const Expeditions = lazy(() => import("./pages/Expeditions"));
const ReportExpeditions = lazy(() => import("./pages/ReportExpeditions"));
const ShipmentsDashboard = lazy(() => import("./pages/ShipmentsDashboard"));
const Guichets = lazy(() => import("./pages/Guichets"));
const ReportSessions = lazy(() => import("./pages/ReportSessions"));
const ReportSynthesis = lazy(() => import("./pages/ReportSynthesis"));
const Auth = lazy(() => import("./pages/Auth"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Install = lazy(() => import("./pages/Install"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

// Loading fallback component with progress bar
function PageLoader() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <LoadingProgress isLoading={true} />
      <LoadingSpinner size="lg" />
      <p className="mt-4 text-muted-foreground animate-pulse">Chargement...</p>
    </div>
  );
}

// Protected route wrapper with role-based access
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, profile } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <PageLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  // Check role-based access - redirect to first accessible route if no access
  const userRole = profile?.role as UserRole;
  const hasAccess = hasRouteAccess(userRole, location.pathname);
  if (!hasAccess) {
    const accessibleRoutes = roleRoutePermissions[userRole] || [];
    const firstRoute = accessibleRoutes[0] || '/';
    return <Navigate to={firstRoute} replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/install" element={<Install />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Index />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tickets"
          element={
            <ProtectedRoute>
              <Tickets />
            </ProtectedRoute>
          }
        />
        <Route
          path="/voyages"
          element={
            <ProtectedRoute>
              <Voyages />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rapports"
          element={
            <ProtectedRoute>
              <Rapports />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rapports/agence"
          element={
            <ProtectedRoute>
              <ReportAgency />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rapports/lignes"
          element={
            <ProtectedRoute>
              <ReportRoutes />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rapports/caisse"
          element={
            <ProtectedRoute>
              <ReportCashiers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/parametres"
          element={
            <ProtectedRoute>
              <Parametres />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <Admin />
            </ProtectedRoute>
          }
        />
        <Route
          path="/audit"
          element={
            <ProtectedRoute>
              <AuditLogs />
            </ProtectedRoute>
          }
        />
        <Route
          path="/maintenance"
          element={
            <ProtectedRoute>
              <Maintenance />
            </ProtectedRoute>
          }
        />
        <Route
          path="/carburant"
          element={
            <ProtectedRoute>
              <Carburant />
            </ProtectedRoute>
          }
        />
        <Route
          path="/cloture-caisse"
          element={
            <ProtectedRoute>
              <ClotureCaisse />
            </ProtectedRoute>
          }
        />
        <Route
          path="/guichets"
          element={
            <ProtectedRoute>
              <Guichets />
            </ProtectedRoute>
          }
        />
        <Route
          path="/staff"
          element={
            <ProtectedRoute>
              <Staff />
            </ProtectedRoute>
          }
        />
        <Route
          path="/depenses"
          element={
            <ProtectedRoute>
              <Depenses />
            </ProtectedRoute>
          }
        />
        <Route
          path="/paie"
          element={
            <ProtectedRoute>
              <Paie />
            </ProtectedRoute>
          }
        />
        <Route
          path="/couts-vehicules"
          element={
            <ProtectedRoute>
              <VehicleCostDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/comptabilite"
          element={
            <ProtectedRoute>
              <Comptabilite />
            </ProtectedRoute>
          }
        />
        <Route
          path="/controle-tickets"
          element={
            <ProtectedRoute>
              <TicketScan />
            </ProtectedRoute>
          }
        />
        <Route
          path="/suivi-souches"
          element={
            <ProtectedRoute>
              <SuiviSouches />
            </ProtectedRoute>
          }
        />
        <Route
          path="/expeditions"
          element={
            <ProtectedRoute>
              <Expeditions />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rapports/expeditions"
          element={
            <ProtectedRoute>
              <ReportExpeditions />
            </ProtectedRoute>
          }
        />
        <Route
          path="/expeditions/dashboard"
          element={
            <ProtectedRoute>
              <ShipmentsDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rapports/sessions"
          element={
            <ProtectedRoute>
              <ReportSessions />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rapports/synthese"
          element={
            <ProtectedRoute>
              <ReportSynthesis />
            </ProtectedRoute>
          }
        />
        
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

function GlobalLoadingBar() {
  const { isLoading } = useGlobalLoading();
  return <LoadingProgress isLoading={isLoading} />;
}

// Initialize interface theme on app load
function InterfaceThemeInitializer() {
  useInterfaceTheme();
  return null;
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <InterfaceThemeInitializer />
          <GlobalLoadingBar />
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
