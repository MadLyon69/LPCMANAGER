"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Tableau de bord", icon: "🏠" },
  { href: "/produits", label: "Produits", icon: "📦" },
  { href: "/fournisseurs", label: "Fournisseurs", icon: "🚚" },
  { href: "/import", label: "Import factures", icon: "📥" },
  { href: "/chiffre-affaires", label: "Chiffre d'affaires", icon: "💶" },
  { href: "/etiquettes", label: "Étiquettes", icon: "🏷️" },
  { href: "/reglages", label: "Réglages", icon: "⚙️" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 shrink-0 border-r border-gray-200 bg-white flex flex-col">
      <div className="px-5 py-5 border-b border-gray-200">
        <p className="text-lg font-semibold text-gray-900">LPC Manager</p>
        <p className="text-xs text-gray-500">Épicerie · Tabac</p>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map((link) => {
          const active =
            link.href === "/"
              ? pathname === "/"
              : pathname === link.href || pathname.startsWith(link.href + "/");
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-gray-900 text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <span aria-hidden>{link.icon}</span>
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
