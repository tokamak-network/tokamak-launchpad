"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export function Header() {
  const pathname = usePathname();

  const handleLogoClick = (e: React.MouseEvent) => {
    if (pathname === "/") {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <header className="fixed top-3 right-0 left-0 z-50 px-4">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between rounded-2xl bg-white px-5 shadow-md ring-1 ring-gray-200 dark:bg-slate-900 dark:ring-slate-700">
        <Link
          href="/"
          onClick={handleLogoClick}
          className="flex items-center gap-2 font-semibold text-gray-900 transition hover:text-gray-600 dark:text-white dark:hover:text-white/80"
        >
          <Image
            src="/tokamak-symbol.svg"
            alt="TONLaunch"
            width={28}
            height={28}
            className="dark:brightness-0 dark:invert transition hover:scale-110"
          />
          <span className="hidden sm:inline">TONLaunch</span>
          <span className="sm:hidden">TONLaunch</span>
        </Link>
        <nav className="flex items-center gap-3">
          <ConnectButton />
        </nav>
      </div>
    </header>
  );
}
