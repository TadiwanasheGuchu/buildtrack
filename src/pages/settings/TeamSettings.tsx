import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format, parseISO } from 'date-fns'
import { UserPlus, Trash2, Loader2, Shield, ChevronDown } from 'lucide-react'
import { useAuth } from '@/auth/useAuth'
import type { TeamMember } from '@/types/team'
import type { UserRole } from '@/types/auth'
import { getTeamMembers, inviteMember, changeMemberRole, removeMember } from '@/services/teamService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Skeleton } from '@/components/ui/skeleton'
import NotificationBell from '@/components/NotificationBell'

// ── Constants ──────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  site_manager: 'Site Manager',
  worker: 'Worker',
  client: 'Client',
}

const ROLE_COLORS: Record<string, string> = {
  owner: 'bg-primary/10 text-primary border-primary/20',
  site_manager: 'bg-secondary/10 text-secondary border-secondary/20',
  worker: 'bg-muted text-muted-foreground border',
  client: 'bg-tertiary/10 text-tertiary border-tertiary/20',
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

// ── Invite schema ──────────────────────────────────────────────────────────

const inviteSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  role: z.enum(['site_manager', 'worker', 'client']),
})
type InviteFormValues = z.infer<typeof inviteSchema>

// ── Invite Dialog ──────────────────────────────────────────────────────────

function InviteDialog({ open, onClose, onInvited }: {
  open: boolean
  onClose: () => void
  onInvited: (email: string) => void
}) {
  const [serverError, setServerError] = useState('')
  const [success, setSuccess] = useState('')

  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: '', role: 'site_manager' },
  })

  useEffect(() => {
    if (open) { form.reset(); setServerError(''); setSuccess('') }
  }, [open, form])

  async function onSubmit(values: InviteFormValues) {
    setServerError('')
    try {
      await inviteMember(values.email, values.role)
      setSuccess(`Invitation sent to ${values.email}`)
      onInvited(values.email)
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Failed to send invite')
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
        </DialogHeader>
        {success ? (
          <div className="py-6 text-center">
            <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-3">
              <span className="material-symbols-outlined text-secondary text-2xl">mark_email_read</span>
            </div>
            <p className="font-semibold text-foreground">Invitation sent!</p>
            <p className="text-sm text-muted-foreground mt-1">{success}</p>
            <Button className="mt-4" onClick={onClose}>Done</Button>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email address *</FormLabel>
                  <FormControl><Input placeholder="colleague@company.com" type="email" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="role" render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="site_manager">Site Manager</SelectItem>
                      <SelectItem value="worker">Worker</SelectItem>
                      <SelectItem value="client">Client</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              {serverError && <p className="text-sm text-destructive">{serverError}</p>}
              <DialogFooter>
                <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send Invite
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ── Remove Confirmation Dialog ─────────────────────────────────────────────

function RemoveDialog({ member, onClose, onRemoved }: {
  member: TeamMember | null
  onClose: () => void
  onRemoved: (id: string) => void
}) {
  const [removing, setRemoving] = useState(false)
  const [error, setError] = useState('')

  async function handleRemove() {
    if (!member) return
    setRemoving(true)
    setError('')
    try {
      await removeMember(member.id)
      onRemoved(member.id)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member')
    } finally {
      setRemoving(false)
    }
  }

  return (
    <Dialog open={!!member} onOpenChange={v => { if (!v && !removing) onClose() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Remove team member?</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground py-2">
          <span className="font-semibold text-foreground">{member?.name}</span> will lose access to all
          company projects immediately.
        </p>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={removing}>Cancel</Button>
          <Button variant="destructive" onClick={handleRemove} disabled={removing}>
            {removing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Remove
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function TeamSettings() {
  const { user } = useAuth()
  const isOwner = user?.role === 'owner'

  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<TeamMember | null>(null)

  useEffect(() => {
    getTeamMembers()
      .then(setMembers)
      .finally(() => setLoading(false))
  }, [])

  async function handleRoleChange(memberId: string, role: string) {
    try {
      const updated = await changeMemberRole(memberId, role as UserRole)
      setMembers(prev => prev.map(m => m.id === memberId ? updated : m))
    } catch {
      // Silently ignore — could add a toast here in Phase 10
    }
  }

  return (
    <div className="p-gutter lg:p-margin-desktop flex flex-col gap-6 max-w-2xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-headline-lg font-headline-lg text-foreground">Team</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {loading ? '—' : `${members.length} member${members.length !== 1 ? 's' : ''} in your company`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          {isOwner && (
            <Button onClick={() => setInviteOpen(true)}>
              <UserPlus className="w-4 h-4 mr-2" />
              Invite Member
            </Button>
          )}
        </div>
      </div>

      {/* Members list */}
      <div className="rounded-xl border bg-card overflow-hidden">
        {loading ? (
          <div className="divide-y">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-4 p-4">
                <Skeleton className="w-10 h-10 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
            ))}
          </div>
        ) : (
          <ul className="divide-y">
            {members.map(member => {
              const isSelf = member.id === user?.id
              const canEdit = isOwner && !isSelf

              return (
                <li key={member.id} className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
                  {/* Avatar */}
                  <Avatar className="w-10 h-10 shrink-0">
                    <AvatarImage src={member.avatarUrl} alt={member.name} />
                    <AvatarFallback className="bg-primary text-on-primary text-sm font-bold">
                      {initials(member.name)}
                    </AvatarFallback>
                  </Avatar>

                  {/* Name + email */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm text-foreground truncate">{member.name}</p>
                      {isSelf && <span className="text-xs text-muted-foreground">(you)</span>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                  </div>

                  {/* Role */}
                  <div className="shrink-0">
                    {canEdit ? (
                      <Select value={member.role} onValueChange={role => handleRoleChange(member.id, role)}>
                        <SelectTrigger className={`h-7 text-xs font-semibold border rounded-full px-2.5 w-auto gap-1 ${ROLE_COLORS[member.role]}`}>
                          <SelectValue />
                          <ChevronDown className="w-3 h-3 opacity-50" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="owner">Owner</SelectItem>
                          <SelectItem value="site_manager">Site Manager</SelectItem>
                          <SelectItem value="worker">Worker</SelectItem>
                          <SelectItem value="client">Client</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold border rounded-full px-2.5 py-1 ${ROLE_COLORS[member.role]}`}>
                        {member.role === 'owner' && <Shield className="w-3 h-3" />}
                        {ROLE_LABELS[member.role] ?? member.role}
                      </span>
                    )}
                  </div>

                  {/* Joined date */}
                  <p className="text-xs text-muted-foreground shrink-0 hidden sm:block w-24 text-right">
                    {format(parseISO(member.createdAt), 'dd MMM yyyy')}
                  </p>

                  {/* Remove */}
                  {canEdit && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() => setRemoveTarget(member)}
                      title="Remove member"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Owner note */}
      {!isOwner && (
        <p className="text-sm text-muted-foreground text-center">
          Contact an owner to invite or manage team members.
        </p>
      )}

      {/* Dialogs */}
      <InviteDialog
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onInvited={() => {
          // Refresh list to show potential new member (real API) or keep demo state
          if (import.meta.env.VITE_DEMO_MODE !== 'true') {
            getTeamMembers().then(setMembers)
          }
        }}
      />
      <RemoveDialog
        member={removeTarget}
        onClose={() => setRemoveTarget(null)}
        onRemoved={id => setMembers(prev => prev.filter(m => m.id !== id))}
      />
    </div>
  )
}
