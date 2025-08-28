import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function TestPage() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">shadcn UI Test</h1>
          <p className="text-muted-foreground">Testing if shadcn components are properly styled</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Button Components Test</CardTitle>
            <CardDescription>
              These buttons should be properly styled with shadcn design system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button>Default</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="link">Link</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Layout Test</CardTitle>
            <CardDescription>
              Testing background, text colors, and spacing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-muted-foreground">This should have a muted background</p>
              </div>
              <div className="p-4 bg-primary text-primary-foreground rounded-lg">
                <p>This should have primary background with proper contrast text</p>
              </div>
              <div className="p-4 border border-border rounded-lg">
                <p>This should have a proper border</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            If you can see properly styled buttons, cards, and backgrounds, shadcn is working! 🎉
          </p>
        </div>
      </div>
    </div>
  )
}