'use server';

import { getSession } from '@wirecrest/auth/server';
import { prisma } from '@wirecrest/db';
import { ApiError } from './lib/errors';
import { throwIfNotSuperAdmin } from 'src/lib/permissions';
import { RealtimeBroadcaster } from 'src/lib/realtime';
import env from 'src/lib/env';
import type { ApiResponse } from './types';
import type { BusinessMarketIdentifier, MarketPlatform, PlatformType, BusinessCreationStep, BusinessCreationStatus } from '@prisma/client';
import { 
  generateGoogleResponse, 
  generateFacebookResponse, 
  generateTripAdvisorResponse, 
  generateBookingResponse,
  type ReviewData 
} from 'src/lib/openai';

// Helper function to convert PlatformType to MarketPlatform
function platformTypeToMarketPlatform(platformType: PlatformType): MarketPlatform {
  switch (platformType) {
    case 'GOOGLE':
      return 'GOOGLE_MAPS';
    case 'FACEBOOK':
      return 'FACEBOOK';
    case 'TRIPADVISOR':
      return 'TRIPADVISOR';
    case 'BOOKING':
      return 'BOOKING';
    case 'INSTAGRAM':
      return 'INSTAGRAM';
    case 'TIKTOK':
      return 'TIKTOK';
    default:
      throw new Error(`Unknown platform type: ${platformType}`);
  }
}

// Helper function to convert MarketPlatform to PlatformType
function marketPlatformToPlatformType(marketPlatform: MarketPlatform): PlatformType {
  switch (marketPlatform) {
    case 'GOOGLE_MAPS':
      return 'GOOGLE';
    case 'FACEBOOK':
      return 'FACEBOOK';
    case 'TRIPADVISOR':
      return 'TRIPADVISOR';
    case 'BOOKING':
      return 'BOOKING';
    case 'INSTAGRAM':
      return 'INSTAGRAM';
    case 'TIKTOK':
      return 'TIKTOK';
    default:
      throw new Error(`Unknown market platform: ${marketPlatform}`);
  }
}

// Superadmin check
export async function checkSuperAdminStatus() {
  const session = await getSession();
  if (!session?.user?.email) {
    return { isSuperAdmin: false };
  }

  // Check if user is a superadmin
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  const isSuperAdmin = !!(user && user.superRole === 'ADMIN');

  return { isSuperAdmin };
}

// Market Identifiers Management
export async function createOrUpdateMarketIdentifier(data: {
  teamId: string;
  platform: MarketPlatform;
  identifier: string;
}) {
  await throwIfNotSuperAdmin();

  const { teamId, platform, identifier } = data;

  console.log(
    `🔍 Market Identifier Request - Team: ${teamId}, Platform: ${platform}, Identifier: ${identifier}`
  );

  if (!teamId || !platform || !identifier) {
    throw new ApiError(400, 'Team ID, platform, and identifier are required');
  }

  // Verify team exists
  const team = await prisma.team.findUnique({
    where: { id: teamId },
  });

  if (!team) {
    throw new ApiError(404, 'Team not found');
  }

  // Check if identifier is being changed (not just created)
  const existingIdentifier = await prisma.businessMarketIdentifier.findUnique({
    where: {
      teamId_platform: {
        teamId,
        platform,
      },
    },
  });

  console.log(`🔍 Existing Identifier Found:`, existingIdentifier);
  const isIdentifierChanging = existingIdentifier && existingIdentifier.identifier !== identifier;
  console.log(`🔍 Is Identifier Changing: ${isIdentifierChanging}`);

  // If identifier is changing, COMPLETELY DELETE ALL RELATED DATA
  if (isIdentifierChanging) {
    console.log(
      `🚨 CRITICAL: Market identifier changing for team ${teamId}, platform ${platform}. DELETING ALL RELATED DATA.`
    );

    // Use a transaction to ensure atomicity - either everything is deleted or nothing is
    await prisma.$transaction(async (tx) => {
      // Delete platform-specific business profiles and ALL related data
      switch (platform) {
        case 'GOOGLE_MAPS': {
          console.log(
            `🗑️ Deleting Google business profile and ALL related data for team ${teamId}`
          );

          // Delete the main profile (cascade will handle all related data)
          const deletedGoogleProfiles = await tx.googleBusinessProfile.deleteMany({
            where: { teamId },
          });
          console.log(
            `✅ Deleted ${deletedGoogleProfiles.count} Google business profiles and ALL related data`
          );
          break;
        }

        case 'FACEBOOK': {
          console.log(
            `🗑️ Deleting Facebook business profile and ALL related data for team ${teamId}`
          );

          // Delete the main profile (cascade will handle all related data)
          const deletedFacebookProfiles = await tx.facebookBusinessProfile.deleteMany({
            where: { teamId },
          });
          console.log(
            `✅ Deleted ${deletedFacebookProfiles.count} Facebook business profiles and ALL related data`
          );
          break;
        }

        case 'TRIPADVISOR': {
          console.log(
            `🗑️ Deleting TripAdvisor business profile and ALL related data for team ${teamId}`
          );

          // Delete the main profile (cascade will handle all related data)
          const deletedTripAdvisorProfiles = await tx.tripAdvisorBusinessProfile.deleteMany({
            where: { teamId },
          });
          console.log(
            `✅ Deleted ${deletedTripAdvisorProfiles.count} TripAdvisor business profiles and ALL related data`
          );
          break;
        }

        case 'TIKTOK': {
          console.log(
            `🗑️ Deleting TikTok business profile and ALL related data for team ${teamId}`
          );

          // Delete the main profile (cascade will handle all related data)
          const deletedTikTokProfiles = await tx.tikTokBusinessProfile.deleteMany({
            where: { teamId },
          });
          console.log(
            `✅ Deleted ${deletedTikTokProfiles.count} TikTok business profiles and ALL related data`
          );
          break;
        }
      }

      // Delete ALL business creation tasks for this platform (with cascade to status messages and step logs)
      // Map MarketPlatform to PlatformType for BusinessCreationTask
      let taskPlatform: 'GOOGLE' | 'FACEBOOK' | 'TRIPADVISOR' | 'TIKTOK';
      switch (platform) {
        case 'GOOGLE_MAPS':
          taskPlatform = 'GOOGLE';
          break;
        case 'FACEBOOK':
          taskPlatform = 'FACEBOOK';
          break;
        case 'TRIPADVISOR':
          taskPlatform = 'TRIPADVISOR';
          break;
        case 'TIKTOK':
          taskPlatform = 'TIKTOK';
          break;
        default:
          // Skip deletion for other platforms (YELP, INSTAGRAM, etc.)
          console.log(
            `⚠️ Skipping business creation task deletion for unsupported platform: ${platform}`
          );
          return;
      }

      // Delete business creation tasks (cascade will handle status messages and step logs)
      const deletedTasks = await tx.businessCreationTask.deleteMany({
        where: {
          teamId,
          platform: taskPlatform,
        },
      });
      console.log(`✅ Deleted ${deletedTasks.count} business creation tasks and ALL related data`);

      console.log(
        `🎯 TRANSACTION COMPLETE: All data deleted successfully for team ${teamId}, platform ${platform}`
      );
    });

    console.log(
      `✅ CRITICAL OPERATION COMPLETE: All related data has been permanently deleted and verified for team ${teamId}, platform ${platform}`
    );
  }

  // Create or update market identifier
  console.log(
    `🔍 Upserting market identifier for team: ${teamId}, platform: ${platform}, identifier: ${identifier}`
  );
  const marketIdentifier: BusinessMarketIdentifier = await prisma.businessMarketIdentifier.upsert({
    where: {
      teamId_platform: {
        teamId,
        platform,
      },
    },
    update: {
      identifier,
      updatedAt: new Date(),
    },
    create: {
      teamId,
      platform,
      identifier,
    },
  });
  console.log(`✅ Market Identifier Result:`, marketIdentifier);

  const message = isIdentifierChanging
    ? '🚨 CRITICAL: Market identifier updated successfully. ALL previous business profile data, reviews, analytics, and related data have been PERMANENTLY DELETED.'
    : 'Market identifier saved successfully';

  // Broadcast real-time update
  await RealtimeBroadcaster.broadcastMarketIdentifierUpdate(
    teamId,
    platform,
    identifier,
    isIdentifierChanging || false
  );

  return {
    marketIdentifier,
    message,
    dataDeleted: isIdentifierChanging,
  };
}

