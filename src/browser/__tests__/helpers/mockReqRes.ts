/**
 * Mock request/response helpers for testing SSE endpoints
 */

interface MockRequest<T = unknown> {
  method: string;
  url: string;
  body: T;
  headers: Record<string, string>;
}

interface MockResponse {
  status: number;
  body: unknown;
  headers: Record<string, string>;
  statusText: string;
}

interface MockReqRes<T = unknown> {
  req: MockRequest<T>;
  res: MockResponse;
}

export function makeMockRequest<T = unknown>(
  method: string,
  url: string,
  body?: T,
  headers: Record<string, string> = {}
): MockReqRes<T> {
  const req: MockRequest<T> = {
    method,
    url,
    body: body as T,
    headers: {
      'content-type': 'application/json',
      ...headers
    }
  };

  const res: MockResponse = {
    status: 200,
    statusText: 'OK',
    body: undefined,
    headers: {}
  };

  return { req, res };
}