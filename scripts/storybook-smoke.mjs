import { spawn } from 'node:child_process'
import process from 'node:process'
import { setTimeout as delay } from 'node:timers/promises'
import { chromium } from 'playwright'

const baseUrl = process.env.STORYBOOK_URL ?? `http://localhost:${process.env.STORYBOOK_PORT ?? '6006'}`
const indexUrl = new URL('index.json', baseUrl).toString()
const iframeUrl = new URL('iframe.html', baseUrl).toString()

const ignoredConsolePatterns = [/Failed to load resource/i]
const transientConsolePatterns = [/Outdated Optimize Dep/i, /Failed to fetch dynamically imported module/i]

const fetchJson = async (url, timeoutMs = 3000) => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { signal: controller.signal, cache: 'no-store' })
    if (!response.ok) {
      return null
    }
    return await response.json()
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

const waitForStorybook = async (timeoutMs = 120_000) => {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const index = await fetchJson(indexUrl)
    if (index) {
      return index
    }
    await delay(500)
  }
  throw new Error(`Storybook server did not start within ${timeoutMs / 1000}s: ${indexUrl}`)
}

const ensureServer = async () => {
  const existing = await fetchJson(indexUrl)
  if (existing) {
    return { index: existing, server: null }
  }

  const server = spawn('pnpm', ['storybook'], {
    stdio: 'inherit',
    env: { ...process.env, STORYBOOK_DISABLE_TELEMETRY: '1' },
  })

  const index = await waitForStorybook()
  return { index, server }
}

const getStoryIds = (index) => {
  const entries = index.entries ?? index.stories ?? {}
  return Object.entries(entries)
    .filter(([, entry]) => entry?.type === 'story')
    .map(([id, entry]) => entry.id ?? id)
}

const setupCleanup = (server) => {
  const cleanup = () => {
    if (server && !server.killed) {
      server.kill('SIGTERM')
    }
  }

  process.on('exit', cleanup)
  process.on('SIGINT', () => {
    cleanup()
    process.exit(130)
  })
  process.on('SIGTERM', () => {
    cleanup()
    process.exit(143)
  })
}

const classifyConsoleErrors = (consoleErrors) => {
  const ignoredErrors = consoleErrors.filter((error) => ignoredConsolePatterns.some((pattern) => pattern.test(error)))
  const transientErrors = consoleErrors.filter((error) =>
    transientConsolePatterns.some((pattern) => pattern.test(error))
  )
  const remainingErrors = consoleErrors.filter(
    (error) =>
      !(
        ignoredConsolePatterns.some((pattern) => pattern.test(error)) ||
        transientConsolePatterns.some((pattern) => pattern.test(error))
      )
  )

  return { ignoredErrors, transientErrors, remainingErrors }
}

const runStory = async (browser, id) => {
  const page = await browser.newPage()
  const pageErrors = []
  const consoleErrors = []

  page.on('pageerror', (error) => {
    pageErrors.push(error.message)
  })
  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text())
    }
  })

  const url = `${iframeUrl}?id=${encodeURIComponent(id)}&viewMode=story`
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await page.waitForSelector('#storybook-root', { state: 'attached', timeout: 20_000 })
  await delay(300)

  await page.close()

  const { ignoredErrors, transientErrors, remainingErrors } = classifyConsoleErrors(consoleErrors)
  return { pageErrors, transientErrors, consoleErrors: remainingErrors, ignoredErrors }
}

const runStoryWithRetry = async (browser, id, maxRetries) => {
  let attempt = 0
  let lastResult = null

  while (attempt < maxRetries) {
    attempt += 1
    lastResult = await runStory(browser, id)

    if (lastResult.pageErrors.length > 0 || lastResult.consoleErrors.length > 0) {
      break
    }

    if (lastResult.transientErrors.length === 0) {
      break
    }

    await delay(1000)
  }

  if (!lastResult) {
    return { errors: [] }
  }

  if (lastResult.pageErrors.length > 0 || lastResult.consoleErrors.length > 0) {
    return { errors: [...lastResult.pageErrors, ...lastResult.consoleErrors] }
  }

  return { errors: [] }
}

const collectFailures = async (browser, storyIds) => {
  const failures = []
  const maxRetries = 2

  for (const id of storyIds) {
    const result = await runStoryWithRetry(browser, id, maxRetries)
    if (result.errors.length > 0) {
      failures.push({ id, errors: result.errors })
    }
  }

  return failures
}

const reportFailures = (failures) => {
  if (failures.length === 0) {
    return
  }

  console.error('Storybook runtime errors found:')
  for (const failure of failures) {
    console.error(`- ${failure.id}`)
    for (const error of failure.errors) {
      console.error(`  - ${error}`)
    }
  }
  process.exit(1)
}

const main = async () => {
  const { index, server } = await ensureServer()
  setupCleanup(server)

  const storyIds = getStoryIds(index)
  if (storyIds.length === 0) {
    throw new Error('No stories found in Storybook index.json')
  }

  const browser = await chromium.launch()
  const failures = await collectFailures(browser, storyIds)
  await browser.close()

  reportFailures(failures)
}

await main()
