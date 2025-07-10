import { z } from 'zod'

export const CodeScanningAlertSchema = z.object({
  action: z.enum([
    'created',
    'appeared_in_branch',
    'fixed',
    'closed_by_user',
    'reopened',
    'reopened_by_user',
  ]),
  alert: z.object({
    id: z.number(),
    url: z.string(),
    html_url: z.string(),
    state: z.enum(['open', 'dismissed', 'fixed']),
    rule: z.object({
      id: z.string(),
      name: z.string(),
      description: z.string(),
      severity: z.enum(['error', 'warning', 'note']),
    }),
    most_recent_instance: z.object({
      ref: z.string(),
      analysis_key: z.string(),
      location: z.object({
        path: z.string(),
        start_line: z.number().optional(),
        start_column: z.number().optional(),
        end_line: z.number().optional(),
        end_column: z.number().optional(),
      }),
    }),
  }),
  ref: z.string(),
  commit_oid: z.string(),
  repository: z.object({
    id: z.number(),
    name: z.string(),
    full_name: z.string(),
    owner: z.object({
      login: z.string(),
    }),
  }),
})

export type CodeScanningAlertWebhook = z.infer<typeof CodeScanningAlertSchema>

export const WebhookPayloadSchema = z.object({
  zen: z.string().optional(),
  hook_id: z.number().optional(),
  hook: z.object({}).optional(),
}).and(CodeScanningAlertSchema.partial())

export type WebhookPayload = z.infer<typeof WebhookPayloadSchema>
