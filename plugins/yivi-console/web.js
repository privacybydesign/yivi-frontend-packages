const yiviConsole = require('./yivi-console');

module.exports = yiviConsole(
  (message) => window.confirm(`${message} Do you want to try again?`),
  () => window.prompt('Please enter the pairing code that your Yivi app currently shows:'),
);
