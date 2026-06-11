import { useEffect, useRef, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { Upload, Trash2, Loader2, Download, FileText } from 'lucide-react'
import { DOC_CATEGORIES } from '@/types/document'
import type { ProjectDocument, DocCategory } from '@/types/document'
import { getDocuments, uploadDocument, createDocument, deleteDocument } from '@/services/documentService'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

// ── Helpers ────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`
  if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(0)} KB`
  return `${bytes} B`
}

function fileIcon(fileType: string): string {
  if (fileType === 'application/pdf') return 'picture_as_pdf'
  if (fileType.startsWith('image/')) return 'image'
  if (fileType.includes('word') || fileType.includes('document')) return 'description'
  if (fileType.includes('excel') || fileType.includes('spreadsheet') || fileType === 'text/csv') return 'table_chart'
  return 'insert_drive_file'
}

function fileIconColor(fileType: string): string {
  if (fileType === 'application/pdf') return 'text-destructive'
  if (fileType.startsWith('image/')) return 'text-secondary'
  if (fileType.includes('word') || fileType.includes('document')) return 'text-primary'
  if (fileType.includes('excel') || fileType.includes('spreadsheet') || fileType === 'text/csv') return 'text-tertiary'
  return 'text-muted-foreground'
}

const CATEGORY_STYLES: Record<string, string> = {
  'Plans & Drawings': 'bg-primary/10 text-primary',
  'Contracts':        'bg-secondary/10 text-secondary',
  'Permits':          'bg-tertiary/10 text-tertiary',
  'Reports':          'bg-amber-50 text-amber-700',
  'Specifications':   'bg-blue-50 text-blue-700',
  'Other':            'bg-muted text-muted-foreground',
}

const ACCEPTED = '.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip,.jpg,.jpeg,.png,.webp'

// ── Upload Dialog ──────────────────────────────────────────────────────────

function UploadDialog({
  open, onClose, projectId, onUploaded,
}: {
  open: boolean
  onClose: () => void
  projectId: string
  onUploaded: (doc: ProjectDocument) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [name, setName] = useState('')
  const [category, setCategory] = useState<DocCategory>('Other')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  function reset() {
    setFile(null); setName(''); setCategory('Other'); setError('')
    if (fileRef.current) fileRef.current.value = ''
  }

  useEffect(() => { if (open) reset() }, [open])  

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    setFile(f)
    if (f && !name) setName(f.name.replace(/\.[^/.]+$/, ''))
  }

  async function handleUpload() {
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const result = await uploadDocument(file)
      const doc = await createDocument(projectId, {
        name: name.trim() || file.name,
        fileUrl: result.url,
        fileType: result.fileType || file.type,
        fileSize: result.fileSize || file.size,
        category,
      })
      onUploaded(doc)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v && !uploading) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* File picker */}
          <div
            className={cn(
              'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
              file ? 'border-primary/40 bg-primary/5' : 'border-border hover:border-primary/40 hover:bg-muted/40',
            )}
            onClick={() => fileRef.current?.click()}
          >
            <input ref={fileRef} type="file" accept={ACCEPTED} className="hidden" onChange={handleFile} />
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <span className={cn('material-symbols-outlined text-3xl', fileIconColor(file.type))}>
                  {fileIcon(file.type)}
                </span>
                <div className="text-left">
                  <p className="font-medium text-foreground text-sm truncate max-w-[220px]">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
                </div>
              </div>
            ) : (
              <>
                <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm font-medium text-foreground">Click to select a file</p>
                <p className="text-xs text-muted-foreground mt-1">PDF, Word, Excel, images — up to 20 MB</p>
              </>
            )}
          </div>

          {/* Document name */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Document name</label>
            <Input
              placeholder="e.g. Structural Engineering Specifications"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Category</label>
            <Select value={category} onValueChange={v => setCategory(v as DocCategory)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DOC_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={uploading}>Cancel</Button>
          <Button onClick={handleUpload} disabled={!file || uploading}>
            {uploading
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading…</>
              : <><Upload className="mr-2 h-4 w-4" /> Upload</>
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Main DocumentsTab ──────────────────────────────────────────────────────

export default function DocumentsTab({ projectId }: { projectId: string }) {
  const [docs, setDocs] = useState<ProjectDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState<string>('All')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ProjectDocument | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    setLoading(true)
    getDocuments(projectId).then(setDocs).finally(() => setLoading(false))
  }, [projectId])

  const categories = ['All', ...DOC_CATEGORIES.filter(c => docs.some(d => d.category === c))]
  const filtered = categoryFilter === 'All' ? docs : docs.filter(d => d.category === categoryFilter)

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteDocument(deleteTarget.id)
      setDocs(prev => prev.filter(d => d.id !== deleteTarget.id))
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3 flex-wrap gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <CardTitle className="text-base flex items-center gap-2">
              Documents
              {docs.length > 0 && <Badge variant="secondary" className="text-xs">{docs.length}</Badge>}
            </CardTitle>
            {/* Category filter pills */}
            {categories.length > 1 && (
              <div className="flex items-center gap-1 flex-wrap">
                {categories.map(c => (
                  <button
                    key={c}
                    onClick={() => setCategoryFilter(c)}
                    className={cn(
                      'text-xs px-2.5 py-1 rounded-full border transition-colors',
                      categoryFilter === c
                        ? 'bg-primary text-on-primary border-primary'
                        : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground',
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button size="sm" onClick={() => setUploadOpen(true)}>
            <Upload className="w-4 h-4 mr-1" /> Upload
          </Button>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <FileText className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="font-medium text-foreground">
                {categoryFilter === 'All' ? 'No documents yet' : `No ${categoryFilter} documents`}
              </p>
              {categoryFilter === 'All' && (
                <>
                  <p className="text-muted-foreground text-sm mt-1">
                    Upload drawings, contracts, permits, and reports here.
                  </p>
                  <Button variant="outline" size="sm" className="mt-4" onClick={() => setUploadOpen(true)}>
                    <Upload className="w-4 h-4 mr-1" /> Upload first document
                  </Button>
                </>
              )}
            </div>
          ) : (
            <ul className="divide-y">
              {filtered.map(doc => (
                <li key={doc.id} className="flex items-center gap-4 py-3 group">
                  {/* File type icon */}
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <span className={cn('material-symbols-outlined text-xl', fileIconColor(doc.fileType))}>
                      {fileIcon(doc.fileType)}
                    </span>
                  </div>

                  {/* Name + meta */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">{doc.name}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className={cn('text-xs font-medium rounded-full px-2 py-0.5', CATEGORY_STYLES[doc.category])}>
                        {doc.category}
                      </span>
                      <span className="text-xs text-muted-foreground">{formatBytes(doc.fileSize)}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(parseISO(doc.createdAt), 'dd MMM yyyy')}
                      </span>
                      <span className="text-xs text-muted-foreground">· {doc.uploadedByName}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    {doc.fileUrl !== '#' && (
                      <Button size="icon" variant="ghost" className="h-7 w-7" asChild title="Download">
                        <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" download>
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </Button>
                    )}
                    <Button
                      size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                      onClick={() => setDeleteTarget(doc)}
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <UploadDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        projectId={projectId}
        onUploaded={doc => setDocs(prev => [doc, ...prev])}
      />

      <Dialog open={!!deleteTarget} onOpenChange={v => { if (!v && !deleting) setDeleteTarget(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete document?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            <span className="font-semibold text-foreground">{deleteTarget?.name}</span> will be permanently deleted.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
