import { describe, expect, it, beforeEach, vi } from "vitest";
import type { NextRequest } from "next/server";

interface CookieEntry {
  value: string;
  options?: Record<string, unknown>;
}

interface CookieStore {
  get(name: string): { value: string } | undefined;
  set(name: string, value: string, options?: Record<string, unknown>): void;
  delete(name: string): void;
}

const TEST_TOKEN = "test-auth-token";
let signedPayload: SessionPayload | null = null;

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));
vi.mock("jose", () => {
  const jwtVerifyMock = vi.fn(async (token: string) => {
    if (token !== TEST_TOKEN || signedPayload === null) {
      throw new Error("Invalid token");
    }

    return { payload: signedPayload };
  });

  return {
    SignJWT: class {
      payload: unknown;

      constructor(payload: unknown) {
        this.payload = payload;
      }

      setProtectedHeader() {
        return this;
      }

      setExpirationTime() {
        return this;
      }

      setIssuedAt() {
        return this;
      }

      async sign() {
        signedPayload = this.payload as SessionPayload;
        return TEST_TOKEN;
      }
    },
    jwtVerify: jwtVerifyMock,
  };
});

import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import {
  createSession,
  deleteSession,
  getSession,
  verifySession,
  type SessionPayload,
} from "../auth";

const cookiesMock = cookies as unknown as {
  mockResolvedValue: (value: CookieStore) => void;
};
const jwtVerifyMock = jwtVerify as unknown as {
  mockReset: () => void;
};

function createCookieStore() {
  const store = new Map<string, CookieEntry>();

  return {
    get(name: string) {
      const entry = store.get(name);
      return entry ? { value: entry.value } : undefined;
    },
    set(name: string, value: string, options?: Record<string, unknown>) {
      store.set(name, { value, options });
    },
    delete(name: string) {
      store.delete(name);
    },
    getEntry(name: string) {
      return store.get(name);
    },
  };
}

describe("src/lib/auth", () => {
  let cookieStore: ReturnType<typeof createCookieStore>;

  beforeEach(() => {
    vi.resetAllMocks();
    signedPayload = null;
    jwtVerifyMock.mockReset();
    cookieStore = createCookieStore();
    cookiesMock.mockResolvedValue(cookieStore as unknown as CookieStore);
  });

  describe("createSession", () => {
    it("creates a session cookie with secure defaults", async () => {
      await createSession("user-123", "user@example.com");

      const entry = cookieStore.getEntry("auth-token");
      expect(entry).toBeDefined();
      expect(entry?.value).toBe(TEST_TOKEN);

      const options = entry?.options;
      expect(options).toMatchObject({
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: false,
      });
      expect(options?.expires).toBeInstanceOf(Date);
    });

    it("creates a secure session cookie in production", async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      await createSession("user-prod", "prod@example.com");

      const entry = cookieStore.getEntry("auth-token");
      expect(entry).toBeDefined();
      expect(entry?.options).toMatchObject({
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: true,
      });

      process.env.NODE_ENV = originalNodeEnv;
    });
  });

  it("returns a session payload when a valid auth cookie exists", async () => {
    await createSession("user-456", "session@example.com");

    const session = await getSession();

    expect(session).not.toBeNull();
    expect(session).toMatchObject<Partial<SessionPayload>>({
      userId: "user-456",
      email: "session@example.com",
    });
    expect((session as SessionPayload).expiresAt).toBeDefined();
  });

  it("returns null when no auth cookie is present", async () => {
    const session = await getSession();
    expect(session).toBeNull();
  });

  it("returns null for invalid session tokens", async () => {
    cookieStore.set("auth-token", "bad-token");
    const session = await getSession();
    expect(session).toBeNull();
  });

  it("deletes the auth cookie", async () => {
    await createSession("user-789", "delete@example.com");
    await deleteSession();

    expect(cookieStore.get("auth-token")).toBeUndefined();
  });

  it("verifies a valid request session token", async () => {
    await createSession("user-abc", "verify@example.com");
    const token = cookieStore.get("auth-token")?.value;

    const request = {
      cookies: {
        get: vi.fn().mockReturnValue({ value: token }),
      },
    } as unknown as NextRequest;

    const result = await verifySession(request);
    expect(result).not.toBeNull();
    expect(result).toMatchObject<Partial<SessionPayload>>({
      userId: "user-abc",
      email: "verify@example.com",
    });
  });

  it("returns null when verifySession receives no token", async () => {
    const request = {
      cookies: {
        get: vi.fn().mockReturnValue(undefined),
      },
    } as unknown as NextRequest;

    const session = await verifySession(request);
    expect(session).toBeNull();
  });

  it("returns null when verifySession receives an invalid token", async () => {
    const request = {
      cookies: {
        get: vi.fn().mockReturnValue({ value: "invalid-token" }),
      },
    } as unknown as NextRequest;

    const session = await verifySession(request);
    expect(session).toBeNull();
  });
});
