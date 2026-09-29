import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import type {
  DocumentFetcher,
  DocumentFetchLimits,
  FetchedDocument,
} from '@devdigest/shared/adapters';
import { AppError } from '../../platform/errors.js';

export class DocumentFetchRefused extends AppError {
  constructor(
    public readonly rule: string,
    message: string,
  ) {
    super('document_fetch_refused', message, 400, { rule });
  }
}

export class HttpDocumentFetcher implements DocumentFetcher {
  async fetch(url: string, limits: DocumentFetchLimits): Promise<FetchedDocument> {
    const deadline = AbortSignal.timeout(limits.timeoutMs);
    let target = url;

    for (let hop = 0; hop <= limits.maxRedirects; hop += 1) {
      await assertReachableTarget(target, limits);

      const response = await fetch(target, {
        redirect: 'manual',
        signal: deadline,
        headers: { accept: 'text/markdown, text/plain, text/*;q=0.8' },
      }).catch((cause) => {
        throw new DocumentFetchRefused('unreachable', refusalFor(cause));
      });

      if (isRedirect(response.status)) {
        const location = response.headers.get('location');
        if (!location) throw new DocumentFetchRefused('bad_redirect', 'The server redirected without saying where.');
        target = new URL(location, target).toString();
        continue;
      }

      if (!response.ok) {
        throw new DocumentFetchRefused('http_status', `The address answered ${response.status}.`);
      }

      return {
        finalUrl: target,
        contentType: response.headers.get('content-type'),
        text: await readCapped(response, limits.maxBytes),
      };
    }

    throw new DocumentFetchRefused(
      'too_many_redirects',
      `The address redirected more than ${limits.maxRedirects} times.`,
    );
  }
}

async function assertReachableTarget(url: string, limits: DocumentFetchLimits): Promise<void> {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:') {
    throw new DocumentFetchRefused('scheme_not_https', 'Only https:// addresses can be fetched.');
  }
  if (parsed.username || parsed.password) {
    throw new DocumentFetchRefused(
      'credentials_in_url',
      'An address carrying a username or password was refused.',
    );
  }
  if (!limits.allowHost(parsed.hostname)) {
    throw new DocumentFetchRefused('host_not_allowed', 'That host is not one this server may fetch from.');
  }
  for (const address of await resolveAll(parsed.hostname)) {
    if (isPrivateAddress(address)) {
      throw new DocumentFetchRefused('private_address', 'That address resolves inside a private network.');
    }
  }
}

async function resolveAll(hostname: string): Promise<string[]> {
  if (isIP(hostname)) return [hostname];
  const records = await lookup(hostname, { all: true }).catch(() => {
    throw new DocumentFetchRefused('unresolvable', 'That host could not be resolved.');
  });
  return records.map((r) => r.address);
}

export function isPrivateAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) return isPrivateIpv4(address);
  if (version === 6) return isPrivateIpv6(address);
  return true;
}

function isPrivateIpv4(address: string): boolean {
  const parts = address.split('.').map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const [a, b] = parts as [number, number, number, number];
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a >= 224) return true;
  return false;
}

function isPrivateIpv6(address: string): boolean {
  const lower = address.toLowerCase();
  if (lower === '::' || lower === '::1') return true;
  if (lower.startsWith('fe80') || lower.startsWith('fc') || lower.startsWith('fd')) return true;
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(lower);
  if (mapped?.[1]) return isPrivateIpv4(mapped[1]);
  return false;
}

function isRedirect(status: number): boolean {
  return status === 301 || status === 302 || status === 303 || status === 307 || status === 308;
}

async function readCapped(response: Response, maxBytes: number): Promise<string> {
  const declared = Number(response.headers.get('content-length') ?? NaN);
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw new DocumentFetchRefused('too_large', `The document is larger than ${maxBytes} bytes.`);
  }

  const reader = response.body?.getReader();
  if (!reader) return '';

  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new DocumentFetchRefused('too_large', `The document is larger than ${maxBytes} bytes.`);
    }
    chunks.push(value);
  }

  return new TextDecoder().decode(concat(chunks, total));
}

function concat(chunks: Uint8Array[], total: number): Uint8Array {
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

function refusalFor(cause: unknown): string {
  if (cause instanceof DocumentFetchRefused) return cause.message;
  const name = cause instanceof Error ? cause.name : '';
  if (name === 'TimeoutError' || name === 'AbortError') return 'The address did not answer in time.';
  return 'The address could not be reached.';
}
