const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface RetryOptions {
  retries?: number;
  baseDelayMs?: number;
  backoffFactor?: number;
  retryableStatusCodes?: number[];
}

/**
 * Generic exponential backoff helper so HTTP clients can transparently retry
 * rate-limited or transient failures without duplicating logic in each service.
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  {
    retries = 2,
    baseDelayMs = 500,
    backoffFactor = 2,
    retryableStatusCodes = [429, 500, 502, 503, 504],
  }: RetryOptions = {}
): Promise<T> {
  let attempt = 0;
  let delay = baseDelayMs;

  while (true) {
    try {
      return await operation();
    } catch (error: any) {
      const status = error?.response?.status ?? error?.status;
      const shouldRetry = attempt < retries && (!status || retryableStatusCodes.includes(status));

      if (!shouldRetry) {
        throw error;
      }

      attempt += 1;
      const retryAfterHeader = error?.response?.headers?.['retry-after'];
      const retryAfterMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 : delay;
      await sleep(retryAfterMs + Math.random() * 150);
      delay *= backoffFactor;
    }
  }
}

export { sleep };
