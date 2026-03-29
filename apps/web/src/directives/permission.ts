import type { Directive, DirectiveBinding } from 'vue'
import { useAuthStore } from '../stores/auth'

type PolicyInput = string | string[] | undefined | null

type PermissionBindingValue = PolicyInput | { policy?: PolicyInput }

type PermissionAnchor = {
  placeholder: Comment
}

const anchorMap = new WeakMap<HTMLElement, PermissionAnchor>()

function resolvePolicy(value: PermissionBindingValue): PolicyInput {
  if (!value) return undefined
  if (typeof value === 'string' || Array.isArray(value)) return value
  return value.policy
}

function applyPermission(el: HTMLElement, binding: DirectiveBinding<PermissionBindingValue>) {
  const authStore = useAuthStore()
  const policy = resolvePolicy(binding.value)
  const allowed = Array.isArray(policy)
    ? policy.some((item) => authStore.hasPermission(item))
    : authStore.hasPermission(policy ?? '')

  if (allowed) {
    const anchor = anchorMap.get(el)
    if (anchor && anchor.placeholder.parentNode) {
      anchor.placeholder.parentNode.replaceChild(el, anchor.placeholder)
      anchorMap.delete(el)
    }
    return
  }

  const parentNode = el.parentNode
  if (!parentNode) {
    return
  }

  if (!anchorMap.has(el)) {
    anchorMap.set(el, { placeholder: document.createComment('v-permission') })
  }

  const anchor = anchorMap.get(el)
  if (!anchor) {
    return
  }

  if (el.parentNode) {
    parentNode.replaceChild(anchor.placeholder, el)
  }
}

export const permissionDirective: Directive<HTMLElement, PermissionBindingValue> = {
  mounted(el, binding) {
    applyPermission(el, binding)
  },
  updated(el, binding) {
    applyPermission(el, binding)
  },
}
