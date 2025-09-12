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
    <Sidebar className="bg-gradient-to-br from-blue-600 via-blue-500 to-teal-400 dark:from-blue-800 dark:via-blue-700 dark:to-teal-600 relative overflow-hidden border-r-0 text-white">
      {/* Background decoration - EXATAMENTE IGUAL À TELA DE LOGIN */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 dark:from-blue-800/30 to-transparent"></div>
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-16 translate-x-16"></div>
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12"></div>
      <div className="absolute top-1/2 right-1/4 w-16 h-16 bg-white/5 rounded-full"></div>
      
      <SidebarContent className="relative z-10">
        {/* Logo - Estilo igual à tela de login */}
        <div className="p-4 border-b border-white/20">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm shadow-lg">
              <img src={logoUrl} alt="FastSign Pro" className="w-6 h-6" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-white drop-shadow-sm">FastSign Pro</span>
              <span className="text-xs text-blue-100">Gestão de documentos inteligente</span>
            </div>
          </div>
        </div>

        {/* Navigation Menu - Estilo igual aos features da tela de login */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-blue-100 font-medium">Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = location === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      data-active={isActive}
                      className={`group cursor-pointer transform transition-all duration-300 hover:translate-x-2 hover:scale-[1.02] ${isActive ? "bg-white/30 text-white shadow-lg" : "text-white hover:text-blue-100"}`}
                      data-testid={`nav-${item.title.toLowerCase().replace(/ /g, '-')}`}
                    >
                      <Link href={item.url} className="flex items-start gap-4">
                        <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-colors duration-300 ${isActive ? 'bg-white/30' : 'bg-white/20 group-hover:bg-white/30'}`}>
                          <item.icon className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 py-2">
                          <span className="text-lg font-semibold group-hover:text-blue-100 transition-colors">{item.title}</span>
                          <p className="text-blue-100 text-sm leading-relaxed group-hover:text-white transition-colors">
                            {item.description}
                          </p>
                        </div>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* User Profile Footer - Estilo similar às funcionalidades */}
      <SidebarFooter className="relative z-10">
        <div className="p-4 border-t border-white/20">
          <div className="flex items-center gap-3 mb-4">
            <Avatar className="w-10 h-10 border-2 border-white/30">
              <AvatarImage src={currentUser.avatar} />
              <AvatarFallback className="bg-white/20 backdrop-blur-sm text-white text-sm font-bold">
                {currentUser.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate drop-shadow-sm">
                {currentUser.name}
              </p>
              <p className="text-xs text-blue-100 truncate">
                {currentUser.email}
              </p>
            </div>
            {currentUser.role === 'admin' && (
              <Badge className="bg-white/20 border-white/30 text-white text-xs">
                Admin
              </Badge>
            )}
          </div>
          
          <div className="space-y-2">
            {currentUser.role === 'admin' && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleAdminSettings}
                className="w-full justify-start text-white bg-white/20 hover:bg-white/30 border border-white/20 transition-all duration-300 group transform hover:translate-x-1"
                data-testid="button-admin-settings"
              >
                <Settings className="w-4 h-4 mr-3" />
                Configurações Admin
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleLogout}
              className="w-full justify-start text-white bg-white/20 hover:bg-white/30 border border-white/20 transition-all duration-300 group transform hover:translate-x-1"
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4 mr-3" />
              Sair da Plataforma
            </Button>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}