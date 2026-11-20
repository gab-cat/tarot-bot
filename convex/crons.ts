import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily("purge old webhook event keys", { hourUTC: 19, minuteUTC: 0 }, internal.webhookEvents.purgeOld, {});

export default crons;
