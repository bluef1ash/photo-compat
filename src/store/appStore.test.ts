import { describe, it, expect, vi, beforeEach } from "vitest";

// mock IPC 层
vi.mock("../ipc/commands", () => ({
  scanDirectory: vi.fn(),
  startProcess: vi.fn(),
  cancelProcess: vi.fn(),
  pauseProcess: vi.fn(),
  resumeProcess: vi.fn(),
  openOutput: vi.fn(),
}));

describe("appStore 状态机", () => {
  beforeEach(async () => {
    const { useAppStore } = await import("./appStore");
    useAppStore.getState().reset();
    vi.clearAllMocks();
  });

  it("初始视图为 home", async () => {
    const { useAppStore } = await import("./appStore");
    expect(useAppStore.getState().view).toBe("home");
  });

  it("reset 回到 home 且清空业务状态", async () => {
    const { useAppStore } = await import("./appStore");
    const s = useAppStore.getState();
    s.setError("err");
    s.reset();
    expect(useAppStore.getState().view).toBe("home");
    expect(useAppStore.getState().error).toBeNull();
  });
});
