"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { fetchMe, logout, type AuthUser } from "@/lib/auth";
import BrandLogo from "@/components/BrandLogo";

export default function Header() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    fetchMe()
      .then(setUser)
      .catch(() => null);
  }, []);

  const handleLogout = () => {
    logout()
      .catch(() => null)
      .finally(() => {
        setUser(null);
        router.push("/login");
      });
  };

  return (
    <header className="flex w-full items-center justify-between border-b border-zinc-200 bg-[var(--surface)] px-6 py-4 text-sm text-zinc-700">
      <div className="flex items-center gap-2">
        <BrandLogo variant="simple" className="h-28 w-auto object-contain" />
        <span className="text-zinc-400">|</span>
        <span>{user ? `Signed in as ${user.email}` : "Not authenticated"}</span>
      </div>
      <button
        type="button"
        onClick={handleLogout}
        className="rounded-md border border-zinc-300 px-3 py-1 text-zinc-700 hover:bg-zinc-50"
        disabled={!user}
      >
        Logout
      </button>
    </header>
  );
}
