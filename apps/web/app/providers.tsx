"use client"

import { hashKey, MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ThemeProvider } from "next-themes"
import { NuqsAdapter } from "nuqs/adapters/next/app"
import type { ReactNode } from "react"

import { Toaster } from "@/components/ui/sonner"
import { authKeys } from "@/lib/api/auth"
import { isApiError, isUnauthorized } from "@/lib/api/errors"

function makeQueryClient() {
  // 401 di request mana pun (setelah refresh gagal) memeriksa ulang sesi; AuthGuard lalu mengarahkan ke /login.
  const onError = (error: unknown) => {
    if (isUnauthorized(error)) void queryClient.invalidateQueries({ queryKey: authKeys.me })
  }

  const queryClient: QueryClient = new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        if (query.queryHash !== hashKey(authKeys.me)) onError(error)
      },
    }),
    mutationCache: new MutationCache({ onError }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        // Error 4xx tidak akan berubah bila diulang.
        retry: (failureCount, error) =>
          !(isApiError(error) && error.status >= 400 && error.status < 500) && failureCount < 2,
      },
    },
  })
  return queryClient
}

let browserQueryClient: QueryClient | undefined

function getQueryClient() {
  if (typeof window === "undefined") return makeQueryClient()
  browserQueryClient ??= makeQueryClient()
  return browserQueryClient
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <NuqsAdapter>
        <QueryClientProvider client={getQueryClient()}>
          {children}
          <Toaster />
        </QueryClientProvider>
      </NuqsAdapter>
    </ThemeProvider>
  )
}
