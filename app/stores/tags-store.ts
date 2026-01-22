import { defineStore } from 'pinia'
import type { Tag } from '~/types'

export const useTagsStore = defineStore('tagsStore', () => {
  const subscribedTagIds = ref<number[]>([])
  const lastSync = ref<number>(0)

  function setSubscribedTags(tags: Tag[] | number[]) {
    if (Array.isArray(tags) && tags.length > 0) {
      // If array of tag objects
      if (typeof tags[0] === 'object' && 'id' in tags[0]) {
        subscribedTagIds.value = (tags as Tag[]).map(tag => tag.id)
      } else {
        // If array of IDs
        subscribedTagIds.value = tags as number[]
      }
      lastSync.value = Date.now()
      console.log('[TAGS STORE] Set subscribed tags:', subscribedTagIds.value)
    }
  }

  function addSubscribedTag(tagId: number) {
    if (!subscribedTagIds.value.includes(tagId)) {
      subscribedTagIds.value = [...subscribedTagIds.value, tagId]
      lastSync.value = Date.now()
      console.log('[TAGS STORE] Added subscribed tag:', tagId)
    }
  }

  function removeSubscribedTag(tagId: number) {
    subscribedTagIds.value = subscribedTagIds.value.filter(id => id !== tagId)
    lastSync.value = Date.now()
    console.log('[TAGS STORE] Removed subscribed tag:', tagId)
  }

  function isSubscribed(tagId: number): boolean {
    return subscribedTagIds.value.includes(tagId)
  }

  function clearSubscribedTags() {
    subscribedTagIds.value = []
    lastSync.value = 0
    console.log('[TAGS STORE] Cleared all subscribed tags')
  }

  return {
    subscribedTagIds,
    lastSync,
    setSubscribedTags,
    addSubscribedTag,
    removeSubscribedTag,
    isSubscribed,
    clearSubscribedTags
  }
}, {
  persist: {
    storage: typeof window !== 'undefined' ? localStorage : undefined,
    key: 'tags-store',
    paths: ['subscribedTagIds', 'lastSync']
  }
})
