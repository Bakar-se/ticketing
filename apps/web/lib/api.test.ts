import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, api, onUnauthorized } from "@/lib/api";

function respondWith(status: number) {
  api.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    throw new AxiosError("failed", undefined, config, undefined, {
      status,
      statusText: "",
      data: { message: "nope" },
      headers: {},
      config: { ...config, headers: new AxiosHeaders() },
    });
  };
}

afterEach(() => {
  onUnauthorized(null);
});

describe("api client", () => {
  it("hands a signed-out response to the registered handler", async () => {
    const handler = vi.fn();
    onUnauthorized(handler);
    respondWith(401);
    await expect(api.get("/projects")).rejects.toBeInstanceOf(ApiError);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("leaves other failures to the caller", async () => {
    const handler = vi.fn();
    onUnauthorized(handler);
    respondWith(404);
    await expect(api.get("/projects")).rejects.toMatchObject({ status: 404, message: "nope" });
    expect(handler).not.toHaveBeenCalled();
  });
});
