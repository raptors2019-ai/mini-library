import { LayoutDashboard } from "lucide-react"

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <LayoutDashboard className="h-6 w-6" />
        <h1 className="text-3xl font-bold">Dashboard</h1>
      </div>
      <p className="text-muted-foreground">
        Your dashboard coming soon...
      </p>
    </div>
  )
}
