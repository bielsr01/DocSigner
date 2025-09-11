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
    <Sidebar>
      <SidebarContent>
        {/* Logo */}
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <img src={logoUrl} alt="DocuSign Pro" className="w-8 h-8" />
            <div className="flex flex-col">
              <span className="font-semibold text-sidebar-foreground">DocuSign Pro</span>
              <span className="text-xs text-sidebar-foreground/60">Sistema de Assinatura Digital</span>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = location === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      data-active={isActive}
                      className={isActive ? "bg-sidebar-accent" : ""}
                      data-testid={`nav-${item.title.toLowerCase().replace(/ /g, '-')}`}
                    >
                      <Link href={item.url}>
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
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
      <SidebarFooter>
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 mb-3">
            <Avatar className="w-8 h-8">
              <AvatarImage src={currentUser.avatar} />
              <AvatarFallback>
                {currentUser.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {currentUser.name}
              </p>
              <p className="text-xs text-sidebar-foreground/60 truncate">
                {currentUser.email}
              </p>
            </div>
            {currentUser.role === 'admin' && (
              <Badge variant="secondary" className="text-xs">
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
                className="flex-1 justify-start"
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
              className="flex-1 justify-start"
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