import type { CodeIssue, CodeIssueMetadata } from '@/domain/CodeIssue'
import type {
  CodeIssueRepository,
  CreateCodeIssueRequest,
  FindCodeIssueRequest,
  UpdateCodeIssueRequest,
} from '@/domain/CodeIssueRepository'
import type { CodeScanningAlert } from '@/usecases/ReconcileAlertsUseCase'
import { Octokit } from '@octokit/rest'

export interface GitHubConfig {
  token: string
  owner: string
  repo: string
}

export class GitHubCodeIssueRepository implements CodeIssueRepository {
  private readonly octokit: Octokit
  private readonly owner: string
  private readonly repo: string

  constructor(config: GitHubConfig) {
    this.octokit = new Octokit({
      auth: config.token,
    })
    this.owner = config.owner
    this.repo = config.repo
  }

  async create(request: CreateCodeIssueRequest): Promise<CodeIssue> {
    const { metadata } = request

    const title = `🚨 ${metadata.severity.toUpperCase()}: ${metadata.ruleName}`
    const body = this.buildIssueBody(metadata)
    const labels = [
      'security-alert',
      `severity:${metadata.severity}`,
      `rule:${metadata.ruleId}`,
    ]

    const response = await this.octokit.rest.issues.create({
      owner: this.owner,
      repo: this.repo,
      title,
      body,
      labels,
    })

    return this.mapGitHubIssueToCodeIssue(response.data, metadata)
  }

  async findByAlert(request: FindCodeIssueRequest): Promise<CodeIssue | null> {
    const { alertId, fingerprint } = request

    // Search for issues with our alert metadata
    const searchQuery = `repo:${this.owner}/${this.repo} is:issue `
      + `"Alert ID: ${alertId}" OR "Fingerprint: ${fingerprint}"`

    const response = await this.octokit.rest.search.issuesAndPullRequests({
      q: searchQuery,
    })

    if (response.data.items.length === 0) {
      return null
    }

    const issue = response.data.items[0]
    const issueDetails = await this.octokit.rest.issues.get({
      owner: this.owner,
      repo: this.repo,
      issue_number: issue.number,
    })

    const metadata = this.extractMetadataFromIssueBody(issueDetails.data.body || '')
    return this.mapGitHubIssueToCodeIssue(issueDetails.data, metadata)
  }

  async update(request: UpdateCodeIssueRequest): Promise<CodeIssue> {
    const issueNumber = Number.parseInt(request.id)

    if (request.labels) {
      await this.octokit.rest.issues.addLabels({
        owner: this.owner,
        repo: this.repo,
        issue_number: issueNumber,
        labels: request.labels,
      })
    }

    if (request.comment) {
      await this.octokit.rest.issues.createComment({
        owner: this.owner,
        repo: this.repo,
        issue_number: issueNumber,
        body: request.comment,
      })
    }

    const response = await this.octokit.rest.issues.get({
      owner: this.owner,
      repo: this.repo,
      issue_number: issueNumber,
    })

    const metadata = this.extractMetadataFromIssueBody(response.data.body || '')
    return this.mapGitHubIssueToCodeIssue(response.data, metadata)
  }

  async close(id: string, reason?: string): Promise<CodeIssue> {
    const issueNumber = Number.parseInt(id)

    if (reason) {
      await this.octokit.rest.issues.createComment({
        owner: this.owner,
        repo: this.repo,
        issue_number: issueNumber,
        body: `Closed: ${reason}`,
      })
    }

    const response = await this.octokit.rest.issues.update({
      owner: this.owner,
      repo: this.repo,
      issue_number: issueNumber,
      state: 'closed',
    })

    const metadata = this.extractMetadataFromIssueBody(response.data.body || '')
    return this.mapGitHubIssueToCodeIssue(response.data, metadata)
  }

  async reopen(id: string, reason?: string): Promise<CodeIssue> {
    const issueNumber = Number.parseInt(id)

    if (reason) {
      await this.octokit.rest.issues.createComment({
        owner: this.owner,
        repo: this.repo,
        issue_number: issueNumber,
        body: `Reopened: ${reason}`,
      })
    }

    const response = await this.octokit.rest.issues.update({
      owner: this.owner,
      repo: this.repo,
      issue_number: issueNumber,
      state: 'open',
    })

    const metadata = this.extractMetadataFromIssueBody(response.data.body || '')
    return this.mapGitHubIssueToCodeIssue(response.data, metadata)
  }

  async addComment(id: string, comment: string): Promise<void> {
    const issueNumber = Number.parseInt(id)

    await this.octokit.rest.issues.createComment({
      owner: this.owner,
      repo: this.repo,
      issue_number: issueNumber,
      body: comment,
    })
  }

  async addLabels(id: string, labels: string[]): Promise<void> {
    const issueNumber = Number.parseInt(id)

    await this.octokit.rest.issues.addLabels({
      owner: this.owner,
      repo: this.repo,
      issue_number: issueNumber,
      labels,
    })
  }

