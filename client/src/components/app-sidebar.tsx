import { Home, FileText, PenTool, FileSignature, Shield, History, Download, Settings, LogOut, User } from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import logoUrl from "@assets/generated_images/Professional_document_management_logo_8435641d.png";

const menuItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: Home,
    description: "Visão geral do sistema"
  },
  {
    title: "Modelos",
    url: "/modelos",
    icon: FileText,
    description: "Gerenciar modelos de documento"
  },
  {
    title: "Gerar Documentos", 
    url: "/gerar",
    icon: PenTool,
    description: "Criar novos documentos"
  },
  {
    title: "Assinar Documentos",
    url: "/assinar", 
    icon: FileSignature,
    description: "Assinar documentos digitalmente"
  },
  {
    title: "Certificados",
    url: "/certificados",
    icon: Shield,
    description: "Gerenciar certificados digitais"
  },
  {
    title: "Histórico",
    url: "/historico",
    icon: History,
    description: "Histórico de documentos"
  },
  {
    title: "Download",
    url: "/download",
    icon: Download,
    description: "Baixar documentos"
  },
];

export function AppSidebar() {
  const [location] = useLocation();
  
  // TODO: Replace with real user data
  const currentUser = {
    name: "João Silva",
    email: "joao@empresa.com",
    role: "admin",
    avatar: ""
  };

  const handleLogout = async () => {
    console.log('Logout triggered');
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      
      if (response.ok) {
        // Redirect to login page
        window.location.href = '/';
      } else {
        console.error('Logout failed');
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleAdminSettings = () => {
    console.log('Admin settings triggered');
    // TODO: Implement admin settings
  };

  return (
    <Sidebar className="relative text-white overflow-hidden border-r-0">
      {/* Background with dark overlay for better contrast */}
      <div className="absolute inset-0 -z-10">
        <div className="w-full h-full bg-gradient-to-br from-slate-800 via-blue-900 to-slate-900"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/60 via-slate-900/40 to-slate-950/60"></div>
      </div>
      
      <SidebarContent className="relative z-10">
        {/* Logo */}
        <div className="p-4 border-b border-white/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/25 rounded-xl flex items-center justify-center backdrop-blur-sm shadow-lg">
              <img src={logoUrl} alt="FastSign Pro" className="w-6 h-6" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-white drop-shadow-md">FastSign Pro</span>
              <span className="text-xs text-white/80">Gestão de documentos inteligente</span>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-white/80 font-medium">Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = location === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      data-active={isActive}
                      className={`group text-white/90 hover:bg-white/15 transition-all duration-300 focus-visible:ring-2 focus-visible:ring-white/30 ${isActive ? "bg-white/20 text-white shadow-lg" : "hover:text-white"}`}
                      data-testid={`nav-${item.title.toLowerCase().replace(/ /g, '-')}`}
                    >
                      <Link href={item.url} className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-300 ${isActive ? 'bg-white/35 shadow-md' : 'bg-white/20 group-hover:bg-white/30'}`}>
                          <item.icon className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-medium">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* User Profile Footer */}
      <SidebarFooter className="relative z-10">
        <div className="p-4 border-t border-white/20">
          <div className="flex items-center gap-3 mb-3">
            <Avatar className="w-8 h-8 border-2 border-white/30">
              <AvatarImage src={currentUser.avatar} />
              <AvatarFallback className="bg-white/20 backdrop-blur-sm text-white text-xs font-medium">
                {currentUser.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate drop-shadow-sm">
                {currentUser.name}
              </p>
              <p className="text-xs text-white/80 truncate">
                {currentUser.email}
              </p>
            </div>
            {currentUser.role === 'admin' && (
              <Badge className="bg-white/25 text-white text-xs shadow-md">
                Admin
              </Badge>
            )}
          </div>
          
          <div className="flex gap-2">
            {currentUser.role === 'admin' && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleAdminSettings}
                className="flex-1 justify-start text-white/90 bg-white/15 hover:bg-white/25 focus-visible:ring-white/30 transition-all duration-300 shadow-sm"
                data-testid="button-admin-settings"
              >
                <Settings className="w-4 h-4 mr-2" />
                Admin
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleLogout}
              className="flex-1 justify-start text-white/90 bg-white/15 hover:bg-white/25 focus-visible:ring-white/30 transition-all duration-300 shadow-sm"
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}