export interface RuntimeConfig {
  ui: {
    auth: {
      showLoginEntry: boolean
    }
    memory: {
      showStatus: boolean
      showSearchViewTimeoutControl: boolean
    }
    theme: {
      showCreate: boolean
      showDuplicate: boolean
    }
  }
  behavior: {
    memory: {
      searchViewIdleTimeoutMinutes: number
    }
  }
}

export const DEFAULT_RUNTIME_CONFIG: RuntimeConfig = {
  ui: {
    auth: {
      showLoginEntry: false
    },
    memory: {
      showStatus: false,
      showSearchViewTimeoutControl: false
    },
    theme: {
      showCreate: false,
      showDuplicate: false
    }
  },
  behavior: {
    memory: {
      searchViewIdleTimeoutMinutes: 30
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function normalizeBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()

    if (normalized === 'true') {
      return true
    }

    if (normalized === 'false') {
      return false
    }
  }

  return fallback
}

function normalizePositiveInteger(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)

    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed
    }
  }

  return fallback
}

export function normalizeRuntimeConfig(input: unknown): RuntimeConfig {
  const root = isRecord(input) ? input : {}
  const ui = isRecord(root.ui) ? root.ui : {}
  const auth = isRecord(ui.auth) ? ui.auth : {}
  const memory = isRecord(ui.memory) ? ui.memory : {}
  const theme = isRecord(ui.theme) ? ui.theme : {}
  const behavior = isRecord(root.behavior) ? root.behavior : {}
  const behaviorMemory = isRecord(behavior.memory) ? behavior.memory : {}

  return {
    ui: {
      auth: {
        showLoginEntry: normalizeBoolean(auth.showLoginEntry, DEFAULT_RUNTIME_CONFIG.ui.auth.showLoginEntry)
      },
      memory: {
        showStatus: normalizeBoolean(memory.showStatus, DEFAULT_RUNTIME_CONFIG.ui.memory.showStatus),
        showSearchViewTimeoutControl: normalizeBoolean(
          memory.showSearchViewTimeoutControl,
          DEFAULT_RUNTIME_CONFIG.ui.memory.showSearchViewTimeoutControl
        )
      },
      theme: {
        showCreate: normalizeBoolean(theme.showCreate, DEFAULT_RUNTIME_CONFIG.ui.theme.showCreate),
        showDuplicate: normalizeBoolean(theme.showDuplicate, DEFAULT_RUNTIME_CONFIG.ui.theme.showDuplicate)
      }
    },
    behavior: {
      memory: {
        searchViewIdleTimeoutMinutes: normalizePositiveInteger(
          behaviorMemory.searchViewIdleTimeoutMinutes,
          DEFAULT_RUNTIME_CONFIG.behavior.memory.searchViewIdleTimeoutMinutes
        )
      }
    }
  }
}
