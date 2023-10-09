const yiviConsole = require('./yivi-console');
const prompt = require('prompt-sync')();

module.exports = yiviConsole(
  (message) => {
    const input = prompt(`⌨️ ${message} Do you want to try again? [Yn]`);
    return ['y', 'Y', ''].indexOf(input) >= 0;
  },
  () => prompt('Please enter the pairing code that your Yivi app currently shows: '),
);
