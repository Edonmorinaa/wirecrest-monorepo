'use server';

import type { PlatformType, MarketPlatform } from '@prisma/client';

import { prisma } from '@wirecrest/db';
import { auth } from '@wirecrest/auth-next';

import env from 'src/lib/env';
import { throwIfNotSuperAdmin } from 'src/lib/permissions';
import { 
  type ReviewData, 
  generateGoogleResponse, 
  generateBookingResponse, 
  generateFacebookResponse,
  generateTripAdvisorResponse 
} from 'src/lib/openai';

import { ApiError } from './lib/errors';

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
  const session = await auth();
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

// Market Identifiers Management (DEPRECATED - use createOrUpdateMarketIdentifierEnhanced instead)
// This function is kept for backward compatibility but should not be used
export async function createOrUpdateMarketIdentifier(data: {
  teamId: string;
  platform: MarketPlatform;
  identifier: string;
}) {
  await throwIfNotSuperAdmin();

  console.warn('⚠️ DEPRECATED: createOrUpdateMarketIdentifier is deprecated. Use createOrUpdateMarketIdentifierEnhanced with locationId instead.');
  
  throw new ApiError(400, 'This function is deprecated. Market identifiers are now location-based. Please use createOrUpdateMarketIdentifierEnhanced with a locationId.');
}


export async function deleteMarketIdentifier(data: { locationId: string; platform: MarketPlatform }) {
  await throwIfNotSuperAdmin();

  const { locationId, platform } = data;

  if (!locationId || !platform) {
    throw new ApiError(400, 'Location ID and platform are required');
  }

  console.log(`🗑️ Deleting market identifier and ALL related data for location: ${locationId}, platform: ${platform}`);

  // Get location to retrieve teamId
  const location = await prisma.businessLocation.findUnique({
    where: { id: locationId },
    select: { teamId: true },
  });

  if (!location) {
    throw new ApiError(404, 'Location not found');
  }

  const teamId = location.teamId;

  // Use a transaction to ensure atomicity - either everything is deleted or nothing is
  await prisma.$transaction(async (tx) => {
    // Delete platform-specific business profiles and ALL related data
    switch (platform) {
      case 'GOOGLE_MAPS': {
        console.log(`🗑️ Deleting Google business profile and ALL related data for location ${locationId}`);
        const deletedGoogleProfiles = await tx.googleBusinessProfile.deleteMany({
          where: { locationId },
        });
        console.log(`✅ Deleted ${deletedGoogleProfiles.count} Google business profiles and ALL related data`);
        break;
      }

      case 'FACEBOOK': {
        console.log(`🗑️ Deleting Facebook business profile and ALL related data for location ${locationId}`);
        const deletedFacebookProfiles = await tx.facebookBusinessProfile.deleteMany({
          where: { locationId },
        });
        console.log(`✅ Deleted ${deletedFacebookProfiles.count} Facebook business profiles and ALL related data`);
        break;
      }

      case 'TRIPADVISOR': {
        console.log(`🗑️ Deleting TripAdvisor business profile and ALL related data for location ${locationId}`);
        const deletedTripAdvisorProfiles = await tx.tripAdvisorBusinessProfile.deleteMany({
          where: { businessLocationId: locationId },
        });
        console.log(`✅ Deleted ${deletedTripAdvisorProfiles.count} TripAdvisor business profiles and ALL related data`);
        break;
      }

      case 'BOOKING': {
        console.log(`🗑️ Deleting Booking.com business profile and ALL related data for location ${locationId}`);
        const deletedBookingProfiles = await tx.bookingBusinessProfile.deleteMany({
          where: { businessLocationId: locationId },
        });
        console.log(`✅ Deleted ${deletedBookingProfiles.count} Booking.com business profiles and ALL related data`);
        break;
      }

      case 'INSTAGRAM': {
        // Instagram is team-level, so delete for the entire team
        console.log(`🗑️ Deleting Instagram business profile and ALL related data for team ${teamId}`);
        const deletedInstagramProfiles = await tx.instagramBusinessProfile.deleteMany({
          where: { teamId },
        });
        console.log(`✅ Deleted ${deletedInstagramProfiles.count} Instagram business profiles and ALL related data`);
        break;
      }

      case 'TIKTOK': {
        // TikTok is team-level, so delete for the entire team
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
        locationId_platform: {
          locationId,
          platform: platform as MarketPlatform,
        },
      },
    });

    console.log(`🎯 TRANSACTION COMPLETE: All data deleted successfully for location ${locationId}, platform ${platform}`);
  });

  console.log(`✅ CRITICAL OPERATION COMPLETE: All related data has been permanently deleted for location ${locationId}, platform ${platform}`);

  return { 
    message: 'Market identifier and all related data deleted successfully',
    dataDeleted: true
  };
}

