import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    css: false,
    // the interaction tests drive userEvent on the real clock, because its small delays between
    // events never resolve against a fake one. five seconds is enough on an idle machine and not
    // on a busy one: a single test timed out once here, while a set of headless browsers from the
    // qa sweep were still shutting down. nothing in the suite should take anywhere near this, so
    // a genuine hang is still caught.
    testTimeout: 15_000,
    hookTimeout: 15_000,
    // threads rather than the default child processes. one jsdom per test file is not cheap,
    // and spawning forty processes to hold forty of them was getting workers killed by the
    // operating system rather than failed by vitest: whole files came back reported as never
    // having run. a thread costs a fraction of a process to start and each file still gets its
    // own environment, so the isolation the suite relies on is unchanged.
    pool: 'threads',
  },
})
