import { EventEmitter } from 'events';

export interface MarketIdentifierChangeEvent {
  teamId: string;
  platform: string;
  oldIdentifier?: string;
  newIdentifier: string;
  timestamp: Date;
}

export interface BusinessProfileCreatedEvent {
  teamId: string;
  platform: string;
  identifier: string;
  businessProfileId: string;
  timestamp: Date;
}

export interface DataCleanupEvent {
  teamId: string;
  platform: string;
  oldIdentifier: string;
  status: 'started' | 'completed' | 'error';
  timestamp: Date;
  deletedRecords?: {
    businessProfiles: number;
    reviews: number;
    overviews: number;
  };
}

class MarketIdentifierEventEmitter extends EventEmitter {
  emitIdentifierChange(event: MarketIdentifierChangeEvent): void {
    this.emit('identifierChange', event);
  }

  onIdentifierChange(callback: (event: MarketIdentifierChangeEvent) => void): void {
    this.on('identifierChange', callback);
  }

  removeIdentifierChangeListener(callback: (event: MarketIdentifierChangeEvent) => void): void {
    this.removeListener('identifierChange', callback);
  }

  emitBusinessProfileCreated(event: BusinessProfileCreatedEvent): void {
    this.emit('businessProfileCreated', event);
  }

  onBusinessProfileCreated(callback: (event: BusinessProfileCreatedEvent) => void): void {
    this.on('businessProfileCreated', callback);
  }

  removeBusinessProfileCreatedListener(callback: (event: BusinessProfileCreatedEvent) => void): void {
    this.removeListener('businessProfileCreated', callback);
  }

  emitDataCleanup(event: DataCleanupEvent): void {
    this.emit('dataCleanup', event);
  }

  onDataCleanup(callback: (event: DataCleanupEvent) => void): void {
    this.on('dataCleanup', callback);
  }

  removeDataCleanupListener(callback: (event: DataCleanupEvent) => void): void {
    this.removeListener('dataCleanup', callback);
  }
}

export const marketIdentifierEvents = new MarketIdentifierEventEmitter(); 