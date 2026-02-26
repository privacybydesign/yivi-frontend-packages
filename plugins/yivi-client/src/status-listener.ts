import ProtocolVersion from './protocol-version';
import EventSource from 'eventsource';
import type { SessionMappings, YiviStateOptions, SessionPtr } from '@privacybydesign/yivi-core';

export interface ServerState {
  status: string;
  nextSession?: SessionPtr;
}

type StateChangeCallback = (state: ServerState) => void;
type ErrorCallback = (error: Error) => void;

interface FetchParams {
  headers?: Record<string, string>;
  cache?: RequestCache;
}

export default class StatusListener {
  private _isRunning: boolean;
  private _isPolling: boolean;
  private _options: YiviStateOptions;
  private _mappings: SessionMappings;
  private _listeningMethod: 'sse' | 'polling';
  private _sseUrl: string;
  private _pollingUrl: string;
  private _fetchParams: FetchParams;
  private _source?: EventSource;
  private _stateChangeCallback?: StateChangeCallback;
  private _errorCallback?: ErrorCallback;
  private _currentStatus?: string;

  constructor(mappings: SessionMappings, options: YiviStateOptions) {
    this._isRunning = false;
    this._isPolling = false;
    this._options = options;
    this._mappings = mappings;
    this._listeningMethod = this._options.serverSentEvents ? 'sse' : 'polling';
    this._sseUrl = this._options.serverSentEvents
      ? this._getFetchUrl((this._options.serverSentEvents as { endpoint?: string }).endpoint || 'statusevents')
      : '';
    this._pollingUrl = this._options.polling
      ? this._getFetchUrl((this._options.polling as { endpoint?: string }).endpoint || 'status')
      : '';
    this._fetchParams = this._getFetchParams();
  }

  observe(stateChangeCallback: StateChangeCallback, errorCallback: ErrorCallback): void {
    this._stateChangeCallback = stateChangeCallback;
    this._errorCallback = errorCallback;
    this._isRunning = true;

    switch (this._listeningMethod) {
      case 'sse':
        this._startSSE();
        break;
      default:
        this._startPolling();
        break;
    }
  }

  close(): boolean {
    if (!this._isRunning) return false;

    if (this._source) {
      // If ready state is CLOSED (2), the close call will do nothing. Therefore we skip debug logging then.
      if (this._options.debugging && this._source.readyState < 2) console.log('Closed EventSource');
      this._source.close();
    }

    this._isRunning = false;
    return true;
  }

  private _getFetchUrl(endpoint: string): string {
    const maxProtocolVersion = this._mappings.frontendRequest?.maxProtocolVersion;
    if (maxProtocolVersion && ProtocolVersion.below(maxProtocolVersion, ProtocolVersion.get('chained-sessions'))) {
      return this._options.legacyUrl!(this._mappings, endpoint);
    }
    return this._options.url!(this._mappings, endpoint);
  }

  private _getFetchParams(): FetchParams {
    const maxProtocolVersion = this._mappings.frontendRequest?.maxProtocolVersion;
    if (maxProtocolVersion && ProtocolVersion.below(maxProtocolVersion, ProtocolVersion.get('chained-sessions'))) {
      return {};
    }

    const authorization = this._mappings.frontendRequest?.authorization;
    if (authorization) {
      return { headers: { Authorization: authorization } };
    }
    return {};
  }

  private _startSSE(): void {
    if (this._options.debugging) console.log(`Using EventSource for server events on ${this._sseUrl}`);

    this._source = new EventSource(this._sseUrl, this._fetchParams);

    const sseOptions = this._options.serverSentEvents as { timeout?: number };
    const timeout = sseOptions?.timeout || 2000;
    const canceller = setTimeout(() => {
      if (this._options.debugging)
        console.error(`EventSource could not connect to ${this._sseUrl} within ${timeout}ms`);

      // Fall back to polling instead
      setTimeout(() => this._source?.close(), 0); // Never block on this
      this._startPolling();
    }, timeout);

    this._source.addEventListener('open', () => clearTimeout(canceller));

    this._source.addEventListener('message', (evnt: MessageEvent) => {
      clearTimeout(canceller);
      let state: ServerState = JSON.parse(evnt.data as string);
      // Do additional parsing in case we received the legacy status response.
      if (typeof state === 'string') {
        state = { status: state };
      }

      if (this._options.debugging) console.log(`Server event: Remote state changed to '${state.status}'`);

      this._stateChangeCallback!(state);
    });

    this._source.addEventListener('error', (error: Event) => {
      clearTimeout(canceller);
      this._source?.close();

      if (this._options.debugging) console.error('EventSource threw an error: ', error);

      // Fall back to polling instead
      setTimeout(() => this._source?.close(), 0); // Never block on this
      this._startPolling();
    });
  }

  private _startPolling(): void {
    this._listeningMethod = 'polling'; // In case polling is activated as fallback
    if (!this._options.polling || this._isPolling) return;

    if (this._options.debugging) console.log(`Using polling for server events on ${this._pollingUrl}`);

    const pollingOptions = this._options.polling as { startState?: string };
    this._currentStatus = pollingOptions?.startState || 'INITIALIZED';
    this._isPolling = true;

    this._polling()
      .then(() => {
        if (this._options.debugging) console.log(`Stopped polling on ${this._pollingUrl}`);
      })
      .catch((error) => {
        if (this._options.debugging) console.error(`Error thrown while polling of ${this._pollingUrl}: `, error);
        this._errorCallback!(error);
      });
  }

  private _pollOnce(): Promise<ServerState> {
    return fetch(this._pollingUrl, { ...this._fetchParams, cache: 'no-store' })
      .then((r) => {
        if (r.status !== 200)
          throw new Error(
            `Error in fetch: endpoint returned status other than 200 OK. Status: ${r.status} ${r.statusText}`,
          );
        return r;
      })
      .then((r) => r.json() as Promise<ServerState | string>)
      // Do additional parsing in case we received the legacy status response.
      .then((state): ServerState => (typeof state === 'string' ? { status: state } : state));
  }

  private _polling(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this._isRunning) {
        this._isPolling = false;
        resolve();
        return;
      }

      const pollingOptions = this._options.polling as { interval?: number };
      const interval = pollingOptions?.interval || 500;

      // On Firefox for Android pending fetch request are actively aborted when navigating.
      // So in case of an error, we do a second attempt to assure the error is permanent.
      this._pollOnce()
        .catch(() => {
          if (this._options.debugging) console.log('Polling attempt failed; doing a second attempt to confirm error');
          return this._pollOnce();
        })
        .then((state) => {
          // Re-check running because variable might have been changed during fetch.
          if (!this._isRunning) {
            this._isPolling = false;
            resolve();
            return;
          }

          if (state.status !== this._currentStatus) {
            if (this._options.debugging) console.log(`Server event: Remote state changed to '${state.status}'`);

            this._currentStatus = state.status;
            this._stateChangeCallback!(state);
          }

          setTimeout(() => {
            this._polling().then(resolve).catch(reject);
          }, interval);
        })
        .catch(reject);
    });
  }
}
