'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { requestSignInOTP, verifySignInOTP } from '@/server/actions/auth'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'

const emailSchema = z.object({
  email: z.string().email('Invalid email address'),
})

const otpSchema = z.object({
  token: z.string().length(6, 'Code must be 6 digits'),
})

type EmailFormData = z.infer<typeof emailSchema>
type OTPFormData = z.infer<typeof otpSchema>

export function AuthForm() {
  const router = useRouter()
  const { toast } = useToast()
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const emailForm = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '' },
  })

  const otpForm = useForm<OTPFormData>({
    resolver: zodResolver(otpSchema),
    defaultValues: { token: '' },
  })

  async function onEmailSubmit(data: EmailFormData) {
    setIsLoading(true)
    const result = await requestSignInOTP(data.email)
    setIsLoading(false)

    if (result?.error) {
      toast({
        title: 'Error',
        description: result.error,
        variant: 'destructive',
      })
    } else if (result?.success) {
      setEmail(data.email)
      setStep('otp')
      toast({
        title: 'Code sent',
        description: 'Check your email for the verification code.',
      })
    }
  }

  async function onOTPSubmit(data: OTPFormData) {
    setIsLoading(true)
    const result = await verifySignInOTP(email, data.token)
    setIsLoading(false)

    if (result?.error) {
      toast({
        title: 'Error',
        description: result.error,
        variant: 'destructive',
      })
    } else if (result?.success) {
      router.push('/dashboard')
      router.refresh()
    }
  }

  if (step === 'otp') {
    return (
      <Form {...otpForm}>
        <form onSubmit={otpForm.handleSubmit(onOTPSubmit)} className="space-y-4">
          <div className="text-sm text-muted-foreground mb-4">
            We sent a code to <span className="font-medium">{email}</span>
          </div>
          <FormField
            control={otpForm.control}
            name="token"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Verification Code</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    placeholder="123456"
                    autoComplete="one-time-code"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Verifying...' : 'Continue'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => {
              setStep('email')
              otpForm.reset()
            }}
          >
            Use a different email
          </Button>
        </form>
      </Form>
    )
  }

  return (
    <Form {...emailForm}>
      <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
        <FormField
          control={emailForm.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Sending code...' : 'Continue'}
        </Button>
      </form>
    </Form>
  )
}
