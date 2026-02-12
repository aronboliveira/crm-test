import SafeJsonUtil from './safe-json.util';

describe('SafeJsonUtil', () => {
  it('parses JSON safely', () => {
    expect(SafeJsonUtil.parse('{"ok":true}', {} as Record<string, unknown>)).toEqual({
      ok: true,
    });
    expect(SafeJsonUtil.parse('invalid-json', { fallback: true })).toEqual({
      fallback: true,
    });
  });

  it('parses objects safely from strings and objects', () => {
    expect(SafeJsonUtil.parseObject('{"id":"1"}')).toEqual({ id: '1' });
    expect(SafeJsonUtil.parseObject({ id: '1' })).toEqual({ id: '1' });
    expect(SafeJsonUtil.parseObject('[1,2,3]')).toBeNull();
  });

  it('stringifies safely and handles circular values', () => {
    expect(SafeJsonUtil.stringify({ a: 1 })).toBe('{"a":1}');

    const circular: Record<string, unknown> = {};
    circular.self = circular;

    expect(SafeJsonUtil.tryStringify(circular)).toBeNull();
    expect(SafeJsonUtil.stringify(circular, '{}')).toBe('{}');
  });

  it('normalizes unknown errors into messages', () => {
    expect(SafeJsonUtil.errorMessage(new Error('boom'))).toBe('boom');
    expect(SafeJsonUtil.errorMessage({ reason: 'fail' })).toContain('reason');
  });
});
