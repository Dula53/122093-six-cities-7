import { inject, injectable } from 'inversify';
import { DatabaseClient } from './database-client.interface.js';
import * as Mongoose from 'mongoose';
import { Component } from '../../types/index.js';
import { Logger } from '../logger/index.js';
import { setTimeout } from 'node:timers/promises';

enum Retry {
  COUNT = 5,
  TIMEOUT = 1000
}

@injectable()
export class MongoDatabaseClient implements DatabaseClient {
  private mongoose: typeof Mongoose;
  private isConnected: boolean;

  constructor(
    @inject(Component.Logger) private readonly logger: Logger
  ) {
    this.isConnected = false;
  }

  public isConnectedToDatabase() {
    return this.isConnected;
  }

  public async connect(uri: string): Promise<void> {
    if (this.isConnectedToDatabase()) {
      throw new Error('MongoDB client is already connected');
    }

    this.logger.info('Trying to connect to MongoDB...');

    let attempt = 0;
    while (attempt < Retry.COUNT) {
      try {
        this.mongoose = await Mongoose.connect(uri);
        this.isConnected = true;
        this.logger.info('Database connection established.');
        return;
      } catch (error) {
        attempt++;
        this.logger.error(`Failed to connect to the database. Attempt ${attempt}`, error as Error);
        await setTimeout(Retry.TIMEOUT);
      }
    }

    throw new Error(`Unable to establish database connection after ${Retry.COUNT} attempts`);
  }

  public async disconnect(): Promise<void> {
    if (!this.isConnectedToDatabase()) {
      throw new Error('Not connected to the database');
    }

    await this.mongoose.disconnect?.();
    this.isConnected = false;
    this.logger.info('Database connection closed.');
  }
}
