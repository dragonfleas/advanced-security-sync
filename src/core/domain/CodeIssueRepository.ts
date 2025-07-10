import type { CodeIssue, CodeIssueMetadata, CodeIssueStatus } from './CodeIssue'

export interface CreateCodeIssueRequest {
  metadata: CodeIssueMetadata
}

export interface UpdateCodeIssueRequest {
  id: string
  status?: CodeIssueStatus
  labels?: string[]
  comment?: string
}

export interface FindCodeIssueRequest {
  alertId?: string
  fingerprint?: string
}

/**
 * Abstract repository interface for Code Issues
 * This enables swapping between different SCM providers (GitHub, GitLab, etc.)
 */
export interface CodeIssueRepository {
  /**
   * Create a new code issue
   */
  create: (request: CreateCodeIssueRequest) => Promise<CodeIssue>

  /**
   * Find an existing code issue by alert ID or fingerprint
   */
  findByAlert: (request: FindCodeIssueRequest) => Promise<CodeIssue | null>

  /**
   * Update an existing code issue
   */
  update: (request: UpdateCodeIssueRequest) => Promise<CodeIssue>

  /**
   * Close a code issue
   */
  close: (id: string, reason?: string) => Promise<CodeIssue>

  /**
   * Reopen a code issue
   */
  reopen: (id: string, reason?: string) => Promise<CodeIssue>

  /**
   * Add a comment to a code issue
   */
  addComment: (id: string, comment: string) => Promise<void>

  /**
   * Add labels to a code issue
   */
  addLabels: (id: string, labels: string[]) => Promise<void>
}
