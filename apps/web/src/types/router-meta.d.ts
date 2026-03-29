import 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    requiresAuth?: boolean
    requiredPolicy?: string
    hidden?: boolean
    order?: number
    icon?: string
  }
}

export {}
