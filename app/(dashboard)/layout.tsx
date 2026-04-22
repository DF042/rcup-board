import { AIChatPanel } from "@/components/chat/AIChatPanel";
import { BottomNav } from "@/components/layout/BottomNav";
import { Header } from "@/components/layout/Header";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { Sidebar } from "@/components/layout/Sidebar";
import { ViewToggle } from "@/components/layout/ViewToggle";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen md:flex">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col pb-16 md:pb-0">
        <MobileHeader />
        <div className="hidden md:block">
          <Header title="Fantasy Dashboard" />
        </div>
        <div className="px-4 py-2 md:px-6">
          <ViewToggle />
        </div>
        <main className="page-transition flex-1 px-4 pb-6 md:px-6">{children}</main>
      </div>
      <AIChatPanel />
      <BottomNav />
    </div>
  );
}
