import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
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
  title: {
    default: "Daniel Alvarez | Servicios Agropecuarios",
    template: "%s | Daniel Alvarez",
  },
  description:
    "Plataforma de gestión operativa de Daniel Alvarez Servicios Agropecuarios: pulverizaciones, siembras y cosechas.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <TooltipProvider delay={200}>
          {children}
          <Toaster />
        </TooltipProvider>
      </body>
    </html>
  );
}
