"use node";

// Uploads card images to Messenger once (upright and rotated 180° for reversed) and
// caches the reusable attachment ids in `tarotCardImages`. Runs in Node for Jimp.

import { v } from "convex/values";
import { Jimp } from "jimp";
import { internalAction, type ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import cardsData from "./tarot-cards.json";
import { getPageAccessToken, graphUrl } from "./lib/messenger";

const IMAGE_SOURCE = "https://raw.githubusercontent.com/metabismuth/tarot-json/refs/heads/master/cards";

// Multipart body built by hand: this is the exact format that has worked against the
// Graph API in production since Oct 2025.
async function uploadImage(image: Buffer, filename: string, accessToken: string): Promise<string> {
  const boundary = `----TarotBotBoundary${Math.random().toString(36).substring(2)}`;
  const messageJson = JSON.stringify({ attachment: { type: "image", payload: { is_reusable: true } } });
  const head = [
    `--${boundary}\r\n`,
    `Content-Disposition: form-data; name="message"\r\n`,
    `Content-Type: application/json\r\n\r\n`,
    `${messageJson}\r\n`,
    `--${boundary}\r\n`,
    `Content-Disposition: form-data; name="filedata"; filename="${filename}"\r\n`,
    `Content-Type: image/jpeg\r\n\r\n`,
  ].join("");
  const body = Buffer.concat([Buffer.from(head, "utf8"), image, Buffer.from(`\r\n--${boundary}--\r\n`, "utf8")]);

  const res = await fetch(graphUrl("me/message_attachments", accessToken), {
    method: "POST",
    headers: { "Content-Type": `multipart/form-data; boundary=${boundary}`, "Content-Length": body.length.toString() },
    body,
  });
  if (!res.ok) throw new Error(`Attachment upload failed for ${filename}: ${res.status} ${await res.text().catch(() => "")}`);
  const data = (await res.json()) as { attachment_id?: string };
  if (!data.attachment_id) throw new Error(`No attachment_id for ${filename}`);
  return data.attachment_id;
}

async function cacheCard(ctx: ActionCtx, cardId: string, filename: string, accessToken: string) {
  const res = await fetch(`${IMAGE_SOURCE}/${filename}`);
  if (!res.ok) throw new Error(`Could not download ${filename}: ${res.status}`);
  const original = Buffer.from(await res.arrayBuffer());

  const image = await Jimp.read(original);
  image.flip({ horizontal: true, vertical: true }); // both axes = rotated 180°, how a reversed card looks
  const reversed = await image.getBuffer("image/jpeg");

  const [uprightAttachmentId, reversedAttachmentId] = await Promise.all([
    uploadImage(original, filename, accessToken),
    uploadImage(reversed, filename, accessToken),
  ]);
  await ctx.runMutation(internal.tarotCardImages.saveCardImage, {
    cardId,
    imageFilename: filename,
    uprightAttachmentId,
    reversedAttachmentId,
  });
  return { uprightAttachmentId, reversedAttachmentId };
}

/** Uploads any of these cards that aren't cached yet, then returns all attachment ids in order. */
export const ensureAttachmentIds = internalAction({
  args: { cards: v.array(v.object({ filename: v.string(), reversed: v.boolean() })) },
  handler: async (ctx, args): Promise<string[]> => {
    const accessToken = getPageAccessToken();
    if (!accessToken) throw new Error("ACCESS_TOKEN is not set");
    const cached = await ctx.runQuery(internal.tarotCardImages.getAttachmentIds, { cards: args.cards });
    return await Promise.all(
      args.cards.map(async (card, i) => {
        if (cached[i]) return cached[i];
        const ids = await cacheCard(ctx, card.filename.replace(/\.jpg$/, ""), card.filename, accessToken);
        return card.reversed ? ids.reversedAttachmentId : ids.uprightAttachmentId;
      }),
    );
  },
});

/** One-off: cache all 78 cards. `npx convex run imageActions:initializeCardImages` */
export const initializeCardImages = internalAction({
  args: {},
  handler: async (ctx): Promise<{ processed: number; total: number }> => {
    const accessToken = getPageAccessToken();
    if (!accessToken) throw new Error("ACCESS_TOKEN is not set");
    let processed = 0;
    const cards = cardsData.cards;
    for (let i = 0; i < cards.length; i += 5) {
      await Promise.all(
        cards.slice(i, i + 5).map(async (card) => {
          if (await ctx.runQuery(internal.tarotCardImages.getByCardId, { cardId: card.name_short })) return;
          try {
            await cacheCard(ctx, card.name_short, card.img, accessToken);
            processed++;
          } catch (error) {
            console.error(`Failed to cache ${card.name_short}`, error);
          }
        }),
      );
    }
    return { processed, total: cards.length };
  },
});
