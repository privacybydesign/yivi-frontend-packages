import { ProtocolVersion } from './protocol-version';
import type { SessionMappings, SessionPtr, FrontendRequest, YiviSessionOptions } from '@privacybydesign/yivi-core';

interface MappingFunctions {
  sessionPtr?: (response: unknown) => SessionPtr;
  sessionToken?: (response: unknown) => string;
  frontendRequest?: (response: unknown) => FrontendRequest;
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

  private _parseMappings(mappings: SessionMappings): SessionMappings {
    if (!mappings.sessionPtr) throw new Error('Missing sessionPtr in mappings');

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
