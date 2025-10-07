"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";

// Facebook API response types
interface FacebookUploadResponse {
  attachment_id: string;
  [key: string]: unknown;
}
import { Jimp } from "jimp";
import cardsData from "./tarot-cards.json" assert { type: "json" };

export const uploadImageAttachment = action({
  args: {
    imageFilename: v.string(),
    accessToken: v.string(),
  },
  handler: async (ctx, args): Promise<string> => {
    const { imageFilename, accessToken } = args;

    // Fetch the image from the GitHub repository
    const imageUrl = `https://raw.githubusercontent.com/metabismuth/tarot-json/refs/heads/master/cards/${imageFilename}`;
    console.log(`Fetching image from: ${imageUrl}`);

    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.status} ${imageResponse.statusText}`);
    }

    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

    // For Node.js environment, we need to construct multipart data manually
    // since FormData with Blob might not work as expected in Convex
    const boundary = `----WebKitFormBoundary${Math.random().toString(36).substring(2)}`;

    const messageJson = JSON.stringify({
      attachment: {
        type: 'image',
        payload: {
          is_reusable: true
        }
      }
    });

    const parts = [
      `--${boundary}\r\n`,
      `Content-Disposition: form-data; name="message"\r\n`,
      `Content-Type: application/json\r\n\r\n`,
      `${messageJson}\r\n`,
      `--${boundary}\r\n`,
      `Content-Disposition: form-data; name="filedata"; filename="${imageFilename}"\r\n`,
      `Content-Type: image/jpeg\r\n\r\n`
    ];

    const footer = `\r\n--${boundary}--\r\n`;

    // Combine all parts into a single buffer
    const buffers = parts.map(part => Buffer.from(part, 'utf8'));
    buffers.push(imageBuffer);
    buffers.push(Buffer.from(footer, 'utf8'));

    const multipartData = Buffer.concat(buffers);

    const url = `https://graph.facebook.com/v19.0/me/message_attachments?access_token=${encodeURIComponent(accessToken as string)}`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': multipartData.length.toString()
      },
      body: multipartData,
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => "<no body>");
      console.error(`Upload failed for ${imageFilename}:`, res.status, errorText);
      throw new Error(`Failed to upload image: ${res.status} ${errorText}`);
    }

    const responseData = await res.json() as FacebookUploadResponse;
    console.log(`Upload successful for ${imageFilename}:`, responseData);

    if (!responseData.attachment_id) {
      throw new Error(`No attachment_id in response: ${JSON.stringify(responseData)}`);
    }

    return responseData.attachment_id;
  },
});

export const uploadMultipleImageAttachments = action({
  args: {
    images: v.array(v.object({
      filename: v.string(),
      reversed: v.boolean(),
    })),
    accessToken: v.string(),
  },
  handler: async (ctx, args): Promise<string[]> => {
    const { images, accessToken } = args;
    const attachmentIds: string[] = [];

    for (const image of images) {
      const { filename, reversed } = image;

      // Try to get cached attachment ID first
      const cachedImage = await ctx.runQuery(api.tarotCardImages.getByFilename, { imageFilename: filename });
      let attachmentId: string;

      if (cachedImage) {
        // Use cached attachment ID
        attachmentId = reversed ? cachedImage.reversedAttachmentId : cachedImage.uprightAttachmentId;
        console.log(`Using cached attachment ID for ${filename} (${reversed ? 'reversed' : 'upright'})`);

        // Update last used timestamp
        await ctx.runMutation(api.tarotCardImages.updateLastUsed, { cardId: cachedImage.cardId });
      } else {
        // Download, upload, and save to database on the fly
        console.log(`No cached image found for ${filename}, downloading and caching on the fly`);

        // Fetch the image from the GitHub repository
        const imageUrl = `https://raw.githubusercontent.com/metabismuth/tarot-json/refs/heads/master/cards/${filename}`;
        console.log(`Fetching image from: ${imageUrl}`);

        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
          throw new Error(`Failed to fetch image: ${imageResponse.status} ${imageResponse.statusText}`);
        }

        const originalBuffer = Buffer.from(await imageResponse.arrayBuffer());

        // Process upright and reversed versions in parallel
        const [uprightAttachmentId, reversedAttachmentId] = await Promise.all([
          uploadImageBuffer(originalBuffer, filename, accessToken, false),
          uploadImageBuffer(originalBuffer, filename, accessToken, true)
        ]);

        // Extract card ID from filename (remove .jpg extension)
        const cardId = filename.replace('.jpg', '');

        // Save to database for future use
        await ctx.runMutation(api.tarotCardImages.createCardImage, {
          cardId,
          imageFilename: filename,
          uprightAttachmentId,
          reversedAttachmentId,
          createdAt: Date.now(),
          lastUsedAt: Date.now(),
        });

        console.log(`Successfully cached ${filename} with upright: ${uprightAttachmentId}, reversed: ${reversedAttachmentId}`);

        // Use the appropriate attachment ID for this request
        attachmentId = reversed ? reversedAttachmentId : uprightAttachmentId;
      }

      attachmentIds.push(attachmentId);
    }

    return attachmentIds;
  },
});

