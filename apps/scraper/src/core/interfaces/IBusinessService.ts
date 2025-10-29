import { MarketPlatform } from '@prisma/client';

/**
 * Business service interface
 * Defines contract for business operations (ISP)
 */
export interface IBusinessService {
  createProfile(teamId: string, platform: MarketPlatform, identifier: string): Promise<BusinessProfileResult>;
  getProfile(teamId: string, platform: MarketPlatform): Promise<BusinessProfileResult>;
  updateProfile(teamId: string, platform: MarketPlatform, data: any): Promise<BusinessProfileResult>;
  deleteProfile(teamId: string, platform: MarketPlatform): Promise<BusinessProfileResult>;
}

export interface BusinessProfileResult {
  success: boolean;
  businessId?: string;
  profileData?: any;
  error?: string;
  created?: boolean; // Indicates if the profile was newly created (true) or already existed (false)
}
