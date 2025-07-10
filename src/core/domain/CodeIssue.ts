export type CodeIssueSeverity = 'critical' | 'high' | 'medium' | 'low' | 'warning' | 'note'

export type CodeIssueStatus
  = | 'created'
    | 'appeared_in_branch'
    | 'fixed'
    | 'closed_by_user'
    | 'reopened'
    | 'reopened_by_user'

export interface CodeIssueMetadata {
  alertId: string
  fingerprint: string
  ruleId: string
  ruleName: string
  severity: CodeIssueSeverity
  description: string
  affectedFile: string
  branch: string
  line?: number
  column?: number
  url?: string
}

export interface CodeIssue {
  readonly id: string
  readonly metadata: CodeIssueMetadata
  readonly status: CodeIssueStatus
  readonly createdAt: Date
  readonly updatedAt: Date
  readonly labels: string[]
  readonly comments: string[]
}
