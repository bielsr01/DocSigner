import { Home, FileText, Upload, History, Settings, LogOut } from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
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

  // Fallback se currentUser não estiver definido
  if (!currentUser) {
    return (
      <div className="relative bg-gradient-to-br from-blue-600 via-blue-500 to-teal-400">
        <Sidebar className="relative bg-transparent border-none text-white">
          <SidebarContent>
            <div className="p-4 text-center text-white">
              Carregando...
            </div>
          </SidebarContent>
        </Sidebar>
      </div>
    );
  }

  // Menu items - simples, sem descrições - ROTAS CORRIGIDAS
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
      title: "Assinar Documentos",
      url: "/assinar",
      icon: Upload,
    },
    {
      title: "Histórico",
      url: "/historico",
      icon: History,
    },
  ];

  const handleLogout = () => {
    console.log('Logout triggered');
    onLogout();
  };

  const handleAdminSettings = () => {
    console.log('Admin settings triggered');
    // TODO: Implement admin settings
  };

  return (
    <div className="relative bg-gradient-to-br from-blue-600 via-blue-500 to-teal-400 dark:from-blue-800 dark:via-blue-700 dark:to-teal-600">
      {/* Background decoration overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-transparent dark:from-blue-800/30"></div>
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-16 translate-x-16"></div>
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12"></div>
      
      <Sidebar className="relative bg-transparent border-none text-white">
        <SidebarContent>
          {/* Logo Header */}
          <div className="p-4 border-b border-white/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <img src={logoUrl} alt="FastSign Pro" className="w-6 h-6" />
              </div>
              <div>
                <span className="font-bold text-white text-lg">FastSign Pro</span>
              </div>
            </div>
          </div>

          {/* Navigation Menu */}
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
                        className="data-[active=true]:bg-white/15 text-white"
                        data-active={isActive}
                        aria-current={isActive ? "page" : undefined}
                        data-testid={`nav-${item.title.toLowerCase().replace(/ /g, '-')}`}
                      >
                        <Link href={item.url}>
                          <item.icon className="w-5 h-5" />
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
          <div className="p-4 border-t border-white/20">
            <div className="flex items-center gap-3 mb-3">
              <Avatar className="w-8 h-8 border-2 border-white/30">
                <AvatarImage src={currentUser.avatar} />
                <AvatarFallback className="bg-white/20 text-white text-xs font-medium">
                  {currentUser.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {currentUser.name}
                </p>
                <p className="text-xs text-blue-100 truncate">
                  {currentUser.email}
                </p>
              </div>
              {currentUser.role === 'admin' && (
                <Badge className="bg-white/20 text-white text-xs border-white/30">
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
                onClick={handleLogout}
                className="w-full justify-start text-white hover:bg-white/15"
                data-testid="button-logout"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>
    </div>
  );
}