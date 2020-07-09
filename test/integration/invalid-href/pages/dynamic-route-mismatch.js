import Link from 'next/link'

export default () => (
  <Link href="/[post]" as="/blog/post-1">
    <a id="click-me">Click me</a>
  </Link>
)
