import { useEffect, useRef, useState } from 'react'
import { ImagePlus, Loader2, X } from 'lucide-react'
import type { Post } from '@/types/feed'
import type { Project } from '@/types/project'
import { createPost, uploadImage } from '@/services/feedService'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface NewPostDialogProps {
  open: boolean
  onClose: () => void
  onPosted: (post: Post) => void
  projects: Project[]
  defaultProjectId?: string
}

export default function NewPostDialog({
  open, onClose, onPosted, projects, defaultProjectId,
}: NewPostDialogProps) {
  const [projectId, setProjectId] = useState(defaultProjectId ?? '')
  const [content, setContent] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setProjectId(defaultProjectId ?? projects[0]?.id ?? '')
      setContent('')
      setImageFile(null)
      setImagePreview(null)
      setError('')
    }
  }, [open, defaultProjectId, projects])

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = ev => setImagePreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  function removeImage() {
    setImageFile(null)
    setImagePreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleSubmit() {
    if (!projectId || !content.trim()) return
    setSubmitting(true)
    setError('')
    try {
      let imageUrl: string | undefined
      if (imageFile) {
        try {
          imageUrl = await uploadImage(imageFile)
        } catch {
          setError('Image upload failed — posting without image.')
          // Non-blocking: continue without image
        }
      }
      const post = await createPost({ projectId, content: content.trim(), imageUrl })
      onPosted(post)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post update')
    } finally {
      setSubmitting(false)
    }
  }

  const canSubmit = !!projectId && content.trim().length > 0 && !submitting

  return (
    <Dialog open={open} onOpenChange={v => { if (!v && !submitting) onClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Post Site Update</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Project selector */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Project *</label>
            <Select value={projectId} onValueChange={setProjectId} disabled={!!defaultProjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Select project…" />
              </SelectTrigger>
              <SelectContent>
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Content */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Update *</label>
            <Textarea
              placeholder="What's happening on site today?"
              rows={4}
              value={content}
              onChange={e => setContent(e.target.value)}
              autoFocus
            />
            <p className="text-xs text-muted-foreground text-right">{content.length} / 1000</p>
          </div>

          {/* Image */}
          {imagePreview ? (
            <div className="relative rounded-lg overflow-hidden border border-outline-variant">
              <img src={imagePreview} alt="Preview" className="w-full object-cover max-h-48" />
              <button
                onClick={removeImage}
                className="absolute top-2 right-2 bg-background/80 rounded-full p-1 hover:bg-background transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full border-2 border-dashed border-outline-variant rounded-lg py-6 flex flex-col items-center gap-2 text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
            >
              <ImagePlus className="w-6 h-6" />
              <span className="text-sm">Add photo (optional)</span>
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFile}
          />

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Post Update
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
