import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "KhoBO GPT | Knowledge Horizon Beyond Opportunities - AI Assistant",
  description: "Chat with KhoBO GPT — enterprise AI for conversations, document intelligence, and business lead qualification. Knowledge Horizon Beyond Opportunities.",
  keywords: ["KhoBO GPT", "AI Assistant", "ChatGPT alternative", "Document RAG", "Lead Generation AI", "FastAPI NextJS", "Enterprise AI SaaS"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen flex flex-col bg-[#080c14] text-slate-100 antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
        <AuthProvider>
          <Navbar />
          <main className="flex-1 flex flex-col">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
