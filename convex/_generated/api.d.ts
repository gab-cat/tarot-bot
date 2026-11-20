/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as ai_gemini from "../ai/gemini.js";
import type * as ai_jev from "../ai/jev.js";
import type * as ai_models from "../ai/models.js";
import type * as ai_prompts from "../ai/prompts.js";
import type * as constants from "../constants.js";
import type * as crons from "../crons.js";
import type * as embeddings from "../embeddings.js";
import type * as facebookApi from "../facebookApi.js";
import type * as followups from "../followups.js";
import type * as http from "../http.js";
import type * as imageActions from "../imageActions.js";
import type * as lib_intents from "../lib/intents.js";
import type * as lib_messenger from "../lib/messenger.js";
import type * as lib_signature from "../lib/signature.js";
import type * as lib_text from "../lib/text.js";
import type * as lib_time from "../lib/time.js";
import type * as lib_webhook from "../lib/webhook.js";
import type * as messenger from "../messenger.js";
import type * as migrations from "../migrations.js";
import type * as notifications from "../notifications.js";
import type * as payments from "../payments.js";
import type * as promotions from "../promotions.js";
import type * as readings from "../readings.js";
import type * as tarot from "../tarot.js";
import type * as tarotCardImages from "../tarotCardImages.js";
import type * as users from "../users.js";
import type * as validators from "../validators.js";
import type * as webhookEvents from "../webhookEvents.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  "ai/gemini": typeof ai_gemini;
  "ai/jev": typeof ai_jev;
  "ai/models": typeof ai_models;
  "ai/prompts": typeof ai_prompts;
  constants: typeof constants;
  crons: typeof crons;
  embeddings: typeof embeddings;
  facebookApi: typeof facebookApi;
  followups: typeof followups;
  http: typeof http;
  imageActions: typeof imageActions;
  "lib/intents": typeof lib_intents;
  "lib/messenger": typeof lib_messenger;
  "lib/signature": typeof lib_signature;
  "lib/text": typeof lib_text;
  "lib/time": typeof lib_time;
  "lib/webhook": typeof lib_webhook;
  messenger: typeof messenger;
  migrations: typeof migrations;
  notifications: typeof notifications;
  payments: typeof payments;
  promotions: typeof promotions;
  readings: typeof readings;
  tarot: typeof tarot;
  tarotCardImages: typeof tarotCardImages;
  users: typeof users;
  validators: typeof validators;
  webhookEvents: typeof webhookEvents;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
