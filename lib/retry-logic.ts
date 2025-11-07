// ============================================================================
// RETRY LOGIC UTILITY
// ============================================================================
// Provides exponential backoff retry mechanism for database operations
// Handles transient failures like locks, network issues, and timeouts
// ============================================================================

export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  retryableErrors?: string[];
  onRetry?: (error: Error, attempt: number, nextDelayMs: number) => void;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
  totalTimeMs: number;
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelayMs: 100,
  maxDelayMs: 5000,
  backoffMultiplier: 2,
  retryableErrors: [
    'lock_not_available',
    'Stock is currently locked',
    'PGRST301', // Supabase connection error
    'connection',
    'timeout',
    'ECONNREFUSED',
    'ETIMEDOUT',
  ],
  onRetry: () => {},
};

/**
 * Delays execution for a specified number of milliseconds
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Checks if an error is retryable based on error message patterns
 */
function isRetryableError(error: Error, retryableErrors: string[]): boolean {
  const errorMessage = error.message.toLowerCase();
  return retryableErrors.some((pattern) =>
    errorMessage.includes(pattern.toLowerCase())
  );
}

/**
 * Calculates the next delay using exponential backoff with jitter
 * Jitter prevents thundering herd problem when multiple clients retry simultaneously
 */
function calculateNextDelay(
  attempt: number,
  initialDelay: number,
  maxDelay: number,
  multiplier: number
): number {
  // Exponential backoff: initialDelay * (multiplier ^ attempt)
  const exponentialDelay = initialDelay * Math.pow(multiplier, attempt);

  // Cap at maxDelay
  const cappedDelay = Math.min(exponentialDelay, maxDelay);

  // Add jitter: random value between 0.5x and 1.5x of calculated delay
  // This prevents all clients from retrying at exactly the same time
  const jitter = 0.5 + Math.random();
  const delayWithJitter = Math.floor(cappedDelay * jitter);

  return delayWithJitter;
}

/**
 * Executes an async operation with automatic retry on failure
 * Uses exponential backoff with jitter to prevent cascading failures
 *
 * @param operation - Async function to execute
 * @param options - Retry configuration options
 * @returns Result object with success status, data/error, and metadata
 *
 * @example
 * ```typescript
 * const result = await withRetry(
 *   async () => {
 *     return await supabase.rpc('adjust_stock_with_lock', params);
 *   },
 *   {
 *     maxAttempts: 5,
 *     onRetry: (error, attempt, delay) => {
 *       console.log(`Retry ${attempt} after ${delay}ms: ${error.message}`);
 *     }
 *   }
 * );
 *
 * if (result.success) {
 *   console.log('Operation succeeded:', result.data);
 * } else {
 *   console.error('Operation failed after retries:', result.error);
 * }
 * ```
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  const startTime = Date.now();

  let lastError: Error | undefined;
  let attempt = 0;

  while (attempt < opts.maxAttempts) {
    try {
      // Execute the operation
      const data = await operation();

      // Success!
      return {
        success: true,
        data,
        attempts: attempt + 1,
        totalTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      attempt++;
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if we should retry
      const shouldRetry =
        attempt < opts.maxAttempts &&
        isRetryableError(lastError, opts.retryableErrors);

      if (!shouldRetry) {
        // Non-retryable error or max attempts reached
        if (process.env.NODE_ENV === 'development') {
          console.error(
            `❌ Operation failed after ${attempt} attempt(s): ${lastError.message}`
          );
        }

        return {
          success: false,
          error: lastError,
          attempts: attempt,
          totalTimeMs: Date.now() - startTime,
        };
      }

      // Calculate delay for next retry
      const nextDelay = calculateNextDelay(
        attempt - 1,
        opts.initialDelayMs,
        opts.maxDelayMs,
        opts.backoffMultiplier
      );

      // Call retry callback
      opts.onRetry(lastError, attempt, nextDelay);

      // Log in development
      if (process.env.NODE_ENV === 'development') {
        console.warn(
          `⚠️ Attempt ${attempt}/${opts.maxAttempts} failed: ${lastError.message}. Retrying in ${nextDelay}ms...`
        );
      }

      // Wait before retrying
      await delay(nextDelay);
    }
  }

  // Should never reach here, but TypeScript needs this
  return {
    success: false,
    error: lastError || new Error('Unknown error'),
    attempts: attempt,
    totalTimeMs: Date.now() - startTime,
  };
}

/**
 * Wraps a function to automatically retry on failure
 * Useful for creating retryable versions of existing functions
 *
 * @example
 * ```typescript
 * const retryableStockAdjust = createRetryableFunction(
 *   adjustProductStock,
 *   { maxAttempts: 5 }
 * );
 *
 * const result = await retryableStockAdjust(productId, stockId, quantity);
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createRetryableFunction<TArgs extends any[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  options: RetryOptions = {}
): (...args: TArgs) => Promise<RetryResult<TReturn>> {
  return async (...args: TArgs) => {
    return withRetry(() => fn(...args), options);
  };
}

/**
 * Specialized retry for database lock conflicts
 * Uses more aggressive retry settings suitable for lock contention
 */
export async function withLockRetry<T>(
  operation: () => Promise<T>
): Promise<RetryResult<T>> {
  return withRetry(operation, {
    maxAttempts: 5,
    initialDelayMs: 50,
    maxDelayMs: 2000,
    backoffMultiplier: 2,
    retryableErrors: [
      'lock_not_available',
      'locked',
      'Stock is currently locked',
      'could not obtain lock',
    ],
    onRetry: (error, attempt, delay) => {
      if (process.env.NODE_ENV === 'development') {
        console.log(
          `🔒 Lock conflict detected (attempt ${attempt}). Retrying in ${delay}ms...`
        );
      }
    },
  });
}

/**
 * Specialized retry for network/connection issues
 * Uses longer delays suitable for network recovery
 */
export async function withNetworkRetry<T>(
  operation: () => Promise<T>
): Promise<RetryResult<T>> {
  return withRetry(operation, {
    maxAttempts: 4,
    initialDelayMs: 500,
    maxDelayMs: 10000,
    backoffMultiplier: 3,
    retryableErrors: [
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
      'network',
      'connection',
      'timeout',
      'PGRST301',
    ],
    onRetry: (error, attempt, delay) => {
      if (process.env.NODE_ENV === 'development') {
        console.log(
          `🌐 Network error detected (attempt ${attempt}). Retrying in ${delay}ms...`
        );
      }
    },
  });
}

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/*
// Example 1: Basic retry
const result = await withRetry(async () => {
  const { data, error } = await supabase.rpc('adjust_stock_with_lock', {
    p_produto_id: 123,
    p_estoque_id: 1,
    p_quantidade_mudanca: -5,
    p_tipo_operacao: 'VENDA'
  });
  if (error) throw error;
  return data;
});

if (!result.success) {
  console.error('Failed after retries:', result.error);
  return;
}

// Example 2: Lock-specific retry
const lockResult = await withLockRetry(async () => {
  return await someLockedOperation();
});

// Example 3: Custom retry options with callback
const customResult = await withRetry(
  async () => await riskyOperation(),
  {
    maxAttempts: 10,
    initialDelayMs: 200,
    onRetry: (error, attempt, delay) => {
      // Send to monitoring service
      logToMonitoring({
        type: 'retry',
        error: error.message,
        attempt,
        delay
      });
    }
  }
);

// Example 4: Create reusable retryable function
const retryableAdjustStock = createRetryableFunction(
  adjustStock,
  { maxAttempts: 5 }
);

const result = await retryableAdjustStock(productId, quantity);
*/
