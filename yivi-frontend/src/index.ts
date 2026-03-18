import '@privacybydesign/yivi-css';

import { YiviCore } from '@privacybydesign/yivi-core';
import type { YiviOptions } from '@privacybydesign/yivi-core';
import { YiviWeb } from '@privacybydesign/yivi-web';
import { YiviPopup } from '@privacybydesign/yivi-popup';
import { YiviClient } from '@privacybydesign/yivi-client';

export interface YiviSession {
  start: (...input: unknown[]) => Promise<unknown>;
  abort: () => Promise<unknown>;
}

export function newWeb(options: YiviOptions): YiviSession {
  const core = new YiviCore(options);
  core.use(YiviWeb);
  core.use(YiviClient);
  return {
    start: core.start.bind(core),
    abort: core.abort.bind(core),
  };
}

export function newPopup(options: YiviOptions): YiviSession {
  const core = new YiviCore(options);
  core.use(YiviPopup);
  core.use(YiviClient);
  return {
    start: core.start.bind(core),
    abort: core.abort.bind(core),
  };
}

// Re-export types and classes for advanced usage
export { YiviCore, StateMachineImpl } from '@privacybydesign/yivi-core';
export type {
  YiviOptions,
  YiviPlugin,
  YiviPluginConstructor,
  YiviPluginArgs,
  StateChangeEvent,
  YiviState,
  IStateMachine,
  SessionPtr,
  FrontendRequest,
  SessionMappings,
} from '@privacybydesign/yivi-core';
export { YiviWeb } from '@privacybydesign/yivi-web';
export { YiviPopup } from '@privacybydesign/yivi-popup';
export { YiviClient } from '@privacybydesign/yivi-client';
