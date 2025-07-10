import { Buffer } from 'node:buffer'
import { createHmac, timingSafeEqual } from 'node:crypto'

export class WebhookValidator {
  constructor(private readonly secret: string) {}

  /**
   * Validates GitHub webhook signature using HMAC SHA-256
   */
  validateSignature(payload: string, signature: string): boolean {
    if (!signature) {
      return false
    }

    const expectedSignature = this.generateSignature(payload)

    // Use timing-safe comparison to prevent timing attacks
    try {
      const sigBuffer = Buffer.from(signature, 'utf8')
      const expectedBuffer = Buffer.from(expectedSignature, 'utf8')

      if (sigBuffer.length !== expectedBuffer.length) {
        return false
      }

      return timingSafeEqual(sigBuffer, expectedBuffer)
    }
    catch (error) {
      return false
    }
  }

  private generateSignature(payload: string): string {
    const hmac = createHmac('sha256', this.secret)
    hmac.update(payload, 'utf8')
    return `sha256=${hmac.digest('hex')}`
  }
}
