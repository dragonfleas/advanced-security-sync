import { GitHubCodeIssueRepository } from '../../src/infra/github/GitHubCodeIssueRepository'

describe('gitHubCodeIssueRepository', () => {
  it('should initialize correctly with config', () => {
    const config = {
      token: 'test-token',
      owner: 'test-owner',
      repo: 'test-repo',
    }

    const repository = new GitHubCodeIssueRepository(config)
    expect(repository).toBeDefined()
  })
})
