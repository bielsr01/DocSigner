import { Home, FileText, Upload, History, Download, Settings, LogOut } from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import logoUrl from "@assets/fastsign-pro-logo.png";

interface User {
  name: string;
  email: string;
  role: string;
  avatar?: string;
}

interface AppSidebarProps {
  currentUser: User;
  onLogout: () => void;
}

export function AppSidebar({ currentUser, onLogout }: AppSidebarProps) {
  const [location] = useLocation();

  const menuItems = [
    {
      title: "Dashboard",
      url: "/",
      icon: Home,
    },
    {
      title: "Modelos",
      url: "/modelos",
      icon: FileText,
    },
    {
      title: "Gerar Documentos",
      url: "/gerar",
      icon: FileText,
    },
    {
      title: "Gerar V2",
      url: "/gerar-v2",
      icon: FileText,
    },
    {
      title: "Assinar Documentos",
      url: "/assinar",
      icon: Upload,
    },
    {
      title: "Carregar Certificados",
      url: "/certificados",
      icon: Upload,
    },
    {
      title: "Histórico",
      url: "/historico",
      icon: History,
    },
    {
      title: "Downloads",
      url: "/download",
      icon: Download,
    },
  ];

  return (
    <Sidebar variant="sidebar" collapsible="offcanvas">
      {/* Gradiente aplicado internamente - tons de preto */}
      <div className="flex flex-col h-full bg-gradient-to-br from-gray-900 via-gray-800 to-black dark:from-gray-900 dark:via-gray-800 dark:to-black text-white">
        
        <SidebarHeader>
          <div className="flex items-center gap-3 p-4">
            <img src={logoUrl} alt="FastSign Pro" className="w-10 h-10 shrink-0" />
            <span className="font-bold text-white text-xl">FastSign Pro</span>
          </div>
        </SidebarHeader>

        <SidebarContent className="flex-1">
          <SidebarGroup>
            <SidebarGroupLabel className="text-gray-300">Menu Principal</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {menuItems.map((item) => {
                  const isActive = location === item.url;
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild
                        isActive={isActive}
                        className="text-white data-[active=true]:bg-white/20 data-[active=true]:text-white hover:bg-white/15 hover:text-white"
                        data-testid={`nav-${item.title.toLowerCase().replace(/ /g, '-')}`}
                      >
                        <Link href={item.url}>
                          <item.icon className="w-5 h-5" />
                          <span className="text-base">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <div className="p-4 border-t border-white/20">
            <div className="flex items-center gap-3 mb-3">
              <Avatar className="w-8 h-8 border-2 border-white/30">
                <AvatarImage src={currentUser?.avatar} />
                <AvatarFallback className="bg-white/20 text-white text-xs font-medium">
                  {currentUser?.name?.split(' ').map(n => n[0]).join('') || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {currentUser?.name || 'Usuário'}
                </p>
                <p className="text-xs text-gray-300 truncate">
                  {currentUser?.email || 'email@example.com'}
                </p>
              </div>
              {currentUser?.role === 'admin' && (
                <Badge className="bg-white/20 text-white text-xs border-white/30">
                  Admin
                </Badge>
              )}
            </div>
            
            <div className="space-y-2">
              {currentUser?.role === 'admin' && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full justify-start text-white hover:bg-white/15"
                  data-testid="button-admin-settings"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Admin
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onLogout}
                className="w-full justify-start text-white hover:bg-white/15"
                data-testid="button-logout"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </SidebarFooter>
      </div>
    </Sidebar>
  );
}