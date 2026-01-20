import type { AvatarProps } from '@nuxt/ui'

export type UserStatus = 'subscribed' | 'unsubscribed' | 'bounced'
export type SaleStatus = 'paid' | 'failed' | 'refunded'

export interface User {
  id: number
  name: string
  email: string
  avatar?: AvatarProps
  status: UserStatus
  location: string
}

export interface Publication {
  id: number
  title: string
  scientificArea: string
  summary: string
  visible: boolean
  fileUrl: string

  author: {
    id: number
    name: string
  }

  averageRating: number
  ratingsCount: number
  tags: Tag[]
  comments: any[] | null

  createdAt: number
  updatedAt: number | null
}

export interface Tag {
  id: number
  name: string
  visible?: boolean
  createdAt?: number
}

export interface UserData {
  id: number
  name: string
  email: string
  role: string
  password: string | null
}

export interface Mail {
  id: number
  unread?: boolean
  from: User
  subject: string
  body: string
  date: string
}

export interface Member {
  name: string
  username: string
  role: 'member' | 'owner'
  avatar: AvatarProps
}

export interface Stat {
  title: string
  icon: string
  value: number | string
  variation: number
  formatter?: (value: number) => string
}

export interface Sale {
  id: string
  date: string
  status: SaleStatus
  email: string
  amount: number
}

export interface Notification {
  id: number
  unread?: boolean
  sender: User
  body: string
  date: string
}

export type Period = 'daily' | 'weekly' | 'monthly'

export interface Range {
  start: Date
  end: Date
}
