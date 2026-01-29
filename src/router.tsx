import { createRouter } from "@tanstack/react-router"
import { QueryClient } from "@tanstack/react-query"
import { ConvexQueryClient } from "@convex-dev/react-query"
import { ConvexReactClient } from "convex/react"

import { routeTree } from "./routeTree.gen"

// Create Convex client
const convexUrl = import.meta.env.VITE_CONVEX_URL as string
export const convexClient = new ConvexReactClient(convexUrl)
export const convexQueryClient = new ConvexQueryClient(convexClient)

// Create React Query client
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryKeyHashFn: convexQueryClient.hashFn(),
      queryFn: convexQueryClient.queryFn(),
    },
  },
})
convexQueryClient.connect(queryClient)

export interface RouterContext {
  queryClient: QueryClient
  convexClient: ConvexReactClient
  convexQueryClient: ConvexQueryClient
}

export const getRouter = () => {
  const router = createRouter({
    routeTree,
    context: {
      queryClient,
      convexClient,
      convexQueryClient,
    } satisfies RouterContext,
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  })

  return router
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
