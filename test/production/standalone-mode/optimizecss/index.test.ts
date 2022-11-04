import { createNext } from 'e2e-utils'
import { NextInstance } from 'test/lib/next-modes/base'
import { renderViaHTTP } from 'next-test-utils'

describe('standalone mode and optimizeCss', () => {
  let next: NextInstance

  beforeAll(async () => {
    next = await createNext({
      files: {
        'pages/index.js': `
          import styles from './index.module.css'
          
          export default function Page() { 
            return <p className={styles.home}>hello world</p>
          } 
        `,
        'pages/index.module.css': `
          .home {
            background: orange;
            color: black;
          }
        `,
      },
      nextConfig: {
        experimental: {
          optimizeCss: true,
        },
        output: 'standalone',
      },
      dependencies: {
        critters: 'latest',
      },
    })
  })
  afterAll(() => next.destroy())

  it('should work', async () => {
    const html = await renderViaHTTP(next.url, '/')
    expect(html).toContain('hello world')
    expect(html).toContain('background:orange')
  })
})
