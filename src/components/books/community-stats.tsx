'use client'

import { Users } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface CommunityStatsProps {
  readerCount: number
  reviewCount: number
}

export function CommunityStats({ readerCount, reviewCount }: CommunityStatsProps): React.ReactElement | null {
  if (readerCount === 0 && reviewCount === 0) {
    return null
  }

  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-2">
        <Users className="h-4 w-4 text-muted-foreground" />
        <div>
          <div className="text-sm text-muted-foreground">Community</div>
          <div className="font-medium">
            {readerCount > 0 ? (
              <>
                {readerCount} {readerCount === 1 ? 'reader' : 'readers'}
                {reviewCount > 0 && ` · ${reviewCount} ${reviewCount === 1 ? 'review' : 'reviews'}`}
              </>
            ) : (
              'Be the first!'
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