// Initialize all tarot card images by downloading, processing, and uploading them
export const initializeCardImages = action({
  args: {
    accessToken: v.string(),
  },
  handler: async (ctx, args): Promise<{ processed: number; total: number }> => {
    const { accessToken } = args;
    const cards = cardsData.cards;
    const totalCards = cards.length;
    let processed = 0;

    console.log(`Starting initialization of ${totalCards} tarot cards...`);

    // Process cards in batches to avoid overwhelming the system
    const batchSize = 5;
    for (let i = 0; i < cards.length; i += batchSize) {
      const batch = cards.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(cards.length / batchSize)}`);

      // Process all cards in this batch in parallel
      const batchPromises = batch.map(async (card) => {
        try {
          const cardId = card.name_short;
          const imageFilename = card.img;

          // Check if this card is already initialized
          const existing = await ctx.runQuery(api.tarotCardImages.getByCardId, { cardId });
          if (existing) {
            console.log(`Card ${cardId} already initialized, skipping...`);
            return;
          }

          console.log(`Processing card: ${cardId} (${imageFilename})`);

          // Download the original image
          const imageUrl = `https://raw.githubusercontent.com/metabismuth/tarot-json/refs/heads/master/cards/${imageFilename}`;
          console.log(`Downloading: ${imageUrl}`);

          const imageResponse = await fetch(imageUrl);
          if (!imageResponse.ok) {
            throw new Error(`Failed to fetch image: ${imageResponse.status} ${imageResponse.statusText}`);
          }

          const originalBuffer = Buffer.from(await imageResponse.arrayBuffer());

          // Process upright and reversed versions in parallel
          const [uprightAttachmentId, reversedAttachmentId] = await Promise.all([
            uploadImageBuffer(originalBuffer, imageFilename, accessToken, false),
            uploadImageBuffer(originalBuffer, imageFilename, accessToken, true)
          ]);

          // Save to database
          await ctx.runMutation(api.tarotCardImages.createCardImage, {
            cardId,
            imageFilename,
            uprightAttachmentId,
            reversedAttachmentId,
            createdAt: Date.now(),
            lastUsedAt: Date.now(),
          });

          console.log(`Successfully processed card: ${cardId}`);
          processed++;

        } catch (error) {
          console.error(`Failed to process card ${card.name_short}:`, error);
          // Continue with other cards even if one fails
        }
      });

      // Wait for the current batch to complete before starting the next
      await Promise.all(batchPromises);
    }

    console.log(`Initialization complete. Processed ${processed}/${totalCards} cards.`);
    return { processed, total: totalCards };
  },
});

// Helper function to upload an image buffer (with optional reversal) to Facebook
async function uploadImageBuffer(
  imageBuffer: Buffer,
  filename: string,
  accessToken: string,
  reverse: boolean = false
): Promise<string> {
  let processedBuffer = imageBuffer;

  // Reverse the image if needed
  if (reverse) {
    console.log(`Reversing image: ${filename}`);
    const image = await Jimp.read(imageBuffer);
    image.flip({ horizontal: true, vertical: true }); // Horizontal flip for reversed cards
    processedBuffer = await image.getBuffer('image/jpeg');
  }

  // Upload to Facebook
  const boundary = `----WebKitFormBoundary${Math.random().toString(36).substring(2)}`;

  const messageJson = JSON.stringify({
    attachment: {
      type: 'image',
      payload: {
        is_reusable: true
      }
    }
  });

  const parts = [
    `--${boundary}\r\n`,
    `Content-Disposition: form-data; name="message"\r\n`,
    `Content-Type: application/json\r\n\r\n`,
    `${messageJson}\r\n`,
    `--${boundary}\r\n`,
    `Content-Disposition: form-data; name="filedata"; filename="${filename}"\r\n`,
    `Content-Type: image/jpeg\r\n\r\n`
  ];

  const footer = `\r\n--${boundary}--\r\n`;

      // Combine all parts into a single buffer
      const buffers: Buffer[] = parts.map(part => Buffer.from(part, 'utf8'));
      buffers.push(Buffer.from(processedBuffer));
      buffers.push(Buffer.from(footer, 'utf8'));

  const multipartData = Buffer.concat(buffers);

  const url = `https://graph.facebook.com/v19.0/me/message_attachments?access_token=${encodeURIComponent(accessToken)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': multipartData.length.toString()
    },
    body: multipartData,
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "<no body>");
    throw new Error(`Failed to upload image: ${res.status} ${errorText}`);
  }

  const responseData = await res.json() as FacebookUploadResponse;
  if (!responseData.attachment_id) {
    throw new Error(`No attachment_id in response: ${JSON.stringify(responseData)}`);
  }

  return responseData.attachment_id;
}