export async function deleteMarketIdentifier(data: { teamId: string; platform: MarketPlatform }) {
  await throwIfNotSuperAdmin();

  const { teamId, platform } = data;

  if (!teamId || !platform) {
    throw new ApiError(400, 'Team ID and platform are required');
  }

  console.log(`🗑️ Deleting market identifier and ALL related data for team: ${teamId}, platform: ${platform}`);

  // Use a transaction to ensure atomicity - either everything is deleted or nothing is
  await prisma.$transaction(async (tx) => {
    // Delete platform-specific business profiles and ALL related data
    switch (platform) {
      case 'GOOGLE_MAPS': {
        console.log(`🗑️ Deleting Google business profile and ALL related data for team ${teamId}`);
        const deletedGoogleProfiles = await tx.googleBusinessProfile.deleteMany({
          where: { teamId },
        });
        console.log(`✅ Deleted ${deletedGoogleProfiles.count} Google business profiles and ALL related data`);
        break;
      }

      case 'FACEBOOK': {
        console.log(`🗑️ Deleting Facebook business profile and ALL related data for team ${teamId}`);
        const deletedFacebookProfiles = await tx.facebookBusinessProfile.deleteMany({
          where: { teamId },
        });
        console.log(`✅ Deleted ${deletedFacebookProfiles.count} Facebook business profiles and ALL related data`);
        break;
      }

      case 'TRIPADVISOR': {
        console.log(`🗑️ Deleting TripAdvisor business profile and ALL related data for team ${teamId}`);
        const deletedTripAdvisorProfiles = await tx.tripAdvisorBusinessProfile.deleteMany({
          where: { teamId },
        });
        console.log(`✅ Deleted ${deletedTripAdvisorProfiles.count} TripAdvisor business profiles and ALL related data`);
        break;
      }

      case 'BOOKING': {
        console.log(`🗑️ Deleting Booking.com business profile and ALL related data for team ${teamId}`);
        const deletedBookingProfiles = await tx.bookingBusinessProfile.deleteMany({
          where: { teamId },
        });
        console.log(`✅ Deleted ${deletedBookingProfiles.count} Booking.com business profiles and ALL related data`);
        break;
      }

      case 'INSTAGRAM': {
        console.log(`🗑️ Deleting Instagram business profile and ALL related data for team ${teamId}`);
        const deletedInstagramProfiles = await tx.instagramBusinessProfile.deleteMany({
          where: { teamId },
        });
        console.log(`✅ Deleted ${deletedInstagramProfiles.count} Instagram business profiles and ALL related data`);
        break;
      }

      case 'TIKTOK': {
        console.log(`🗑️ Deleting TikTok business profile and ALL related data for team ${teamId}`);
        const deletedTikTokProfiles = await tx.tikTokBusinessProfile.deleteMany({
          where: { teamId },
        });
        console.log(`✅ Deleted ${deletedTikTokProfiles.count} TikTok business profiles and ALL related data`);
        break;
      }

      default:
        console.log(`⚠️ Unknown platform ${platform}, skipping profile deletion`);
        break;
    }

    // Delete business creation tasks (cascade will handle status messages and step logs)
    const deletedTasks = await tx.businessCreationTask.deleteMany({
      where: {
        teamId,
        platform: platform as any,
      },
    });
    console.log(`✅ Deleted ${deletedTasks.count} business creation tasks and ALL related data`);

    // Finally, delete the market identifier itself
    await tx.businessMarketIdentifier.delete({
      where: {
        teamId_platform: {
          teamId: teamId as string,
          platform: platform as MarketPlatform,
        },
      },
    });

    console.log(`🎯 TRANSACTION COMPLETE: All data deleted successfully for team ${teamId}, platform ${platform}`);
  });

  console.log(`✅ CRITICAL OPERATION COMPLETE: All related data has been permanently deleted for team ${teamId}, platform ${platform}`);

  return { 
    message: 'Market identifier and all related data deleted successfully',
    dataDeleted: true
  };
}

