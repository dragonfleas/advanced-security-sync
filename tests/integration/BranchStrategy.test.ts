import type { CodeIssue } from '../../src/core/domain/CodeIssue'
import type { CodeIssueRepository } from '../../src/core/domain/CodeIssueRepository'
import type { WebhookConfig } from '../../src/core/domain/WebhookConfig'
import type { CodeScanningAlert } from '../../src/core/usecases/ReconcileAlertsUseCase'
import type { Logger } from '../../src/utils/Logger'
import { BranchAlertStrategy } from '../../src/core/domain/WebhookConfig'
import { AppearInBranchUseCase } from '../../src/core/usecases/AppearInBranchUseCase'
import { CreateCodeIssueUseCase } from '../../src/core/usecases/CreateCodeIssueUseCase'
import { ReconcileAlertsUseCase } from '../../src/core/usecases/ReconcileAlertsUseCase'

// This integration test verifies that the branch strategy is correctly applied across all use cases

describe('branch Strategy Integration', () => {
  let mockRepository: jest.Mocked<CodeIssueRepository>
  let mockLogger: jest.Mocked<Logger>
  let createCodeIssueUseCase: CreateCodeIssueUseCase
  let appearInBranchUseCase: AppearInBranchUseCase
  let reconcileAlertsUseCase: ReconcileAlertsUseCase
  let mockConfig: WebhookConfig

  const mockCodeIssue: CodeIssue = {
    id: '1',
    metadata: {
      alertId: '123',
      fingerprint: 'test-fingerprint',
      ruleId: 'rule-123',
      ruleName: 'Test Rule',
      severity: 'high',
      description: 'Test description',
      affectedFile: 'src/test.ts',
      branch: 'main',
      line: 10,
      column: 5,
      url: 'https://github.com/test/repo/security/code-scanning/123',
    },
    status: 'created',
    createdAt: new Date(),
    updatedAt: new Date(),
    labels: ['security-alert'],
    comments: [],
  }

  const mockAlert: CodeScanningAlert = {
    id: 123,
    url: 'https://api.github.com/repos/test/repo/code-scanning/alerts/123',
    html_url: 'https://github.com/test/repo/security/code-scanning/123',
    state: 'open',
    rule: {
      id: 'rule-123',
      name: 'Test Rule',
      description: 'Test description',
      severity: 'error',
    },
    most_recent_instance: {
      ref: 'refs/heads/main',
      analysis_key: 'analysis-123',
      location: {
        path: 'src/test.ts',
        start_line: 10,
        start_column: 5,
      },
    },
  }

  const featureBranchAlert = {
    ...mockAlert,
    id: 456,
    most_recent_instance: {
      ...mockAlert.most_recent_instance,
      ref: 'refs/heads/feature/test',
      location: {
        ...mockAlert.most_recent_instance.location,
      },
    },
  }

  beforeEach(() => {
    mockRepository = {
      create: jest.fn(),
      findByAlert: jest.fn(),
      update: jest.fn(),
      close: jest.fn(),
      reopen: jest.fn(),
      addComment: jest.fn(),
      addLabels: jest.fn(),
      fetchCodeScanningAlerts: jest.fn(),
    } as jest.Mocked<CodeIssueRepository>

    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as jest.Mocked<Logger>

    mockConfig = {
      branchStrategy: BranchAlertStrategy.MAIN_ONLY,
      mainBranch: 'main',
    }

    createCodeIssueUseCase = new CreateCodeIssueUseCase(mockRepository, mockConfig)
    appearInBranchUseCase = new AppearInBranchUseCase(mockRepository, mockConfig)
    reconcileAlertsUseCase = new ReconcileAlertsUseCase(mockRepository, mockConfig, mockLogger)
  })

  describe('mAIN_ONLY strategy', () => {
    beforeEach(() => {
      mockConfig.branchStrategy = BranchAlertStrategy.MAIN_ONLY
      createCodeIssueUseCase = new CreateCodeIssueUseCase(mockRepository, mockConfig)
      appearInBranchUseCase = new AppearInBranchUseCase(mockRepository, mockConfig)
      reconcileAlertsUseCase = new ReconcileAlertsUseCase(mockRepository, mockConfig, mockLogger)
    })

    it('should only create issues for main branch alerts', async () => {
      mockRepository.findByAlert.mockResolvedValue(null)
      mockRepository.create.mockResolvedValue(mockCodeIssue)

      // Main branch alert - should create issue
      const mainBranchMetadata = { ...mockCodeIssue.metadata, branch: 'main' }
      const mainResult = await createCodeIssueUseCase.execute(mainBranchMetadata)

      // Feature branch alert - should not create issue
      const featureBranchMetadata = { ...mockCodeIssue.metadata, branch: 'feature/test' }
      const featureResult = await createCodeIssueUseCase.execute(featureBranchMetadata)

      expect(mainResult).not.toBeNull()
      expect(featureResult).toBeNull()
      expect(mockRepository.create).toHaveBeenCalledTimes(1)
    })

    it('should not update issues when alerts appear in other branches', async () => {
      const result = await appearInBranchUseCase.execute('123', 'test-fingerprint', 'feature/test')

      expect(result).toBeNull()
      expect(mockRepository.findByAlert).not.toHaveBeenCalled()
      expect(mockRepository.addComment).not.toHaveBeenCalled()
    })

    it('should only reconcile alerts for main branch', async () => {
      mockRepository.findByAlert.mockResolvedValue(null)
      mockRepository.create.mockResolvedValue(mockCodeIssue)

      const result = await reconcileAlertsUseCase.execute([mockAlert, featureBranchAlert])

      expect(result.totalAlerts).toBe(2)
      expect(result.createdIssues).toBe(1) // Only main branch alert creates an issue
      expect(result.skippedAlerts).toBe(1) // Feature branch alert is skipped
      expect(mockRepository.create).toHaveBeenCalledTimes(1)
    })
  })

  describe('mAIN_WITH_BRANCH_UPDATES strategy', () => {
    beforeEach(() => {
      mockConfig.branchStrategy = BranchAlertStrategy.MAIN_WITH_BRANCH_UPDATES
      createCodeIssueUseCase = new CreateCodeIssueUseCase(mockRepository, mockConfig)
      appearInBranchUseCase = new AppearInBranchUseCase(mockRepository, mockConfig)
      reconcileAlertsUseCase = new ReconcileAlertsUseCase(mockRepository, mockConfig, mockLogger)
    })

    it('should only create issues for main branch alerts', async () => {
      mockRepository.findByAlert.mockResolvedValue(null)
      mockRepository.create.mockResolvedValue(mockCodeIssue)

      // Main branch alert - should create issue
      const mainBranchMetadata = { ...mockCodeIssue.metadata, branch: 'main' }
      const mainResult = await createCodeIssueUseCase.execute(mainBranchMetadata)

      // Feature branch alert - should not create issue
      const featureBranchMetadata = { ...mockCodeIssue.metadata, branch: 'feature/test' }
      const featureResult = await createCodeIssueUseCase.execute(featureBranchMetadata)

      expect(mainResult).not.toBeNull()
      expect(featureResult).toBeNull()
      expect(mockRepository.create).toHaveBeenCalledTimes(1)
    })

    it('should update existing issues when alerts appear in other branches', async () => {
      mockRepository.findByAlert.mockResolvedValue(mockCodeIssue)
      mockRepository.update.mockResolvedValue({
        ...mockCodeIssue,
        status: 'appeared_in_branch',
      })

      const result = await appearInBranchUseCase.execute('123', 'test-fingerprint', 'feature/test')

      expect(result).not.toBeNull()
      expect(mockRepository.findByAlert).toHaveBeenCalled()
      expect(mockRepository.addComment).toHaveBeenCalled()
      expect(mockRepository.addLabels).toHaveBeenCalled()
      expect(result?.status).toBe('appeared_in_branch')
    })
  })

  describe('aLL_BRANCHES strategy', () => {
    beforeEach(() => {
      mockConfig.branchStrategy = BranchAlertStrategy.ALL_BRANCHES
      createCodeIssueUseCase = new CreateCodeIssueUseCase(mockRepository, mockConfig)
      appearInBranchUseCase = new AppearInBranchUseCase(mockRepository, mockConfig)
      reconcileAlertsUseCase = new ReconcileAlertsUseCase(mockRepository, mockConfig, mockLogger)
    })

    it('should create issues for alerts in any branch', async () => {
      mockRepository.findByAlert.mockResolvedValue(null)
      mockRepository.create
        .mockResolvedValueOnce(mockCodeIssue)
        .mockResolvedValueOnce({
          ...mockCodeIssue,
          id: '2',
          metadata: { ...mockCodeIssue.metadata, branch: 'feature/test' },
        })

      // Main branch alert
      const mainBranchMetadata = { ...mockCodeIssue.metadata, branch: 'main' }
      const mainResult = await createCodeIssueUseCase.execute(mainBranchMetadata)

      // Feature branch alert
      const featureBranchMetadata = { ...mockCodeIssue.metadata, branch: 'feature/test' }
      const featureResult = await createCodeIssueUseCase.execute(featureBranchMetadata)

      expect(mainResult).not.toBeNull()
      expect(featureResult).not.toBeNull()
      expect(mockRepository.create).toHaveBeenCalledTimes(2)
    })

    it('should reconcile alerts for all branches', async () => {
      mockRepository.findByAlert.mockResolvedValue(null)
      mockRepository.create
        .mockResolvedValueOnce(mockCodeIssue)
        .mockResolvedValueOnce({
          ...mockCodeIssue,
          id: '2',
          metadata: { ...mockCodeIssue.metadata, branch: 'feature/test' },
        })

      const result = await reconcileAlertsUseCase.execute([mockAlert, featureBranchAlert])

      expect(result.totalAlerts).toBe(2)
      expect(result.createdIssues).toBe(2) // Both alerts create issues
      expect(result.skippedAlerts).toBe(0)
      expect(mockRepository.create).toHaveBeenCalledTimes(2)
    })
  })
})
