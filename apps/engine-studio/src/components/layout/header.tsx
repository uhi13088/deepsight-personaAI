import { Bell, Search } from "lucide-react"

interface HeaderProps {
  title: string
  description?: string
}

export function Header({ title, description }: HeaderProps) {
  return (
    <header className="border-border flex h-14 items-center justify-between border-b px-6">
      <div>
        <h1 className="text-lg font-semibold">{title}</h1>
        {description && <p className="text-muted-foreground text-xs">{description}</p>}
      </div>

      <div className="flex items-center gap-3">
        <button className="text-muted-foreground hover:bg-accent hover:text-accent-foreground rounded-md p-1.5 transition-colors">
          <Search className="h-4 w-4" />
        </button>
        <button className="text-muted-foreground hover:bg-accent hover:text-accent-foreground rounded-md p-1.5 transition-colors">
          <Bell className="h-4 w-4" />
        </button>
      </div>
    </header>
  )
}