// Enhanced Platform Actions with Direct Prisma Operations
export async function executePlatformAction(data: {
  teamId: string;
  locationId: string;
  platform: MarketPlatform;
  action: string;
  options?: any;
}) {
  await throwIfNotSuperAdmin();

  const { teamId, locationId, platform, action } = data;

  console.log(`🚀 Executing platform action: ${action} for ${platform} on team ${teamId}, location ${locationId}`);

  try {
  // Verify team exists
  const team = await prisma.team.findUnique({
    where: { id: teamId },
  });

  if (!team) {
    throw new ApiError(404, 'Team not found');
  }

    // Verify location exists
    const location = await prisma.businessLocation.findUnique({
      where: { id: locationId },
    });

    if (!location) {
      throw new ApiError(404, 'Location not found');
    }

    // Get market identifier for the platform and location
    const marketIdentifier = await prisma.businessMarketIdentifier.findUnique({
      where: {
        locationId_platform: {
          locationId,
          platform,
        },
      },
    });

  if (!marketIdentifier && action !== 'check_status') {
      throw new ApiError(400, `Market identifier not set for ${platform} at this location. Please set it first.`);
  }

    // Convert MarketPlatform to PlatformType for business creation tasks
    const platformType = marketPlatformToPlatformType(platform);

  // Handle different actions
  switch (action) {
    case 'create_profile': {
      // Create or update business creation task for tracking
      const existingTask = await prisma.businessCreationTask.findUnique({
        where: {
          teamId_platform: { teamId, platform: platformType },
        },
      });

      let taskId: string;
      if (existingTask) {
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
            createdBy: teamId,
          },
        });
        taskId = newTask.id;
      }

      // Call scraper webhook (scraper handles ALL profile creation now)
      try {
        const backendResponse = await callExternalBackend('profile', platform, marketIdentifier!.identifier, teamId, locationId);

        if (backendResponse.success) {
          console.log(`✅ Platform action ${action} completed successfully for ${platform}`);
          return {
            success: true,
            taskId,
            message: `${platform} profile creation initiated`,
            backendResponse
          };
        } else {
          throw new Error(backendResponse.error || 'Backend returned unsuccessful response');
        }
      } catch (backendError) {
        console.error('Backend API error:', backendError);

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
          const backendResponse = await callExternalBackend('reviews', platform, marketIdentifier!.identifier, teamId, locationId);
          
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
  locationId: string;
  platform: MarketPlatform;
  identifier: string;
}) {
  await throwIfNotSuperAdmin();

  const { locationId, platform, identifier } = data;

  console.log(`🔧 Creating/updating market identifier for ${platform} on location ${locationId}`);

  try {
    // Verify location exists and get team info
    const location = await prisma.businessLocation.findUnique({
      where: { id: locationId },
      include: { team: true },
    });

    if (!location) {
      throw new ApiError(404, 'Location not found');
    }

    const teamId = location.teamId;

    // Check if identifier is being changed (not just created)
    const existingIdentifier = await prisma.businessMarketIdentifier.findUnique({
      where: {
        locationId_platform: {
          locationId,
          platform,
        },
      },
    });

    const isIdentifierChanging = existingIdentifier && existingIdentifier.identifier !== identifier;

    // If identifier is changing, delete existing platform data first
    if (isIdentifierChanging) {
      console.log(`🚨 Market identifier changing for location ${locationId}, platform ${platform}. DELETING ALL RELATED DATA.`);

      // Use a transaction to ensure atomicity
      await prisma.$transaction(async (tx) => {
        // Delete platform-specific business profiles and ALL related data
        switch (platform) {
          case 'GOOGLE_MAPS': {
            await tx.googleBusinessProfile.deleteMany({
              where: { locationId },
            });
            break;
          }
          case 'FACEBOOK': {
            await tx.facebookBusinessProfile.deleteMany({
              where: { locationId },
            });
            break;
          }
          case 'TRIPADVISOR': {
            await tx.tripAdvisorBusinessProfile.deleteMany({
              where: { businessLocationId: locationId },
            });
            break;
          }
          case 'BOOKING': {
            await tx.bookingBusinessProfile.deleteMany({
              where: { businessLocationId: locationId },
            });
            break;
          }
          case 'INSTAGRAM': {
            // Instagram stays at team level
            await tx.instagramBusinessProfile.deleteMany({
              where: { teamId },
            });
            break;
          }
          case 'TIKTOK': {
            // TikTok stays at team level
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
        locationId_platform: {
          locationId,
          platform,
        },
      },
      update: {
        identifier,
        updatedAt: new Date(),
      },
      create: {
        locationId,
        platform,
        identifier,
      },
    });

    console.log(`✅ Market identifier saved successfully for ${platform} on location ${locationId}`);
    
    // Notify scraper about the new identifier
    await notifyScraperPlatformConfigured(teamId, locationId, platform, identifier);
    
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

// Helper function to notify scraper about platform configuration
async function notifyScraperPlatformConfigured(
  teamId: string,
  locationId: string,
  platform: MarketPlatform,
  identifier: string
) {
  try {
    if (!env.backendUrl) {
      console.log('⚠️ Backend URL not configured, skipping scraper notification');
      return;
    }

    const webhookEndpoint = `${env.backendUrl}/api/webhooks/platform-configured`;
    
    // Map platform names
    const platformMapping: Record<string, string> = {
      'GOOGLE_MAPS': 'google_maps',
      'FACEBOOK': 'facebook',
      'TRIPADVISOR': 'tripadvisor',
      'BOOKING': 'booking',
      'INSTAGRAM': 'instagram',
      'TIKTOK': 'tiktok'
    };

    const mappedPlatform = platformMapping[platform] || platform.toLowerCase();
    
    const requestPayload = {
      teamId,
      locationId,
      platform: mappedPlatform,
      identifier
    };

    console.log('🔔 Notifying scraper about platform configuration:', requestPayload);

    const response = await fetch(webhookEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Scraper notification failed:', errorText);
    } else {
      console.log('✅ Scraper notified successfully');
    }
  } catch (error) {
    console.error('❌ Error notifying scraper:', error);
    // Don't throw - this is a non-critical operation
  }
}

// Enhanced Platform Data Deletion with Direct Prisma Operations
export async function deletePlatformData(data: {
  teamId: string;
  locationId?: string;
  platform: string;
}) {
  await throwIfNotSuperAdmin();

  const { teamId, locationId } = data;
  
  // Map frontend platform names to backend MarketPlatform enum values
  const platformMapping: Record<string, string> = {
    GOOGLE: 'GOOGLE_MAPS',
    FACEBOOK: 'FACEBOOK',
    TRIPADVISOR: 'TRIPADVISOR',
    BOOKING: 'BOOKING',
    INSTAGRAM: 'INSTAGRAM',
    TIKTOK: 'TIKTOK',
  };
  
  // Map MarketPlatform to PlatformType (for BusinessCreationTask)
  const toPlatformType: Record<string, string> = {
    GOOGLE_MAPS: 'GOOGLE',
    FACEBOOK: 'FACEBOOK',
    TRIPADVISOR: 'TRIPADVISOR',
    BOOKING: 'BOOKING',
    INSTAGRAM: 'INSTAGRAM',
    TIKTOK: 'TIKTOK',
  };
  
  const platform = platformMapping[data.platform] || data.platform;
  const platformType = toPlatformType[platform] || platform;

  console.log(`🗑️ Deleting platform data for ${platform} on team ${teamId}${locationId ? `, location ${locationId}` : ''}`);

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
          if (locationId) {
          await tx.googleBusinessProfile.deleteMany({
              where: { locationId },
            });
          } else {
            // Delete all for team
            await tx.googleBusinessProfile.deleteMany({
              where: { 
                businessLocation: { teamId }
              },
          });
          }
          break;
        }
        case 'FACEBOOK': {
          if (locationId) {
          await tx.facebookBusinessProfile.deleteMany({
              where: { locationId },
            });
          } else {
            await tx.facebookBusinessProfile.deleteMany({
              where: { 
                businessLocation: { teamId }
              },
          });
          }
          break;
        }
        case 'TRIPADVISOR': {
          if (locationId) {
          await tx.tripAdvisorBusinessProfile.deleteMany({
              where: { businessLocationId: locationId },
            });
          } else {
            await tx.tripAdvisorBusinessProfile.deleteMany({
              where: { 
                businessLocation: { teamId }
              },
          });
          }
          break;
        }
        case 'BOOKING': {
          if (locationId) {
          await tx.bookingBusinessProfile.deleteMany({
              where: { businessLocationId: locationId },
            });
          } else {
            await tx.bookingBusinessProfile.deleteMany({
              where: { 
                businessLocation: { teamId }
              },
          });
          }
          break;
        }
        case 'INSTAGRAM': {
          // Instagram is team-level
          await tx.instagramBusinessProfile.deleteMany({
            where: { teamId },
          });
          break;
        }
        case 'TIKTOK': {
          // TikTok is team-level
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
          platform: platformType as PlatformType,
        },
      });

      // Delete market identifiers
      if (locationId) {
        await tx.businessMarketIdentifier.deleteMany({
          where: {
            locationId,
            platform: platform as MarketPlatform,
          },
        });
      } else {
        // Delete all market identifiers for this platform across all locations
        await tx.businessMarketIdentifier.deleteMany({
          where: {
            location: { teamId },
            platform: platform as MarketPlatform,
          },
        });
      }
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
        locations: {
          include: {
        marketIdentifiers: true,
            googleBusinessProfile: {
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
            facebookBusinessProfile: {
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
  // Get all market identifiers from all locations for this platform
  const marketIdentifiers = tenant.locations?.flatMap((loc: any) => 
    loc.marketIdentifiers?.filter((mi: any) => mi.platform === platform) || []
  ) || [];
  
  // For now, use the first one if multiple exist
  const marketIdentifier = marketIdentifiers[0];

  const task = tenant.businessCreationTasks.find(
    (t: any) => t.platform === platform
  );

  let profile = null;
  let reviewsCount = 0;
  let lastReviewDate = null;

  // Get platform-specific profile and reviews
  switch (platform) {
    case 'GOOGLE':
      // Get from locations (flatten all Google profiles from all locations)
      profile = tenant.locations?.flatMap((loc: any) => loc.googleBusinessProfile ? [loc.googleBusinessProfile] : []);
      if (profile && profile.length > 0) {
        // Aggregate reviews from all profiles
        const allReviews = profile.flatMap((p: any) => p.reviews || []);
        reviewsCount = allReviews.length;
        lastReviewDate = allReviews[0]?.publishedAtDate || null;
      }
      profile = profile && profile.length > 0 ? profile[0] : null; // Use first profile for display
      break;
    case 'FACEBOOK':
      // Get from locations
      profile = tenant.locations?.flatMap((loc: any) => loc.facebookBusinessProfile ? [loc.facebookBusinessProfile] : []);
      if (profile && profile.length > 0) {
        const allReviews = profile.flatMap((p: any) => p.reviews || []);
        reviewsCount = allReviews.length;
        lastReviewDate = allReviews[0]?.date || null;
      }
      profile = profile && profile.length > 0 ? profile[0] : null;
      break;
    case 'TRIPADVISOR':
      // Get from locations
      profile = tenant.locations?.flatMap((loc: any) => loc.tripAdvisorBusinessProfile ? [loc.tripAdvisorBusinessProfile] : []);
      if (profile && profile.length > 0) {
        const allReviews = profile.flatMap((p: any) => p.reviews || []);
        reviewsCount = allReviews.length;
        lastReviewDate = allReviews[0]?.publishedDate || null;
      }
      profile = profile && profile.length > 0 ? profile[0] : null;
      break;
    case 'BOOKING':
      // Get from locations
      profile = tenant.locations?.flatMap((loc: any) => loc.bookingBusinessProfile ? [loc.bookingBusinessProfile] : []);
      if (profile && profile.length > 0) {
        const allReviews = profile.flatMap((p: any) => p.reviews || []);
        reviewsCount = allReviews.length;
        lastReviewDate = allReviews[0]?.publishedDate || null;
      }
      profile = profile && profile.length > 0 ? profile[0] : null;
      break;
    case 'INSTAGRAM':
      // Instagram is still team-level
      profile = tenant.instagramBusinessProfile;
      if (profile?.dailySnapshots) {
        reviewsCount = profile.dailySnapshots.length;
        lastReviewDate = profile.dailySnapshots[0]?.snapshotDate || null;
      }
      break;
    case 'TIKTOK':
      // TikTok is still team-level
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
  locationId?: string;
  platform: string;
}) {
  await throwIfNotSuperAdmin();

  const { teamId, locationId, platform } = data;

  console.log(`🔍 Checking platform status for ${platform} on team ${teamId}${locationId ? `, location ${locationId}` : ''}`);

  try {
    // Verify team exists
    const team = await prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      throw new ApiError(404, 'Team not found');
    }

    // Get market identifier for the platform
    let marketIdentifier;
    if (locationId) {
      marketIdentifier = await prisma.businessMarketIdentifier.findUnique({
        where: {
          locationId_platform: {
            locationId,
            platform: platform as MarketPlatform,
          },
        },
      });
    } else {
      // Get first market identifier across all locations
      const identifiers = await prisma.businessMarketIdentifier.findMany({
        where: {
          location: { teamId },
          platform: platform as MarketPlatform,
        },
        take: 1,
      });
      marketIdentifier = identifiers[0];
    }

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
      // Get Instagram market identifier (from any location, since Instagram is team-level)
      const marketIdentifier = await prisma.businessMarketIdentifier.findFirst({
        where: {
          location: { teamId },
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
  teamId: string,
  locationId: string
) {
  // If no backend URL is configured, use mock responses for development
  if (!env.backendUrl) {
    console.log(
      `Mock backend call: ${action} for ${platform} with identifier ${identifier}, teamId ${teamId}, locationId ${locationId}`
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
      locationId,
      timestamp: new Date().toISOString(),
      message: `Mock ${action} completed for ${platform}`,
      error: undefined
    };
  }

  // Map platform names to match scraper's expected format
  const platformMapping: Record<string, string> = {
    'google_maps': 'google_maps',
    'google': 'google_maps',
    'facebook': 'facebook',
    'tripadvisor': 'tripadvisor',
    'booking': 'booking',
    'instagram': 'instagram',
    'tiktok': 'tiktok'
  };

  const mappedPlatform = platformMapping[platform.toLowerCase()] || platform.toLowerCase();
  
  console.log('🚀 Calling scraper webhook for platform configuration');
  console.log('Platform:', platform, '→', mappedPlatform, 'Action:', action, 'TeamId:', teamId, 'LocationId:', locationId);

  // Use the new webhook-driven architecture
  // The scraper will handle profile creation and initial data fetch automatically
  const webhookEndpoint = `${env.backendUrl}/api/webhooks/platform-configured`;
  
  const requestPayload = {
    teamId,
    locationId,
    platform: mappedPlatform,
    identifier
  };

  console.log('Request payload:', requestPayload);
  console.log('Webhook endpoint:', webhookEndpoint);

  try {
    const response = await fetch(webhookEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestPayload),
    });

    console.log('Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Scraper webhook error response:', errorText);
      throw new ApiError(
        response.status,
        `Scraper webhook error: ${response.statusText} - ${errorText}`
      );
    }

    const jsonResponse = await response.json();
    console.log('✅ Scraper webhook success response:', jsonResponse);
    
    // Transform response to match expected format
    return {
      success: jsonResponse.success,
      message: jsonResponse.message || 'Platform configured and scraping initiated',
      error: jsonResponse.error || undefined,
      initialTaskStarted: jsonResponse.initialTaskStarted,
      businessAdded: jsonResponse.businessAdded,
      action,
      platform: mappedPlatform,
      identifier,
      teamId,
      locationId: requestPayload.locationId,
      timestamp: new Date().toISOString()
    };
  } catch (fetchError) {
    console.error('❌ Fetch error details:', fetchError);
    if (fetchError instanceof ApiError) {
      throw fetchError;
    }
    throw new ApiError(
      500,
      `Network error calling scraper: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`
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
  const session = await auth();
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
  const session = await auth();
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
  const session = await auth();
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
  const session = await auth();
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
  const session = await auth();
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
