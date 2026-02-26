/**
 * All possible states in the Yivi state machine.
 */
export type YiviState =
  | 'Uninitialized'
  | 'Loading'
  | 'CheckingUserAgent'
  | 'PreparingQRCode'
  | 'ShowingQRCode'
  | 'EnterPairingCode'
  | 'Pairing'
  | 'ContinueOn2ndDevice'
  | 'PreparingYiviButton'
  | 'ShowingYiviButton'
  | 'ContinueInYiviApp'
  | 'PreparingResult'
  | 'Cancelled'
  | 'TimedOut'
  | 'Error'
  | 'BrowserNotSupported'
  | 'Success'
  | 'Aborted';

/**
 * State change event passed to plugins and listeners.
 */
export interface StateChangeEvent {
  newState: YiviState;
  oldState: YiviState;
  transition: string;
  isFinal: boolean;
  payload?: unknown;
}

/**
 * Interface for Yivi plugins.
 */
export interface YiviPlugin {
  stateChange?(state: StateChangeEvent): void;
  start?(...args: unknown[]): void | Promise<unknown>;
  close?(): void | Promise<unknown>;
}

/**
 * Constructor type for Yivi plugins.
 */
export interface YiviPluginConstructor {
  new (args: YiviPluginArgs): YiviPlugin;
}

/**
 * Arguments passed to plugin constructors.
 */
export interface YiviPluginArgs {
  stateMachine: IStateMachine;
  options: YiviOptions;
}

/**
 * Session pointer returned by IRMA/Yivi server.
 */
export interface SessionPtr {
  u: string;
  irmaqr?: string;
}

/**
 * Frontend request options from IRMA/Yivi server.
 */
export interface FrontendRequest {
  authorization?: string;
  minProtocolVersion?: string;
  maxProtocolVersion?: string;
  pairingHint?: boolean;
}

/**
 * Session mappings containing session pointer and tokens.
 */
export interface SessionMappings {
  sessionPtr: SessionPtr;
  sessionToken?: string;
  frontendRequest?: FrontendRequest;
}

/**
 * Callback for selecting a transition.
 */
export interface SelectTransitionCallback {
  (params: SelectTransitionParams): SelectTransitionResult | false;
}

/**
 * Parameters passed to the select transition callback.
 */
export interface SelectTransitionParams {
  state: YiviState;
  validTransitions: string[];
  inEndState: boolean;
}

/**
 * Result of selecting a transition.
 */
export interface SelectTransitionResult {
  transition: string;
  isFinal?: boolean;
  payload?: unknown;
}

/**
 * State change listener function type.
 */
export type StateChangeListener = (event: StateChangeEvent) => void;

/**
 * Interface for the state machine.
 */
export interface IStateMachine {
  selectTransition(callback: SelectTransitionCallback): Promise<SelectTransitionResult | false>;
  addStateChangeListener(listener: StateChangeListener): void;
  /** @deprecated Use selectTransition instead */
  transition(transition: string, payload?: unknown): Promise<SelectTransitionResult | false>;
  /** @deprecated Use selectTransition instead */
  finalTransition(transition: string, payload?: unknown): Promise<SelectTransitionResult | false>;
}

/**
 * Options for Yivi sessions.
 */
export interface YiviSessionOptions {
  url?: string;
  start?: {
    url?: string | ((options: YiviSessionOptions) => string);
    parseResponse?: (response: Response) => unknown | Promise<unknown>;
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  } | false;
  mapping?: {
    sessionPtr?: (response: unknown) => SessionPtr;
    sessionToken?: (response: unknown) => string;
    frontendRequest?: (response: unknown) => FrontendRequest;
  };
  result?: {
    url?: string | ((options: YiviSessionOptions, mappings: SessionMappings) => string);
    parseResponse?: (response: Response) => unknown | Promise<unknown>;
    method?: string;
    headers?: Record<string, string>;
  } | false;
}

/**
 * Options for Yivi state handling.
 */
export interface YiviStateOptions {
  debugging?: boolean;
  cancel?: {
    url?: (mappings: SessionMappings) => string;
  };
  url?: (mappings: SessionMappings, endpoint: string) => string;
  legacyUrl?: (mappings: SessionMappings, endpoint: string) => string;
  serverSentEvents?: {
    endpoint?: string;
    timeout?: number;
  } | false;
  polling?: {
    endpoint?: string;
    interval?: number;
    startState?: string;
  } | false;
  frontendOptions?: {
    endpoint?: string;
    requestContext?: string;
  };
  pairing?: {
    onlyEnableIf?: (mappings: SessionMappings) => boolean;
    completedEndpoint?: string;
    minCheckingDelay?: number;
    pairingMethod?: string;
  } | false;
}

/**
 * Main options object for YiviCore.
 */
export interface YiviOptions {
  debugging?: boolean;
  element?: string;
  language?: 'en' | 'nl';
  session?: YiviSessionOptions;
  state?: YiviStateOptions;
  [key: string]: unknown;
}
