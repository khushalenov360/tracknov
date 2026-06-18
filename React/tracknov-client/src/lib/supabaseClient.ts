import { createClient } from '@supabase/supabase-js';

type MockSession = {
  user: {
    id: string;
    email: string;
  };
};

type AuthChangeCallback = (_event: string, session: MockSession | null) => void;

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const MOCK_SESSION_KEY = 'tracknov-react-mock-session';
export const hasSupabaseConfig = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

function readMockSession(): MockSession | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(MOCK_SESSION_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as MockSession;
  } catch {
    window.localStorage.removeItem(MOCK_SESSION_KEY);
    return null;
  }
}

function writeMockSession(session: MockSession | null) {
  if (typeof window === 'undefined') {
    return;
  }

  if (!session) {
    window.localStorage.removeItem(MOCK_SESSION_KEY);
    return;
  }

  window.localStorage.setItem(MOCK_SESSION_KEY, JSON.stringify(session));
}

function createMockSupabaseClient() {
  let listeners = new Set<AuthChangeCallback>();

  const notify = (event: string, session: MockSession | null) => {
    listeners.forEach((listener) => listener(event, session));
  };

  return {
    auth: {
      getSession: async () => ({
        data: {
          session: readMockSession(),
        },
      }),
      getUser: async () => ({
        data: {
          user: readMockSession()?.user ?? null,
        },
      }),
      onAuthStateChange: (callback: AuthChangeCallback) => {
        listeners.add(callback);
        return {
          data: {
            subscription: {
              unsubscribe: () => {
                listeners.delete(callback);
              },
            },
          },
        };
      },
      signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
        if (!email || !password) {
          return {
            data: { session: null },
            error: { message: 'Email and password are required.' },
          };
        }

        const session: MockSession = {
          user: {
            id: 'mock-user-1',
            email,
          },
        };

        writeMockSession(session);
        notify('SIGNED_IN', session);

        return {
          data: { session },
          error: null,
        };
      },
      signOut: async () => {
        writeMockSession(null);
        notify('SIGNED_OUT', null);
        return { error: null };
      },
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            single: async () => ({ data: null, error: null }),
            maybeSingle: async () => ({ data: null, error: null }),
          }),
          order: async () => ({ data: [], error: null }),
          in: async () => ({ data: [], error: null }),
          single: async () => ({ data: null, error: null }),
          maybeSingle: async () => ({ data: null, error: null }),
        }),
        in: () => ({
          order: async () => ({ data: [], error: null }),
        }),
        order: async () => ({ data: [], error: null }),
      }),
    }),
  };
}

export const supabase: any =
  hasSupabaseConfig
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : createMockSupabaseClient();
