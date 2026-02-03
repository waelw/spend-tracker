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
          <div className="min-h-screen flex flex-col">
            <header className="sticky top-0 z-50 w-full glass">
              <div className="max-w-7xl mx-auto flex h-16 items-center px-4 sm:px-6 lg:px-8">
                <div className="md:mr-4 mr-2 flex">
                  <Link to="/" className="md:mr-6 mr-2 flex items-center space-x-2 group">
                    <span className="font-bold text-lg md:text-xl bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary group-hover:from-accent group-hover:to-primary transition-all duration-300">
                      Spend Tracker
                    </span>
                  </Link>
                  <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
                    <SignedIn>
                      <Link
                        to="/"
                        className="transition-colors hover:text-primary text-muted-foreground [&.active]:text-primary [&.active]:font-semibold"
                      >
                        Dashboard
                      </Link>
                      <Link
                        to="/budgets/new"
                        className="transition-colors hover:text-primary text-muted-foreground [&.active]:text-primary [&.active]:font-semibold"
                      >
                        New Budget
                      </Link>
                    </SignedIn>
                  </nav>
                </div>
                <div className="flex flex-1 items-center justify-end space-x-4">
                  <ThemeToggle />
                  <SignedIn>
                    <UserButton afterSignOutUrl="/" />
                  </SignedIn>
                  <SignedOut>
                    <SignInButton mode="modal">
                      <Button size="sm" className="rounded-full px-6 bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity">
                        Sign In
                      </Button>
                    </SignInButton>
                  </SignedOut>
                </div>
              </div>
            </header>
            
            <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 mb-20 md:mb-0">
              {children}
            </main>

            {/* Mobile Bottom Navigation */}
            <SignedIn>
              <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass border-t pb-[env(safe-area-inset-bottom)]">
                <nav className="flex items-center justify-around h-16 px-2">
                  <Link
                    to="/"
                    className="flex flex-col items-center justify-center space-y-1 w-full h-full text-muted-foreground [&.active]:text-primary"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect width="7" height="9" x="3" y="3" rx="1" />
                      <rect width="7" height="5" x="14" y="3" rx="1" />
                      <rect width="7" height="9" x="14" y="12" rx="1" />
                      <rect width="7" height="5" x="3" y="16" rx="1" />
                    </svg>
                    <span className="text-[10px] font-medium">Dashboard</span>
                  </Link>
                  <Link
                    to="/budgets/new"
                    className="flex flex-col items-center justify-center space-y-1 w-full h-full text-muted-foreground [&.active]:text-primary"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <path d="M8 12h8" />
                      <path d="M12 8v8" />
                    </svg>
                    <span className="text-[10px] font-medium">New Budget</span>
                  </Link>
                </nav>
              </div>
            </SignedIn>
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
