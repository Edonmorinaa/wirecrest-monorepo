import { Client } from 'pg';
import { MarketPlatform } from '@prisma/client';
import { marketIdentifierEvents, MarketIdentifierChangeEvent } from '../events/marketIdentifierEvents';

interface DatabaseNotification {
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  teamId: string;
  platform: MarketPlatform;
  newIdentifier: string | null;
  oldIdentifier: string | null;
  timestamp: string;
}

export class DatabaseListener {
  private client: Client;
  private connectionString: string;
  private isListening: boolean = false;

  constructor(connectionString: string) {
    this.connectionString = connectionString;
    this.client = new Client({
      connectionString,
    });
  }

  /**
   * Start listening to database notifications
   */
  async start(): Promise<void> {
    if (this.isListening) {
      console.log('Database listener is already running');
      return;
    }

    try {
      await this.client.connect();
      console.log('Connected to PostgreSQL for database notifications');

      // Listen to the market_identifier_change channel
      await this.client.query('LISTEN market_identifier_change');
      console.log('Listening for market identifier changes...');

      // Set up notification handler
      this.client.on('notification', this.handleNotification.bind(this));

      // Handle connection errors
      this.client.on('error', (error) => {
        console.error('Database listener error:', error);
        this.reconnect();
      });

      // Handle connection end
      this.client.on('end', () => {
        console.log('Database listener connection ended');
        if (this.isListening) {
          this.reconnect();
        }
      });

      this.isListening = true;
      console.log('Database listener started successfully');

    } catch (error) {
      console.error('Failed to start database listener:', error);
      throw error;
    }
  }

  /**
   * Stop listening to database notifications
   */
  async stop(): Promise<void> {
    if (!this.isListening) {
      return;
    }

    this.isListening = false;

    try {
      await this.client.query('UNLISTEN market_identifier_change');
      await this.client.end();
      console.log('Database listener stopped');
    } catch (error) {
      console.error('Error stopping database listener:', error);
    }
  }

  /**
   * Handle incoming database notifications
   */
  private handleNotification(msg: any): void {
    try {
      if (msg.channel !== 'market_identifier_change') {
        return;
      }

      console.log('Received database notification:', msg.payload);

      const notification: DatabaseNotification = JSON.parse(msg.payload);

      // Convert to our event format and emit
      if (notification.operation === 'INSERT' || notification.operation === 'UPDATE') {
        // Only trigger workflow for INSERT and UPDATE operations
        if (notification.newIdentifier) {
          const changeEvent: MarketIdentifierChangeEvent = {
            teamId: notification.teamId,
            platform: notification.platform,
            oldIdentifier: notification.oldIdentifier || undefined,
            newIdentifier: notification.newIdentifier,
            timestamp: new Date(notification.timestamp)
          };

          console.log(`Database change detected: ${notification.operation} for team ${notification.teamId}, platform ${notification.platform}`);
          console.log(`  Old: ${notification.oldIdentifier || 'none'} → New: ${notification.newIdentifier}`);

          // Emit the market identifier change event
          marketIdentifierEvents.emitIdentifierChange(changeEvent);
        }
      } else if (notification.operation === 'DELETE') {
        // For DELETE operations, we might want to trigger cleanup
        console.log(`Market identifier deleted for team ${notification.teamId}, platform ${notification.platform}: ${notification.oldIdentifier}`);
        
        // Emit data cleanup event
        if (notification.oldIdentifier) {
          marketIdentifierEvents.emitDataCleanup({
            teamId: notification.teamId,
            platform: notification.platform,
            oldIdentifier: notification.oldIdentifier,
            status: 'started',
            timestamp: new Date()
          });
        }
      }

    } catch (error) {
      console.error('Error handling database notification:', error);
    }
  }

  /**
   * Reconnect to the database
   */
  private async reconnect(): Promise<void> {
    if (!this.isListening) {
      return;
    }

    console.log('Attempting to reconnect database listener...');

    try {
      // Wait a bit before reconnecting
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Create new client
      await this.client.end().catch(() => {}); // Ignore errors
      this.client = new Client({
        connectionString: this.connectionString
      });

      // Restart listening
      await this.start();

    } catch (error) {
      console.error('Failed to reconnect database listener:', error);
      
      // Try again after a longer delay
      setTimeout(() => {
        this.reconnect();
      }, 30000); // 30 seconds
    }
  }

  /**
   * Get listener status
   */
  getStatus(): {
    isListening: boolean;
    connectionState: string;
  } {
    return {
      isListening: this.isListening,
      connectionState: this.isListening ? 'connected' : 'disconnected'
    };
  }

  /**
   * Test the database listener by inserting a test record
   */
  async testListener(teamId: string = 'test-team'): Promise<void> {
    if (!this.isListening) {
      throw new Error('Database listener is not running');
    }

    const testClient = new Client({
      connectionString: this.connectionString
    });

    try {
      await testClient.connect();

      // Insert a test record
      const testQuery = `
        INSERT INTO "BusinessMarketIdentifier" (id, "teamId", platform, identifier, "createdAt", "updatedAt")
        VALUES (gen_random_uuid(), $1, 'GOOGLE_MAPS', 'ChIJtest-' || extract(epoch from now()), NOW(), NOW())
        RETURNING *
      `;

      const result = await testClient.query(testQuery, [teamId]);
      console.log('Test record inserted:', result.rows[0]);

      // Clean up test record after a short delay
      setTimeout(async () => {
        try {
          await testClient.query(
            'DELETE FROM "BusinessMarketIdentifier" WHERE id = $1',
            [result.rows[0].id]
          );
          console.log('Test record cleaned up');
        } catch (error) {
          console.error('Error cleaning up test record:', error);
        } finally {
          await testClient.end();
        }
      }, 5000);

    } catch (error) {
      await testClient.end();
      throw error;
    }
  }
} 