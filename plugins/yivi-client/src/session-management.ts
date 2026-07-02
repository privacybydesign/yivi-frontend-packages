import { ProtocolVersion } from './protocol-version';
import type { SessionMappings, SessionPtr, FrontendRequest, YiviSessionOptions } from '@privacybydesign/yivi-core';

interface MappingFunctions {
  sessionPtr?: (response: unknown) => SessionPtr | undefined;
  sessionToken?: (response: unknown) => string | undefined;
  frontendRequest?: (response: unknown) => FrontendRequest | undefined;
}

interface StartOptions {
  url?: string | ((options: YiviSessionOptions) => string);
  parseResponse?: (response: Response) => unknown | Promise<unknown>;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

interface ResultOptions {
  url?: string | ((options: YiviSessionOptions, mappings: SessionMappings) => string);
  parseResponse?: (response: Response) => unknown | Promise<unknown>;
  method?: string;
  headers?: Record<string, string>;
}

export class SessionManagement {
  private _options: YiviSessionOptions;
  private _mappings: Partial<SessionMappings>;

  constructor(options: YiviSessionOptions) {
    this._options = options;
    this._mappings = {};
  }

  start(): Promise<SessionMappings> {
    const startOptions = this._options.start as StartOptions | false | undefined;
    const mapping = this._options.mapping as MappingFunctions | undefined;

    // Handle case where start is disabled and qr and token are supplied directly
    if (!startOptions) {
      if (mapping) {
        (Object.keys(mapping) as Array<keyof MappingFunctions>).forEach((val) => {
          const mappingFn = mapping[val];
          if (mappingFn) {
            (this._mappings as Record<string, unknown>)[val] = mappingFn({});
          }
        });
      }

      return Promise.resolve(this._parseMappings(this._mappings as SessionMappings));
    }

    // Start options are specified, so start a new session
    const url = typeof startOptions.url === 'function' ? startOptions.url(this._options) : startOptions.url || '';

    return fetch(url, startOptions as RequestInit)
      .then((r) => {
        if (r.status !== 200)
          throw new Error(
            `Error in fetch: endpoint returned status other than 200 OK. Status: ${r.status} ${r.statusText}`,
          );
        return r;
      })
      .then((r) => (startOptions.parseResponse ? startOptions.parseResponse(r) : r.json()))
      .then((r) => {
        // Execute all mapping functions using the received start response.
        if (mapping) {
          (Object.keys(mapping) as Array<keyof MappingFunctions>).forEach((val) => {
            const mappingFn = mapping[val];
            if (mappingFn) {
              (this._mappings as Record<string, unknown>)[val] = mappingFn(r);
            }
          });
        }

        return this._parseMappings(this._mappings as SessionMappings);
      });
  }

  /**
   * The session pointer URL (`sessionPtr.u`) is returned by the requestor's
   * server and used as the base for every subsequent frontend request,
   * including ones that carry the frontend authorization header. A tampered
   * value pointing at an attacker-controlled host would leak that token, so we
   * validate the scheme here — immediately after parsing the start response —
   * before it is ever used as a fetch base.
   *
   * Allowed: relative URLs (resolve same-origin as the hosting page), absolute
   * https URLs, and http/https to localhost for local development. Rejected:
   * http to a remote host, protocol-relative `//host`, and any other scheme
   * (javascript:, data:, ...).
   */
  private _assertSafeSessionUrl(url: string): void {
    if (typeof url !== 'string' || url.length === 0) {
      throw new Error('Missing or invalid sessionPtr URL in mappings');
    }

    // Reject protocol-relative URLs (`//host/...`) up front: they inherit the
    // page scheme (so a scheme check alone would pass them) but resolve to an
    // arbitrary cross-origin host once concatenated into a fetch URL, leaking
    // the frontend authorization header.
    if (url.startsWith('//')) {
      throw new Error(`Refusing to use protocol-relative sessionPtr URL: ${url}`);
    }

    // Resolve against the hosting page's origin when available so that
    // relative session URLs (which stay same-origin) are accepted.
    const base = typeof window !== 'undefined' && window.location ? window.location.href : 'https://localhost/';

    let parsed: URL;
    try {
      parsed = new URL(url, base);
    } catch {
      throw new Error(`Invalid sessionPtr URL received from server: ${url}`);
    }

    const isLocalhost =
      parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1' || parsed.hostname === '[::1]';
    const isSafe = parsed.protocol === 'https:' || (parsed.protocol === 'http:' && isLocalhost);
    if (!isSafe) {
      throw new Error(`Refusing to use insecure sessionPtr URL (scheme "${parsed.protocol}"): ${url}`);
    }
  }

  private _parseMappings(mappings: SessionMappings): SessionMappings {
    if (!mappings.sessionPtr) throw new Error('Missing sessionPtr in mappings');
    this._assertSafeSessionUrl(mappings.sessionPtr.u);

    let frontendRequest = mappings.frontendRequest;
    if (!frontendRequest) {
      frontendRequest = {
        minProtocolVersion: ProtocolVersion.minSupported(),
        maxProtocolVersion: ProtocolVersion.minSupported(),
      };
    }
    // Check whether the IRMA server at least has minimum support for this yivi-client version.
    if (
      ProtocolVersion.above(ProtocolVersion.minSupported(), frontendRequest.maxProtocolVersion || '') ||
      ProtocolVersion.below(ProtocolVersion.maxSupported(), frontendRequest.minProtocolVersion || '')
    ) {
      throw new Error('Frontend protocol version is not supported');
    }
    return { ...mappings, frontendRequest };
  }

  result(): Promise<unknown> {
    const resultOptions = this._options.result as ResultOptions | false | undefined;

    if (!resultOptions) return Promise.resolve(this._mappings);

    const url =
      typeof resultOptions.url === 'function'
        ? resultOptions.url(this._options, this._mappings as SessionMappings)
        : resultOptions.url || '';

    return fetch(url, resultOptions as RequestInit)
      .then((r) => {
        if (r.status !== 200)
          throw new Error(
            `Error in fetch: endpoint returned status other than 200 OK. Status: ${r.status} ${r.statusText}`,
          );
        return r;
      })
      .then((r) => (resultOptions.parseResponse ? resultOptions.parseResponse(r) : r.json()));
  }
}
