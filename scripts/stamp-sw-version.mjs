import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

const SW_FILE = '.open-next/assets/sw.js'
const SW_BUILD_ID_PLACEHOLDER = '__SW_BUILD_ID__'

const resolveBuildId = () => {
  const githubSha = process.env.GITHUB_SHA?.trim()
  if (githubSha) {
    return githubSha.slice(0, 12)
  }

  try {
    const gitSha = execFileSync('git', ['rev-parse', '--short=12', 'HEAD'], { encoding: 'utf8' }).trim()
    return gitSha || 'dev'
  } catch {
    return 'dev'
  }
}

let swSource = null
try {
  swSource = readFileSync(SW_FILE, 'utf8')
} catch {
  console.error(`Service worker build output not found: ${SW_FILE}`)
  process.exitCode = 1
}

if (swSource !== null) {
  const replacementCount = swSource.split(SW_BUILD_ID_PLACEHOLDER).length - 1

  if (replacementCount === 0) {
    console.error(`Service worker build output has no ${SW_BUILD_ID_PLACEHOLDER} placeholder: ${SW_FILE}`)
    process.exitCode = 1
  } else {
    const buildId = resolveBuildId()
    const stampedSource = swSource.replaceAll(SW_BUILD_ID_PLACEHOLDER, buildId)

    if (stampedSource.includes(SW_BUILD_ID_PLACEHOLDER)) {
      console.error(`Service worker build output still contains ${SW_BUILD_ID_PLACEHOLDER}: ${SW_FILE}`)
      process.exitCode = 1
    } else {
      writeFileSync(SW_FILE, stampedSource)
      console.log(
        `Stamped ${SW_FILE} with build ID ${buildId} (${replacementCount} replacement${replacementCount === 1 ? '' : 's'})`
      )
    }
  }
}
