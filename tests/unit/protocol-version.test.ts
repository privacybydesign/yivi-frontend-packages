import { describe, it, expect } from 'vitest';
import ProtocolVersion from '../../plugins/yivi-client/src/protocol-version';

describe('ProtocolVersion', () => {
  describe('get', () => {
    it('should return version string for known features', () => {
      expect(ProtocolVersion.get('pairing')).toBe('1.1');
      expect(ProtocolVersion.get('chained-sessions')).toBe('1.1');
    });

    it('should throw for unknown features', () => {
      expect(() => ProtocolVersion.get('unknown' as any)).toThrow('unknown feature');
    });
  });

  describe('minSupported', () => {
    it('should return minimum supported version', () => {
      expect(ProtocolVersion.minSupported()).toBe('1.0');
    });
  });

  describe('maxSupported', () => {
    it('should return maximum supported version', () => {
      expect(ProtocolVersion.maxSupported()).toBe('1.1');
    });
  });

  describe('below', () => {
    it('should return true when version is below target', () => {
      expect(ProtocolVersion.below('1.0', '2.0')).toBe(true);
      expect(ProtocolVersion.below('1.0', '1.1')).toBe(true);
    });

    it('should return false when version is above target', () => {
      expect(ProtocolVersion.below('2.0', '1.0')).toBe(false);
      expect(ProtocolVersion.below('1.1', '1.0')).toBe(false);
    });

    it('should return false when versions are equal', () => {
      expect(ProtocolVersion.below('1.1', '1.1')).toBe(false);
      expect(ProtocolVersion.below('2.0', '2.0')).toBe(false);
    });

    it('should compare minor versions correctly', () => {
      expect(ProtocolVersion.below('2.3', '2.5')).toBe(true);
      expect(ProtocolVersion.below('2.5', '2.3')).toBe(false);
    });

    it('should prioritize major version over minor', () => {
      expect(ProtocolVersion.below('1.9', '2.0')).toBe(true);
      expect(ProtocolVersion.below('2.0', '1.9')).toBe(false);
    });
  });

  describe('above', () => {
    it('should return true when version is above target', () => {
      expect(ProtocolVersion.above('2.0', '1.0')).toBe(true);
      expect(ProtocolVersion.above('1.1', '1.0')).toBe(true);
    });

    it('should return false when version is below target', () => {
      expect(ProtocolVersion.above('1.0', '2.0')).toBe(false);
    });

    it('should return false when versions are equal', () => {
      expect(ProtocolVersion.above('1.1', '1.1')).toBe(false);
    });
  });
});
