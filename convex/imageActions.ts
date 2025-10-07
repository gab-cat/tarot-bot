"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { Jimp } from "jimp";

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

    const responseData = await res.json() as any;
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

      // Fetch the image from the GitHub repository
      const imageUrl = `https://raw.githubusercontent.com/metabismuth/tarot-json/refs/heads/master/cards/${filename}`;
      console.log(`Fetching image from: ${imageUrl}`);

      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.status} ${imageResponse.statusText}`);
      }

      let imageBuffer = Buffer.from(await imageResponse.arrayBuffer()) as Buffer;

      // If reversed, flip the image horizontally using Jimp
      if (reversed) {
        console.log(`Reversing image: ${filename}`);
        const image = await Jimp.read(imageBuffer);
        image.flip({ horizontal: false, vertical: true }); // Horizontal flip
        imageBuffer = await image.getBuffer('image/jpeg');
      }

      // Upload the image (reversed or not) to Facebook
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
      const buffers = parts.map(part => Buffer.from(part, 'utf8'));
      buffers.push(Buffer.from(imageBuffer));
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
        console.error(`Upload failed for ${filename}:`, res.status, errorText);
        throw new Error(`Failed to upload image: ${res.status} ${errorText}`);
      }

      const responseData = await res.json() as any;
      console.log(`Upload successful for ${filename}:`, responseData);

      if (!responseData.attachment_id) {
        throw new Error(`No attachment_id in response: ${JSON.stringify(responseData)}`);
      }

      attachmentIds.push(responseData.attachment_id);
    }

    return attachmentIds;
  },
});
