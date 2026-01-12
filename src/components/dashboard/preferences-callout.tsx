'use client'

import Link from 'next/link'
import { Settings, Sparkles } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface PreferencesCalloutProps {
  hasTasteProfile: boolean
}

export function PreferencesCallout({ hasTasteProfile }: PreferencesCalloutProps) {
  return (
    <Card className="border-muted">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="p-2 rounded-full bg-muted">
            {hasTasteProfile ? (
              <Sparkles className="h-5 w-5 text-primary" />
            ) : (
              <Settings className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">
              {hasTasteProfile
                ? 'AI-Powered Recommendations Active'
                : 'Recommendations based on your preferences'}
            </p>
            <p className="text-xs text-muted-foreground">
              {hasTasteProfile
                ? 'Your taste profile is learning from your ratings'
                : 'Rate more books to improve your AI taste profile'}
            </p>
          </div>
          <Link href="/dashboard/preferences">
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Edit Preferences
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
