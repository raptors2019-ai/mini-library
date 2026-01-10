'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, ChevronDown, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { UserRole } from '@/types/database'

const ROLE_INFO: Record<UserRole, { label: string; color: string; description: string }> = {
  guest: {
    label: 'Guest',
    color: 'text-gray-500',
    description: 'Basic access, can browse and checkout'
  },
  member: {
    label: 'Member',
    color: 'text-blue-500',
    description: 'Standard member access'
  },
  premium: {
    label: 'Premium',
    color: 'text-purple-500',
    description: 'Priority waitlist access'
  },
  librarian: {
    label: 'Librarian',
    color: 'text-orange-500',
    description: 'Can add/edit books, admin panel'
  },
  admin: {
    label: 'Admin',
    color: 'text-red-500',
    description: 'Full system access'
  },
}

export function RoleSwitcher() {
  const router = useRouter()
  const [currentRole, setCurrentRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/dev/switch-role')
      .then(res => res.json())
      .then(data => setCurrentRole(data.currentRole))
      .catch(() => {})
  }, [])

  const switchRole = async (role: UserRole) => {
    setLoading(true)
    try {
      const res = await fetch('/api/dev/switch-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      })
      if (res.ok) {
        setCurrentRole(role)
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  if (!currentRole) return null

  const roleInfo = ROLE_INFO[currentRole]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={loading}
        >
          <Shield className={`h-4 w-4 ${roleInfo.color}`} />
          <span className={roleInfo.color}>{roleInfo.label}</span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Switch Role (Demo)
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {(Object.keys(ROLE_INFO) as UserRole[]).map((role) => {
          const info = ROLE_INFO[role]
          const isActive = role === currentRole
          return (
            <DropdownMenuItem
              key={role}
              onClick={() => switchRole(role)}
              className="flex flex-col items-start gap-1 cursor-pointer"
            >
              <div className="flex items-center gap-2 w-full">
                <Shield className={`h-4 w-4 ${info.color}`} />
                <span className={`font-medium ${info.color}`}>{info.label}</span>
                {isActive && <Check className="h-4 w-4 ml-auto" />}
              </div>
              <span className="text-xs text-muted-foreground pl-6">
                {info.description}
              </span>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
