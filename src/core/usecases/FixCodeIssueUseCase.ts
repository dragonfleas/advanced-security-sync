import type { CodeIssue } from '@/domain/CodeIssue'
import type { CodeIssueRepository } from '@/domain/CodeIssueRepository'

export class FixCodeIssueUseCase {
  constructor(private readonly repository: CodeIssueRepository) {}

  async execute(alertId: string, fingerprint: string): Promise<CodeIssue | null> {
    const existingIssue = await this.repository.findByAlert({
      alertId,
      fingerprint,
    })

    if (!existingIssue) {
      return null
    }

    const labels = ['fixed']
    await this.repository.addLabels(existingIssue.id, labels)

    const comment = '✅ Security alert has been fixed!'
    await this.repository.addComment(existingIssue.id, comment)

    return await this.repository.close(existingIssue.id, 'fixed')
  }
}
