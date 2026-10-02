import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// base './' keeps the build openable from any static host (and inside Capacitor later)
export default defineConfig({ plugins: [react()], base: './' })
