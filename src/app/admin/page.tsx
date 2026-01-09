import { Settings } from "lucide-react"

export default function AdminPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <Settings className="h-6 w-6" />
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
      </div>
      <p className="text-muted-foreground">
        Admin features coming soon...
      </p>
    </div>
  )
}
