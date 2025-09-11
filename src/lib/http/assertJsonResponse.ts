export function assertJsonResponse(res: Response): Response {
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
    throw new Error(`[HTTP] Expected JSON, got "${ct}". Status=${res.status}`);
  }
  return res;
}

