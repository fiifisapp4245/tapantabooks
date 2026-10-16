import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/shell/app-sidebar"
import { TopBar } from "@/components/shell/top-bar"
import { CommandPalette } from "@/components/shell/command-palette"
import { FormHost } from "@/components/forms/form-host"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    // Inset layout: the sidebar and top bar are one light-grey frame with no
    // lines between them; the page sits in a white rounded panel that scrolls on its own.
    <SidebarProvider className="h-svh overflow-hidden">
      <AppSidebar />
      <SidebarInset className="h-svh min-w-0 bg-sidebar">
        <TopBar />
        <div className="min-h-0 flex-1 md:pr-2 md:pb-2">
          <div id="content" className="h-full min-w-0 overflow-x-clip overflow-y-auto bg-card md:rounded-xl md:border">
            {children}
          </div>
        </div>
      </SidebarInset>
      <CommandPalette />
      <FormHost />
    </SidebarProvider>
  )
}
