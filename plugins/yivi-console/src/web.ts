import { createYiviConsole } from './yivi-console';

export const YiviConsole = createYiviConsole(
  (message: string): boolean => window.confirm(`${message} Do you want to try again?`),
  (): string => window.prompt('Please enter the pairing code that your Yivi app currently shows:') || '',
);
