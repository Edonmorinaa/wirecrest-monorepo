
import type { Request, Response } from "express";
import { InstagramDataService } from "../services/instagramDataService.js";

export class InstagramController {
    private instagramService: InstagramDataService;

    constructor(instagramService: InstagramDataService) {
        this.instagramService = instagramService;
    }

    /**
     * Trigger an immediate snapshot for an Instagram business profile
     * POST /api/instagram/snapshots
     */
    async triggerSnapshot(req: Request, res: Response): Promise<void> {
        try {
            const {
                locationId,
                instagramUsername,
                includeMedia = true,
                includeComments = true,
                maxMedia = 20,
                maxComments = 50
            } = req.body;

            if (!locationId || !instagramUsername) {
                res.status(400).json({
                    success: false,
                    error: "Missing required fields: locationId, instagramUsername",
                });
                return;
            }

            console.log(`📸 [Instagram] Triggering snapshot for ${instagramUsername} (Location: ${locationId})`);

            // 1. Ensure profile exists
            const profileResult = await this.instagramService.createBusinessProfile(
                locationId,
                instagramUsername
            );

            if (!profileResult.success || !profileResult.businessProfileId) {
                res.status(500).json({
                    success: false,
                    error: profileResult.error || "Failed to ensure business profile exists",
                });
                return;
            }

            // 2. Take snapshot
            const snapshotResult = await this.instagramService.takeDailySnapshot(
                profileResult.businessProfileId,
                {
                    snapshotType: "MANUAL",
                    includeMedia,
                    includeComments,
                    maxMedia,
                    maxComments,
                }
            );

            if (!snapshotResult.success) {
                res.status(500).json({
                    success: false,
                    error: snapshotResult.error || "Failed to take snapshot",
                });
                return;
            }

            res.json({
                success: true,
                message: "Instagram snapshot triggered successfully",
                snapshotId: snapshotResult.snapshotId,
                businessProfileId: profileResult.businessProfileId,
            });

        } catch (error: any) {
            console.error("[Instagram] Error triggering snapshot:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Internal server error",
            });
        }
    }
}
