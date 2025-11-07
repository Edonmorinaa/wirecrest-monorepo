// src/apifyService.ts
import { ApifyClient } from "apify-client";
import dotenv from "dotenv";

dotenv.config();
const apifyToken = process.env.APIFY_TOKEN;
if (!apifyToken) {
  console.error("Missing APIFY_TOKEN");
  process.exit(1);
}
export const apify = new ApifyClient({ token: apifyToken });
