import { MarketPlatform } from '@prisma/client';
import { IBusinessService, BusinessProfileResult } from '../interfaces/IBusinessService';
import { IBusinessRepository } from '../interfaces/IBusinessRepository';
import { FacebookBusinessProfile } from '@prisma/client';

/**
 * Facebook Business Service
 * Follows Single Responsibility Principle (SRP) - only handles Facebook business operations
 * Follows Dependency Inversion Principle (DIP) - depends on abstractions, not concretions
 */
export class FacebookBusinessService implements IBusinessService {
  constructor(
    private businessRepository: IBusinessRepository<FacebookBusinessProfile>,
    private teamService: any // TODO: Define proper interface
  ) {}

  async createProfile(teamId: string, platform: MarketPlatform, identifier: string): Promise<BusinessProfileResult> {
    try {
      // Validate team exists
      const team = await this.teamService.getTeamById(teamId);
      if (!team) {
        return {
          success: false,
          error: 'Team not found'
        };
      }

      // Check if profile already exists
      const existingProfile = await this.businessRepository.findByPlaceId(identifier);
      if (existingProfile) {
        return {
          success: true,
          businessId: existingProfile.id,
          profileData: existingProfile
        };
      }

      // Create new profile
      const profile = await this.businessRepository.create({
        teamId,
        pageId: identifier,
        pageName: '', // Will be populated by actor
        pageUrl: '',
        category: '',
        address: '',
        rating: 0,
        reviewCount: 0,
        categories: [],
        phone: '',
        website: '',
        scrapedAt: new Date(),
        metadata: {
          isActive: true,
          updateFrequencyMinutes: 60,
          nextUpdateAt: new Date(),
          lastUpdateAt: new Date()
        }
      } as any);

      return {
        success: true,
        businessId: profile.id,
        profileData: profile
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getProfile(teamId: string, platform: MarketPlatform): Promise<BusinessProfileResult> {
    try {
      const profile = await this.businessRepository.findByPlatform(teamId, platform);
      
      if (!profile) {
        return {
          success: false,
          error: 'Profile not found'
        };
      }

      return {
        success: true,
        businessId: profile.id,
        profileData: profile
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async updateProfile(teamId: string, platform: MarketPlatform, data: any): Promise<BusinessProfileResult> {
    try {
      const profile = await this.businessRepository.findByPlatform(teamId, platform);
      
      if (!profile) {
        return {
          success: false,
          error: 'Profile not found'
        };
      }

      const updatedProfile = await this.businessRepository.update(profile.id, data);

      return {
        success: true,
        businessId: updatedProfile.id,
        profileData: updatedProfile
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async deleteProfile(teamId: string, platform: MarketPlatform): Promise<BusinessProfileResult> {
    try {
      const profile = await this.businessRepository.findByPlatform(teamId, platform);
      
      if (!profile) {
        return {
          success: false,
          error: 'Profile not found'
        };
      }

      await this.businessRepository.delete(profile.id);

      return {
        success: true
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
