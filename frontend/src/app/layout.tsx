import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/auth-context";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SaaS Enterprise Platform | ProERP",
  description: "Next.js Frontend for FastAPI E-Commerce, HR & Payroll, and Finance Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full bg-slate-50">
      <body className={`${inter.className} min-h-full flex flex-col text-slate-800`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
