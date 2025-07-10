import type { CodeIssue } from '@/domain/CodeIssue'
import type { CodeIssueRepository } from '@/domain/CodeIssueRepository'

export class ReopenCodeIssueUseCase {
  constructor(private readonly repository: CodeIssueRepository) {}

  async execute(
    alertId: string,
    fingerprint: string,
    reopenedByUser: boolean = false,
  ): Promise<CodeIssue | null> {
    const existingIssue = await this.repository.findByAlert({
      alertId,
      fingerprint,
    })

    if (!existingIssue) {
      return null
    }

    const reason = reopenedByUser ? 'reopened_by_user' : 'reopened'
    const labels = [reason]
    await this.repository.addLabels(existingIssue.id, labels)

    const emoji = reopenedByUser ? '👤' : '🔄'
    const description = reopenedByUser ? 'by user' : 'automatically'
    const comment = `${emoji} Security alert reopened ${description}`
    await this.repository.addComment(existingIssue.id, comment)

    return await this.repository.reopen(existingIssue.id, reason)
  }
}
