import type { Metadata } from "next";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "ProjectRadar Prototype",
  description: "Official-source opportunity radar prototype"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
