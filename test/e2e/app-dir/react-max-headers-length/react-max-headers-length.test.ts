import { nextTestSetup } from 'e2e-utils'

describe('react-max-headers-length', () => {
  describe.each([0, 400, undefined])(
    'reactMaxHeadersLength = %s',
    (reactMaxHeadersLength) => {
      const env: Record<string, string> = {}
      if (typeof reactMaxHeadersLength === 'number') {
        env.TEST_REACT_MAX_HEADERS_LENGTH = reactMaxHeadersLength.toString()
      }

      const { next } = nextTestSetup({ files: __dirname, env })

      it('should respect reactMaxHeadersLength', async () => {
        const res = await next.fetch('/')

        // React currently only sets the `Link` header, so we should check to
        // see that the length of the header has respected the configured
        // value.
        const header = res.headers.get('Link')
        if (reactMaxHeadersLength === undefined) {
          // This is the default case.
          expect(header).toBeString()
          expect(header.length).toBeGreaterThan(0)
          expect(header.length).toBeLessThanOrEqual(6000)
        } else if (reactMaxHeadersLength === 0) {
          // This is the case where the header is not emitted.
          expect(header).toBeNull()
        } else if (typeof reactMaxHeadersLength === 'number') {
          // This is the case where the header is emitted and the length is
          // respected.
          expect(header).toBeString()
          expect(header.length).toBeGreaterThan(0)
          expect(header.length).toBeLessThanOrEqual(reactMaxHeadersLength)
        }
      })
    }
  )
})
