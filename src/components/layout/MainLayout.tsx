"use client";

import * as React from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { SidebarNav } from "./SidebarNav";
import HeaderBar from "./HeaderBar";

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const isMobile = useIsMobile();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  if (isMobile) {
    return (
      <div className="flex min-h-screen bg-[#F6F4FF] dark:bg-[#0B0B12]">
        <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="absolute top-4 left-4 z-50">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72">
            <SidebarNav onLinkClick={() => setIsSidebarOpen(false)} />
          </SheetContent>
        </Sheet>
        <main className="flex-1 p-4 pt-16 md:p-6 overflow-auto">
          <HeaderBar />
          {children}
        </main>
      </div>
    );
  }

  return (
    <ResizablePanelGroup
      direction="horizontal"
      className="min-h-screen items-stretch bg-[#F6F4FF] dark:bg-[#0B0B12]"
    >
      <ResizablePanel defaultSize={16} minSize={12} maxSize={22} className="bg-transparent">
        <SidebarNav />
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={84}>
        <main className="flex-1 p-6 lg:p-8 overflow-auto">
          <HeaderBar />
          {children}
        </main>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
};