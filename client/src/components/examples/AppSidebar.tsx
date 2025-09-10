import { AppSidebar } from '../app-sidebar';
import { SidebarProvider } from '@/components/ui/sidebar';

export default function AppSidebarExample() {
  const style = {
    "--sidebar-width": "20rem",
    "--sidebar-width-icon": "4rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <main className="flex-1 p-6">
          <div className="max-w-2xl">
            <h1 className="text-2xl font-bold mb-4">Sidebar Preview</h1>
            <p className="text-muted-foreground">
              Esta é uma prévia do sidebar com navegação, logo, perfil do usuário e botão de admin.
            </p>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}