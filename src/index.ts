import type { WebhookConfig } from '@/domain/WebhookConfig'
import process from 'node:process'
import { serve } from '@hono/node-server'
import * as dotenv from 'dotenv'
import { Hono } from 'hono'
import { WebhookHandler } from '@/api/WebhookHandler'
import { ReconciliationService } from '@/core/services/ReconciliationService'
import { BranchAlertStrategy } from '@/domain/WebhookConfig'
import { GitHubCodeIssueRepository } from '@/infra/github/GitHubCodeIssueRepository'
import { Logger, LogLevel } from '@/utils/Logger'

// Load environment variables
dotenv.config()

// Helper function to determine branch strategy from environment variables
function getBranchStrategy(): BranchAlertStrategy {
  // For backward compatibility, check old environment variables
  const createIssuesForAllBranches = process.env.CREATE_ISSUES_FOR_ALL_BRANCHES === 'true'
  const trackBranchAlerts = process.env.TRACK_BRANCH_ALERTS === 'true'

  // Check new environment variable first
  const branchStrategy = process.env.BRANCH_ALERT_STRATEGY
  if (branchStrategy) {
    switch (branchStrategy.toLowerCase()) {
      case 'main_only':
        return BranchAlertStrategy.MAIN_ONLY
      case 'main_with_branch_updates':
        return BranchAlertStrategy.MAIN_WITH_BRANCH_UPDATES
      case 'all_branches':
        return BranchAlertStrategy.ALL_BRANCHES
    }
  }

  // Backward compatibility logic
  if (createIssuesForAllBranches) {
    return BranchAlertStrategy.ALL_BRANCHES
  }
  else if (trackBranchAlerts) {
    return BranchAlertStrategy.MAIN_WITH_BRANCH_UPDATES
  }
  else {
    return BranchAlertStrategy.MAIN_ONLY
  }
}

// Configuration
const config = {
  port: Number.parseInt(process.env.PORT || '3000'),
  nodeEnv: process.env.NODE_ENV || 'development',
  github: {
    token: process.env.GITHUB_TOKEN!,
    owner: process.env.GITHUB_OWNER!,
    repo: process.env.GITHUB_REPO!,
  },
  webhookSecret: process.env.GITHUB_WEBHOOK_SECRET!,
  webhook: {
    branchStrategy: getBranchStrategy(),
    mainBranch: process.env.MAIN_BRANCH || 'main',
  } as WebhookConfig,
  reconciliation: {
    enabled: process.env.ENABLE_RECONCILIATION !== 'false', // Enabled by default
    delayMs: Number.parseInt(process.env.RECONCILIATION_DELAY_MS || '1000'),
  },
}

// Validate required environment variables
const requiredEnvVars = [
  'GITHUB_TOKEN',
  'GITHUB_OWNER',
  'GITHUB_REPO',
  'GITHUB_WEBHOOK_SECRET',
]

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Missing required environment variable: ${envVar}`)
    process.exit(1)
  }
}

// Initialize dependencies
const logger = new Logger(
  config.nodeEnv === 'development' ? LogLevel.DEBUG : LogLevel.INFO,
)

const repository = new GitHubCodeIssueRepository(config.github)
const webhookHandler = new WebhookHandler(
  config.webhookSecret,
  repository,
  config.webhook,
  logger,
)

// Initialize Hono app
const app = new Hono()

// Health check endpoint
app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  })
})

// Webhook endpoint
app.post('/webhook', c => webhookHandler.handle(c))

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404)
})

// Error handler
app.onError((err, c) => {
  logger.error('Unhandled error', err)
  return c.json({ error: 'Internal server error' }, 500)
})

// Create reconciliation service
const reconciliationService = new ReconciliationService(
  repository,
  config.webhook,
  logger,
)

// Start server
logger.info(`Starting server on port ${config.port}`)
logger.info(`Environment: ${config.nodeEnv}`)
logger.info(`GitHub repository: ${config.github.owner}/${config.github.repo}`)

// Start the server
serve({
  fetch: app.fetch,
  port: config.port,
})

logger.info(`🚀 Server running on http://localhost:${config.port}`)

// Run reconciliation on startup if enabled
if (config.reconciliation.enabled) {
  (async () => {
    try {
      // Add a delay to ensure the server is up and running first
      await new Promise(resolve => setTimeout(resolve, config.reconciliation.delayMs))
      logger.info('Running initial code scanning alerts reconciliation...')
      await reconciliationService.reconcileCodeScanningAlerts()
      logger.info('Initial reconciliation completed successfully')
    }
    catch (error) {
      logger.error('Failed to run initial reconciliation', error)
      // Don't crash the server if reconciliation fails
    }
  })()
}
else {
  logger.info('Reconciliation disabled - skipping initial sync')
}

export default app
