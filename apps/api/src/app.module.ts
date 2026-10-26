import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { join } from 'node:path';
import { DetectionsModule } from './detections/detections.module';
import { ProductsModule } from './products/products.module';
import { SupabaseModule } from './supabase/supabase.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Absolute paths so .env loads even if cwd is the monorepo root
      envFilePath: [
        join(__dirname, '..', '.env'),
        join(__dirname, '..', '.env.local'),
        join(process.cwd(), '.env'),
      ],
    }),
    SupabaseModule,
    ProductsModule,
    DetectionsModule,
  ],
})
export class AppModule {}

