// prettier-ignore
module.exports = {
  header: 'Ga verder met <i class="yivi-web-logo">Yivi</i>',
  helper: 'Kom je er niet uit? Kijk dan eens op <a href="https://yivi.app/">de website van Yivi</a>.',
  loading: 'Een moment alstublieft',
  button: 'Open Yivi-app',
  qrCode: 'Toon QR-code',
  app: 'Volg de instructies in de Yivi-app',
  retry: 'Opnieuw proberen',
  back: 'Ga terug',
  cancelled: 'De handeling is afgebroken',
  timeout: 'Sorry! We hebben te lang<br/>niks van je gehoord',
  error: 'Sorry! Er is een fout opgetreden',
  browser: 'Het spijt ons, maar je browser voldoet niet aan de minimale eisen',
  success: 'Gelukt!',
  cancel: 'Annuleer',
  pairing: 'Vul de koppelcode in die in jouw Yivi-app verschijnt.',
  pairingFailed: (code) => `De koppelcode ${code} komt niet overeen met de code in je Yivi-app. Probeer het opnieuw.`,
  explanation: function (applicationName, type) {
    const explanations = {};

    // Type can be 'disclosing', 'issuing' or 'signing'
    // Only available for ShowingQRCode and ShowingYiviButton states
    if (type === 'disclosing') {
      explanations.ShowingQRCode = `<p>Doorloop de volgende stappen:</p><ol><li>Scan deze QR-code met uw Yivi-app.</li><li>Kies in uw Yivi-app of u de gevraagde gegevens wilt delen met ${applicationName}.</li></ol>`;
    }

    if (type === 'issuing') {
      explanations.ShowingQRCode = `<p>Doorloop de volgende stappen:</p><ol><li>Scan deze QR-code met uw Yivi-app.</li><li>Kies in uw Yivi-app of u de gegevens wilt toevoegen.</li></ol>`;
    }

    return explanations;
  }
};
