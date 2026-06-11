import { useRef, useState } from 'react'
import { Camera, Loader2 } from 'lucide-react'
import { useAuth } from '@/auth/useAuth'
import { changePasswordApi, updateMeApi, uploadAvatarApi } from '@/services/authService'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import NotificationBell from '@/components/NotificationBell'

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export default function ProfileSettings() {
  const { user, updateUser } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState(user?.name ?? '')
  const [savingName, setSavingName] = useState(false)
  const [nameMsg, setNameMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const [uploading, setUploading] = useState(false)
  const [avatarMsg, setAvatarMsg] = useState<string | null>(null)

  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [savingPw, setSavingPw] = useState(false)
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null)

  async function saveName(e: React.FormEvent) {
    e.preventDefault()
    if (name.trim().length < 2) {
      setNameMsg({ ok: false, text: 'Name must be at least 2 characters' })
      return
    }
    setSavingName(true)
    setNameMsg(null)
    try {
      const updated = await updateMeApi(name.trim())
      updateUser(updated)
      setNameMsg({ ok: true, text: 'Profile updated' })
    } catch (err) {
      setNameMsg({ ok: false, text: err instanceof Error ? err.message : 'Failed to update profile' })
    } finally {
      setSavingName(false)
    }
  }

  async function handleAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setAvatarMsg('Image must be under 5MB')
      return
    }
    setUploading(true)
    setAvatarMsg(null)
    try {
      const updated = await uploadAvatarApi(file)
      updateUser(updated)
    } catch (err) {
      setAvatarMsg(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault()
    setPwMsg(null)
    if (newPw.length < 8) {
      setPwMsg({ ok: false, text: 'New password must be at least 8 characters' })
      return
    }
    if (newPw !== confirmPw) {
      setPwMsg({ ok: false, text: 'New passwords do not match' })
      return
    }
    setSavingPw(true)
    try {
      await changePasswordApi(currentPw, newPw)
      setPwMsg({ ok: true, text: 'Password changed' })
      setCurrentPw(''); setNewPw(''); setConfirmPw('')
    } catch (err) {
      setPwMsg({ ok: false, text: err instanceof Error ? err.message : 'Failed to change password' })
    } finally {
      setSavingPw(false)
    }
  }

  return (
    <div className="p-gutter lg:p-margin-desktop flex flex-col gap-6 max-w-2xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-headline-lg font-headline-lg text-foreground">Profile Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your personal details and password</p>
        </div>
        <NotificationBell />
      </div>

      {/* Profile card */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveName} className="space-y-5">
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16 border-2 border-outline-variant">
                <AvatarImage src={user?.avatarUrl} alt={user?.name} />
                <AvatarFallback className="bg-primary text-on-primary text-lg font-bold">
                  {user ? initials(user.name) : 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading
                    ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    : <Camera className="w-4 h-4 mr-2" />}
                  {uploading ? 'Uploading…' : 'Change photo'}
                </Button>
                <p className="text-xs text-muted-foreground mt-1.5">JPG, PNG or WebP, max 5MB</p>
                {avatarMsg && <p className="text-sm text-destructive mt-1">{avatarMsg}</p>}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleAvatarFile}
              />
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="profile-name">Full name</Label>
              <Input id="profile-name" value={name} onChange={e => setName(e.target.value)} />
            </div>

            {/* Email (read-only) */}
            <div className="space-y-2">
              <Label htmlFor="profile-email">Email</Label>
              <Input id="profile-email" value={user?.email ?? ''} disabled />
              <p className="text-xs text-muted-foreground">Email can't be changed — it's your login identity.</p>
            </div>

            {nameMsg && (
              <p className={`text-sm ${nameMsg.ok ? 'text-secondary' : 'text-destructive'}`}>{nameMsg.text}</p>
            )}

            <div className="flex justify-end">
              <Button type="submit" disabled={savingName || name.trim() === user?.name}>
                {savingName && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Password card */}
      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={savePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pw-current">Current password</Label>
              <Input id="pw-current" type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} autoComplete="current-password" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pw-new">New password</Label>
                <Input id="pw-new" type="password" value={newPw} onChange={e => setNewPw(e.target.value)} autoComplete="new-password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pw-confirm">Confirm new password</Label>
                <Input id="pw-confirm" type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} autoComplete="new-password" />
              </div>
            </div>

            {pwMsg && (
              <p className={`text-sm ${pwMsg.ok ? 'text-secondary' : 'text-destructive'}`}>{pwMsg.text}</p>
            )}

            <div className="flex justify-end">
              <Button type="submit" disabled={savingPw || !currentPw || !newPw || !confirmPw}>
                {savingPw && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Update password
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
