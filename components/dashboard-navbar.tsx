import Image from "next/image"
import { ThemeToggle } from "@/components/theme-toggle"
interface DashboardNavbarProps {
  companyName: string
  logoUrl?: string | null
}

export function DashboardNavbar({ companyName, logoUrl }: DashboardNavbarProps) {
  return (
    <nav className="border-b border-border bg-background">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-2">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={`${companyName} logo`}
              className="w-8 h-8 rounded-lg object-cover"
            />
          ) : (
            <Image
              src="/logo.svg"
              alt="Logo"
              width={32}
              height={32}
              className="themed-logo rounded-lg"
              priority
            />
          )}
          <h1 className="text-xl font-semibold text-foreground">{companyName}</h1>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </div>
    </nav>
  )
}
