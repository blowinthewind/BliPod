import { app } from 'electron'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { parse } from 'yaml'
import { DEFAULT_RUNTIME_CONFIG, normalizeRuntimeConfig, type RuntimeConfig } from '../shared/runtimeConfig'
import { logger } from './utils/logger'

const CONFIG_FILE_NAME = 'config.yaml'
const CONFIG_PATH_ENV_KEY = 'BLIPOD_CONFIG_PATH'

let runtimeConfig: RuntimeConfig = DEFAULT_RUNTIME_CONFIG
let runtimeConfigPath: string | null = null

export function resolveRuntimeConfigPath(): string {
  const envPath = process.env[CONFIG_PATH_ENV_KEY]?.trim()

  if (envPath) {
    return envPath
  }

  return join(app.getPath('userData'), CONFIG_FILE_NAME)
}

export function loadRuntimeConfig(): RuntimeConfig {
  const nextPath = resolveRuntimeConfigPath()
  runtimeConfigPath = nextPath

  if (!existsSync(nextPath)) {
    runtimeConfig = DEFAULT_RUNTIME_CONFIG
    logger.info('Runtime config file not found, using defaults', { path: nextPath })
    return runtimeConfig
  }

  try {
    const content = readFileSync(nextPath, 'utf-8')

    if (!content.trim()) {
      runtimeConfig = DEFAULT_RUNTIME_CONFIG
      logger.warn('Runtime config file is empty, using defaults', { path: nextPath })
      return runtimeConfig
    }

    const parsed = parse(content)
    runtimeConfig = normalizeRuntimeConfig(parsed)
    logger.info('Runtime config loaded', { path: nextPath, source: process.env[CONFIG_PATH_ENV_KEY] ? 'env' : 'default' })
    return runtimeConfig
  } catch (error) {
    runtimeConfig = DEFAULT_RUNTIME_CONFIG
    logger.warn('Failed to load runtime config, using defaults', {
      path: nextPath,
      error: error instanceof Error ? error.message : String(error)
    })
    return runtimeConfig
  }
}

export function getRuntimeConfig(): RuntimeConfig {
  return runtimeConfig
}

export function getRuntimeConfigPath(): string | null {
  return runtimeConfigPath
}
