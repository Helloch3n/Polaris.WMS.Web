import { computed } from 'vue'
import { useAuthStore } from '../stores/auth'

export function usePermission() {
  const authStore = useAuthStore()

  function hasPermission(policy: string) {
    return authStore.hasPermission(policy)
  }

  function hasAnyPermission(policies: string[]) {
    if (!policies.length) return true
    return policies.some((policy) => hasPermission(policy))
  }

  function hasAllPermissions(policies: string[]) {
    if (!policies.length) return true
    return policies.every((policy) => hasPermission(policy))
  }

  const grantedPolicies = computed(() => authStore.grantedPolicies)

  return {
    grantedPolicies,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  }
}
