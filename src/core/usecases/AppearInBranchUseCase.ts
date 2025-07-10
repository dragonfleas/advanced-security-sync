import type { CodeIssue } from '@/domain/CodeIssue'
import type { CodeIssueRepository } from '@/domain/CodeIssueRepository'
import type { WebhookConfig } from '@/domain/WebhookConfig'
import { BranchAlertStrategy } from '@/domain/WebhookConfig'

export class AppearInBranchUseCase {
  constructor(
    private readonly repository: CodeIssueRepository,
    private readonly config: WebhookConfig,
    private readonly logger = console,
  ) {}

  async execute(alertId: string, fingerprint: string, branch: string): Promise<CodeIssue | null> {
    // Check if we should track branch alerts based on strategy
    if (this.config.branchStrategy === BranchAlertStrategy.MAIN_ONLY) {
      this.logBranchAlertIgnored(alertId, branch)
      return null
    }

    const existingIssue = await this.repository.findByAlert({
      alertId,
      fingerprint,
    })

    if (!existingIssue) {
      return null
    }

    const comment = `🌿 Alert appeared in branch: \`${branch}\``
    await this.repository.addComment(existingIssue.id, comment)

    const labels = ['appeared-in-branch']
    await this.repository.addLabels(existingIssue.id, labels)

    return await this.repository.update({
      id: existingIssue.id,
      status: 'appeared_in_branch',
      labels,
      comment,
    })
  }

  private logBranchAlertIgnored(alertId: string, branch: string): void {
    // Use the logger injected in the constructor or fallback to warn
    this.logger.warn(`Branch alert tracking disabled (MAIN_ONLY strategy) - ignoring alert ${alertId} in branch ${branch}`)
  }
}
