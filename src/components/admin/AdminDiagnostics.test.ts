import { isJson } from './AdminDiagnostics';

describe('isJson', () => {
  it('returns true for valid JSON content-type', () => {
    expect(isJson('application/json')).toBe(true);
    expect(isJson('application/json; charset=utf-8')).toBe(true);
    expect(isJson('Application/JSON')).toBe(true);
  });

  it('returns false for non-JSON content-type', () => {
    expect(isJson('text/html')).toBe(false);
    expect(isJson('text/plain')).toBe(false);
    expect(isJson('application/xml')).toBe(false);
    expect(isJson('')).toBe(false);
  });

  it('handles case-insensitive matching', () => {
    expect(isJson('APPLICATION/JSON')).toBe(true);
    expect(isJson('application/JSON')).toBe(true);
    expect(isJson('Application/Json')).toBe(true);
  });
});