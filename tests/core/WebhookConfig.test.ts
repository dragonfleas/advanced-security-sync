import type { WebhookConfig } from '../../src/core/domain/WebhookConfig'
import { BranchAlertStrategy } from '../../src/core/domain/WebhookConfig'

describe('webhookConfig', () => {
  describe('branchAlertStrategy', () => {
    it('should have the correct values for BranchAlertStrategy', () => {
      expect(BranchAlertStrategy.MAIN_ONLY).toBe('main_only')
      expect(BranchAlertStrategy.MAIN_WITH_BRANCH_UPDATES).toBe('main_with_branch_updates')
      expect(BranchAlertStrategy.ALL_BRANCHES).toBe('all_branches')
    })
  })

  describe('webhookConfig Interface', () => {
    it('should create a valid config with MAIN_ONLY strategy', () => {
      const config: WebhookConfig = {
        branchStrategy: BranchAlertStrategy.MAIN_ONLY,
        mainBranch: 'main',
      }

      expect(config.branchStrategy).toBe(BranchAlertStrategy.MAIN_ONLY)
      expect(config.mainBranch).toBe('main')
    })

    it('should create a valid config with MAIN_WITH_BRANCH_UPDATES strategy', () => {
      const config: WebhookConfig = {
        branchStrategy: BranchAlertStrategy.MAIN_WITH_BRANCH_UPDATES,
        mainBranch: 'master',
      }

      expect(config.branchStrategy).toBe(BranchAlertStrategy.MAIN_WITH_BRANCH_UPDATES)
      expect(config.mainBranch).toBe('master')
    })

    it('should create a valid config with ALL_BRANCHES strategy', () => {
      const config: WebhookConfig = {
        branchStrategy: BranchAlertStrategy.ALL_BRANCHES,
        mainBranch: 'develop',
      }

      expect(config.branchStrategy).toBe(BranchAlertStrategy.ALL_BRANCHES)
      expect(config.mainBranch).toBe('develop')
    })
  })
})
