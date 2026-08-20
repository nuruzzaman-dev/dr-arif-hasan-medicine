import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function adminContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "admin-user",
      email: "admin@example.com",
      name: "Admin",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("assets.upload", () => {
  it("rejects unsupported file types before storage upload", async () => {
    const caller = appRouter.createCaller(adminContext());
    await expect(caller.assets.upload({
      filename: "malware.exe",
      mimeType: "application/x-msdownload",
      dataBase64: "ZGF0YQ==",
      usage: "other",
    })).rejects.toThrow("Unsupported file type");
  });
});
