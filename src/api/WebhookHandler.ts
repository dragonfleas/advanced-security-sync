import type { Context } from 'hono'
import type { CodeIssueMetadata, CodeIssueSeverity } from '@/domain/CodeIssue'
import type { CodeIssueRepository } from '@/domain/CodeIssueRepository'
import type { WebhookConfig } from '@/domain/WebhookConfig'
import type { CodeScanningAlertWebhook } from '@/utils/WebhookSchemas'
import { AppearInBranchUseCase } from '@/usecases/AppearInBranchUseCase'
import { CloseByUserUseCase } from '@/usecases/CloseByUserUseCase'
import { CreateCodeIssueUseCase } from '@/usecases/CreateCodeIssueUseCase'
import { FixCodeIssueUseCase } from '@/usecases/FixCodeIssueUseCase'
import { ReopenCodeIssueUseCase } from '@/usecases/ReopenCodeIssueUseCase'
import { Logger } from '@/utils/Logger'
import { CodeScanningAlertSchema } from '@/utils/WebhookSchemas'
import { WebhookValidator } from '@/utils/WebhookValidator'

export class WebhookHandler {
  private readonly validator: WebhookValidator
  private readonly logger: Logger
  private readonly config: WebhookConfig
  private readonly createUseCase: CreateCodeIssueUseCase
  private readonly appearInBranchUseCase: AppearInBranchUseCase
  private readonly fixUseCase: FixCodeIssueUseCase
  private readonly closeByUserUseCase: CloseByUserUseCase
  private readonly reopenUseCase: ReopenCodeIssueUseCase

  constructor(
    webhookSecret: string,
    repository: CodeIssueRepository,
    config: WebhookConfig,
    logger: Logger = new Logger(),
  ) {
    this.validator = new WebhookValidator(webhookSecret)
    this.logger = logger
    this.config = config
    this.createUseCase = new CreateCodeIssueUseCase(repository, config)
    this.appearInBranchUseCase = new AppearInBranchUseCase(repository, config)
    this.fixUseCase = new FixCodeIssueUseCase(repository)
    this.closeByUserUseCase = new CloseByUserUseCase(repository)
    this.reopenUseCase = new ReopenCodeIssueUseCase(repository)
  }

  async handle(c: Context): Promise<Response> {
    try {
      // Validate webhook signature
      const signature = c.req.header('X-Hub-Signature-256')
      const rawBody = await c.req.text()

      if (!signature || !this.validator.validateSignature(rawBody, signature)) {
        this.logger.warn('Invalid webhook signature')
        return c.json({ error: 'Unauthorized' }, 401)
      }

      // Parse and validate payload
      const payload = JSON.parse(rawBody)
      const validationResult = CodeScanningAlertSchema.safeParse(payload)

      if (!validationResult.success) {
        this.logger.warn('Invalid webhook payload', validationResult.error)
        return c.json({ error: 'Invalid payload' }, 400)
      }

      const webhookData: CodeScanningAlertWebhook = validationResult.data

      this.logger.info(`Received code_scanning_alert webhook: ${webhookData.action}`, {
        alertId: webhookData.alert.id,
        repository: webhookData.repository.full_name,
      })

      // Dispatch to appropriate handler based on action
      const result = await this.dispatchAction(webhookData)

      return c.json({
        success: true,
        action: webhookData.action,
        result,
      })
    }
    catch (error) {
      this.logger.error('Error processing webhook', error)
      return c.json({ error: 'Internal server error' }, 500)
    }
  }

  private async dispatchAction(webhook: CodeScanningAlertWebhook) {
    const { action, alert, ref } = webhook
    const alertId = alert.id.toString()
    const fingerprint = `${alert.rule.id}-${alert.most_recent_instance.location.path}`

    switch (action) {
      case 'created':
        return await this.handleCreated(webhook)

      case 'appeared_in_branch': {
        const branch = ref.replace('refs/heads/', '')
        return await this.appearInBranchUseCase.execute(alertId, fingerprint, branch)
      }

      case 'fixed':
        return await this.fixUseCase.execute(alertId, fingerprint)

      case 'closed_by_user':
        return await this.closeByUserUseCase.execute(alertId, fingerprint)

      case 'reopened':
        return await this.reopenUseCase.execute(alertId, fingerprint, false)

      case 'reopened_by_user':
        return await this.reopenUseCase.execute(alertId, fingerprint, true)

      default:
        this.logger.warn(`Unsupported action: ${action}`)
        throw new Error(`Unsupported action: ${action}`)
    }
  }

  private async handleCreated(webhook: CodeScanningAlertWebhook) {
    const { alert, ref } = webhook

    const metadata: CodeIssueMetadata = {
      alertId: alert.id.toString(),
      fingerprint: `${alert.rule.id}-${alert.most_recent_instance.location.path}`,
      ruleId: alert.rule.id,
      ruleName: alert.rule.name,
      severity: this.mapSeverity(alert.rule.severity),
      description: alert.rule.description,
      affectedFile: alert.most_recent_instance.location.path,
      branch: ref.replace('refs/heads/', ''),
      url: alert.html_url,
      ...(alert.most_recent_instance.location.start_line !== undefined && {
        line: alert.most_recent_instance.location.start_line,
      }),
      ...(alert.most_recent_instance.location.start_column !== undefined && {
        column: alert.most_recent_instance.location.start_column,
      }),
    }

    const result = await this.createUseCase.execute(metadata)

    if (!result) {
      this.logger.info(`Issue creation skipped for alert ${metadata.alertId} in branch ${metadata.branch}`)
      return {
        message: 'Issue creation skipped - not in tracked branch',
        alertId: metadata.alertId,
        branch: metadata.branch,
        mainBranch: this.config.mainBranch,
      }
    }

    return result
  }

  private mapSeverity(githubSeverity: 'error' | 'warning' | 'note'): CodeIssueSeverity {
    switch (githubSeverity) {
      case 'error':
        return 'high'
      case 'warning':
        return 'medium'
      case 'note':
        return 'low'
      default:
        return 'medium'
    }
  }
}
