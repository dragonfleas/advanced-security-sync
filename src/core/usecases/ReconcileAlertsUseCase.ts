import type { CodeIssueMetadata, CodeIssueSeverity } from '@/domain/CodeIssue'
import type { CodeIssueRepository } from '@/domain/CodeIssueRepository'
import type { WebhookConfig } from '@/domain/WebhookConfig'
import type { Logger } from '@/utils/Logger'
import { BranchAlertStrategy } from '@/domain/WebhookConfig'

export interface CodeScanningAlert {
  id: number
  url: string
  html_url: string
  state: 'open' | 'dismissed' | 'fixed'
  rule: {
    id: string
    name: string
    description: string
    severity: 'error' | 'warning' | 'note'
  }
  most_recent_instance: {
    ref: string
    analysis_key: string // Required for reconciliation
    location: {
      path: string // Required for reconciliation
      start_line?: number | undefined
      start_column?: number | undefined
      end_line?: number | undefined
      end_column?: number | undefined
    }
  }
}

export interface ReconciliationResult {
  totalAlerts: number
  createdIssues: number
  skippedAlerts: number
  errors: number
}

export class ReconcileAlertsUseCase {
  constructor(
    private readonly repository: CodeIssueRepository,
    private readonly config: WebhookConfig,
    private readonly logger: Logger,
  ) {}

  async execute(alerts: CodeScanningAlert[]): Promise<ReconciliationResult> {
    this.logger.info(`Starting reconciliation of ${alerts.length} code scanning alerts`)

    const result: ReconciliationResult = {
      totalAlerts: alerts.length,
      createdIssues: 0,
      skippedAlerts: 0,
      errors: 0,
    }

    for (const alert of alerts) {
      try {
        const processed = await this.processAlert(alert)
        if (processed) {
          result.createdIssues++
        }
        else {
          result.skippedAlerts++
        }
      }
      catch (error) {
        this.logger.error(`Failed to process alert ${alert.id}`, error)
        result.errors++
      }
    }

    this.logger.info(`Reconciliation completed: ${result.createdIssues} issues created, ${result.skippedAlerts} skipped, ${result.errors} errors`)
    return result
  }

  private async processAlert(alert: CodeScanningAlert): Promise<boolean> {
    // Skip alerts that are not in open state
    if (alert.state !== 'open') {
      this.logger.debug(`Skipping alert ${alert.id} - state: ${alert.state}`)
      return false
    }

    const branch = alert.most_recent_instance.ref.replace('refs/heads/', '')

    // Check if we should create an issue for this branch
    if (!this.shouldCreateIssueForBranch(branch)) {
      this.logger.debug(`Skipping alert ${alert.id} - branch ${branch} not tracked`)
      return false
    }

    const fingerprint = `${alert.rule.id}-${alert.most_recent_instance.location.path}`

    // Check if issue already exists
    const existingIssue = await this.repository.findByAlert({
      alertId: alert.id.toString(),
      fingerprint,
    })

    if (existingIssue) {
      this.logger.debug(`Alert ${alert.id} already has corresponding issue ${existingIssue.id}`)
      return false
    }

    // Create new issue
    const metadata: CodeIssueMetadata = {
      alertId: alert.id.toString(),
      fingerprint,
      ruleId: alert.rule.id,
      ruleName: alert.rule.name,
      severity: this.mapSeverity(alert.rule.severity),
      description: alert.rule.description,
      affectedFile: alert.most_recent_instance.location.path,
      branch,
      url: alert.html_url,
      ...(alert.most_recent_instance.location.start_line !== undefined && {
        line: alert.most_recent_instance.location.start_line,
      }),
      ...(alert.most_recent_instance.location.start_column !== undefined && {
        column: alert.most_recent_instance.location.start_column,
      }),
    }

    const issue = await this.repository.create({ metadata })
    this.logger.info(`Created issue ${issue.id} for reconciled alert ${alert.id}`)
    return true
  }

  private shouldCreateIssueForBranch(branch: string): boolean {
    switch (this.config.branchStrategy) {
      case BranchAlertStrategy.ALL_BRANCHES:
        return true
      case BranchAlertStrategy.MAIN_WITH_BRANCH_UPDATES:
      case BranchAlertStrategy.MAIN_ONLY:
        return branch === this.config.mainBranch
      default:
        return branch === this.config.mainBranch
    }
  }

  private mapSeverity(severity: 'error' | 'warning' | 'note'): CodeIssueSeverity {
    switch (severity) {
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
