import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { api, unwrap, withMockCsrf } from "./client"
import { isMocked } from "./config"
import * as mocks from "./mocks/mapping"
import type { EventSlot, UpdateEventSlotsRequest } from "./types"

export const mappingKeys = {
  all: ["mapping"] as const,
  slots: (slug: string) => [...mappingKeys.all, "event-slots", slug] as const,
}

/** `GET /projects/{slug}/event-slots` */
export async function listEventSlots(slug: string): Promise<EventSlot[]> {
  if (isMocked("mapping")) return mocks.listEventSlots(slug)
  return (await unwrap(api.GET("/projects/{slug}/event-slots", { params: { path: { slug } } }))).data
}

/** `PUT /projects/{slug}/event-slots`: seluruh slot disimpan sekaligus. */
export async function updateEventSlots(slug: string, body: UpdateEventSlotsRequest): Promise<EventSlot[]> {
  if (isMocked("mapping")) return withMockCsrf(() => mocks.updateEventSlots(slug, body))
  return (await unwrap(api.PUT("/projects/{slug}/event-slots", { params: { path: { slug } }, body }))).data
}

export function useEventSlots(slug: string) {
  return useQuery({
    queryKey: mappingKeys.slots(slug),
    queryFn: () => listEventSlots(slug),
  })
}

export function useUpdateEventSlots() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ slug, ...body }: { slug: string } & UpdateEventSlotsRequest) => updateEventSlots(slug, body),
    onSuccess: (slots, { slug }) => {
      queryClient.setQueryData(mappingKeys.slots(slug), slots)
    },
  })
}
