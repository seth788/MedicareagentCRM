import Image from "next/image"
import Link from "next/link"
import { ForceLightTheme } from "@/components/force-light-theme"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { signIn, signInWithGoogle } from "@/app/actions/auth"
import { GoogleIcon } from "@/components/icons/google-icon"

export default function LoginPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted/30 px-4">
      <ForceLightTheme />
      <div className="mb-8 flex items-center justify-center">
        <Image
          src="/logo.svg"
          alt="AdvantaCRM"
          width={180}
          height={48}
          className="h-12 w-auto"
          priority
        />
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Sign in with your email and password or use Google.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form action={signIn} className="flex flex-col gap-4">
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
                autoComplete="current-password"
                required
              />
            </div>
            <Button type="submit" className="min-h-[40px] w-full">
              Sign in
            </Button>
          </form>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">or</span>
            </div>
          </div>
          <form action={signInWithGoogle}>
            <Button type="submit" variant="outline" className="min-h-[40px] w-full gap-2">
              <GoogleIcon className="h-4 w-4" />
              Continue with Google
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-medium text-primary underline-offset-4 hover:underline">
              Sign up
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
