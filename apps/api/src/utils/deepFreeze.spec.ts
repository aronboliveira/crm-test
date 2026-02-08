import DeepFreeze from './deepFreeze';

describe('DeepFreeze', () => {
  describe('apply', () => {
    it('should freeze a simple object', () => {
      const obj = { a: 1, b: 'hello' };
      const frozen = DeepFreeze.apply(obj);
      expect(Object.isFrozen(frozen)).toBe(true);
      expect(frozen.a).toBe(1);
    });

    it('should deep-freeze nested objects', () => {
      const obj = { a: { b: { c: 42 } } };
      const frozen = DeepFreeze.apply(obj);
      expect(Object.isFrozen(frozen)).toBe(true);
      expect(Object.isFrozen(frozen.a)).toBe(true);
      expect(Object.isFrozen(frozen.a.b)).toBe(true);
    });

    it('should freeze arrays and their nested objects', () => {
      const arr = [1, { x: 2 }, [3, { y: 4 }]];
      const frozen = DeepFreeze.apply(arr);
      expect(Object.isFrozen(frozen)).toBe(true);
      expect(Object.isFrozen(frozen[1])).toBe(true);
      expect(Object.isFrozen(frozen[2])).toBe(true);
      expect(Object.isFrozen((frozen[2] as any[])[1])).toBe(true);
    });

    it('should return primitives as-is', () => {
      expect(DeepFreeze.apply(42)).toBe(42);
      expect(DeepFreeze.apply('str')).toBe('str');
      expect(DeepFreeze.apply(true)).toBe(true);
      expect(DeepFreeze.apply(null)).toBe(null);
      expect(DeepFreeze.apply(undefined)).toBe(undefined);
    });

    it('should handle circular references without infinite loop', () => {
      const obj: any = { a: 1 };
      obj.self = obj;
      expect(() => DeepFreeze.apply(obj)).not.toThrow();
      const frozen = DeepFreeze.apply(obj);
      expect(Object.isFrozen(frozen)).toBe(true);
    });

    it('should not throw on already frozen objects', () => {
      const obj = Object.freeze({ a: 1, b: { c: 2 } });
      expect(() => DeepFreeze.apply(obj)).not.toThrow();
    });

    it('should freeze empty objects and arrays', () => {
      expect(Object.isFrozen(DeepFreeze.apply({}))).toBe(true);
      expect(Object.isFrozen(DeepFreeze.apply([]))).toBe(true);
    });

    it('frozen object should reject mutations in strict mode', () => {
      const obj = DeepFreeze.apply({ x: 10 });
      expect(() => {
        'use strict';
        (obj as any).x = 99;
      }).toThrow();
    });
  });
});
