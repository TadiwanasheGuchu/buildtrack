import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, MailCheck } from 'lucide-react'
import { forgotPasswordApi } from '@/services/authService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
})

type FormValues = z.infer<typeof schema>

export default function ForgotPassword() {
  const [sent, setSent] = useState(false)
  const [serverError, setServerError] = useState('')

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  })

  async function onSubmit(values: FormValues) {
    setServerError('')
    try {
      await forgotPasswordApi(values.email)
      setSent(true)
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

        {sent ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="flex justify-center mb-4">
                <div className="w-14 h-14 rounded-full bg-secondary/10 flex items-center justify-center">
                  <MailCheck className="w-7 h-7 text-secondary" />
                </div>
              </div>
              <h2 className="text-xl font-bold mb-2">Check your inbox</h2>
              <p className="text-muted-foreground text-sm">
                We've sent a password reset link to{' '}
                <span className="font-medium text-foreground">{form.getValues('email')}</span>.
                It expires in 30 minutes.
              </p>
            </CardContent>
            <CardFooter className="justify-center">
              <Link to="/login" className="text-sm text-primary hover:underline font-medium">
                Back to sign in
              </Link>
            </CardFooter>
          </Card>
        ) : (
          <>
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-foreground">Reset your password</h1>
              <p className="text-muted-foreground mt-1">
                Enter your email and we'll send you a reset link
              </p>
            </div>

            <Card>
              <CardContent className="pt-6">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email address</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="you@company.com" {...field} />
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
                      Send reset link
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
