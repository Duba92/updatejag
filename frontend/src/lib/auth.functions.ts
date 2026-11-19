import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { AppUser } from "@backend/types";

export type { AppUser } from "@backend/types";

const signupSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
  phone: z.string().regex(/^\+[1-9]\d{7,14}$/),
  password: z.string().min(8).max(128),
});

const signinSchema = z.object({
  phone: z.string().regex(/^\+[1-9]\d{7,14}$/),
  password: z.string().min(1).max(128),
});

export const registerAppUser = createServerFn({ method: "POST" })
  .validator((input) => signupSchema.parse(input))
  .handler(async ({ data }) => {
    const { createAppAccount } = await import("@backend/app-auth.server");
    return createAppAccount(data);
  });

export const signInAppUser = createServerFn({ method: "POST" })
  .validator((input) => signinSchema.parse(input))
  .handler(async ({ data }) => {
    const { signInAppAccount } = await import("@backend/app-auth.server");
    return signInAppAccount(data);
  });

export const getCurrentAppUser = createServerFn({ method: "GET" }).handler(
  async () => {
    const { getAppSessionUser } = await import("@backend/app-auth.server");
    return getAppSessionUser();
  },
);

export const signOutAppUser = createServerFn({ method: "POST" }).handler(
  async () => {
    const { signOutAppAccount } = await import("@backend/app-auth.server");
    return signOutAppAccount();
  },
);
