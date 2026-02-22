import Link from "next/link"
import { ForceLightTheme } from "@/components/force-light-theme"
import { Shield } from "@/components/icons"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { signUp } from "@/app/actions/auth"

export default function SignUpPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted/30 px-4">
      <ForceLightTheme />
      <div className="mb-8 flex items-center gap-2.5">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
          <Shield className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <span className="text-lg font-semibold tracking-tight text-foreground">MediCRM</span>
          <span className="block text-xs text-muted-foreground">Medicare Agent Platform</span>
        </div>
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Create an account</CardTitle>
          <CardDescription>Enter your details to register as an agent.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={signUp} className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label htmlFor="fullName">Full name (optional)</Label>
              <Input
                id="fullName"
                name="fullName"
                type="text"
                placeholder="Jane Smith"
                autoComplete="name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full">
              Sign up
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
