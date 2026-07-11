import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, FolderOpen, Archive, Calendar, Shield, Workflow } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";

const overviewItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
];

const processItems = [
  { title: "Aktif Başvurular", url: "/cases", icon: FolderOpen },
  { title: "Süreç Motoru", url: "/legal-reasoning", icon: Workflow },
];

const officeItems = [
  { title: "Takvim", url: "/calendar", icon: Calendar },
  { title: "Arşiv", url: "/archive", icon: Archive },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const { isAdmin } = useAuth();
  const isActive = (p: string) =>
    pathname === p || (p !== "/dashboard" && pathname.startsWith(p));

  const renderItems = (items: typeof overviewItems) =>
    items.map((item) => (
      <SidebarMenuItem key={item.url}>
        <SidebarMenuButton
          asChild
          isActive={isActive(item.url)}
          className="border-l-2 border-l-transparent transition-colors hover:border-l-accent hover:text-accent data-[active=true]:border-l-accent"
        >
          <NavLink to={item.url} className="flex items-center gap-2">
            <item.icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span>{item.title}</span>}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    ));

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Genel Bakış</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderItems(overviewItems)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Süreç Yönetimi</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderItems(processItems)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Ofis Yönetimi</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderItems(officeItems)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Yönetim</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive("/admin")}
                    className="border-l-2 border-l-transparent transition-colors hover:border-l-accent hover:text-accent data-[active=true]:border-l-accent"
                  >
                    <NavLink to="/admin" className="flex items-center gap-2">
                      <Shield className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>Admin Paneli</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
