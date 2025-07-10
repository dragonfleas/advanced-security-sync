# Advanced Security Sync

A clean, well-architected Node.js application that integrates with GitHub's webhook system to handle `code_scanning_alert` events, converting them into GitHub Issues for better tracking and management.

## 🏗️ Architecture

This application follows **Clean Architecture** principles with clear separation of concerns:

```
src/
├── api/              # Hono routes and handlers
├── core/
│   ├── domain/       # Core entities and interfaces
│   └── usecases/     # Business logic
├── infra/
│   └── github/       # GitHub API integration
├── utils/            # Utilities (validation, logging)
└── index.ts          # Application entry point
```

### Key Architectural Decisions

- **Domain-Driven Design**: The `CodeIssue` entity represents the core business concept
- **Dependency Inversion**: Abstract repositories enable swapping SCM providers
- **Hexagonal Architecture**: Clean separation between business logic and infrastructure
- **SCM-Agnostic Design**: Ready to support GitLab, Bitbucket, etc.

## 🚀 Features

### Webhook Actions Supported

| GitHub Action | Behavior |
|---------------|----------|
| `created` | Creates a new GitHub Issue for the alert |
| `appeared_in_branch` | Adds a comment indicating the alert appeared in another branch |
| `fixed` | Closes the issue and adds "fixed" label |
| `closed_by_user` | Closes the issue and adds "closed-by-user" label |
| `reopened` | Reopens the issue and adds "reopened" label |
| `reopened_by_user` | Reopens the issue and adds "reopened-by-user" label |

### Key Features

- ✅ **Secure Webhook Validation** - HMAC SHA-256 signature verification
- ✅ **Idempotent Operations** - Prevents duplicate issues for the same alert
- ✅ **Rich Issue Templates** - Structured GitHub issues with alert metadata
- ✅ **Comprehensive Logging** - Structured logging for debugging and monitoring
- ✅ **Type Safety** - Full TypeScript implementation with Zod validation
- ✅ **Clean Architecture** - Testable, maintainable, and extensible design
- ✅ **Modern Tech Stack** - Hono, Octokit, TypeScript, Jest

## 🛠️ Tech Stack

