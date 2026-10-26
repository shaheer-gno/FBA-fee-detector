import {
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService implements OnModuleInit {
  private readonly logger = new Logger(SupabaseService.name);
  readonly client: SupabaseClient;

  constructor(config: ConfigService) {
    const url = config.get<string>('SUPABASE_URL')?.trim();
    const key = config.get<string>('SUPABASE_SERVICE_ROLE_KEY')?.trim();

    if (!url || !key) {
      throw new Error(
        [
          'Database configuration missing.',
          'Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in apps/api/.env',
          '(from `pnpm db:status` after `pnpm db:start`).',
        ].join(' '),
      );
    }

    this.client = createClient(url, key);
    this.logger.log(`Supabase client configured (${url})`);
  }

  async onModuleInit(): Promise<void> {
    const { error } = await this.client
      .from('products')
      .select('id')
      .limit(1);

    if (error) {
      throw new Error(
        [
          `Database connection failed: ${error.message}.`,
          'Ensure local Supabase is running (`pnpm db:start`) and migrations are applied (`pnpm db:reset`).',
        ].join(' '),
      );
    }

    this.logger.log('Database connection OK');
  }
}
