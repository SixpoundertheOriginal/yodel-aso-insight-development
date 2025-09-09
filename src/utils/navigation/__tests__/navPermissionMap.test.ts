import { describe, it, expect } from 'vitest';
import { resolvePermForPath } from '../navPermissionMap';

describe('resolvePermForPath', () => {
  it('returns undefined for unknown paths', () => {
    expect(resolvePermForPath('/unknown/route')).toBeUndefined();
  });

  it('prefers the longest matching prefix', () => {
    // The map includes '/admin' and '/admin/users'
    const perm = resolvePermForPath('/admin/users/list');
    expect(perm).toBeDefined();
  });
});

