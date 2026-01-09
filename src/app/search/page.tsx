import { Search } from "lucide-react"

export default function SearchPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <Search className="h-6 w-6" />
        <h1 className="text-3xl font-bold">Search Books</h1>
      </div>
      <p className="text-muted-foreground">
        Search functionality coming soon...
      </p>
    </div>
  )
}
