"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "분석" },
  { href: "/history", label: "이력" },
  { href: "/phrases", label: "사전" },
];

export default function SiteNav() {
  const pathname = usePathname();

  return (
    <nav className="mx-auto flex w-full max-w-3xl items-center gap-6 px-6 pt-8 text-sm">
      <Link href="/" className="font-semibold tracking-tight">
        KOTONA
      </Link>
      <ul className="flex gap-4">
        {LINKS.map((link) => {
          // "/" 는 모든 경로의 접두사라 정확히 일치할 때만 활성으로 본다.
          const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={active ? "font-medium" : "opacity-50 transition hover:opacity-100"}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
