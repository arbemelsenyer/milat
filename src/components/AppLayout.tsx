import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

/**
 * Global shell: left collapsible sidebar + main area.
 * Individual pages continue to render their own <AppNavbar/> at the top
 * (kept intentionally to satisfy DOKUNMA constraints).
 */
export default function AppLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 min-w-0 flex flex-col relative">
          <SidebarTrigger className="fixed top-3 left-3 z-40 md:hidden bg-card border rounded-md shadow" />
          <div className="hidden md:block absolute top-3 left-3 z-40">
            <SidebarTrigger className="bg-card border rounded-md shadow" />
          </div>
          <Outlet />
        </div>
      </div>
    </SidebarProvider>
  );
}