// Enhanced Platform Actions with Direct Prisma Operations
export async function executePlatformAction(data: {
  teamId: string;
  platform: MarketPlatform;
  action: string;
  options?: any;
}) {
  await throwIfNotSuperAdmin();

  const { teamId, platform, action, options } = data;

  console.log(`🚀 Executing platform action: ${action} for ${platform} on team ${teamId}`);

  try {
  // Verify team exists
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      marketIdentifiers: true,
    },
  });

  if (!team) {
    throw new ApiError(404, 'Team not found');
  }

  // Get market identifier for the platform
  const marketIdentifier = team.marketIdentifiers.find(
      (mi) => mi.platform === platform
  );

  if (!marketIdentifier && action !== 'check_status') {
    throw new ApiError(400, `Market identifier not set for ${platform}. Please set it first.`);
  }

    // Convert MarketPlatform to PlatformType for business creation tasks
    const platformType = marketPlatformToPlatformType(platform);

  // Handle different actions
  switch (action) {
    case 'create_profile': {
        // Create or update business creation task
      const existingTask = await prisma.businessCreationTask.findUnique({
        where: {
          teamId_platform: {
            teamId,
              platform: platformType,
          },
        },
      });

      let taskId: string;
      if (existingTask) {
        // Update existing task to IN_PROGRESS
          const updatedTask = await prisma.businessCreationTask.update({
          where: { id: existingTask.id },
          data: {
            status: 'IN_PROGRESS',
            currentStep: 'CREATING_PROFILE',
            startedAt: new Date(),
            lastActivityAt: new Date(),
            errorCount: 0,
            lastError: null,
          },
        });
          taskId = updatedTask.id;
      } else {
        // Create new task
        const newTask = await prisma.businessCreationTask.create({
          data: {
            teamId,
              platform: platformType,
            status: 'IN_PROGRESS',
            currentStep: 'CREATING_PROFILE',
              googlePlaceId: platformType === 'GOOGLE' ? marketIdentifier?.identifier : null,
              facebookUrl: platformType === 'FACEBOOK' ? marketIdentifier?.identifier : null,
              tripAdvisorUrl: platformType === 'TRIPADVISOR' ? marketIdentifier?.identifier : null,
              bookingUrl: platformType === 'BOOKING' ? marketIdentifier?.identifier : null,
            startedAt: new Date(),
              createdBy: teamId, // Using teamId as createdBy for now
          },
        });
        taskId = newTask.id;
      }

      // Call external backend to create profile
      try {
          const backendResponse = await callExternalBackend('profile', platform, marketIdentifier!.identifier, teamId);

        // Check if backend response indicates success
        if (backendResponse.success) {
          // Update task to COMPLETED since the backend handles the full profile creation flow
          await prisma.businessCreationTask.update({
            where: { id: taskId },
            data: {
              status: 'COMPLETED',
              currentStep: 'CREATING_PROFILE',
              completedAt: new Date(),
              lastActivityAt: new Date(),
              completedSteps: 1,
              progressPercent: 25, // Profile creation is 25% of total process
                lastError: null
              }
          });

          // Create success status message
          await prisma.businessStatusMessage.create({
            data: {
              businessCreationId: taskId,
              step: 'CREATING_PROFILE',
              status: 'COMPLETED',
              message: backendResponse.message || `${platform} profile created successfully`,
                messageType: 'success'
              }
            });

            console.log(`✅ Platform action ${action} completed successfully for ${platform}`);
          return {
              success: true,
              taskId,
            message: `${platform} profile created successfully`,
              backendResponse
          };
        } else {
          throw new Error(backendResponse.error || 'Backend returned unsuccessful response');
        }
      } catch (backendError) {
        console.error('Backend API error:', backendError);

        // Reset task status to FAILED if backend call fails
        await prisma.businessCreationTask.update({
          where: { id: taskId },
          data: {
            status: 'FAILED',
            lastActivityAt: new Date(),
            errorCount: (existingTask?.errorCount || 0) + 1,
              lastError: backendError instanceof Error ? backendError.message : 'External backend API call failed'
            }
        });

        // Create error status message
        await prisma.businessStatusMessage.create({
          data: {
            businessCreationId: taskId,
            step: 'CREATING_PROFILE',
            status: 'FAILED',
            message: `Profile creation failed: ${backendError instanceof Error ? backendError.message : 'External API error'}`,
              messageType: 'error'
            }
        });

          throw new ApiError(500, `Failed to create profile for ${platform}: ${backendError instanceof Error ? backendError.message : 'External API error'}`);
      }
    }

    case 'get_reviews': {
        // Get existing task or create new one
        let task = await prisma.businessCreationTask.findUnique({
          where: {
            teamId_platform: {
              teamId,
              platform: platformType,
            },
          },
        });

        if (!task) {
          task = await prisma.businessCreationTask.create({
            data: {
              teamId,
              platform: platformType,
              status: 'IN_PROGRESS',
              currentStep: 'FETCHING_REVIEWS',
              startedAt: new Date(),
              createdBy: teamId, // Using teamId as createdBy for now
            },
          });
        } else {
          // Update existing task
          task = await prisma.businessCreationTask.update({
            where: { id: task.id },
            data: {
              status: 'IN_PROGRESS',
              currentStep: 'FETCHING_REVIEWS',
              lastActivityAt: new Date(),
            },
          });
        }

        // Call external backend to fetch reviews
        try {
          const backendResponse = await callExternalBackend('reviews', platform, marketIdentifier!.identifier, teamId);
          
          // Check if backend response indicates success
          if (backendResponse.success) {
            // Update task to COMPLETED since the backend handles the full reviews fetching flow
            await prisma.businessCreationTask.update({
              where: { id: task.id },
              data: {
                status: 'COMPLETED',
                currentStep: 'FETCHING_REVIEWS',
                completedAt: new Date(),
                lastActivityAt: new Date(),
                completedSteps: 2,
                progressPercent: 100, // Reviews fetching completes the process
                lastError: null
              }
            });

            // Create success status message
            await prisma.businessStatusMessage.create({
              data: {
                businessCreationId: task.id,
                step: 'FETCHING_REVIEWS',
                status: 'COMPLETED',
                message: backendResponse.message || `${platform} reviews fetched successfully`,
                messageType: 'success'
              }
            });

            console.log(`✅ Platform action ${action} completed successfully for ${platform}`);
            return {
              success: true,
              taskId: task.id,
              message: `${platform} reviews fetched successfully`,
              backendResponse
            };
          } else {
            throw new Error(backendResponse.error || 'Backend returned unsuccessful response');
          }
        } catch (backendError) {
          console.error('Backend API error:', backendError);
          
          // Reset task status to FAILED if backend call fails
          await prisma.businessCreationTask.update({
            where: { id: task.id },
            data: {
              status: 'FAILED',
              lastActivityAt: new Date(),
              errorCount: (task?.errorCount || 0) + 1,
              lastError: backendError instanceof Error ? backendError.message : 'External backend API call failed'
            }
          });

          // Create error status message
          await prisma.businessStatusMessage.create({
            data: {
              businessCreationId: task.id,
              step: 'FETCHING_REVIEWS',
              status: 'FAILED',
              message: `Reviews fetching failed: ${backendError instanceof Error ? backendError.message : 'External API error'}`,
              messageType: 'error'
            }
          });

          throw new ApiError(500, `Failed to fetch reviews for ${platform}: ${backendError instanceof Error ? backendError.message : 'External API error'}`);
        }
      }

      case 'retry': {
        // Get existing task
        const task = await prisma.businessCreationTask.findUnique({
          where: {
            teamId_platform: {
              teamId,
              platform: platformType,
            },
          },
        });

        if (!task) {
          throw new ApiError(404, `No task found for ${platform}`);
        }

        // Reset task to retry
        const updatedTask = await prisma.businessCreationTask.update({
          where: { id: task.id },
          data: {
            status: 'IN_PROGRESS',
            lastActivityAt: new Date(),
            errorCount: 0,
            lastError: null,
          },
        });

        // Create status message
        await prisma.businessStatusMessage.create({
          data: {
            businessCreationId: task.id,
            step: task.currentStep || 'CREATING_PROFILE',
            status: 'IN_PROGRESS',
            message: `Retrying ${platform} operation...`,
            messageType: 'info',
          },
        });

        console.log(`✅ Platform action ${action} completed successfully for ${platform}`);
        return {
          success: true,
          taskId: updatedTask.id,
          message: `${platform} retry initiated`,
        };
    }

    case 'check_status': {
      // Get current status from database
      const currentTask = await prisma.businessCreationTask.findUnique({
        where: {
          teamId_platform: {
            teamId,
              platform: platformType,
          },
        },
        include: {
          statusMessages: {
            orderBy: { timestamp: 'desc' },
            take: 5,
          },
        },
      });

        console.log(`✅ Platform status checked successfully for ${platform}`);
      return {
          success: true,
        task: currentTask,
        hasMarketIdentifier: !!marketIdentifier,
      };
    }

      default:
        throw new ApiError(400, 'Invalid action');
    }
  } catch (error) {
    console.error(`❌ Platform action ${action} failed for ${platform}:`, error);
    throw error;
  }
}

