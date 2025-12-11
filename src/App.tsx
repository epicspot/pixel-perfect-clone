import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { hasRouteAccess, UserRole } from "@/lib/permissions";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Index from "./pages/Index";
import Tickets from "./pages/Tickets";
import Voyages from "./pages/Voyages";
import Rapports from "./pages/Rapports";
import ReportAgency from "./pages/ReportAgency";
import ReportRoutes from "./pages/ReportRoutes";
import ReportCashiers from "./pages/ReportCashiers";
import Parametres from "./pages/Parametres";
import Admin from "./pages/Admin";
import Maintenance from "./pages/Maintenance";
import Carburant from "./pages/Carburant";
import ClotureCaisse from "./pages/ClotureCaisse";
import Staff from "./pages/Staff";
import Depenses from "./pages/Depenses";
import Paie from "./pages/Paie";
import VehicleCostDashboard from "./pages/VehicleCostDashboard";
import TicketScan from "./pages/TicketScan";
import SuiviSouches from "./pages/SuiviSouches";
import AuditLogs from "./pages/AuditLogs";
import Expeditions from "./pages/Expeditions";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import AccessDenied from "./pages/AccessDenied";
import Install from "./pages/Install";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

// Protected route wrapper with role-based access
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, profile } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  // Check role-based access
  const hasAccess = hasRouteAccess(profile?.role as UserRole, location.pathname);
  if (!hasAccess) {
    return <Navigate to="/acces-refuse" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
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
        <Route path="/acces-refuse" element={<AccessDenied />} />
        <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
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
