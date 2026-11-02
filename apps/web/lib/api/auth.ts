import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { api, unwrap } from "./client"
import { isMocked } from "./config"
import * as mocks from "./mocks/auth"
import type { User } from "./types"

export const authKeys = {
  me: ["auth", "me"] as const,
}

/** `GET /me` */
export async function getMe(): Promise<User> {
  if (isMocked("auth")) return mocks.getMe()
  return (await unwrap(api.GET("/me"))).data
}

/** `POST /auth/logout` */
export async function logout(): Promise<void> {
  if (isMocked("auth")) return mocks.logout()
  await unwrap(api.POST("/auth/logout"))
}

export function useMe() {
  return useQuery({
    queryKey: authKeys.me,
    queryFn: getMe,
    staleTime: 5 * 60_000,
  })
}

/** Keluar lalu kosongkan cache; tetap dianggap keluar walaupun sesi sudah tidak valid (401). */
export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: logout,
    onSettled: () => queryClient.clear(),
  })
}