// Enhanced Market Identifier Management with Direct Prisma Operations
export async function createOrUpdateMarketIdentifierEnhanced(data: {
  teamId: string;
  platform: MarketPlatform;
  identifier: string;
}) {
  await throwIfNotSuperAdmin();

  const { teamId, platform, identifier } = data;

  console.log(`🔧 Creating/updating market identifier for ${platform} on team ${teamId}`);

  try {
    // Verify team exists
    const team = await prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      throw new ApiError(404, 'Team not found');
    }

    // Check if identifier is being changed (not just created)
    const existingIdentifier = await prisma.businessMarketIdentifier.findUnique({
      where: {
        teamId_platform: {
          teamId,
          platform,
        },
      },
    });

    const isIdentifierChanging = existingIdentifier && existingIdentifier.identifier !== identifier;

    // If identifier is changing, delete existing platform data first
    if (isIdentifierChanging) {
      console.log(`🚨 Market identifier changing for team ${teamId}, platform ${platform}. DELETING ALL RELATED DATA.`);

      // Use a transaction to ensure atomicity
      await prisma.$transaction(async (tx) => {
        // Delete platform-specific business profiles and ALL related data
        switch (platform) {
          case 'GOOGLE_MAPS': {
            await tx.googleBusinessProfile.deleteMany({
              where: { teamId },
            });
            break;
          }
          case 'FACEBOOK': {
            await tx.facebookBusinessProfile.deleteMany({
              where: { teamId },
            });
            break;
          }
          case 'TRIPADVISOR': {
            await tx.tripAdvisorBusinessProfile.deleteMany({
              where: { teamId },
            });
            break;
          }
          case 'BOOKING': {
            await tx.bookingBusinessProfile.deleteMany({
              where: { teamId },
            });
            break;
          }
          case 'INSTAGRAM': {
            await tx.instagramBusinessProfile.deleteMany({
              where: { teamId },
            });
            break;
          }
          case 'TIKTOK': {
            await tx.tikTokBusinessProfile.deleteMany({
              where: { teamId },
            });
            break;
          }
    default:
            // Handle unknown platform
            break;
        }

        // Delete business creation tasks
        // Map MarketPlatform to PlatformType for businessCreationTask
        const platformTypeMapping = {
          'GOOGLE_MAPS': 'GOOGLE',
          'FACEBOOK': 'FACEBOOK',
          'TRIPADVISOR': 'TRIPADVISOR',
          'BOOKING': 'BOOKING',
          'INSTAGRAM': 'INSTAGRAM',
          'TIKTOK': 'TIKTOK'
        };
        
        const platformType = platformTypeMapping[platform] || platform;
        
        await tx.businessCreationTask.deleteMany({
          where: {
            teamId,
            platform: platformType,
          },
        });
      });
    }

    // Create or update market identifier
    const marketIdentifier = await prisma.businessMarketIdentifier.upsert({
      where: {
        teamId_platform: {
          teamId,
          platform,
        },
      },
      update: {
        identifier,
        updatedAt: new Date(),
      },
      create: {
        teamId,
        platform,
        identifier,
      },
    });

    console.log(`✅ Market identifier saved successfully for ${platform}`);
    
    return {
      success: true,
      marketIdentifier,
      message: `Market identifier for ${platform} saved successfully`,
    };
  } catch (error) {
    console.error(`❌ Failed to save market identifier for ${platform}:`, error);
    throw error;
  }
}

