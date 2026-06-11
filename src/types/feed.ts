export interface Post {
  id: string
  projectId: string
  projectName: string
  authorId: string
  authorName: string
  authorAvatarUrl?: string
  content: string
  imageUrl?: string
  createdAt: string
}

export interface CreatePostData {
  projectId: string
  content: string
  imageUrl?: string
}
