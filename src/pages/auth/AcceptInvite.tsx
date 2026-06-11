import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/auth/useAuth'
import { getInviteInfo, acceptInvite } from '@/services/teamService'
import type { InviteInfo } from '@/types/team'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  site_manager: 'Site Manager',
  worker: 'Worker',
  client: 'Client',
}

const schema = z.object({
  name: z.string().min(2, 'Full name must be at least 2 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

type FormValues = z.infer<typeof schema>

export default function AcceptInvite() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { loginWithTokens } = useAuth()
  const token = searchParams.get('token') ?? ''

  const [info, setInfo] = useState<InviteInfo | null>(null)
  const [loadError, setLoadError] = useState('')
  const [loading, setLoading] = useState(true)
  const [serverError, setServerError] = useState('')

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', password: '', confirmPassword: '' },
  })

  useEffect(() => {
    if (!token) {
      setLoadError('No invitation token found.')
      setLoading(false)
      return
    }
    getInviteInfo(token)
      .then(setInfo)
      .catch(err => setLoadError(err instanceof Error ? err.message : 'Invalid invitation'))
      .finally(() => setLoading(false))
  }, [token])

  async function onSubmit(values: FormValues) {
    setServerError('')
    try {
      const auth = await acceptInvite(token, values.name, values.password)
      loginWithTokens(auth.access_token, auth.refresh_token, auth.user)
      navigate('/', { replace: true })
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Failed to accept invitation')
    }
  }

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  // Invalid token
  if (loadError || !info) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-destructive text-3xl">link_off</span>
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">Invitation expired</h1>
          <p className="text-muted-foreground text-sm">{loadError || 'This invitation is no longer valid.'}</p>
          <Button asChild className="mt-6" variant="outline">
            <a href="/login">Go to login</a>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm space-y-8">
        {/* Brand */}
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-on-primary text-3xl">architecture</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Join {info.companyName}</h1>
          <p className="text-muted-foreground text-sm mt-2">
            You've been invited as a{' '}
            <span className="font-semibold text-foreground">{ROLE_LABELS[info.role] ?? info.role}</span>.
            Set up your account to get started.
          </p>
          <p className="text-xs text-muted-foreground mt-1">{info.email}</p>
        </div>

        {/* Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Full name *</FormLabel>
                <FormControl>
                  <Input placeholder="Your full name" autoFocus {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="password" render={({ field }) => (
              <FormItem>
                <FormLabel>Password *</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="Min. 8 characters" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="confirmPassword" render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm password *</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="Repeat password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {serverError && <p className="text-sm text-destructive">{serverError}</p>}

            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Account &amp; Join Team
            </Button>
          </form>
        </Form>

        <p className="text-center text-xs text-muted-foreground">
          Already have an account?{' '}
          <a href="/login" className="text-primary hover:underline font-medium">Sign in</a>
        </p>
      </div>
    </div>
  )
}
