import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { resetPasswordApi } from '@/services/authService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'

const schema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine(d => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type FormValues = z.infer<typeof schema>

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [done, setDone] = useState(false)
  const [serverError, setServerError] = useState('')

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirmPassword: '' },
  })

  async function onSubmit(values: FormValues) {
    setServerError('')
    try {
      await resetPasswordApi(token!, values.password)
      setDone(true)
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-muted">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-white">architecture</span>
          </div>
          <span className="text-xl font-bold">TerraConstruct</span>
        </div>

        {!token ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-destructive font-medium mb-2">Invalid reset link</p>
              <p className="text-muted-foreground text-sm">This link is missing a reset token.</p>
            </CardContent>
            <CardFooter className="justify-center">
              <Link to="/forgot-password" className="text-sm text-primary hover:underline font-medium">
                Request a new link
              </Link>
            </CardFooter>
          </Card>
        ) : done ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="flex justify-center mb-4">
                <div className="w-14 h-14 rounded-full bg-secondary/10 flex items-center justify-center">
                  <CheckCircle2 className="w-7 h-7 text-secondary" />
                </div>
              </div>
              <h2 className="text-xl font-bold mb-2">Password updated</h2>
              <p className="text-muted-foreground text-sm">
                Your password has been reset. You can now sign in with your new password.
              </p>
            </CardContent>
            <CardFooter className="justify-center">
              <Link to="/login" className="text-sm text-primary hover:underline font-medium">
                Sign in
              </Link>
            </CardFooter>
          </Card>
        ) : (
          <>
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-foreground">Choose a new password</h1>
              <p className="text-muted-foreground mt-1">Must be at least 8 characters</p>
            </div>

            <Card>
              <CardContent className="pt-6">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {serverError && (
                      <p className="text-sm text-destructive">{serverError}</p>
                    )}

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={form.formState.isSubmitting}
                    >
                      {form.formState.isSubmitting && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Reset password
                    </Button>
                  </form>
                </Form>
              </CardContent>
              <CardFooter className="justify-center">
                <Link to="/login" className="text-sm text-primary hover:underline font-medium">
                  Back to sign in
                </Link>
              </CardFooter>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
