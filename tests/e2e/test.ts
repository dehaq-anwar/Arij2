import { test as base, type Request } from '@playwright/test'

export { expect } from '@playwright/test'

/**
 * Playwright's test with one addition: when a test fails, the requests of its page that never
 * finished are printed (method, URL, age), so a hanging page load in CI shows what it waited for.
 */
export const test = base.extend<{ unfinishedRequests: void }>({
  unfinishedRequests: [
    async ({ page }, use, testInfo) => {
      const pending = new Map<Request, number>()
      page.on('request', (request) => pending.set(request, Date.now()))
      page.on('requestfinished', (request) => pending.delete(request))
      page.on('requestfailed', (request) => pending.delete(request))
      await use()
      if (testInfo.status !== testInfo.expectedStatus && pending.size) {
        const now = Date.now()
        const list = [...pending].map(
          ([request, start]) => `  ${request.method()} ${request.url()} (${now - start} ms)`,
        )
        console.log(`Unfinished requests in "${testInfo.title}":\n${list.join('\n')}`)
      }
    },
    { auto: true },
  ],
})
