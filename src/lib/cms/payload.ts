import config from '@payload-config'
import { getPayload } from 'payload'
import { cache } from 'react'

/** One Payload instance per request (Local API: no HTTP hop). */
export const getPayloadClient = cache(() => getPayload({ config }))
