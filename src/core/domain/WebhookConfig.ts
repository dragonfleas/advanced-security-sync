export enum BranchAlertStrategy {
  /** Only track alerts in the main branch, ignore all other branches */
  MAIN_ONLY = 'main_only',

  /** Track alerts in main branch, update existing issues when alerts appear in other branches */
  MAIN_WITH_BRANCH_UPDATES = 'main_with_branch_updates',

  /** Create issues for alerts in any branch */
  ALL_BRANCHES = 'all_branches',
}

export interface WebhookConfig {
  /**
   * Strategy for handling alerts across different branches.
   * - MAIN_ONLY: Only create issues for alerts in the main branch
   * - MAIN_WITH_BRANCH_UPDATES: Create issues for main branch, update when alerts appear in other branches
   * - ALL_BRANCHES: Create separate issues for alerts in any branch
   * Default: MAIN_ONLY
   */
  branchStrategy: BranchAlertStrategy

  /**
   * The name of the main/default branch to track.
   * Default: 'main'
   */
  mainBranch: string
}
