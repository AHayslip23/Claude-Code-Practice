import { renderHook, act, waitFor } from "@testing-library/react";
import { useRouter } from "next/navigation";
import { useAuth } from "../use-auth";
import * as authActions from "@/actions";
import * as projectActions from "@/actions/create-project";
import * as getProjectsActions from "@/actions/get-projects";
import * as anonWorkTracker from "@/lib/anon-work-tracker";

vi.mock("next/navigation");
vi.mock("@/actions");
vi.mock("@/actions/create-project");
vi.mock("@/actions/get-projects");
vi.mock("@/lib/anon-work-tracker");

describe("useAuth", () => {
  const mockPush = vi.fn();
  const mockProject = { id: "project-123", name: "Test Project" };
  const mockAnonWork = {
    messages: [{ id: "msg-1", content: "test" }],
    fileSystemData: { file: "data" },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue({
      push: mockPush,
    });
  });

  describe("signIn", () => {
    it("should sign in successfully and handle post-sign-in flow", async () => {
      const mockProjects = [{ id: "proj-1" }, { id: "proj-2" }];
      (authActions.signIn as any).mockResolvedValue({ success: true });
      (anonWorkTracker.getAnonWorkData as any).mockReturnValue(null);
      (getProjectsActions.getProjects as any).mockResolvedValue(mockProjects);

      const { result } = renderHook(() => useAuth());

      let signInResult;
      await act(async () => {
        signInResult = await result.current.signIn(
          "user@example.com",
          "password123"
        );
      });

      expect(authActions.signIn).toHaveBeenCalledWith(
        "user@example.com",
        "password123"
      );
      expect(signInResult).toEqual({ success: true });
      expect(mockPush).toHaveBeenCalledWith("/proj-1");
    });

    it("should set isLoading to true during sign in", async () => {
      let loadingDuringCall = false;
      (authActions.signIn as any).mockImplementation(async () => {
        loadingDuringCall = result.current.isLoading;
        return { success: true };
      });
      (anonWorkTracker.getAnonWorkData as any).mockReturnValue(null);
      (getProjectsActions.getProjects as any).mockResolvedValue([]);
      (projectActions.createProject as any).mockResolvedValue(mockProject);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password123");
      });

      expect(loadingDuringCall).toBe(true);
      expect(result.current.isLoading).toBe(false);
    });

    it("should handle sign in failure", async () => {
      const errorResult = { success: false, error: "Invalid credentials" };
      (authActions.signIn as any).mockResolvedValue(errorResult);

      const { result } = renderHook(() => useAuth());

      let signInResult;
      await act(async () => {
        signInResult = await result.current.signIn(
          "user@example.com",
          "wrong"
        );
      });

      expect(signInResult).toEqual(errorResult);
      expect(mockPush).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
    });

    it("should handle sign in error and reset loading state", async () => {
      (authActions.signIn as any).mockRejectedValue(
        new Error("Network error")
      );

      const { result } = renderHook(() => useAuth());

      await expect(
        act(async () => {
          await result.current.signIn("user@example.com", "password123");
        })
      ).rejects.toThrow("Network error");

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("signUp", () => {
    it("should sign up successfully and handle post-sign-in flow", async () => {
      const mockProjects = [{ id: "proj-1" }];
      (authActions.signUp as any).mockResolvedValue({ success: true });
      (anonWorkTracker.getAnonWorkData as any).mockReturnValue(null);
      (getProjectsActions.getProjects as any).mockResolvedValue(mockProjects);

      const { result } = renderHook(() => useAuth());

      let signUpResult;
      await act(async () => {
        signUpResult = await result.current.signUp(
          "newuser@example.com",
          "password123"
        );
      });

      expect(authActions.signUp).toHaveBeenCalledWith(
        "newuser@example.com",
        "password123"
      );
      expect(signUpResult).toEqual({ success: true });
      expect(mockPush).toHaveBeenCalledWith("/proj-1");
    });

    it("should set isLoading to true during sign up", async () => {
      let loadingDuringCall = false;
      (authActions.signUp as any).mockImplementation(async () => {
        loadingDuringCall = result.current.isLoading;
        return { success: true };
      });
      (anonWorkTracker.getAnonWorkData as any).mockReturnValue(null);
      (getProjectsActions.getProjects as any).mockResolvedValue([]);
      (projectActions.createProject as any).mockResolvedValue(mockProject);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("newuser@example.com", "password123");
      });

      expect(loadingDuringCall).toBe(true);
      expect(result.current.isLoading).toBe(false);
    });

    it("should handle sign up failure", async () => {
      const errorResult = { success: false, error: "Email already exists" };
      (authActions.signUp as any).mockResolvedValue(errorResult);

      const { result } = renderHook(() => useAuth());

      let signUpResult;
      await act(async () => {
        signUpResult = await result.current.signUp(
          "existing@example.com",
          "password123"
        );
      });

      expect(signUpResult).toEqual(errorResult);
      expect(mockPush).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
    });

    it("should handle sign up error and reset loading state", async () => {
      (authActions.signUp as any).mockRejectedValue(
        new Error("Server error")
      );

      const { result } = renderHook(() => useAuth());

      await expect(
        act(async () => {
          await result.current.signUp("user@example.com", "password123");
        })
      ).rejects.toThrow("Server error");

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("Post-sign-in flow", () => {
    it("should create project with anonymous work if it exists", async () => {
      (authActions.signIn as any).mockResolvedValue({ success: true });
      (anonWorkTracker.getAnonWorkData as any).mockReturnValue(mockAnonWork);
      (projectActions.createProject as any).mockResolvedValue(mockProject);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password123");
      });

      expect(projectActions.createProject).toHaveBeenCalledWith({
        name: expect.stringMatching(/Design from/),
        messages: mockAnonWork.messages,
        data: mockAnonWork.fileSystemData,
      });
      expect(anonWorkTracker.clearAnonWork).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith(`/${mockProject.id}`);
    });

    it("should not clear anon work if messages are empty", async () => {
      const emptyAnonWork = { messages: [], fileSystemData: {} };
      (authActions.signIn as any).mockResolvedValue({ success: true });
      (anonWorkTracker.getAnonWorkData as any).mockReturnValue(emptyAnonWork);
      (getProjectsActions.getProjects as any).mockResolvedValue([]);
      (projectActions.createProject as any).mockResolvedValue(mockProject);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password123");
      });

      expect(anonWorkTracker.clearAnonWork).not.toHaveBeenCalled();
    });

    it("should navigate to most recent project if no anon work", async () => {
      const projects = [
        { id: "proj-1", createdAt: "2024-01-01" },
        { id: "proj-2", createdAt: "2024-01-02" },
      ];
      (authActions.signIn as any).mockResolvedValue({ success: true });
      (anonWorkTracker.getAnonWorkData as any).mockReturnValue(null);
      (getProjectsActions.getProjects as any).mockResolvedValue(projects);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password123");
      });

      expect(mockPush).toHaveBeenCalledWith("/proj-1");
      expect(projectActions.createProject).not.toHaveBeenCalled();
    });

    it("should create new project if user has no existing projects", async () => {
      (authActions.signIn as any).mockResolvedValue({ success: true });
      (anonWorkTracker.getAnonWorkData as any).mockReturnValue(null);
      (getProjectsActions.getProjects as any).mockResolvedValue([]);
      (projectActions.createProject as any).mockResolvedValue(mockProject);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password123");
      });

      expect(projectActions.createProject).toHaveBeenCalledWith({
        name: expect.stringMatching(/New Design #\d+/),
        messages: [],
        data: {},
      });
      expect(mockPush).toHaveBeenCalledWith(`/${mockProject.id}`);
    });

    it("should not navigate if sign in is unsuccessful", async () => {
      (authActions.signIn as any).mockResolvedValue({
        success: false,
        error: "Invalid email",
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("invalid", "password123");
      });

      expect(mockPush).not.toHaveBeenCalled();
      expect(projectActions.createProject).not.toHaveBeenCalled();
    });
  });

  describe("Hook API", () => {
    it("should return signIn, signUp, and isLoading", () => {
      const { result } = renderHook(() => useAuth());

      expect(result.current).toHaveProperty("signIn");
      expect(result.current).toHaveProperty("signUp");
      expect(result.current).toHaveProperty("isLoading");
      expect(typeof result.current.signIn).toBe("function");
      expect(typeof result.current.signUp).toBe("function");
      expect(typeof result.current.isLoading).toBe("boolean");
    });

    it("should initialize with isLoading as false", () => {
      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("Edge cases", () => {
    it("should handle concurrent sign in calls", async () => {
      (authActions.signIn as any).mockResolvedValue({ success: true });
      (anonWorkTracker.getAnonWorkData as any).mockReturnValue(null);
      (getProjectsActions.getProjects as any).mockResolvedValue([
        { id: "proj-1" },
      ]);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await Promise.all([
          result.current.signIn("user1@example.com", "password123"),
          result.current.signIn("user2@example.com", "password123"),
        ]);
      });

      expect(authActions.signIn).toHaveBeenCalledTimes(2);
      expect(mockPush).toHaveBeenCalledTimes(2);
    });

    it("should handle project creation with special characters in date", async () => {
      (authActions.signIn as any).mockResolvedValue({ success: true });
      (anonWorkTracker.getAnonWorkData as any).mockReturnValue(null);
      (getProjectsActions.getProjects as any).mockResolvedValue([]);
      (projectActions.createProject as any).mockResolvedValue(mockProject);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password123");
      });

      const createProjectCall = (
        projectActions.createProject as any
      ).mock.calls[0][0];
      expect(createProjectCall.name).toMatch(/Design from \d{1,2}:\d{2}:\d{2}/);
    });

    it("should handle null anon work gracefully", async () => {
      (authActions.signIn as any).mockResolvedValue({ success: true });
      (anonWorkTracker.getAnonWorkData as any).mockReturnValue(null);
      (getProjectsActions.getProjects as any).mockResolvedValue([
        { id: "proj-1" },
      ]);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password123");
      });

      expect(anonWorkTracker.clearAnonWork).not.toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/proj-1");
    });
  });
});