// Enhanced Platform Data Deletion with Direct Prisma Operations
export async function deletePlatformData(data: {
  teamId: string;
  platform: string;
}) {
  await throwIfNotSuperAdmin();

  const { teamId, platform } = data;

  console.log(`🗑️ Deleting platform data for ${platform} on team ${teamId}`);

  try {
    // Verify team exists
    const team = await prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      throw new ApiError(404, 'Team not found');
    }

    // Delete platform data using transaction
    await prisma.$transaction(async (tx) => {
      // Delete platform-specific business profiles and ALL related data
      switch (platform) {
        case 'GOOGLE_MAPS': {
          await tx.googleBusinessProfile.deleteMany({
            where: { teamId },
          });
          break;
        }
        case 'FACEBOOK': {
          await tx.facebookBusinessProfile.deleteMany({
            where: { teamId },
          });
          break;
        }
        case 'TRIPADVISOR': {
          await tx.tripAdvisorBusinessProfile.deleteMany({
            where: { teamId },
          });
          break;
        }
        case 'BOOKING': {
          await tx.bookingBusinessProfile.deleteMany({
            where: { teamId },
          });
          break;
        }
        case 'INSTAGRAM': {
          await tx.instagramBusinessProfile.deleteMany({
            where: { teamId },
          });
          break;
        }
        case 'TIKTOK': {
          await tx.tikTokBusinessProfile.deleteMany({
            where: { teamId },
          });
          break;
        }
        default:
          // Handle unknown platform
          break;
      }

      // Delete business creation tasks
      await tx.businessCreationTask.deleteMany({
        where: {
          teamId,
          platform: platform as PlatformType,
        },
      });

      // Delete market identifier
      await tx.businessMarketIdentifier.deleteMany({
        where: {
          teamId,
          platform: platform as MarketPlatform,
        },
      });
    });

    console.log(`✅ Platform data deleted successfully for ${platform}`);
    
    return {
      success: true,
      message: `${platform} data deleted successfully`,
    };
  } catch (error) {
    console.error(`❌ Failed to delete platform data for ${platform}:`, error);
    throw error;
  }
}

