import { BranchAlertStrategy } from '../src/core/domain/WebhookConfig'

// Utility function to recreate the logic in index.ts
function getBranchStrategy(env: {
  BRANCH_ALERT_STRATEGY?: string
  CREATE_ISSUES_FOR_ALL_BRANCHES?: string
  TRACK_BRANCH_ALERTS?: string
}): BranchAlertStrategy {
  // For backward compatibility, check old environment variables
  const createIssuesForAllBranches = env.CREATE_ISSUES_FOR_ALL_BRANCHES === 'true'
  const trackBranchAlerts = env.TRACK_BRANCH_ALERTS === 'true'

  // Check new environment variable first
  const branchStrategy = env.BRANCH_ALERT_STRATEGY
  if (branchStrategy) {
    switch (branchStrategy.toLowerCase()) {
      case 'main_only':
        return BranchAlertStrategy.MAIN_ONLY
      case 'main_with_branch_updates':
        return BranchAlertStrategy.MAIN_WITH_BRANCH_UPDATES
      case 'all_branches':
        return BranchAlertStrategy.ALL_BRANCHES
    }
  }

  // Backward compatibility logic
  if (createIssuesForAllBranches) {
    return BranchAlertStrategy.ALL_BRANCHES
  }
  else if (trackBranchAlerts) {
    return BranchAlertStrategy.MAIN_WITH_BRANCH_UPDATES
  }
  else {
    return BranchAlertStrategy.MAIN_ONLY
  }
}

describe('index Configuration', () => {
  describe('getBranchStrategy', () => {
    it('should return ALL_BRANCHES when BRANCH_ALERT_STRATEGY is "all_branches"', () => {
      const result = getBranchStrategy({
        BRANCH_ALERT_STRATEGY: 'all_branches',
      })
      expect(result).toBe(BranchAlertStrategy.ALL_BRANCHES)
    })

    it('should return MAIN_WITH_BRANCH_UPDATES when BRANCH_ALERT_STRATEGY is "main_with_branch_updates"', () => {
      const result = getBranchStrategy({
        BRANCH_ALERT_STRATEGY: 'main_with_branch_updates',
      })
      expect(result).toBe(BranchAlertStrategy.MAIN_WITH_BRANCH_UPDATES)
    })

    it('should return MAIN_ONLY when BRANCH_ALERT_STRATEGY is "main_only"', () => {
      const result = getBranchStrategy({
        BRANCH_ALERT_STRATEGY: 'main_only',
      })
      expect(result).toBe(BranchAlertStrategy.MAIN_ONLY)
    })

    it('should be case insensitive for BRANCH_ALERT_STRATEGY', () => {
      const result = getBranchStrategy({
        BRANCH_ALERT_STRATEGY: 'ALL_BRANCHES',
      })
      expect(result).toBe(BranchAlertStrategy.ALL_BRANCHES)
    })

    // Backward compatibility tests
    it('should return ALL_BRANCHES when CREATE_ISSUES_FOR_ALL_BRANCHES is "true"', () => {
      const result = getBranchStrategy({
        CREATE_ISSUES_FOR_ALL_BRANCHES: 'true',
      })
      expect(result).toBe(BranchAlertStrategy.ALL_BRANCHES)
    })

    it('should return MAIN_WITH_BRANCH_UPDATES when TRACK_BRANCH_ALERTS is "true"', () => {
      const result = getBranchStrategy({
        TRACK_BRANCH_ALERTS: 'true',
      })
      expect(result).toBe(BranchAlertStrategy.MAIN_WITH_BRANCH_UPDATES)
    })

    it('should return MAIN_ONLY by default when no env variables are set', () => {
      const result = getBranchStrategy({})
      expect(result).toBe(BranchAlertStrategy.MAIN_ONLY)
    })

    it('should prioritize BRANCH_ALERT_STRATEGY over legacy env vars', () => {
      const result = getBranchStrategy({
        BRANCH_ALERT_STRATEGY: 'main_only',
        CREATE_ISSUES_FOR_ALL_BRANCHES: 'true',
        TRACK_BRANCH_ALERTS: 'true',
      })
      expect(result).toBe(BranchAlertStrategy.MAIN_ONLY)
    })
  })
})
