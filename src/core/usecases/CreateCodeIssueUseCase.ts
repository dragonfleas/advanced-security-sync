import type { CodeIssue, CodeIssueMetadata } from '@/domain/CodeIssue'
import type { CodeIssueRepository, CreateCodeIssueRequest } from '@/domain/CodeIssueRepository'
import type { WebhookConfig } from '@/domain/WebhookConfig'
import { BranchAlertStrategy } from '@/domain/WebhookConfig'

export class CreateCodeIssueUseCase {
  constructor(
    private readonly repository: CodeIssueRepository,
    private readonly config: WebhookConfig,
    private readonly logger = console,
  ) {}

  async execute(metadata: CodeIssueMetadata): Promise<CodeIssue | null> {
    // Check if we should create issues for this branch
    if (!this.shouldCreateIssue(metadata.branch)) {
      this.logIssueCreationSkipped(metadata.alertId, metadata.branch)
      return null
    }

    // Check if issue already exists for this alert
    const existingIssue = await this.repository.findByAlert({
      alertId: metadata.alertId,
      fingerprint: metadata.fingerprint,
    })

    if (existingIssue) {
      // Issue already exists, return it instead of creating duplicate
      return existingIssue
    }

    const request: CreateCodeIssueRequest = {
      metadata,
    }

    return await this.repository.create(request)
  }

  private shouldCreateIssue(branch: string): boolean {
    // Check branch strategy
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

  private logIssueCreationSkipped(alertId: string, branch: string): void {
    this.logger.warn(`Issue creation skipped for alert ${alertId} in branch ${branch} (not main branch: ${this.config.mainBranch})`)
  }
}
