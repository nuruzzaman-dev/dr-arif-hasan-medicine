import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, publicProcedure, router } from "./_core/trpc";
import { archiveMediaAsset, insertMediaAsset, listMediaAssets } from "./db";
import { storageGetSignedUrl, storagePut } from "./storage";

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const usageSchema = z.enum(["hero", "consultation", "editorial", "document", "other"]);

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  assets: router({
    list: adminProcedure.query(async () => {
      const assets = await listMediaAssets();
      return Promise.all(assets.map(async (asset) => ({
        ...asset,
        previewUrl: await storageGetSignedUrl(asset.fileKey),
      })));
    }),
    upload: adminProcedure
      .input(z.object({
        filename: z.string().min(1).max(180),
        mimeType: z.string().refine((value) => allowedMimeTypes.has(value), "Unsupported file type"),
        dataBase64: z.string().min(1),
        altText: z.string().max(500).optional(),
        usage: usageSchema.default("other"),
      }))
      .mutation(async ({ ctx, input }) => {
        const data = Buffer.from(input.dataBase64, "base64");
        if (data.byteLength > 8 * 1024 * 1024) throw new Error("Files must be smaller than 8 MB");
        const safeName = input.filename.replace(/[^a-zA-Z0-9._-]/g, "-");
        const uploaded = await storagePut(`physician-profile/${ctx.user.id}/${safeName}`, data, input.mimeType);
        return insertMediaAsset({
          uploadedBy: ctx.user.id,
          filename: input.filename,
          fileKey: uploaded.key,
          url: uploaded.url,
          mimeType: input.mimeType,
          sizeBytes: data.byteLength,
          altText: input.altText ?? null,
          usage: input.usage,
          status: "active",
        });
      }),
    archive: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ input }) => archiveMediaAsset(input.id)),
  }),
});

export type AppRouter = typeof appRouter;
