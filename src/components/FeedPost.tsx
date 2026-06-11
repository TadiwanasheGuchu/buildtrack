import { formatDistanceToNow, parseISO } from 'date-fns'
import type { Post } from '@/types/feed'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function timeAgo(dateStr: string): string {
  try {
    return formatDistanceToNow(parseISO(dateStr), { addSuffix: true })
  } catch {
    return ''
  }
}

interface FeedPostProps {
  post: Post
  onProjectClick?: (projectId: string) => void
}

export default function FeedPost({ post, onProjectClick }: FeedPostProps) {
  return (
    <article className="bg-surface-container-lowest rounded-xl border border-outline-variant p-5 hover:shadow-warm transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="w-9 h-9 shrink-0">
            <AvatarImage src={post.authorAvatarUrl} alt={post.authorName} />
            <AvatarFallback className="bg-primary text-on-primary text-xs font-bold">
              {initials(post.authorName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-semibold text-sm text-on-surface">{post.authorName}</p>
            <button
              onClick={() => onProjectClick?.(post.projectId)}
              className="text-xs text-primary hover:underline truncate max-w-[200px] block text-left"
            >
              {post.projectName}
            </button>
          </div>
        </div>
        <time className="text-caption text-on-surface-variant shrink-0 mt-0.5">
          {timeAgo(post.createdAt)}
        </time>
      </div>

      {/* Content */}
      <p className="text-body-md text-on-surface leading-relaxed whitespace-pre-line">
        {post.content}
      </p>

      {/* Image */}
      {post.imageUrl && (
        <div className="mt-3 rounded-lg overflow-hidden border border-outline-variant">
          <img
            src={post.imageUrl}
            alt="Site update"
            className="w-full object-cover max-h-72"
          />
        </div>
      )}
    </article>
  )
}
