import type { CodeIssue } from '../../src/core/domain/CodeIssue'
import type { CodeIssueRepository } from '../../src/core/domain/CodeIssueRepository'
import type { WebhookConfig } from '../../src/core/domain/WebhookConfig'
import { BranchAlertStrategy } from '../../src/core/domain/WebhookConfig'
import { AppearInBranchUseCase } from '../../src/core/usecases/AppearInBranchUseCase'

describe('appearInBranchUseCase', () => {
  let mockRepository: jest.Mocked<CodeIssueRepository>
  let useCase: AppearInBranchUseCase
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

  beforeEach(() => {
    mockRepository = {
      create: jest.fn(),
      findByAlert: jest.fn(),
      update: jest.fn(),
      close: jest.fn(),
      reopen: jest.fn(),
      addComment: jest.fn(),
      addLabels: jest.fn(),
    }

    mockConfig = {
      branchStrategy: BranchAlertStrategy.MAIN_WITH_BRANCH_UPDATES,
      mainBranch: 'main',
    }

    useCase = new AppearInBranchUseCase(mockRepository, mockConfig)
  })

  it('should update existing issue when trackBranchAlerts is true', async () => {
    mockRepository.findByAlert.mockResolvedValue(mockCodeIssue)
    mockRepository.update.mockResolvedValue({
      ...mockCodeIssue,
      status: 'appeared_in_branch',
    })

    const result = await useCase.execute('123', 'test-fingerprint', 'feature/test')

    expect(mockRepository.findByAlert).toHaveBeenCalledWith({
      alertId: '123',
      fingerprint: 'test-fingerprint',
    })
    expect(mockRepository.addComment).toHaveBeenCalledWith(
      '1',
      '🌿 Alert appeared in branch: `feature/test`',
    )
    expect(mockRepository.addLabels).toHaveBeenCalledWith('1', ['appeared-in-branch'])
    expect(result?.status).toBe('appeared_in_branch')
  })

  it('should return null when branch strategy is MAIN_ONLY', async () => {
    mockConfig.branchStrategy = BranchAlertStrategy.MAIN_ONLY
    useCase = new AppearInBranchUseCase(mockRepository, mockConfig)

    const result = await useCase.execute('123', 'test-fingerprint', 'feature/test')

    expect(result).toBeNull()
    expect(mockRepository.findByAlert).not.toHaveBeenCalled()
    expect(mockRepository.addComment).not.toHaveBeenCalled()
    expect(mockRepository.addLabels).not.toHaveBeenCalled()
  })

  it('should update issue when branch strategy is ALL_BRANCHES', async () => {
    mockConfig.branchStrategy = BranchAlertStrategy.ALL_BRANCHES
    useCase = new AppearInBranchUseCase(mockRepository, mockConfig)

    mockRepository.findByAlert.mockResolvedValue(mockCodeIssue)
    mockRepository.update.mockResolvedValue({
      ...mockCodeIssue,
      status: 'appeared_in_branch',
    })

    const result = await useCase.execute('123', 'test-fingerprint', 'feature/test')

    expect(result).not.toBeNull()
    expect(mockRepository.addComment).toHaveBeenCalledWith(
      '1',
      '🌿 Alert appeared in branch: `feature/test`',
    )
    expect(mockRepository.addLabels).toHaveBeenCalledWith('1', ['appeared-in-branch'])
    expect(result?.status).toBe('appeared_in_branch')
  })

  it('should return null when no existing issue is found', async () => {
    mockRepository.findByAlert.mockResolvedValue(null)

    const result = await useCase.execute('999', 'nonexistent', 'feature/test')

    expect(result).toBeNull()
    expect(mockRepository.addComment).not.toHaveBeenCalled()
    expect(mockRepository.addLabels).not.toHaveBeenCalled()
  })
})
