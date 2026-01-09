'use client'

import Link from 'next/link'
import { Sparkles, ArrowRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export function OnboardingPrompt() {
  return (
    <Card className="border-primary/50 bg-gradient-to-r from-primary/5 to-primary/10">
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-full bg-primary/10">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg">Get Personalized Recommendations</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Tell us about your reading preferences and the books you&apos;ve enjoyed.
              We&apos;ll use AI to suggest books you&apos;ll love.
            </p>
          </div>
          <Link href="/onboarding">
            <Button>
              Get Started
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
