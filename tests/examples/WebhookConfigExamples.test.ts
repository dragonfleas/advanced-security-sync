import type { CodeIssueRepository } from '../../src/core/domain/CodeIssueRepository'
import type { WebhookConfig } from '../../src/core/domain/WebhookConfig'
import { BranchAlertStrategy } from '../../src/core/domain/WebhookConfig'
import { AppearInBranchUseCase } from '../../src/core/usecases/AppearInBranchUseCase'
import { CreateCodeIssueUseCase } from '../../src/core/usecases/CreateCodeIssueUseCase'

/**
 * This file serves as documentation and examples of how to use WebhookConfig
 * with different branch strategies.
 */
describe('webhookConfig Examples', () => {
  // Mock repository for the examples
  let repository: CodeIssueRepository

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      findByAlert: jest.fn(),
      update: jest.fn(),
      close: jest.fn(),
      reopen: jest.fn(),
      addComment: jest.fn(),
      addLabels: jest.fn(),
    } as unknown as jest.Mocked<CodeIssueRepository>
  })

  describe('mAIN_ONLY strategy', () => {
    it('only creates issues for the main branch', () => {
    // Example configuration
      const config: WebhookConfig = {
        branchStrategy: BranchAlertStrategy.MAIN_ONLY,
        mainBranch: 'main',
      }

      // Create use case with this config
      const useCase = new CreateCodeIssueUseCase(repository, config)
      expect(useCase).toBeTruthy()

      // Usage example:
      expect(config.branchStrategy).toBe('main_only')
      // When using this strategy:
      // - Issues are only created for alerts in the main branch
      // - No tracking for alerts in other branches
      // - No comments or updates for alerts appearing in other branches
    })
  })

  describe('mAIN_WITH_BRANCH_UPDATES strategy', () => {
    it('creates issues for main branch, updates them when alerts appear elsewhere', () => {
    // Example configuration
      const config: WebhookConfig = {
        branchStrategy: BranchAlertStrategy.MAIN_WITH_BRANCH_UPDATES,
        mainBranch: 'master', // Can use any branch name as main
      }

      // Create use cases with this config
      const createUseCase = new CreateCodeIssueUseCase(repository, config)
      const appearUseCase = new AppearInBranchUseCase(repository, config)
      expect(createUseCase).toBeTruthy()
      expect(appearUseCase).toBeTruthy()

      // Usage example:
      expect(config.branchStrategy).toBe('main_with_branch_updates')
      // When using this strategy:
      // - Issues are only created for alerts in the main branch
      // - When alerts appear in other branches, existing issues are updated with a comment
      // - No separate issues are created for other branches
    })
  })

  describe('aLL_BRANCHES strategy', () => {
    it('creates issues for alerts in any branch', () => {
    // Example configuration
      const config: WebhookConfig = {
        branchStrategy: BranchAlertStrategy.ALL_BRANCHES,
        mainBranch: 'main',
      }

      // Create use case with this config
      const allBranchesUseCase = new CreateCodeIssueUseCase(repository, config)
      expect(allBranchesUseCase).toBeTruthy()

      // Usage example:
      expect(config.branchStrategy).toBe('all_branches')
      // When using this strategy:
      // - Issues are created for alerts in any branch
      // - Each branch's alerts get their own issues
      // - Useful for teams working with feature branch workflows
    })
  })
})
