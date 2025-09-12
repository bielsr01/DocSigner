import { useState, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { LoginForm } from "@/components/login-form";
import DashboardPage from "@/pages/dashboard";
import ModelosPage from "@/pages/modelos";
import GerarDocumentosPage from "@/pages/gerar-documentos";
import AssinarDocumentosPage from "@/pages/assinar-documentos";
import CertificadosPage from "@/pages/certificados";
import HistoricoPage from "@/pages/historico";
import DownloadPage from "@/pages/download";
import NotFound from "@/pages/not-found";

interface User {
  email: string;
  name: string;
  role: string;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={() => <DashboardPage />} />
      <Route path="/modelos" component={() => <ModelosPage />} />
      <Route path="/gerar" component={() => <GerarDocumentosPage />} />
      <Route path="/assinar" component={() => <AssinarDocumentosPage />} />
      <Route path="/certificados" component={() => <CertificadosPage />} />
      <Route path="/historico" component={() => <HistoricoPage />} />
      <Route path="/download" component={() => <DownloadPage />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();
  
  // Check if user is already authenticated on app load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          method: 'GET',
          credentials: 'include',
        });
        
        if (response.ok) {
          const userData = await response.json();
          console.log('🔄 checkAuth found authenticated user:', userData);
          console.log('🔄 Current user state before checkAuth setUser:', user);
          setUser({
            email: userData.email,
            name: userData.name,
            role: userData.role
          });
          console.log('✅ checkAuth setUser called');
        }
      } catch (error) {
        console.log('No existing session:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, []);
  
  const handleLogin = (userData: User) => {
    console.log('🔄 handleLogin called with:', userData);
    console.log('🔄 Current user state before setUser:', user);
    setUser(userData);
    console.log('✅ setUser called successfully');
    
    // Force navigation to dashboard after login to prevent 404
    setTimeout(() => {
      console.log('🔀 Navigating to dashboard after login');
      setLocation('/');
    }, 100);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      console.log('🔄 Logout successful');
      setUser(null);
      setLocation('/');
    } catch (error) {
      console.error('Logout error:', error);
      // Even if logout fails, clear local state
      setUser(null);
      setLocation('/');
    }
  };
  
  // Custom sidebar width for document management application
  const style = {
    "--sidebar-width": "20rem",       // 320px for better navigation
    "--sidebar-width-icon": "4rem",   // default icon width
  };

  if (isLoading) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Carregando...</p>
            </div>
          </div>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  console.log('🔍 App render - user state:', user);
  console.log('🔍 App render - isLoading state:', isLoading);

  if (!user) {
    console.log('🚪 Rendering LoginForm because user is null');
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <LoginForm onLogin={handleLogin} />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  console.log('🏠 Rendering main app because user exists:', user);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SidebarProvider style={style as React.CSSProperties}>
          <div className="flex h-screen w-full">
            <AppSidebar currentUser={user} onLogout={handleLogout} />
            <div className="flex flex-col flex-1">
              <header className="flex items-center justify-between p-4 border-b border-border">
                <SidebarTrigger data-testid="button-sidebar-toggle" />
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Olá, {user.name}</span>
                  <ThemeToggle />
                </div>
              </header>
              <main className="flex-1 overflow-auto">
                <Router />
              </main>
            </div>
          </div>
        </SidebarProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
