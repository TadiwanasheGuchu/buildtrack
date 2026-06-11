import { useState } from 'react'
import { Building2, Loader2 } from 'lucide-react'
import { useAuth } from '@/auth/useAuth'
import { getMeApi, renameCompanyApi } from '@/services/authService'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import NotificationBell from '@/components/NotificationBell'

export default function CompanySettings() {
  const { user, updateUser } = useAuth()
  const isOwner = user?.role === 'owner'

  const [name, setName] = useState(user?.companyName ?? '')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  async function saveName(e: React.FormEvent) {
    e.preventDefault()
    if (name.trim().length < 2) {
      setMsg({ ok: false, text: 'Company name must be at least 2 characters' })
      return
    }
    setSaving(true)
    setMsg(null)
    try {
      await renameCompanyApi(name.trim())
      // companyName lives on the user object — refresh it so the sidebar updates
      const me = await getMeApi()
      updateUser(me)
      setMsg({ ok: true, text: 'Company name updated' })
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : 'Failed to update company' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-gutter lg:p-margin-desktop flex flex-col gap-6 max-w-2xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-headline-lg font-headline-lg text-foreground">Company Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your company details</p>
        </div>
        <NotificationBell />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Company
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveName} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company-name">Company name</Label>
              <Input
                id="company-name"
                value={name}
                onChange={e => setName(e.target.value)}
                disabled={!isOwner}
              />
              {!isOwner && (
                <p className="text-xs text-muted-foreground">
                  Only the company owner can change the company name.
                </p>
              )}
            </div>

            {msg && (
              <p className={`text-sm ${msg.ok ? 'text-secondary' : 'text-destructive'}`}>{msg.text}</p>
            )}

            {isOwner && (
              <div className="flex justify-end">
                <Button type="submit" disabled={saving || name.trim() === user?.companyName}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Save changes
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