- **Runtime**: Node.js + TypeScript
- **Web Framework**: [Hono](https://hono.dev/) (modern, fast, edge-ready)
- **GitHub Integration**: [@octokit/rest](https://github.com/octokit/rest.js)
- **Validation**: [Zod](https://zod.dev/) for runtime type checking
- **Testing**: Jest with ts-jest
- **Code Quality**: ESLint + Prettier

## 📦 Installation

### Prerequisites

- Node.js 18+
- npm or yarn
- GitHub Personal Access Token with `repo` permissions
- GitHub webhook secret

### Setup

1. **Clone and install dependencies**:
   ```bash
   git clone <repository-url>
   cd advanced-security-sync
   npm install
   ```

2. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your values:
   ```env
   GITHUB_TOKEN=your_github_personal_access_token
   GITHUB_WEBHOOK_SECRET=your_webhook_secret
   GITHUB_OWNER=your_github_username_or_org
   GITHUB_REPO=your_repository_name
   PORT=3000
   NODE_ENV=development
   ```

3. **Build the application**:
   ```bash
   npm run build
   ```

4. **Run tests**:
   ```bash
   npm test
   ```

5. **Start the server**:
   ```bash
   # Development
   npm run dev

   # Production
   npm start
   ```

## 🔧 Configuration

### GitHub Setup

1. **Create a Personal Access Token**:
   - Go to GitHub Settings → Developer settings → Personal access tokens
   - Create a token with `repo` permissions
   - Set as `GITHUB_TOKEN` in your environment

2. **Configure Repository Webhook**:
   - Go to your repository Settings → Webhooks
   - Add webhook with URL: `https://your-domain.com/webhook`
   - Content type: `application/json`
   - Secret: Same as `GITHUB_WEBHOOK_SECRET`
   - Events: Select "Code scanning alerts"

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GITHUB_TOKEN` | GitHub Personal Access Token | ✅ |
| `GITHUB_WEBHOOK_SECRET` | Webhook secret for signature validation | ✅ |
| `GITHUB_OWNER` | GitHub username or organization | ✅ |
| `GITHUB_REPO` | Repository name where issues will be created | ✅ |
| `BRANCH_ALERT_STRATEGY` | Branch alert handling strategy (see below) | ❌ |
| `MAIN_BRANCH` | Main branch name (default: `main`) | ❌ |
| `ENABLE_RECONCILIATION` | Enable/disable alert reconciliation on startup (default: `true`) | ❌ |
| `RECONCILIATION_DELAY_MS` | Delay before running reconciliation after startup (default: `1000`) | ❌ |
| `PORT` | Server port (default: 3000) | ❌ |
| `NODE_ENV` | Environment (development/production) | ❌ |

### Branch Alert Strategy

The `BRANCH_ALERT_STRATEGY` environment variable controls how the application handles code scanning alerts across different branches:

| Strategy | Value | Description |
|----------|-------|-------------|
| **Main Only** | `main_only` | Only create issues for alerts in the main branch (default) |
| **Main with Branch Updates** | `main_with_branch_updates` | Create issues for main branch alerts, update existing issues when alerts appear in other branches |
| **All Branches** | `all_branches` | Create separate issues for alerts in any branch |

**Examples:**
```env
# Only track main branch alerts (recommended for most teams)
BRANCH_ALERT_STRATEGY=main_only
MAIN_BRANCH=main

# Track main branch + update issues when alerts appear in feature branches
BRANCH_ALERT_STRATEGY=main_with_branch_updates
MAIN_BRANCH=main

# Create issues for alerts in any branch
BRANCH_ALERT_STRATEGY=all_branches
```

> **Note:** For backward compatibility, the deprecated environment variables `TRACK_BRANCH_ALERTS` and `CREATE_ISSUES_FOR_ALL_BRANCHES` are still supported but should be replaced with `BRANCH_ALERT_STRATEGY`.

### Reconciliation

The application includes an automatic reconciliation feature that runs on startup to ensure all existing code scanning alerts have corresponding issues. This is useful for:

- Initial setup: Creating issues for all existing alerts when first deploying the application
- Recovery: Ensuring no alerts are missed if the webhook handler was temporarily unavailable
- Consistency: Making sure the GitHub Issues stay in sync with code scanning alerts

**Configuration:**

```env
# Enable/disable reconciliation (default: true)
ENABLE_RECONCILIATION=true

# Delay in milliseconds before running reconciliation after server start
RECONCILIATION_DELAY_MS=1000
```

**How It Works:**

1. On application startup, after a configurable delay, the reconciliation process begins
2. All open code scanning alerts are fetched from GitHub's API
3. For each alert, the system checks if a corresponding issue already exists
4. Missing issues are created following the same branch strategy configuration
5. Summary statistics are logged when the process completes

## 🔌 API Endpoints

### Health Check
```
GET /health
```

Returns server status and basic information.

### Webhook Endpoint
```
POST /webhook
```

Receives GitHub `code_scanning_alert` webhooks. Requires valid `X-Hub-Signature-256` header.

## 🧪 Testing

The project includes comprehensive unit tests:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm test -- --coverage
```

### Test Structure

```
tests/
├── core/         # Use case tests
├── infra/        # Infrastructure tests
└── utils/        # Utility tests
```

## 🚀 Deployment

### Docker (Recommended)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist/ ./dist/
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

### Railway/Vercel/Heroku

The application is designed to be platform-agnostic and can be deployed on any Node.js hosting platform.

1. Set environment variables in your platform
2. Ensure webhook URL points to `/webhook` endpoint
3. Configure build command: `npm run build`
4. Configure start command: `npm start`

## 🔧 Development

### Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run type-check` - Type check without emitting

### Code Quality

The project enforces code quality with:
- **TypeScript** strict mode
- **ESLint** with TypeScript rules
- **Prettier** for consistent formatting
- **Jest** for testing
- **Exact optional property types** for better type safety

## 🔄 GitHub Issue Template

Issues created by this application follow this structure:

```markdown
## Security Alert Details

**Description:** [Alert description]

**File:** `path/to/file.js`
**Branch:** `main`
**Line:** 42
**Column:** 10
**Severity:** HIGH
**Rule:** rule-id

[View Alert](https://github.com/owner/repo/security/code-scanning/123)

---
<!-- METADATA -->
Alert ID: 123
Fingerprint: rule-id-path-hash
Rule ID: rule-id
<!-- /METADATA -->
```

## 🛡️ Security

- **Webhook Validation**: All webhooks are validated using HMAC SHA-256
- **No Sensitive Data Logging**: Tokens and secrets are never logged
- **Environment Variables**: All sensitive configuration via environment variables
- **Timing-Safe Comparison**: Protection against timing attacks in signature validation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and add tests
4. Ensure tests pass: `npm test`
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔮 Future Enhancements

- [ ] Support for GitLab webhooks
- [ ] Support for Bitbucket webhooks
- [ ] Database persistence layer
- [ ] Webhook retry mechanism
- [ ] Issue templating configuration
- [ ] Metrics and monitoring integration
- [ ] Multi-repository support
- [ ] Custom label management
- [ ] Slack/Teams notifications

## 📞 Support

For questions, issues, or contributions, please:

1. Check the [Issues](../../issues) page
2. Create a new issue with detailed information
3. Follow the issue template and provide reproduction steps

---

**Built with ❤️ using Clean Architecture principles**

- 🔐 **Secure webhook validation** using HMAC SHA-256
- 🏗️ **Clean Architecture** with clear separation of concerns
- 🔄 **Complete alert lifecycle management** (created, fixed, reopened, etc.)
- 🎯 **Idempotent operations** to prevent duplicate issues
- 🧪 **Comprehensive test coverage**
- 📊 **SCM-agnostic design** for future extensibility
- ⚡ **Modern tech stack** with Hono and TypeScript

## Architecture

```
┌─────────────────┐
│   API Layer     │  ← Hono HTTP handlers
├─────────────────┤
│ Use Case Layer  │  ← Business logic
├─────────────────┤
│ Domain Layer    │  ← Core entities & interfaces
├─────────────────┤
│Infrastructure   │  ← GitHub API integration
└─────────────────┘
```

### Core Components

- **CodeIssue**: Domain entity representing the lifecycle of a security alert
- **CodeIssueRepository**: Abstract interface for SCM operations
- **Use Cases**: Pure business logic for each webhook action
- **WebhookHandler**: HTTP request processing and validation
- **GitHubAdapter**: GitHub-specific implementation

## Supported Webhook Actions

| Action | Effect |
|--------|--------|
| `created` | Creates a new GitHub Issue with alert metadata |
| `appeared_in_branch` | Adds comment noting alert presence in another branch |
| `fixed` | Closes the issue with "fixed" label |
| `closed_by_user` | Closes the issue with "closed_by_user" label |
| `reopened` | Reopens the issue with "reopened" label |
| `reopened_by_user` | Reopens the issue with "reopened_by_user" label |

## Setup

### Prerequisites

- Node.js 18+
- GitHub repository with Advanced Security enabled
- GitHub Personal Access Token with `repo` scope

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd advanced-security-sync
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your configuration:
   ```env
   # GitHub Configuration
   GITHUB_TOKEN=your_personal_access_token
   GITHUB_WEBHOOK_SECRET=your_webhook_secret
   GITHUB_OWNER=your_username_or_org
   GITHUB_REPO=your_repository_name

   # Application Configuration
   PORT=3000
   NODE_ENV=development
   ```

4. **Build the application**
   ```bash
   npm run build
   ```

5. **Start the server**
   ```bash
   npm start
   # or for development
   npm run dev
   ```

### GitHub Webhook Configuration

1. Go to your repository's **Settings > Webhooks**
2. Click **Add webhook**
3. Configure:
   - **Payload URL**: `https://your-domain.com/webhook`
   - **Content type**: `application/json`
   - **Secret**: Same as `GITHUB_WEBHOOK_SECRET` in your `.env`
   - **Events**: Select "Code scanning alerts"

## Development

### Project Structure

```
src/
├── api/                    # HTTP handlers (Hono)
│   └── WebhookHandler.ts   # Main webhook processing
├── core/
│   ├── domain/             # Domain entities & interfaces
│   │   ├── CodeIssue.ts
│   │   └── CodeIssueRepository.ts
│   └── usecases/           # Business logic
│       ├── CreateCodeIssueUseCase.ts
│       ├── FixCodeIssueUseCase.ts
│       └── ...
├── infra/
│   └── github/             # GitHub API integration
│       └── GitHubCodeIssueRepository.ts
├── utils/                  # Utilities
│   ├── WebhookValidator.ts
│   ├── WebhookSchemas.ts
│   └── Logger.ts
└── index.ts                # Application entry point

tests/
├── core/                   # Unit tests for use cases
├── infra/                  # Integration tests
└── utils/                  # Utility tests
```

### Scripts

```bash
npm run dev          # Start development server with hot reload
npm run build        # Compile TypeScript
npm run start        # Start production server
npm run test         # Run test suite
npm run test:watch   # Run tests in watch mode
npm run lint         # Run ESLint
npm run format       # Format code with Prettier
npm run type-check   # Type checking without emission
```

### Testing

The application includes comprehensive tests:

- **Unit tests** for all use cases and domain logic
- **Integration tests** for GitHub API interactions (using nock)
- **Validation tests** for webhook security

```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run tests in watch mode
npm run test:watch
```

## API Endpoints

### Health Check
```
GET /health
```
Returns application health status.

### Webhook
```
POST /webhook
```
Receives GitHub code scanning alert webhooks.

**Headers:**
- `X-Hub-Signature-256`: GitHub webhook signature

## Security

- All webhooks are validated using HMAC SHA-256 signatures
- Environment variables store sensitive configuration
- No sensitive data is logged
- Timing-safe signature comparison prevents timing attacks

## Extending to Other SCMs

The architecture is designed to support other Source Control Management platforms:

1. Implement the `CodeIssueRepository` interface for your SCM
2. Create platform-specific adapters
3. Update the dependency injection in `index.ts`

Example:
```typescript
// For GitLab
class GitLabCodeIssueRepository implements CodeIssueRepository {
  // Implementation for GitLab Issues API
}

// For Bitbucket
class BitbucketCodeIssueRepository implements CodeIssueRepository {
  // Implementation for Bitbucket Issues API
}
```

## Monitoring & Observability

The application includes structured logging with different levels:

- `ERROR`: Critical errors requiring immediate attention
- `WARN`: Warning conditions that should be investigated
- `INFO`: General application flow (default in production)
- `DEBUG`: Detailed debugging information (default in development)

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make changes and add tests
4. Run the test suite: `npm test`
5. Commit changes: `git commit -m 'Add your feature'`
6. Push to the branch: `git push origin feature/your-feature`
7. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Troubleshooting

### Common Issues

**Webhook validation fails**
- Verify `GITHUB_WEBHOOK_SECRET` matches GitHub webhook configuration
- Ensure payload is being passed correctly to validation

**GitHub API errors**
- Check `GITHUB_TOKEN` has sufficient permissions (`repo` scope)
- Verify `GITHUB_OWNER` and `GITHUB_REPO` are correct

**Issues not created**
- Confirm webhook is configured for "Code scanning alerts" events
- Check application logs for error details
- Verify repository has Advanced Security enabled

### Debug Mode

Enable debug logging:
```bash
NODE_ENV=development npm start
```

This provides detailed logging of webhook processing and API interactions.
