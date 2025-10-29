import { MarketPlatform } from '@prisma/client';
import { IBusinessService, BusinessProfileResult } from '../interfaces/IBusinessService';
import { IBusinessRepository } from '../interfaces/IBusinessRepository';
import { BookingBusinessProfile } from '@prisma/client';
import { BusinessProfileCreationService } from '../../services/businessProfileCreationService';

/**
 * Booking Business Service
 * Follows Single Responsibility Principle (SRP) - only handles Booking business operations
 * Follows Dependency Inversion Principle (DIP) - depends on abstractions, not concretions
 * 
 * Note: Currently delegates to legacy BusinessProfileCreationService for profile creation
 * TODO: Migrate fully to SOLID architecture
 */
export class BookingBusinessService implements IBusinessService {
  private legacyCreationService: BusinessProfileCreationService;

  constructor(
    private businessRepository: IBusinessRepository<BookingBusinessProfile>,
    private teamService: any, // TODO: Define proper interface
    apifyToken: string
  ) {
    this.legacyCreationService = new BusinessProfileCreationService(apifyToken);
  }

  async createProfile(teamId: string, platform: MarketPlatform, identifier: string): Promise<BusinessProfileResult> {
    try {
      // Use the legacy service which fully works
      const result = await this.legacyCreationService.ensureBusinessProfileExists(
        teamId,
        platform,
        identifier
      );

      if (!result.exists || result.error) {
        return {
          success: false,
          error: result.error || 'Failed to create business profile'
        };
      }

      // Fetch the created profile
      const profile = await this.businessRepository.findById(result.businessProfileId!);
      
      return {
        success: true,
        businessId: result.businessProfileId!,
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