  /**
   * Fetch all open code scanning alerts from GitHub
   */
  async fetchCodeScanningAlerts(): Promise<CodeScanningAlert[]> {
    try {
      const response = await this.octokit.rest.codeScanning.listAlertsForRepo({
        owner: this.owner,
        repo: this.repo,
        state: 'open',
        per_page: 100,
      })

      // More strict filtering to ensure all required fields are present
      return response.data
        .filter(alert =>
          // Check all required fields exist
          alert.rule?.id
          && alert.most_recent_instance?.location?.path
          && alert.most_recent_instance?.ref
          && alert.most_recent_instance?.analysis_key
          // Also check there are no undefined values for required fields
          && typeof alert.rule.id === 'string'
          && typeof alert.most_recent_instance.location.path === 'string'
          && typeof alert.most_recent_instance.ref === 'string'
          && typeof alert.most_recent_instance.analysis_key === 'string',
        )
        .map((alert) => {
          // Since we've filtered, we can safely assert these exist
          const instance = alert.most_recent_instance!
          const location = instance.location!

          return {
            id: alert.number,
            url: alert.url,
            html_url: alert.html_url,
            state: alert.state as 'open' | 'dismissed' | 'fixed',
            rule: {
              id: alert.rule.id!,
              name: alert.rule.name || alert.rule.id!,
              description: alert.rule.description || 'No description available',
              severity: alert.rule.severity as 'error' | 'warning' | 'note',
            },
            most_recent_instance: {
              ref: instance.ref!,
              analysis_key: instance.analysis_key!,
              location: {
                path: location.path!,
                start_line: location.start_line,
                start_column: location.start_column,
                end_line: location.end_line,
                end_column: location.end_column,
              },
            },
          }
        })
    }
    catch (error) {
      throw new Error(`Failed to fetch code scanning alerts: ${error}`)
    }
  }

  private buildIssueBody(metadata: CodeIssueMetadata): string {
    return `## Security Alert Details

**Description:** ${metadata.description}

**File:** \`${metadata.affectedFile}\`
**Branch:** \`${metadata.branch}\`
${metadata.line ? `**Line:** ${metadata.line}` : ''}
${metadata.column ? `**Column:** ${metadata.column}` : ''}
**Severity:** ${metadata.severity.toUpperCase()}
**Rule:** ${metadata.ruleId}

${metadata.url ? `[View Alert](${metadata.url})` : ''}

---
<!-- METADATA -->
Alert ID: ${metadata.alertId}
Fingerprint: ${metadata.fingerprint}
Rule ID: ${metadata.ruleId}
<!-- /METADATA -->`
  }

  private extractMetadataFromIssueBody(body: string): CodeIssueMetadata {
    const alertIdMatch = body.match(/Alert ID: (.+)/)
    const fingerprintMatch = body.match(/Fingerprint: (.+)/)
    const ruleIdMatch = body.match(/Rule ID: (.+)/)

    // Extract other metadata from the body
    const descriptionMatch = body.match(/\*\*Description:\*\* (.+)/)
    const fileMatch = body.match(/\*\*File:\*\* `(.+)`/)
    const branchMatch = body.match(/\*\*Branch:\*\* `(.+)`/)
    const lineMatch = body.match(/\*\*Line:\*\* (\d+)/)
    const columnMatch = body.match(/\*\*Column:\*\* (\d+)/)
    const severityMatch = body.match(/\*\*Severity:\*\* (.+)/)
    const ruleNameMatch = body.match(/\*\*Rule:\*\* (.+)/)

    const result: CodeIssueMetadata = {
      alertId: alertIdMatch?.[1] || '',
      fingerprint: fingerprintMatch?.[1] || '',
      ruleId: ruleIdMatch?.[1] || '',
      ruleName: ruleNameMatch?.[1] || '',
      severity: (severityMatch?.[1]?.toLowerCase() as any) || 'medium',
      description: descriptionMatch?.[1] || '',
      affectedFile: fileMatch?.[1] || '',
      branch: branchMatch?.[1] || '',
    }

    if (lineMatch) {
      result.line = Number.parseInt(lineMatch[1])
    }
    if (columnMatch) {
      result.column = Number.parseInt(columnMatch[1])
    }

    return result
  }

  private mapGitHubIssueToCodeIssue(githubIssue: any, metadata: CodeIssueMetadata): CodeIssue {
    return {
      id: githubIssue.number.toString(),
      metadata,
      status: githubIssue.state === 'open' ? 'created' : 'fixed',
      createdAt: new Date(githubIssue.created_at),
      updatedAt: new Date(githubIssue.updated_at),
      labels: githubIssue.labels.map((label: any) => label.name),
      comments: [], // We'd need to fetch comments separately if needed
    }
  }
}
