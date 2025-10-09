const OWNER_REPO = process.env.GITHUB_REPO; // e.g., "yourname/MAI_DS_2"
const BRANCH = process.env.GITHUB_BRANCH || 'main';
const TOKEN = process.env.GITHUB_TOKEN;

if (!OWNER_REPO) {
  console.warn('GITHUB_REPO is not set; API routes will fail');
}

// Configuration
const MAX_RETRIES = 5;
const INITIAL_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 32000;
const REQUEST_TIMEOUT_MS = 30000;
const MUTATIVE_THROTTLE_MS = 1000; // Min 1s between mutative requests

// State tracking
let lastMutativeRequestTime = 0;
const etagCache = new Map(); // Map<url, { etag: string, data: any }>

function ghUrl(apiPath) {
  return `https://api.github.com/repos/${OWNER_REPO}${apiPath}`;
}

// Calculate exponential backoff with jitter
function calculateBackoff(attempt) {
  const exponential = Math.min(INITIAL_BACKOFF_MS * Math.pow(2, attempt), MAX_BACKOFF_MS);
  const jitter = Math.random() * 0.3 * exponential; // ±30% jitter
  return Math.floor(exponential + jitter);
}

// Sleep helper
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Log rate limit info for monitoring
function logRateLimitHeaders(res, method, apiPath) {
  const remaining = res.headers.get('x-ratelimit-remaining');
  const limit = res.headers.get('x-ratelimit-limit');
  const reset = res.headers.get('x-ratelimit-reset');
  const retryAfter = res.headers.get('retry-after');
  
  if (remaining !== null || limit !== null || reset !== null || retryAfter !== null) {
    const resetDate = reset ? new Date(parseInt(reset) * 1000).toISOString() : 'N/A';
    console.log(`[GitHub Rate Limit] ${method} ${apiPath} | Remaining: ${remaining}/${limit} | Reset: ${resetDate} | Retry-After: ${retryAfter || 'N/A'}`);
  }
}

// Check if error is retryable
function isRetryableError(status, error) {
  // Network errors (fetch failures, timeouts)
  if (error && (error.name === 'AbortError' || error.name === 'TypeError')) {
    return true;
  }
  // 5xx server errors, 408 timeout, 429 rate limit, 403 (might be rate limit)
  return status >= 500 || status === 408 || status === 429 || status === 403;
}

// Calculate delay for rate limit
async function handleRateLimit(res) {
  const retryAfter = res.headers.get('retry-after');
  const remaining = res.headers.get('x-ratelimit-remaining');
  const reset = res.headers.get('x-ratelimit-reset');
  
  // If Retry-After header present, use it
  if (retryAfter) {
    const delaySeconds = parseInt(retryAfter);
    const delayMs = delaySeconds * 1000;
    console.log(`[GitHub] Rate limited, waiting ${delaySeconds}s as per Retry-After header`);
    await sleep(delayMs);
    return true;
  }
  
  // If remaining === 0, wait until reset
  if (remaining === '0' && reset) {
    const resetTime = parseInt(reset) * 1000;
    const now = Date.now();
    const delayMs = Math.max(0, resetTime - now + 1000); // Add 1s buffer
    console.log(`[GitHub] Rate limit exhausted, waiting ${Math.ceil(delayMs / 1000)}s until reset`);
    await sleep(delayMs);
    return true;
  }
  
  return false;
}

// Throttle mutative requests
async function throttleMutativeRequest(method) {
  if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(method.toUpperCase())) {
    const now = Date.now();
    const timeSinceLastMutative = now - lastMutativeRequestTime;
    if (timeSinceLastMutative < MUTATIVE_THROTTLE_MS) {
      const waitTime = MUTATIVE_THROTTLE_MS - timeSinceLastMutative;
      console.log(`[GitHub] Throttling ${method} request, waiting ${waitTime}ms`);
      await sleep(waitTime);
    }
    lastMutativeRequestTime = Date.now();
  }
}

