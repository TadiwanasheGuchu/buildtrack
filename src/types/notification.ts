export type NotificationType = 'post' | 'milestone' | 'punch' | 'budget' | 'team'

export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  message: string
  link: string | null
  read: boolean
  createdAt: string
}
