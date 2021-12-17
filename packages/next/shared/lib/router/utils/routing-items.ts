import { getMiddlewareRegex } from './get-middleware-regex'
import { getRouteMatcher } from './route-matcher'
import { getRouteRegex } from './route-regex'
import { getSortedRoutes } from './sorted-routes'

const MIDDLEWARE_SUFFIX = '/_middleware'

export interface RoutingItem {
  page: string
  match: ReturnType<typeof getRouteMatcher>
  ssr?: boolean
  isMiddleware?: boolean
}

export function* getRoutingItems(
  pages: string[],
  middleware: { page: string; ssr: boolean }[]
): Generator<RoutingItem> {
  // append the suffix so that `getSortedRoutes()` can handle middleware properly
  const middlewarePages = middleware.map((m) => `${m.page}${MIDDLEWARE_SUFFIX}`)

  const middlewareMap = new Map(middleware.map((m) => [m.page, m]))

  for (const page of getSortedRoutes([...pages, ...middlewarePages]))
    if (page.endsWith(MIDDLEWARE_SUFFIX)) {
      const p = page.slice(0, -MIDDLEWARE_SUFFIX.length) || '/'
      const { ssr } = middlewareMap.get(p)!
      yield {
        match: getRouteMatcher(getMiddlewareRegex(p, !ssr)),
        page: p,
        ssr,
        isMiddleware: true,
      }
    } else {
      yield {
        match: getRouteMatcher(getRouteRegex(page)),
        page,
      }
    }
}
