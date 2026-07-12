import { Outlet, useLocation, useParams, useSearchParams } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { CaseNotesFAB } from "@/components/CaseNotesFAB";

function NotesMount() {
  const { pathname } = useLocation();
  const params = useParams();
  const [sp] = useSearchParams();
  // Extract case id from /case-room/:id, /case/:id, /cases/:id, or ?caseId=
  const idFromPath = /^\/(case-room|case|cases)\/([0-9a-f-]{36})/i.exec(pathname)?.[2];
  const idFromQuery = sp.get("caseId");
  const caseId = idFromPath || idFromQuery || (params.id as string | undefined);
  if (!caseId) return null;
  return <CaseNotesFAB caseId={caseId} />;
}

/**
 * Global shell: left collapsible sidebar + main area.
 * Individual pages keep rendering their own <AppNavbar/> (DOKUNMA constraint).
 */
export default function AppLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 min-w-0 flex flex-col relative">
          <div className="absolute top-3 left-3 z-40">
            <SidebarTrigger className="bg-card border rounded-md shadow" />
          </div>
          <Outlet />
          <NotesMount />
        </div>
      </div>
    </SidebarProvider>
  );
}

