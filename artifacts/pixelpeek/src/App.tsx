import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/context/auth";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { useEffect } from "react";

import { AppLayout } from "@/components/layout";
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Register from "@/pages/register";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import Home from "@/pages/home";
import Encode from "@/pages/encode";
import Decode from "@/pages/decode";
import Peek from "@/pages/peek";
import History from "@/pages/history";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function AuthSetup() {
  const { token } = useAuth();
  useEffect(() => {
    setAuthTokenGetter(() => token);
  }, [token]);
  return null;
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center">
        <div className="text-2xl font-black text-[#0F172A] animate-pulse" style={{ fontFamily: "Outfit, sans-serif" }}>
          Loading…
        </div>
      </div>
    );
  }
  if (!user) return <Redirect to="/login" />;
  return (
    <AppLayout>
      <Component />
    </AppLayout>
  );
}

function Router() {
  return (
    <Switch>
      {/* Public */}
      <Route path="/" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />

      {/* Protected */}
      <Route path="/dashboard">
        <ProtectedRoute component={Home} />
      </Route>
      <Route path="/encode">
        <ProtectedRoute component={Encode} />
      </Route>
      <Route path="/decode">
        <ProtectedRoute component={Decode} />
      </Route>
      <Route path="/peek">
        <ProtectedRoute component={Peek} />
      </Route>
      <Route path="/history">
        <ProtectedRoute component={History} />
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AuthSetup />
            <Router />
          </WouterRouter>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
