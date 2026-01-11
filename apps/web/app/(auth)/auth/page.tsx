import { Logo } from "@/components/brand/logo"
import { AuthCard } from "@/components/features/auth/auth-card"

export default function AuthPage() {
  return (
    <div className="flex flex-col items-center gap-8 px-6">
      <Logo className="h-12 w-auto text-foreground" />
      <p className="text-center font-serif text-2xl text-foreground">
        Let me log you in, so I can
        <br />
        write your medical notes.
      </p>
      <AuthCard />
    </div>
  )
}
