import type { CodeIssue, CodeIssueMetadata } from '../../src/core/domain/CodeIssue'
import type { CodeIssueRepository } from '../../src/core/domain/CodeIssueRepository'
import type { WebhookConfig } from '../../src/core/domain/WebhookConfig'
import { BranchAlertStrategy } from '../../src/core/domain/WebhookConfig'
import { CreateCodeIssueUseCase } from '../../src/core/usecases/CreateCodeIssueUseCase'

describe('createCodeIssueUseCase', () => {
  let mockRepository: jest.Mocked<CodeIssueRepository>
  let useCase: CreateCodeIssueUseCase
  let mockConfig: WebhookConfig

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
      branchStrategy: BranchAlertStrategy.MAIN_ONLY,
      mainBranch: 'main',
    }

    useCase = new CreateCodeIssueUseCase(mockRepository, mockConfig)
  })

  const mockMetadata: CodeIssueMetadata = {
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
  }

  const mockCodeIssue: CodeIssue = {
    id: '1',
    metadata: mockMetadata,
    status: 'created',
    createdAt: new Date(),
    updatedAt: new Date(),
    labels: ['security-alert'],
    comments: [],
  }

  it('should create a new code issue when none exists', async () => {
    mockRepository.findByAlert.mockResolvedValue(null)
    mockRepository.create.mockResolvedValue(mockCodeIssue)

    const result = await useCase.execute(mockMetadata)

    expect(mockRepository.findByAlert).toHaveBeenCalledWith({
      alertId: '123',
      fingerprint: 'test-fingerprint',
    })
    expect(mockRepository.create).toHaveBeenCalledWith({
      metadata: mockMetadata,
    })
    expect(result).toEqual(mockCodeIssue)
  })

  it('should return existing code issue when duplicate detected', async () => {
    mockRepository.findByAlert.mockResolvedValue(mockCodeIssue)

    const result = await useCase.execute(mockMetadata)

    expect(mockRepository.findByAlert).toHaveBeenCalledWith({
      alertId: '123',
      fingerprint: 'test-fingerprint',
    })
    expect(mockRepository.create).not.toHaveBeenCalled()
    expect(result).toEqual(mockCodeIssue)
  })

  it('should skip issue creation for non-main branch when createIssuesForAllBranches is false', async () => {
    const featureBranchMetadata: CodeIssueMetadata = {
      ...mockMetadata,
      branch: 'feature/new-feature',
    }

    const result = await useCase.execute(featureBranchMetadata)

    expect(result).toBeNull()
    expect(mockRepository.create).not.toHaveBeenCalled()
    expect(mockRepository.findByAlert).not.toHaveBeenCalled()
  })

  it('should create issue for any branch when strategy is ALL_BRANCHES', async () => {
    mockConfig.branchStrategy = BranchAlertStrategy.ALL_BRANCHES
    useCase = new CreateCodeIssueUseCase(mockRepository, mockConfig)

    const featureBranchMetadata: CodeIssueMetadata = {
      ...mockMetadata,
      branch: 'feature/new-feature',
    }

    mockRepository.findByAlert.mockResolvedValue(null)
    mockRepository.create.mockResolvedValue({
      ...mockCodeIssue,
      metadata: featureBranchMetadata,
    })

    const result = await useCase.execute(featureBranchMetadata)

    expect(result).not.toBeNull()
    expect(mockRepository.create).toHaveBeenCalledWith({
      metadata: featureBranchMetadata,
    })
  })

  it('should create issue for main branch regardless of branch strategy', async () => {
    mockConfig.branchStrategy = BranchAlertStrategy.MAIN_ONLY
    useCase = new CreateCodeIssueUseCase(mockRepository, mockConfig)

    mockRepository.findByAlert.mockResolvedValue(null)
    mockRepository.create.mockResolvedValue(mockCodeIssue)

    const result = await useCase.execute(mockMetadata)

    expect(result).toEqual(mockCodeIssue)
    expect(mockRepository.create).toHaveBeenCalledWith({
      metadata: mockMetadata,
    })
  })
})
