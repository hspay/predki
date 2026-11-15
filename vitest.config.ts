import { defineConfig, mergeConfig } from 'vitest/config'
import base from './vite.config'
// Tests of the tree's logic (layout, kinship, links) run in plain Node; tests/env.ts stands in for the few browser globals.
export default mergeConfig(base, defineConfig({ test: { environment: 'node', setupFiles: ['tests/env.ts'], include: ['tests/**/*.spec.ts'] } }))
