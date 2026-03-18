import { createYiviConsole } from './yivi-console';
import prompt from 'prompt-sync';

const promptSync = prompt();

export const YiviConsole = createYiviConsole(
  (message: string): boolean => {
    const input = promptSync(`${message} Do you want to try again? [Yn]`);
    return ['y', 'Y', ''].indexOf(input) >= 0;
  },
  (): string => promptSync('Please enter the pairing code that your Yivi app currently shows: '),
);