// Get Tenant Details with Direct Prisma Operations
export async function getTenantDetails(tenantId: string) {
  await throwIfNotSuperAdmin();

  console.log(`📊 Fetching detailed tenant data for ${tenantId}`);

  try {
    // Fetch tenant with all related data using direct Prisma operations
    const tenant = await prisma.team.findUnique({
      where: { id: tenantId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        marketIdentifiers: true,
        businessProfile: {
          include: {
            reviews: {
              select: {
                id: true,
                publishedAtDate: true,
                rating: true,
              },
              orderBy: { publishedAtDate: 'desc' },
              take: 1,
            },
          },
        },
        facebookBusinessProfiles: {
          include: {
            reviews: {
              select: {
                id: true,
                date: true,
                isRecommended: true,
              },
              orderBy: { date: 'desc' },
              take: 1,
            },
          },
        },
        tripAdvisorBusinessProfile: {
          include: {
            reviews: {
              select: {
                id: true,
                publishedDate: true,
                rating: true,
              },
              orderBy: { publishedDate: 'desc' },
              take: 1,
            },
          },
        },
        bookingBusinessProfile: {
          include: {
            reviews: {
              select: {
                id: true,
                publishedDate: true,
                rating: true,
              },
              orderBy: { publishedDate: 'desc' },
              take: 1,
            },
          },
        },
        instagramBusinessProfile: {
          include: {
            dailySnapshots: {
              select: {
                id: true,
                snapshotDate: true,
                followersCount: true,
              },
              orderBy: { snapshotDate: 'desc' },
              take: 1,
            },
          },
        },
        tiktokBusinessProfile: {
          include: {
            dailySnapshots: {
              select: {
                id: true,
                snapshotDate: true,
                followerCount: true,
              },
              orderBy: { snapshotDate: 'desc' },
              take: 1,
            },
          },
        },
        businessCreationTasks: {
          include: {
            statusMessages: {
              orderBy: { timestamp: 'desc' },
              take: 5,
            },
            stepLogs: {
              orderBy: { startedAt: 'desc' },
              take: 10,
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!tenant) {
      throw new ApiError(404, 'Tenant not found');
    }

    // Process platform data
    const platforms = {
      google: processPlatformData(tenant, 'GOOGLE'),
      facebook: processPlatformData(tenant, 'FACEBOOK'),
      tripadvisor: processPlatformData(tenant, 'TRIPADVISOR'),
      booking: processPlatformData(tenant, 'BOOKING'),
      instagram: processPlatformData(tenant, 'INSTAGRAM'),
      tiktok: processPlatformData(tenant, 'TIKTOK'),
    };

    // Calculate stats
    const stats = calculateTenantStats(tenant, platforms);

    // Get recent activity
    const recentActivity = await getRecentActivity(tenantId);

    console.log(`✅ Tenant details fetched successfully for ${tenantId}`);
    
    return {
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        createdAt: tenant.createdAt,
        updatedAt: tenant.updatedAt,
        members: tenant.members.map(member => ({
          id: member.id,
          role: member.role,
          user: member.user,
        })),
      },
      platforms,
      stats,
      recentActivity,
    };
  } catch (error) {
    console.error(`❌ Failed to fetch tenant details for ${tenantId}:`, error);
    throw error;
  }
}

// Helper functions for processing platform data
function processPlatformData(tenant: any, platform: string) {
  const marketIdentifier = tenant.marketIdentifiers.find(
    (mi: any) => mi.platform === platform
  );

  const task = tenant.businessCreationTasks.find(
    (t: any) => t.platform === platform
  );

  let profile = null;
  let reviewsCount = 0;
  let lastReviewDate = null;

  // Get platform-specific profile and reviews
  switch (platform) {
    case 'GOOGLE':
      profile = tenant.businessProfile;
      if (profile?.reviews) {
        reviewsCount = profile.reviews.length;
        lastReviewDate = profile.reviews[0]?.publishedAtDate || null;
      }
      break;
    case 'FACEBOOK':
      profile = tenant.facebookBusinessProfiles;
      if (profile?.reviews) {
        reviewsCount = profile.reviews.length;
        lastReviewDate = profile.reviews[0]?.date || null;
      }
      break;
    case 'TRIPADVISOR':
      profile = tenant.tripAdvisorBusinessProfile;
      if (profile?.reviews) {
        reviewsCount = profile.reviews.length;
        lastReviewDate = profile.reviews[0]?.publishedDate || null;
      }
      break;
    case 'BOOKING':
      profile = tenant.bookingBusinessProfile;
      if (profile?.reviews) {
        reviewsCount = profile.reviews.length;
        lastReviewDate = profile.reviews[0]?.publishedDate || null;
      }
      break;
    case 'INSTAGRAM':
      profile = tenant.instagramBusinessProfile;
      if (profile?.dailySnapshots) {
        reviewsCount = profile.dailySnapshots.length;
        lastReviewDate = profile.dailySnapshots[0]?.snapshotDate || null;
      }
      break;
    case 'TIKTOK':
      profile = tenant.tiktokBusinessProfile;
      if (profile?.dailySnapshots) {
        reviewsCount = profile.dailySnapshots.length;
        lastReviewDate = profile.dailySnapshots[0]?.snapshotDate || null;
      }
      break;
    default:
      // Handle unknown platform
      break;
  }

  // Determine status
  let status: string = 'not_started';
  if (marketIdentifier) {
    if (task) {
      if (task.status === 'COMPLETED') {
        status = 'completed';
      } else if (task.status === 'IN_PROGRESS') {
        status = task.currentStep === 'CREATING_PROFILE' ? 'profile_in_progress' : 'reviews_in_progress';
      } else if (task.status === 'FAILED') {
        status = 'failed';
      }
    } else {
      status = 'identifier_set';
    }
  }

  // Determine action availability
  const canCreateProfile = !!marketIdentifier && (status === 'not_started' || status === 'identifier_set' || status === 'failed');
  const canGetReviews = status === 'completed' || status === 'profile_completed';
  const canRetry = status === 'failed';

  return {
    identifier: marketIdentifier?.identifier || null,
    profile,
    reviewsCount,
    lastReviewDate,
    task,
    status,
    canCreateProfile,
    canGetReviews,
    canRetry,
    statusMessage: task?.lastError || '',
    isProcessing: task?.status === 'IN_PROGRESS',
    currentStep: task?.currentStep || null,
  };
}

function calculateTenantStats(tenant: any, platforms: any) {
  let totalReviews = 0;
  let totalPhotos = 0;
  let totalRating = 0;
  let ratingCount = 0;
  let activeTasksCount = 0;
  let failedTasksCount = 0;

  // Calculate platform-specific stats
  Object.values(platforms).forEach((platform: any) => {
    totalReviews += platform.reviewsCount || 0;
    
    if (platform.task) {
      if (platform.task.status === 'IN_PROGRESS') {
        activeTasksCount++;
      } else if (platform.task.status === 'FAILED') {
        failedTasksCount++;
      }
    }

    // Calculate average rating if available
    if (platform.profile?.rating) {
      totalRating += platform.profile.rating;
      ratingCount++;
    }
  });

  // Calculate completion percentage
  const totalPlatforms = Object.keys(platforms).length;
  const completedPlatforms = Object.values(platforms).filter((p: any) => p.status === 'completed').length;
  const completionPercentage = (completedPlatforms / totalPlatforms) * 100;

  return {
    totalReviews,
    totalPhotos,
    averageRating: ratingCount > 0 ? totalRating / ratingCount : 0,
    completionPercentage,
    activeTasksCount,
    failedTasksCount,
  };
}

async function getRecentActivity(tenantId: string) {
  const activities = await prisma.businessStatusMessage.findMany({
    where: {
      businessCreation: {
        teamId: tenantId,
      },
    },
    include: {
      businessCreation: {
        select: {
          platform: true,
        },
      },
    },
    orderBy: { timestamp: 'desc' },
    take: 20,
  });

  return activities.map(activity => ({
    id: activity.id,
    type: activity.status === 'COMPLETED' ? 'task_completed' : 
          activity.status === 'FAILED' ? 'task_failed' : 'status_message',
    platform: activity.businessCreation.platform,
    message: activity.message,
    timestamp: activity.timestamp,
    metadata: {
      step: activity.step,
      messageType: activity.messageType,
    },
  }));
}

// Check Platform Status with Direct Prisma Operations
export async function checkPlatformStatus(data: {
  teamId: string;
  platform: string;
}) {
  await throwIfNotSuperAdmin();

  const { teamId, platform } = data;

  console.log(`🔍 Checking platform status for ${platform} on team ${teamId}`);

  try {
    // Verify team exists
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        marketIdentifiers: true,
      },
    });

    if (!team) {
      throw new ApiError(404, 'Team not found');
    }

    // Get market identifier for the platform
    const marketIdentifier = team.marketIdentifiers.find(
      (mi) => mi.platform === platform
    );

    // Get current status from database
    const currentTask = await prisma.businessCreationTask.findUnique({
      where: {
        teamId_platform: {
          teamId,
          platform: platform as PlatformType,
        },
      },
      include: {
        statusMessages: {
          orderBy: { timestamp: 'desc' },
          take: 5,
        },
      },
    });

    console.log(`✅ Platform status checked successfully for ${platform}`);
    
    return {
      success: true,
      task: currentTask,
      hasMarketIdentifier: !!marketIdentifier,
    };
  } catch (error) {
    console.error(`❌ Failed to check platform status for ${platform}:`, error);
    throw error;
  }
}

// Instagram Controls
export async function executeInstagramControl(data: {
  teamId: string;
  action:
    | 'create_profile'
    | 'take_snapshot'
    | 'schedule_snapshots'
    | 'pause_snapshots'
    | 'resume_snapshots'
    | 'update_schedule'
    | 'test_connection'
    | 'force_sync'
    | 'export_data'
    | 'delete_data'
    | 'get_status'
    | 'get_analytics';
  options?: any;
}) {
  await throwIfNotSuperAdmin();

  const { teamId, action, options = {} } = data;

  if (!teamId || !action) {
    throw new ApiError(400, 'teamId and action are required');
  }

  // Verify team exists
  const team = await prisma.team.findUnique({
    where: { id: teamId },
  });

  if (!team) {
    throw new ApiError(404, 'Team not found');
  }

  // Get backend API URL
  const backendApiUrl = process.env.BACKEND_URL || 'http://localhost:3000';

  console.log(`🔄 Instagram control action: ${action} for team: ${teamId}`);

  switch (action) {
    case 'create_profile': {
      // Get Instagram market identifier
      const marketIdentifier = await prisma.businessMarketIdentifier.findFirst({
        where: {
          teamId,
          platform: 'INSTAGRAM',
        },
      });

      if (!marketIdentifier?.identifier) {
        throw new ApiError(400, 'Instagram username not configured');
      }

      const response = await fetch(`${backendApiUrl}/api/instagram/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId,
          instagramUsername: marketIdentifier.identifier,
          snapshotTime: options.snapshotTime || '09:00:00',
          timezone: options.timezone || 'UTC',
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new ApiError(response.status, result.error || 'Profile creation failed');
      }

      return {
        success: true,
        data: result,
        message: 'Instagram profile created successfully',
      };
    }

    case 'take_snapshot': {
      const response = await fetch(`${backendApiUrl}/api/instagram/snapshots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId,
          instagramUsername: options.instagramUsername,
          forceRefresh: true,
          includeMedia: options.includeMedia ?? true,
          includeComments: options.includeComments ?? true,
          maxMedia: options.maxMedia || 20,
          maxComments: options.maxComments || 50,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new ApiError(response.status, result.error || 'Snapshot failed');
      }

      return {
        success: true,
        data: result,
        message: 'Snapshot taken successfully',
      };
    }

    default:
      throw new ApiError(400, `Unknown action: ${action}`);
  }
}

// Helper function to call external backend
async function callExternalBackend(
  action: 'profile' | 'reviews',
  platform: string,
  identifier: string,
  teamId: string
) {
  // If no backend URL is configured, use mock responses for development
  if (!env.backendUrl) {
    console.log(
      `Mock backend call: ${action} for ${platform} with identifier ${identifier}, teamId ${teamId}`
    );

    // Simulate async operation
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Return mock success response
    return {
      success: true,
      action,
      platform,
      identifier,
      teamId,
      timestamp: new Date().toISOString(),
      message: `Mock ${action} completed for ${platform}`,
    };
  }

  // Convert platform names to backend API format
  let platformName: string;
  let endpoint: string;
  
  switch (platform.toLowerCase()) {
    case 'google_maps':
      platformName = 'google';
      endpoint = `${env.backendUrl}/api/${platformName}/${action}`;
      break;
    case 'facebook':
      platformName = 'facebook';
      endpoint = `${env.backendUrl}/api/${platformName}/${action}`;
      break;
    case 'tripadvisor':
      platformName = 'tripadvisor';
      endpoint = `${env.backendUrl}/api/${platformName}/${action}`;
      break;
    case 'booking':
      platformName = 'booking';
      endpoint = `${env.backendUrl}/api/${platformName}/${action}`;
      break;
    case 'instagram':
      platformName = 'instagram';
      endpoint = `${env.backendUrl}/api/${platformName}/${action}`;
      break;
    case 'tiktok':
      platformName = 'tiktok';
      endpoint = `${env.backendUrl}/api/${platformName}/${action}`;
      break;
    default:
      throw new ApiError(400, `Unsupported platform: ${platform}`);
  }
  
  console.log('Making request to endpoint:', endpoint);
  console.log('Platform:', platform, 'Action:', action, 'TeamId:', teamId);

  // Build request payload based on platform and backend API expectations
  const requestPayload: any = { teamId };

  switch (platform.toLowerCase()) {
    case 'google_maps':
      requestPayload.placeId = identifier;
      if (action === 'reviews') {
        requestPayload.forceRefresh = true;
      }
      break;
    case 'facebook':
      requestPayload.facebookUrl = identifier;
      if (action === 'reviews') {
        requestPayload.forceRefresh = true;
      }
      break;
    case 'tripadvisor':
      requestPayload.tripAdvisorUrl = identifier;
      if (action === 'reviews') {
        requestPayload.forceRefresh = true;
      }
      break;
    case 'booking':
      requestPayload.bookingUrl = identifier;
      if (action === 'reviews') {
        requestPayload.forceRefresh = true;
      }
      break;
    case 'instagram':
      requestPayload.instagramUsername = identifier;
      if (action === 'reviews') {
        // For Instagram, we call snapshots instead of reviews
        const snapshotsEndpoint = `${env.backendUrl}/api/instagram/snapshots`;
        console.log('Making Instagram snapshots request to:', snapshotsEndpoint);
        
        const snapshotsResponse = await fetch(snapshotsEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestPayload)
        });

        if (!snapshotsResponse.ok) {
          const errorText = await snapshotsResponse.text();
          console.error('Instagram snapshots API error response:', errorText);
          throw new ApiError(snapshotsResponse.status, `Instagram snapshots API error: ${snapshotsResponse.statusText} - ${errorText}`);
        }

        return await snapshotsResponse.json();
      }
      break;
    case 'tiktok':
      requestPayload.tiktokUsername = identifier;
      if (action === 'reviews') {
        // For TikTok, 'reviews' maps to snapshots (historical data collection)
        const snapshotsEndpoint = `${env.backendUrl}/api/tiktok/snapshots`;
        console.log('Making TikTok snapshots request to:', snapshotsEndpoint);

        const snapshotsResponse = await fetch(snapshotsEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestPayload)
        });

        if (!snapshotsResponse.ok) {
          const errorText = await snapshotsResponse.text();
          console.error('TikTok snapshots API error response:', errorText);
          throw new ApiError(snapshotsResponse.status, `TikTok snapshots API error: ${snapshotsResponse.statusText} - ${errorText}`);
        }

        return await snapshotsResponse.json();
      }
      break;
    default:
      throw new ApiError(400, `Unsupported platform: ${platform}`);
  }

  console.log('Request payload:', requestPayload);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestPayload),
    });

    console.log('Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Backend API error response:', errorText);
      throw new ApiError(
        response.status,
        `Backend API error: ${response.statusText} - ${errorText}`
      );
    }

    const jsonResponse = await response.json();
    console.log('Backend API success response:', jsonResponse);
    return jsonResponse;
  } catch (fetchError) {
    console.error('Fetch error details:', fetchError);
    if (fetchError instanceof ApiError) {
      throw fetchError;
    }
    throw new ApiError(
      500,
      `Network error calling backend: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`
    );
  }
}

