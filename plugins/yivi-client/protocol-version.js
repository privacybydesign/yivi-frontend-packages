module.exports = class {
  static _parse(str) {
    const split = str.split('.').map((x) => parseInt(x));
    if (split.length !== 2) throw new Error('Length does not match');
    return {
      major: split[0],
      minor: split[1],
    };
  }

  /**
   * Returns the minimal supported frontend protocol version.
   * @returns {string}
   */
  static minSupported() {
    return '1.0';
  }

  /**
   * Returns the maximal supported frontend protocol version.
   * @returns {string}
   */
  static maxSupported() {
    return '1.1';
  }

  /**
   * Returns the minimal supported frontend protocol version necessary for the given feature.
   * @param feature
   * @returns {string}
   */
  static get(feature) {
    switch (feature) {
      case 'pairing':
      case 'chained-sessions':
        return '1.1';
      default:
        throw new Error('Protocol version requested of unknown feature');
    }
  }

  /**
   * Checks whether version x is above version y
   * @param {string} x
   * @param {string} y
   * @returns {boolean}
   */
  static above(x, y) {
    const parsedX = this._parse(x);
    const parsedY = this._parse(y);

    if (parsedX.major === parsedY.major) return parsedX.minor > parsedY.minor;
    return parsedX.major > parsedY.major;
  }

  /**
   * Checks whether version x is below version y
   * @param {string} x
   * @param {string} y
   * @returns {boolean}
   */
  static below(x, y) {
    const parsedX = this._parse(x);
    const parsedY = this._parse(y);

    if (parsedX.major === parsedY.major) return parsedX.minor < parsedY.minor;
    return parsedX.major < parsedY.major;
  }
};
