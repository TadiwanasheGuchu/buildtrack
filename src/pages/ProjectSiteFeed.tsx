import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import TopNav from '@/components/TopNav'
import FeedPost from '@/components/FeedPost'
import NewPostDialog from '@/components/NewPostDialog'
import { getPosts } from '@/services/feedService'
import { getProjects } from '@/services/projectService'
import type { Post } from '@/types/feed'
import type { Project } from '@/types/project'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

const TABS = [
  { label: 'Site Feed', to: '/site-feed', active: true },
  { label: 'Dashboard', to: '/', active: false },
  { label: 'Reports', to: '/reports', active: false },
]

const PAGE_SIZE = 20

export default function ProjectSiteFeed() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [posts, setPosts] = useState<Post[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [projectFilter, setProjectFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [newPostOpen, setNewPostOpen] = useState(false)

  // Load projects for filter + dialog
  useEffect(() => {
    getProjects().then(setProjects)
  }, [])

  // Load feed when filter changes
  useEffect(() => {
    setLoading(true)
    setPosts([])
    const pid = projectFilter === 'all' ? undefined : projectFilter
    getPosts(pid, 0, PAGE_SIZE)
      .then(data => {
        setPosts(data)
        setHasMore(data.length === PAGE_SIZE)
      })
      .finally(() => setLoading(false))
  }, [projectFilter])

  async function loadMore() {
    setLoadingMore(true)
    const pid = projectFilter === 'all' ? undefined : projectFilter
    try {
      const more = await getPosts(pid, posts.length, PAGE_SIZE)
      setPosts(prev => [...prev, ...more])
      setHasMore(more.length === PAGE_SIZE)
    } finally {
      setLoadingMore(false)
    }
  }

  function handlePosted(post: Post) {
    setPosts(prev => [post, ...prev])
  }

  function handleProjectClick(projectId: string) {
    navigate(`/projects/${projectId}`)
  }

  return (
    <>
      <TopNav
        variant="feed"
        tabs={TABS}
        searchPlaceholder="Search logs..."
        profileImageUrl={user?.avatarUrl}
        userName={user?.name}
      />

      <main className="flex-1 p-gutter lg:p-margin-desktop max-w-2xl mx-auto w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="font-headline-lg text-headline-lg text-on-background">Site Feed</h1>
            <p className="text-body-md text-on-surface-variant mt-1">
              Real-time updates from your construction sites
            </p>
          </div>
          <Button onClick={() => setNewPostOpen(true)}>
            <span className="material-symbols-outlined text-[18px] mr-2">add</span>
            Post Update
          </Button>
        </div>

        {/* Project filter */}
        <div className="mb-6">
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue placeholder="All projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All projects</SelectItem>
              {projects.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Feed */}
        <div className="flex flex-col gap-4">
          {loading ? (
            [1, 2, 3].map(i => (
              <div key={i} className="bg-surface-container-lowest rounded-xl border border-outline-variant p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-9 h-9 rounded-full" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))
          ) : posts.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-muted-foreground text-3xl">feed</span>
              </div>
              <h3 className="font-semibold text-lg text-foreground">No updates yet</h3>
              <p className="text-muted-foreground text-sm mt-1">
                {projectFilter !== 'all' ? 'No posts for this project.' : 'Post the first site update to get started.'}
              </p>
              <Button className="mt-4" onClick={() => setNewPostOpen(true)}>
                Post Update
              </Button>
            </div>
          ) : (
            <>
              {posts.map(post => (
                <FeedPost
                  key={post.id}
                  post={post}
                  onProjectClick={handleProjectClick}
                />
              ))}

              {hasMore && (
                <div className="text-center pt-2">
                  <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
                    {loadingMore && <span className="mr-2 h-4 w-4 animate-spin inline-block border-2 border-current border-t-transparent rounded-full" />}
                    Load more
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <NewPostDialog
        open={newPostOpen}
        onClose={() => setNewPostOpen(false)}
        onPosted={handlePosted}
        projects={projects}
      />
    </>
  )
}
