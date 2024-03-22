import type { FlightRouterState } from '../../../server/app-render/types'
import type { CacheNode } from '../../../shared/lib/app-router-context.shared-runtime'
import type { AppRouterState } from './router-reducer-types'
import { applyFlightData } from './apply-flight-data'
import { fetchServerResponse } from './fetch-server-response'
import { PAGE_SEGMENT_KEY } from '../../../shared/lib/segment'

interface RefreshInactiveParallelSegments {
  state: AppRouterState
  updatedTree: FlightRouterState
  updatedCache: CacheNode
  includeNextUrl: boolean
}

/**
 * Refreshes inactive segments that are still in the current FlightRouterState.
 * A segment is considered "inactive" when the server response indicates it didn't match to a page component.
 * This happens during a soft-navigation, where the server will want to patch in the segment
 * with the "default" component, but we explicitly ignore the server in this case
 * and keep the existing state for that segment. New data for inactive segments are inherently
 * not part of the server response when we patch the tree, because they were associated with a response
 * from an earlier navigation/request. For each segment, once it becomes "active", we encode the URL that provided
 * the data for it. This function traverses parallel routes looking for these markers so that it can re-fetch
 * and patch the new data into the tree.
 */
export async function refreshInactiveParallelSegments(
  options: RefreshInactiveParallelSegments
) {
  const fetchedSegments = new Set<string>()
  await refreshInactiveParallelSegmentsImpl({ ...options, fetchedSegments })
}

async function refreshInactiveParallelSegmentsImpl({
  state,
  updatedTree,
  updatedCache,
  includeNextUrl,
  fetchedSegments,
}: RefreshInactiveParallelSegments & { fetchedSegments: Set<string> }) {
  const [, parallelRoutes, refetchUrl, refetchMarker] = updatedTree

  if (
    refetchUrl &&
    refetchUrl !== state.canonicalUrl &&
    refetchMarker === 'refetch' &&
    // it's possible for the tree to contain multiple segments that contain data at the same URL
    // we keep track of them so we can dedupe the requests
    !fetchedSegments.has(refetchUrl)
  ) {
    fetchedSegments.add(refetchUrl) // Mark this URL as fetched

    const fetchResponse = await fetchServerResponse(
      new URL(refetchUrl, location.origin),
      [updatedTree[0], updatedTree[1], updatedTree[2], 'refetch'],
      includeNextUrl ? state.nextUrl : null,
      state.buildId
    )

    const flightData = fetchResponse[0]
    if (typeof flightData !== 'string') {
      for (const flightDataPath of flightData) {
        // we only pass the new cache as this function is called after clearing the router cache
        // and filling in the new page data from the server. Meaning the existing cache is actually the cache that's
        // just been created & has been written to, but hasn't been "committed" yet.
        applyFlightData(updatedCache, updatedCache, flightDataPath)
      }
    } else {
      // When flightData is a string, it suggests that the server response should have triggered an MPA navigation
      // I'm not 100% sure of this decision, but it seems unlikely that we'd want to introduce a redirect side effect
      // when refreshing on-screen data, so handling this has been ommitted.
    }
  }

  for (const key in parallelRoutes) {
    await refreshInactiveParallelSegmentsImpl({
      state,
      updatedTree: parallelRoutes[key],
      updatedCache,
      includeNextUrl,
      fetchedSegments,
    })
  }
}

/**
 * Walks the current parallel segments to determine if they are "active".
 * An active parallel route will have a `__PAGE__` segment in the FlightRouterState.
 * As opposed to a `__DEFAULT__` segment, which means there was no match for that parallel route.
 * We add a special marker here so that we know how to refresh its data when the router is revalidated.
 */
export function addRefreshMarkerToActiveParallelSegments(
  tree: FlightRouterState,
  canonicalUrl: string
) {
  const [segment, parallelRoutes, , refetchMarker] = tree
  if (segment === PAGE_SEGMENT_KEY && refetchMarker !== 'refetch') {
    tree[2] = canonicalUrl
    tree[3] = 'refetch'
  }

  for (const key in parallelRoutes) {
    addRefreshMarkerToActiveParallelSegments(parallelRoutes[key], canonicalUrl)
  }
}
