import { NextResponse } from "next/server";
import { HttpError } from "./auth";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function fail(status: number, message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

export function handleError(e: unknown) {
  if (e instanceof HttpError) return fail(e.status, e.message);
  console.error("[api]", e);
  return fail(500, "Something went wrong on the server. Please try again.");
}

export async function withApi(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (e) {
    return handleError(e);
  }
}

export function parseId(v: string | undefined): number {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) throw new HttpError(400, "Invalid id");
  return n;
}
