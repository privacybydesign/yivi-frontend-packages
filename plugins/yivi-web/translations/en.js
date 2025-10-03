// prettier-ignore
module.exports = {
  header: 'Continue with <i class="yivi-web-logo">Yivi</i>',
  helper: 'Can\'t figure it out?<br>Take a look at the <a href="https://yivi.app/">Yivi website</a>.',
  loading: 'Just a second please!',
  button: 'Open Yivi app',
  qrCode: 'Show QR code',
  app: 'Follow the steps in the Yivi app',
  retry: 'Try again',
  back: 'Go back',
  cancelled: 'The session is cancelled',
  timeout: 'Sorry! We haven\'t heard<br/>from you for too long',
  error: 'Sorry! Something went wrong',
  browser: 'We\'re sorry, but your browser does not meet the minimum requirements',
  success: 'Success!',
  cancel: 'Cancel',
  pairing: 'Enter the pairing code that your Yivi app currently shows.',
  pairingFailed: (code) => `The pairing code ${code} does not match the code in your Yivi app. Please try again.`,
  explanation: function (applicationName, type) {
    const explanations = {};

    // Type can be 'disclosing', 'issuing' or 'signing'
    // Only available for ShowingQRCode and ShowingYiviButton states
    if (type === 'disclosing') {
      explanations.ShowingQRCode = `<p>Follow the following steps:</p><ol><li>Scan the QR-code with your Yivi-app.</li><li>Choose in the Yivi-app if you want share the requested data with ${applicationName}.</li></ol>`;
    }

    if (type === 'issuing') {
      explanations.ShowingQRCode = `<p>Follow the following steps:</p><ol><li>Scan the QR-code with your Yivi-app.</li><li>Choose in the Yivi-app if you want to add the data.</li></ol>`;
    }

    return explanations;
  }
};