async function ghRequest(method, apiPath, body, options = {}) {
  const url = ghUrl(apiPath);
  let lastError = null;
  let lastStatus = null;
  
  // Throttle mutative requests
  await throttleMutativeRequest(method);
  
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    
    try {
      const headers = { 'Accept': 'application/vnd.github+json' };
      if (TOKEN) headers['Authorization'] = `Bearer ${TOKEN}`;
      if (body) headers['Content-Type'] = 'application/json';
      
      // ETag support for GET requests
      if (method.toUpperCase() === 'GET' && etagCache.has(url)) {
        const cached = etagCache.get(url);
        headers['If-None-Match'] = cached.etag;
      }
      
      const res = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      // Log rate limit headers
      logRateLimitHeaders(res, method, apiPath);
      
      // Handle 304 Not Modified for conditional requests
      if (res.status === 304) {
        console.log(`[GitHub] 304 Not Modified for ${method} ${apiPath}, using cached data`);
        return etagCache.get(url).data;
      }
      
      // Handle rate limiting (429, 403)
      if (res.status === 429 || (res.status === 403 && res.headers.get('x-ratelimit-remaining') === '0')) {
        lastStatus = res.status;
        const rateLimitHandled = await handleRateLimit(res);
        if (rateLimitHandled && attempt < MAX_RETRIES) {
          console.log(`[GitHub] Retrying after rate limit (attempt ${attempt + 1}/${MAX_RETRIES})`);
          continue; // Retry immediately after rate limit delay
        }
      }
      
      // Handle successful responses
      if (res.ok) {
        const ct = res.headers.get('content-type') || '';
        const data = ct.includes('application/json') ? await res.json() : await res.text();
        
        // Cache ETag for GET requests
        if (method.toUpperCase() === 'GET') {
          const etag = res.headers.get('etag');
          if (etag) {
            etagCache.set(url, { etag, data });
          }
        }
        
        return data;
      }
      
      // Handle retryable errors
      lastStatus = res.status;
      const txt = await res.text().catch(() => '');
      lastError = new Error(`GitHub ${method} ${apiPath} failed: ${res.status} ${txt}`);
      
      if (isRetryableError(res.status, null)) {
        if (attempt < MAX_RETRIES) {
          const backoffMs = calculateBackoff(attempt);
          console.log(`[GitHub] Retryable error ${res.status}, backing off ${backoffMs}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
          await sleep(backoffMs);
          continue;
        }
      } else {
        // Non-retryable error, throw immediately
        throw lastError;
      }
      
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error;
      
      // Handle network errors and timeouts
      if (isRetryableError(null, error)) {
        if (attempt < MAX_RETRIES) {
          const backoffMs = calculateBackoff(attempt);
          console.log(`[GitHub] Network/timeout error (${error.name}), backing off ${backoffMs}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
          await sleep(backoffMs);
          continue;
        }
      }
      
      // Non-retryable error or exhausted retries
      if (attempt >= MAX_RETRIES) {
        break;
      }
      throw error;
    }
  }
  
  // All retries exhausted
  const finalError = new Error(
    `GitHub ${method} ${apiPath} failed after ${MAX_RETRIES + 1} attempts` +
    (lastStatus ? ` (last status: ${lastStatus})` : '') +
    (lastError ? `: ${lastError.message}` : '')
  );
  throw finalError;
}

function contentsPath(p) {
  // Preserve path separators using encodeURI
  return `/contents/${encodeURI(p)}`;
}

async function listDir(path) {
  const out = await ghRequest('GET', `${contentsPath(path)}?ref=${encodeURIComponent(BRANCH)}`);
  if (!Array.isArray(out)) return [];
  return out;
}

async function getFile(path) {
  const out = await ghRequest('GET', `${contentsPath(path)}?ref=${encodeURIComponent(BRANCH)}`);
  const sha = out.sha;
  const content = Buffer.from(out.content || '', 'base64').toString('utf8');
  return { sha, content };
}

async function putFile(path, content, message) {
  let sha;
  try { const cur = await getFile(path); sha = cur.sha; } catch {}
  const body = {
    message: message || `Update ${path}`,
    content: Buffer.from(content, 'utf8').toString('base64'),
    branch: BRANCH,
    sha
  };
  return ghRequest('PUT', contentsPath(path), body);
}

async function putBinary(path, buffer, message) {
  let sha;
  try { const cur = await getFile(path); sha = cur.sha; } catch {}
  const body = {
    message: message || `Upload ${path}`,
    content: Buffer.from(buffer).toString('base64'),
    branch: BRANCH,
    sha
  };
  return ghRequest('PUT', contentsPath(path), body);
}

async function deleteFile(path, message) {
  const cur = await getFile(path);
  const body = {
    message: message || `Delete ${path}`,
    branch: BRANCH,
    sha: cur.sha
  };
  return ghRequest('DELETE', contentsPath(path), body);
}

module.exports = { listDir, getFile, putFile, putBinary, deleteFile };
