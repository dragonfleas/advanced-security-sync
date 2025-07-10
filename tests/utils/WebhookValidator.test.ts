import { createHmac } from 'node:crypto'
import { WebhookValidator } from '../../src/utils/WebhookValidator'

describe('webhookValidator', () => {
  const secret = 'test-secret'
  let validator: WebhookValidator

  beforeEach(() => {
    validator = new WebhookValidator(secret)
  })

  it('should validate correct webhook signature', () => {
    const payload = '{"test": "data"}'
    // Generate the correct signature for this payload and secret
    const expectedSignature = `sha256=${createHmac('sha256', secret).update(payload, 'utf8').digest('hex')}`

    const isValid = validator.validateSignature(payload, expectedSignature)

    expect(isValid).toBe(true)
  })

  it('should reject incorrect webhook signature', () => {
    const payload = '{"test": "data"}'
    const wrongSignature = 'sha256=wrongsignature'

    const isValid = validator.validateSignature(payload, wrongSignature)

    expect(isValid).toBe(false)
  })

  it('should reject empty signature', () => {
    const payload = '{"test": "data"}'

    const isValid = validator.validateSignature(payload, '')

    expect(isValid).toBe(false)
  })

  it('should handle malformed signatures gracefully', () => {
    const payload = '{"test": "data"}'
    const malformedSignature = 'not-a-signature'

    const isValid = validator.validateSignature(payload, malformedSignature)

    expect(isValid).toBe(false)
  })
})
