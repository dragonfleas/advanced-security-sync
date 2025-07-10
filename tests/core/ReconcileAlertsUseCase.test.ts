import type { CodeIssue } from '../../src/core/domain/CodeIssue'
import type { CodeIssueRepository } from '../../src/core/domain/CodeIssueRepository'
import type { WebhookConfig } from '../../src/core/domain/WebhookConfig'
import type { CodeScanningAlert } from '../../src/core/usecases/ReconcileAlertsUseCase'
import type { Logger } from '../../src/utils/Logger'
import { BranchAlertStrategy } from '../../src/core/domain/WebhookConfig'
import { ReconcileAlertsUseCase } from '../../src/core/usecases/ReconcileAlertsUseCase'

describe('reconcileAlertsUseCase', () => {
  let mockRepository: jest.Mocked<CodeIssueRepository>
  let mockLogger: jest.Mocked<Logger>
  let useCase: ReconcileAlertsUseCase
  let mockConfig: WebhookConfig

  const mockCodeIssue: CodeIssue = {
    id: '1',
    metadata: {
      alertId: '123',
      fingerprint: 'rule-123-src/test.ts',
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

  const mockFeatureBranchAlert: CodeScanningAlert = {
    ...mockAlert,
    id: 456,
    most_recent_instance: {
      ...mockAlert.most_recent_instance,
      ref: 'refs/heads/feature/test',
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
    } as unknown as jest.Mocked<CodeIssueRepository>

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

    useCase = new ReconcileAlertsUseCase(mockRepository, mockConfig, mockLogger)
  })

  it('should create issues for main branch alerts that do not exist', async () => {
    mockRepository.findByAlert.mockResolvedValue(null)
    mockRepository.create.mockResolvedValue(mockCodeIssue)

    const result = await useCase.execute([mockAlert])

    expect(result.totalAlerts).toBe(1)
    expect(result.createdIssues).toBe(1)
    expect(result.skippedAlerts).toBe(0)
    expect(result.errors).toBe(0)

    expect(mockRepository.findByAlert).toHaveBeenCalledWith({
      alertId: mockAlert.id.toString(),
      fingerprint: `${mockAlert.rule.id}-${mockAlert.most_recent_instance.location.path}`,
    })

    expect(mockRepository.create).toHaveBeenCalledWith({
      metadata: expect.objectContaining({
        alertId: mockAlert.id.toString(),
        fingerprint: `${mockAlert.rule.id}-${mockAlert.most_recent_instance.location.path}`,
        ruleId: mockAlert.rule.id,
        branch: 'main',
        affectedFile: mockAlert.most_recent_instance.location.path,
      }),
    })
  })

  it('should skip alerts that already have corresponding issues', async () => {
    mockRepository.findByAlert.mockResolvedValue(mockCodeIssue)

    const result = await useCase.execute([mockAlert])

    expect(result.totalAlerts).toBe(1)
    expect(result.createdIssues).toBe(0)
    expect(result.skippedAlerts).toBe(1)
    expect(result.errors).toBe(0)

    expect(mockRepository.findByAlert).toHaveBeenCalled()
    expect(mockRepository.create).not.toHaveBeenCalled()
  })

  it('should skip non-main branch alerts when strategy is MAIN_ONLY', async () => {
    mockConfig.branchStrategy = BranchAlertStrategy.MAIN_ONLY
    useCase = new ReconcileAlertsUseCase(mockRepository, mockConfig, mockLogger)

    const result = await useCase.execute([mockFeatureBranchAlert])

    expect(result.totalAlerts).toBe(1)
    expect(result.createdIssues).toBe(0)
    expect(result.skippedAlerts).toBe(1)
    expect(result.errors).toBe(0)

    expect(mockRepository.findByAlert).not.toHaveBeenCalled()
    expect(mockRepository.create).not.toHaveBeenCalled()
  })

  it('should create issues for any branch when strategy is ALL_BRANCHES', async () => {
    mockConfig.branchStrategy = BranchAlertStrategy.ALL_BRANCHES
    useCase = new ReconcileAlertsUseCase(mockRepository, mockConfig, mockLogger)

    mockRepository.findByAlert.mockResolvedValue(null)
    mockRepository.create.mockResolvedValue({
      ...mockCodeIssue,
      metadata: {
        ...mockCodeIssue.metadata,
        branch: 'feature/test',
      },
    })

    const result = await useCase.execute([mockFeatureBranchAlert])

    expect(result.totalAlerts).toBe(1)
    expect(result.createdIssues).toBe(1)
    expect(result.skippedAlerts).toBe(0)
    expect(result.errors).toBe(0)

    expect(mockRepository.findByAlert).toHaveBeenCalled()
    expect(mockRepository.create).toHaveBeenCalled()
  })

  it('should handle errors during alert processing', async () => {
    mockRepository.findByAlert.mockRejectedValue(new Error('Test error'))

    const result = await useCase.execute([mockAlert])

    expect(result.totalAlerts).toBe(1)
    expect(result.createdIssues).toBe(0)
    expect(result.skippedAlerts).toBe(0)
    expect(result.errors).toBe(1)

    expect(mockLogger.error).toHaveBeenCalled()
  })

  it('should process multiple alerts correctly', async () => {
    // First alert: exists already
    mockRepository.findByAlert.mockResolvedValueOnce(mockCodeIssue)

    // Second alert: doesn't exist, should create
    mockRepository.findByAlert.mockResolvedValueOnce(null)
    mockRepository.create.mockResolvedValueOnce(mockCodeIssue)

    // Third alert: will cause an error
    mockRepository.findByAlert.mockRejectedValueOnce(new Error('Test error'))

    const alerts = [mockAlert, { ...mockAlert, id: 124 }, { ...mockAlert, id: 125 }]
    const result = await useCase.execute(alerts)

    expect(result.totalAlerts).toBe(3)
    expect(result.createdIssues).toBe(1)
    expect(result.skippedAlerts).toBe(1)
    expect(result.errors).toBe(1)
  })
})
