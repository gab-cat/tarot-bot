/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as ai_emotionalAnalysis from "../ai/emotionalAnalysis.js";
import type * as ai_factory from "../ai/factory.js";
import type * as ai_interpretationModel from "../ai/interpretationModel.js";
import type * as constants from "../constants.js";
import type * as embeddings from "../embeddings.js";
import type * as facebookApi from "../facebookApi.js";
import type * as followups from "../followups.js";
import type * as http from "../http.js";
import type * as imageActions from "../imageActions.js";
import type * as notifications from "../notifications.js";
import type * as payments from "../payments.js";
import type * as promotions from "../promotions.js";
import type * as rag from "../rag.js";
import type * as readings from "../readings.js";
import type * as tarot from "../tarot.js";
import type * as tarotCardImages from "../tarotCardImages.js";
import type * as users from "../users.js";
import type * as xenditClient from "../xenditClient.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  "ai/emotionalAnalysis": typeof ai_emotionalAnalysis;
  "ai/factory": typeof ai_factory;
  "ai/interpretationModel": typeof ai_interpretationModel;
  constants: typeof constants;
  embeddings: typeof embeddings;
  facebookApi: typeof facebookApi;
  followups: typeof followups;
  http: typeof http;
  imageActions: typeof imageActions;
  notifications: typeof notifications;
  payments: typeof payments;
  promotions: typeof promotions;
  rag: typeof rag;
  readings: typeof readings;
  tarot: typeof tarot;
  tarotCardImages: typeof tarotCardImages;
  users: typeof users;
  xenditClient: typeof xenditClient;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
