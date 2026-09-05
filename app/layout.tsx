import type { Metadata } from "next";
import "@fontsource-variable/roboto/wght.css";
import "@fontsource-variable/roboto-slab/wght.css";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Lista d’attesa",
    template: "%s | Lista d’attesa",
  },
  description: "Iscrizione e gestione della lista d’attesa del Gruppo scout.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="it" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