// ============================================================================
// OWNER RESPONSE GENERATION ACTIONS (Using Perplexity AI with Sonar Pro)
// ============================================================================

// Main generic response generator
export async function generateOwnerResponseAction(data: {
  reviewData: ReviewData;
  customPrompt?: string;
  tone?: 'professional' | 'friendly' | 'formal' | 'casual';
  language?: string;
}) {
  const session = await getSession();
  if (!session?.user?.email) {
    throw new ApiError(401, 'Unauthorized');
  }

  try {
    const { generateOwnerResponse } = await import('src/lib/openai');
    return await generateOwnerResponse({
      reviewData: data.reviewData,
      customPrompt: data.customPrompt,
      tone: data.tone,
      language: data.language
    });
  } catch (error) {
    console.error('Error generating owner response:', error);
    throw new ApiError(500, 'Failed to generate owner response');
  }
}

// Platform-specific response generators
export async function generateGoogleOwnerResponse(data: {
  reviewData: ReviewData;
  customPrompt?: string;
}) {
  const session = await getSession();
  if (!session?.user?.email) {
    throw new ApiError(401, 'Unauthorized');
  }

  try {
    console.log('Generating Google owner response for:', data.reviewData);
    const result = await generateGoogleResponse(data.reviewData, data.customPrompt);
    console.log('Google owner response generated successfully');
    return result;
  } catch (error) {
    console.error('Error generating Google owner response:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      reviewData: data.reviewData
    });
    throw new ApiError(500, `Failed to generate Google owner response: ${error.message}`);
  }
}

