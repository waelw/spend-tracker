import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
  Outlet,
  Link,
} from "@tanstack/react-router"
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools"
import { TanStackDevtools } from "@tanstack/react-devtools"
import { QueryClientProvider } from "@tanstack/react-query"
import { ClerkProvider, SignedIn, SignedOut, UserButton, SignInButton, useAuth } from "@clerk/tanstack-react-start"
import { ConvexProviderWithClerk } from "convex/react-clerk"

import { ThemeProvider } from "@/components/theme-provider"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import type { RouterContext } from "@/router"

import appCss from "../styles.css?url"

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover",
      },
      {
        title: "Spend Tracker",
      },
      {
        name: "description",
        content: "Track your budgets, expenses, and spending limits across multiple currencies",
      },
      {
        name: "theme-color",
        content: "#0f172a",
      },
      {
        name: "apple-mobile-web-app-capable",
        content: "yes",
      },
      {
        name: "apple-mobile-web-app-status-bar-style",
        content: "black-translucent",
      },
      {
        name: "apple-mobile-web-app-title",
        content: "Spend Tracker",
      },
      {
        name: "mobile-web-app-capable",
        content: "yes",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "manifest",
        href: "/manifest.json",
      },
      {
        rel: "apple-touch-icon",
        href: "/logo192.png",
      },
      {
        rel: "icon",
        type: "image/png",
        sizes: "192x192",
        href: "/logo192.png",
      },
      {
        rel: "icon",
        type: "image/png",
        sizes: "512x512",
        href: "/logo512.png",
      },
      {
        rel: "icon",
        type: "image/svg+xml",
        href: "/icon.svg",
      },
    ],
  }),
  component: RootComponent,
})

function RootComponent() {
  const { queryClient } = Route.useRouteContext()

  return (
    <ClerkProvider>
      <QueryClientProvider client={queryClient}>
        <ConvexClientProvider>
          <RootDocument>
            <Outlet />
          </RootDocument>
        </ConvexClientProvider>
      </QueryClientProvider>
    </ClerkProvider>
  )
}

function ConvexClientProvider({ children }: { children: React.ReactNode }) {
  const { convexClient } = Route.useRouteContext()
  const auth = useAuth()

  // Debug logging
  console.log("Clerk auth state:", {
    isLoaded: auth.isLoaded,
    isSignedIn: auth.isSignedIn,
    userId: auth.userId,
  })

  // Test getting the token directly
  if (auth.isLoaded && auth.isSignedIn) {
    auth.getToken({ template: "convex" }).then((token) => {
      console.log("Convex token:", token ? "Token received" : "No token")
    }).catch((err) => {
      console.error("Error getting token:", err)
    })
  }

  return (
    <ConvexProviderWithClerk client={convexClient} useAuth={useAuth}>
      {children}
    </ConvexProviderWithClerk>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
        <ThemeProvider defaultTheme="system" storageKey="spend-tracker-theme">
          <div className="min-h-screen bg-background">
            <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <div className="max-w-7xl mx-auto flex h-14 items-center px-4 sm:px-6 lg:px-8">
                <div className="md:mr-4 mr-2 flex">
                  <Link to="/" className="md:mr-6 mr-2 flex items-center space-x-2">
                    <span className="font-bold text-xs md:text-base">Spend Tracker</span>
                  </Link>
                  <nav className="flex items-center space-x-2 md:space-x-6 text-sm font-medium">
                    <SignedIn>
                      <Link
                        to="/"
                        className="transition-colors text-xs md:text-base hover:text-foreground/80 text-foreground/60 [&.active]:text-foreground"
                      >
                        Dashboard
                      </Link>
                      <Link
                        to="/budgets/new"
                        className="transition-colors text-xs md:text-base hover:text-foreground/80 text-foreground/60 [&.active]:text-foreground"
                      >
                        New Budget
                      </Link>
                    </SignedIn>
                  </nav>
                </div>
                <div className="flex flex-1 items-center justify-end space-x-2">
                  <ThemeToggle />
                  <SignedIn>
                    <UserButton afterSignOutUrl="/" />
                  </SignedIn>
                  <SignedOut>
                    <SignInButton mode="modal">
                      <Button size="sm" variant="outline">Sign In</Button>
                    </SignInButton>
                  </SignedOut>
                </div>
              </div>
            </header>
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">{children}</main>
          </div>
          <TanStackDevtools
            config={{
              position: "bottom-right",
            }}
            plugins={[
              {
                name: "Tanstack Router",
                render: <TanStackRouterDevtoolsPanel />,
              },
            ]}
          />
          <Scripts />
        </ThemeProvider>
      </body>
    </html>
  )
}
