import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthProvider, useAuth } from '../auth-context';
import { apiClient } from '@/lib/api-client';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { User } from '@/types';

// Component to test hook output
function TestConsumer() {
  const { user, loading, login, logout, hasPermission, hasModuleAccess } = useAuth();

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div data-testid="user-name">{user ? user.username : 'Anonymous'}</div>
      <div data-testid="is-super">{user?.is_superuser ? 'Superuser' : 'Regular'}</div>
      <div data-testid="perm-check">
        {hasPermission('hr', 'employees', 'view') ? 'Permitted' : 'Denied'}
      </div>
      <div data-testid="module-check">
        {hasModuleAccess('hr') ? 'ModuleGranted' : 'ModuleDenied'}
      </div>
      <button
        onClick={() => {
          const fd = new FormData();
          fd.append('username', 'admin');
          fd.append('password', 'secret');
          login(fd);
        }}
      >
        LoginBtn
      </button>
      <button onClick={() => logout()}>LogoutBtn</button>
    </div>
  );
}

describe('AuthContext & Hook Audit', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(apiClient);
    localStorage.clear();
  });

  afterEach(() => {
    mock.restore();
    localStorage.clear();
  });

  it('initializes with null user when no token exists in localStorage', async () => {
    await act(async () => {
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );
    });

    expect(screen.getByTestId('user-name')).toHaveTextContent('Anonymous');
    expect(screen.getByTestId('perm-check')).toHaveTextContent('Denied');
    expect(screen.getByTestId('module-check')).toHaveTextContent('ModuleDenied');
  });

  it('hydrates user on mount when valid token exists', async () => {
    localStorage.setItem('access_token', 'valid-jwt-token');

    const mockUser: Partial<User> = {
      id: 1,
      username: 'hr_manager',
      email: 'hr@proerp.com',
      is_superuser: false,
      permissions: ['hr:employees:view', 'hr:leave:approve'],
    };

    mock.onGet('/auth/me').reply(200, mockUser);

    await act(async () => {
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );
    });

    expect(screen.getByTestId('user-name')).toHaveTextContent('hr_manager');
    expect(screen.getByTestId('perm-check')).toHaveTextContent('Permitted');
    expect(screen.getByTestId('module-check')).toHaveTextContent('ModuleGranted');
    expect(localStorage.getItem('current_user')).toContain('hr_manager');
  });

  it('superuser bypasses all permission and module checks', async () => {
    localStorage.setItem('access_token', 'super-token');

    const superUser: Partial<User> = {
      id: 99,
      username: 'superuser_boss',
      email: 'admin@proerp.com',
      is_superuser: true,
      permissions: [],
    };

    mock.onGet('/auth/me').reply(200, superUser);

    await act(async () => {
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );
    });

    expect(screen.getByTestId('is-super')).toHaveTextContent('Superuser');
    expect(screen.getByTestId('perm-check')).toHaveTextContent('Permitted');
    expect(screen.getByTestId('module-check')).toHaveTextContent('ModuleGranted');
  });

  it('purges token and current_user on logout', async () => {
    localStorage.setItem('access_token', 'test-token');
    localStorage.setItem('current_user', JSON.stringify({ username: 'test' }));

    mock.onGet('/auth/me').reply(200, {
      id: 2,
      username: 'test',
      is_superuser: false,
      permissions: [],
    });
    mock.onPost('/auth/logout').reply(200);

    let getByTextFn: any;
    await act(async () => {
      const rendered = render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );
      getByTextFn = rendered.getByText;
    });

    await act(async () => {
      getByTextFn('LogoutBtn').click();
    });

    expect(localStorage.getItem('access_token')).toBeNull();
    expect(localStorage.getItem('current_user')).toBeNull();
  });
});
