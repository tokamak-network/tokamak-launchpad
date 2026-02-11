import type { Metadata } from "next";
import { Geist, Geist_Mono, Poppins } from "next/font/google";
import "@rainbow-me/rainbowkit/styles.css";
import "./globals.css";
import { ClientApp } from "@/src/ClientApp";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "TONLaunch — Token Launchpad on Tokamak",
    template: "%s | TONLaunch",
  },
  description:
    "Create and trade bonding-curve tokens backed by TON on the Tokamak Network. Launch in seconds, trade instantly.",
  metadataBase: new URL("https://tonlaunch.up.railway.app"),
  openGraph: {
    title: "TONLaunch — Token Launchpad on Tokamak",
    description:
      "Permissionless bonding-curve token launchpad on Tokamak Network. No order books, no LPs.",
    siteName: "TONLaunch",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "TONLaunch",
    description:
      "Create and trade bonding-curve tokens backed by TON on Tokamak Network.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem("tokamak-theme");var d=!("light"===t);if(!t&&window.matchMedia("(prefers-color-scheme: dark)").matches)d=true;document.documentElement.classList.toggle("dark",d);})();`,
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} ${poppins.variable} antialiased`}>
        <ClientApp>{children}</ClientApp>
      </body>
    </html>
  );
}
