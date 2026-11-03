import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { api, unwrap, withMockCsrf } from "./client"
import { isMocked } from "./config"
import * as mocks from "./mocks/auth"
import type {
  ChangePasswordRequest,
  ForgotPasswordRequest,
  LoggedInUser,
  LoginRequest,
  MessageResult,
  RegisterRequest,
  ResetPasswordRequest,
  ResetPasswordResult,
  User,
} from "./types"

export const authKeys = {
  me: ["auth", "me"] as const,
}

/** `POST /auth/register` */
export async function register(body: RegisterRequest): Promise<User> {
  if (isMocked("auth")) return withMockCsrf(() => mocks.register(body))
  return (await unwrap(api.POST("/auth/register", { body }))).data
}

/** `POST /auth/login` */
export async function login(body: LoginRequest): Promise<LoggedInUser> {
  if (isMocked("auth")) return withMockCsrf(() => mocks.login(body))
  return (await unwrap(api.POST("/auth/login", { body }))).data
}

/** `POST /auth/logout` */
export async function logout(): Promise<void> {
  if (isMocked("auth")) return withMockCsrf(() => mocks.logout())
  await unwrap(api.POST("/auth/logout"))
}

/** `POST /auth/forgot-password` */
export async function forgotPassword(body: ForgotPasswordRequest): Promise<MessageResult> {
  if (isMocked("auth")) return withMockCsrf(() => mocks.forgotPassword(body))
  return (await unwrap(api.POST("/auth/forgot-password", { body }))).data
}

/** `POST /auth/reset-password` */
export async function resetPassword(body: ResetPasswordRequest): Promise<ResetPasswordResult> {
  if (isMocked("auth")) return withMockCsrf(() => mocks.resetPassword(body))
  return (await unwrap(api.POST("/auth/reset-password", { body }))).data
}

/** `GET /me` */
export async function getMe(): Promise<User> {
  if (isMocked("auth")) return mocks.getMe()
  return (await unwrap(api.GET("/me"))).data
}

/** `PUT /me/password` */
export async function changePassword(body: ChangePasswordRequest): Promise<void> {
  if (isMocked("auth")) return withMockCsrf(() => mocks.changePassword(body))
  await unwrap(api.PUT("/me/password", { body }))
}

export function useMe() {
  return useQuery({
    queryKey: authKeys.me,
    queryFn: getMe,
    staleTime: 5 * 60_000,
  })
}

/** Setelah daftar, user langsung masuk: cache user sebelumnya dibuang dan diganti akun baru. */
export function useRegister() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: register,
    onSuccess: (user) => {
      queryClient.clear()
      queryClient.setQueryData(authKeys.me, user)
    },
  })
}

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: login,
    onSuccess: () => queryClient.clear(),
  })
}

export function useLogout() {
  return useMutation({ mutationFn: logout })
}

export function useForgotPassword() {
  return useMutation({ mutationFn: forgotPassword })
}

/** Reset password mencabut semua sesi, jadi cache user lama ikut dibuang. */
export function useResetPassword() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: resetPassword,
    onSuccess: () => queryClient.clear(),
  })
}

export function useChangePassword() {
  return useMutation({ mutationFn: changePassword })
}
