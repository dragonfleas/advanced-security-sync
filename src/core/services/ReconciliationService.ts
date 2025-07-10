import type { WebhookConfig } from '@/domain/WebhookConfig'
import type { GitHubCodeIssueRepository } from '@/infra/github/GitHubCodeIssueRepository'
import type { ReconciliationResult } from '@/usecases/ReconcileAlertsUseCase'
import type { Logger } from '@/utils/Logger'
import { ReconcileAlertsUseCase } from '@/usecases/ReconcileAlertsUseCase'

export class ReconciliationService {
  constructor(
    private readonly repository: GitHubCodeIssueRepository,
    private readonly config: WebhookConfig,
    private readonly logger: Logger,
  ) {}

  async reconcileCodeScanningAlerts(): Promise<ReconciliationResult> {
    this.logger.info('Starting code scanning alerts reconciliation...')

    try {
      // Fetch all open alerts from GitHub
      const alerts = await this.repository.fetchCodeScanningAlerts()
      this.logger.info(`Found ${alerts.length} open code scanning alerts`)

      if (alerts.length === 0) {
        this.logger.info('No alerts to reconcile')
        return {
          totalAlerts: 0,
          createdIssues: 0,
          skippedAlerts: 0,
          errors: 0,
        }
      }

      // Process alerts through the reconciliation use case
      const reconcileUseCase = new ReconcileAlertsUseCase(
        this.repository,
        this.config,
        this.logger,
      )

      const result = await reconcileUseCase.execute(alerts)

      this.logger.info(
        `Reconciliation completed successfully: `
        + `${result.createdIssues} issues created, `
        + `${result.skippedAlerts} alerts skipped, `
        + `${result.errors} errors`,
      )

      return result
    }
    catch (error) {
      this.logger.error('Reconciliation failed', error)
      throw new Error(`Reconciliation failed: ${error}`)
    }
  }
}