export async function generateFacebookOwnerResponse(data: {
  reviewData: ReviewData;
  customPrompt?: string;
}) {
  const session = await getSession();
  if (!session?.user?.email) {
    throw new ApiError(401, 'Unauthorized');
  }

  try {
    return await generateFacebookResponse(data.reviewData, data.customPrompt);
  } catch (error) {
    console.error('Error generating Facebook owner response:', error);
    throw new ApiError(500, 'Failed to generate Facebook owner response');
  }
}

export async function generateTripAdvisorOwnerResponse(data: {
  reviewData: ReviewData;
  customPrompt?: string;
}) {
  const session = await getSession();
  if (!session?.user?.email) {
    throw new ApiError(401, 'Unauthorized');
  }

  try {
    return await generateTripAdvisorResponse(data.reviewData, data.customPrompt);
  } catch (error) {
    console.error('Error generating TripAdvisor owner response:', error);
    throw new ApiError(500, 'Failed to generate TripAdvisor owner response');
  }
}

export async function generateBookingOwnerResponse(data: {
  reviewData: ReviewData;
  customPrompt?: string;
}) {
  const session = await getSession();
  if (!session?.user?.email) {
    throw new ApiError(401, 'Unauthorized');
  }

  try {
    return await generateBookingResponse(data.reviewData, data.customPrompt);
  } catch (error) {
    console.error('Error generating Booking owner response:', error);
    throw new ApiError(500, 'Failed to generate Booking owner response');
  }
}
