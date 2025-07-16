
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import { BrowserRouter } from 'react-router-dom';

// Mock the supabase client
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: { session: null }
      }),
      onAuthStateChange: jest.fn().mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } }
      }),
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      signInWithOAuth: jest.fn()
    }
  }
}));

// Mock the useToast hook
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn()
  })
}));

// Test component that uses the auth context
const TestComponent = () => {
  const { signIn, signUp, signOut } = useAuth();
  
  return (
    <div>
      <button onClick={() => signIn({ email: 'test@example.com', password: 'password' })}>
        Sign In
      </button>
      <button onClick={() => signUp({ email: 'test@example.com', password: 'password' })}>
        Sign Up
      </button>
      <button onClick={() => signOut()}>
        Sign Out
      </button>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('provides auth functions', async () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      </BrowserRouter>
    );
    
    expect(screen.getByText('Sign In')).toBeInTheDocument();
    expect(screen.getByText('Sign Up')).toBeInTheDocument();
    expect(screen.getByText('Sign Out')).toBeInTheDocument();
  });

  // Add more comprehensive tests as needed
});
