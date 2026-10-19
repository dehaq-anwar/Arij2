import config from '@payload-config'
import { getPayload } from 'payload'
import { cache } from 'react'

/**
 * One Payload instance per request (Local API: no HTTP hop). `cron` starts the job queue
 * (nightly retention) with the first request after the server starts.
 */
export const getPayloadClient = cache(() => getPayload({ config, cron: true }))
