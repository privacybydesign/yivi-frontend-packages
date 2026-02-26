interface ParsedVersion {
  major: number;
  minor: number;
}

type FeatureName = 'pairing' | 'chained-sessions';

export default class ProtocolVersion {
  private static _parse(str: string): ParsedVersion {
    const split = str.split('.').map((x) => parseInt(x, 10));
    if (split.length !== 2) throw new Error('Length does not match');
    return {
      major: split[0],
      minor: split[1],
    };
  }

  /**
   * Returns the minimal supported frontend protocol version.
   */
  static minSupported(): string {
    return '1.0';
  }

  /**
   * Returns the maximal supported frontend protocol version.
   */
  static maxSupported(): string {
    return '1.1';
  }

  /**
   * Returns the minimal supported frontend protocol version necessary for the given feature.
   */
  static get(feature: FeatureName): string {
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
   */
  static above(x: string, y: string): boolean {
    const parsedX = this._parse(x);
    const parsedY = this._parse(y);

    if (parsedX.major === parsedY.major) return parsedX.minor > parsedY.minor;
    return parsedX.major > parsedY.major;
  }

  /**
   * Checks whether version x is below version y
   */
  static below(x: string, y: string): boolean {
    const parsedX = this._parse(x);
    const parsedY = this._parse(y);

    if (parsedX.major === parsedY.major) return parsedX.minor < parsedY.minor;
    return parsedX.major < parsedY.major;
  }
}
