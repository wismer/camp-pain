import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import { Sidebar, SidebarHeader, SidebarSkeleton } from "@/components/sidebar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Campaign Codex",
  description: "Prep and run a D&D campaign",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full">
        <aside className="sticky top-0 h-screen w-64 shrink-0 overflow-y-auto border-r bg-sidebar px-3 py-5 text-sidebar-foreground">
          <SidebarHeader />
          <Suspense fallback={<SidebarSkeleton />}>
            <Sidebar />
          </Suspense>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      </body>
    </html>
  );
}
