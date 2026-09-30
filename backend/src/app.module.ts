import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { RedisThrottlerStorage } from './redis/redis-throttler.storage';
import { QueueModule } from './queue/queue.module';
import { StorageModule } from './storage/storage.module';
import { MetricsModule } from './metrics/metrics.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { UploadsModule } from './uploads/uploads.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { StudentsModule } from './students/students.module';
import { ParentsModule } from './parents/parents.module';
import { TeachersModule } from './teachers/teachers.module';
import { ClassesModule } from './classes/classes.module';
import { SubjectsModule } from './subjects/subjects.module';
import { AcademicModule } from './academic/academic.module';
import { ExaminationsModule } from './examinations/examinations.module';
import { ResultsModule } from './results/results.module';
import { PaymentsModule } from './payments/payments.module';
import { AnnouncementsModule } from './announcements/announcements.module';
import { EventsModule } from './events/events.module';
import { DocumentsModule } from './documents/documents.module';
import { ResourcesModule } from './resources/resources.module';
import { GalleryModule } from './gallery/gallery.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AiModule } from './ai/ai.module';
import { AuditModule } from './audit/audit.module';
import { SettingsModule } from './settings/settings.module';
import { SearchModule } from './search/search.module';
import { HealthModule } from './health/health.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { PermissionsGuard } from './auth/guards/permissions.guard';
import { CsrfGuard } from './auth/guards/csrf.guard';
import { RequestLoggingInterceptor } from './common/interceptors/request-logging.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../.env'] }),
    PrismaModule,
    RedisModule,
    // Rate limits are counted in Redis so every API replica shares one budget per client.
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule, RedisModule],
      inject: [ConfigService, RedisThrottlerStorage],
      useFactory: (config: ConfigService, storage: RedisThrottlerStorage) => ({
        throttlers: [{
          ttl: config.get<number>('RATE_LIMIT_TTL', 60) * 1000,
          limit: config.get<number>('RATE_LIMIT_MAX', 100),
        }],
        storage,
      }),
    }),
    QueueModule,
    StorageModule,
    MetricsModule,
    MaintenanceModule,
    UploadsModule,
    AuthModule,
    UsersModule,
    StudentsModule,
    ParentsModule,
    TeachersModule,
    ClassesModule,
    SubjectsModule,
    AcademicModule,
    ExaminationsModule,
    ResultsModule,
    PaymentsModule,
    AnnouncementsModule,
    EventsModule,
    DocumentsModule,
    ResourcesModule,
    GalleryModule,
    NotificationsModule,
    AiModule,
    AuditModule,
    SettingsModule,
    SearchModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: CsrfGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_INTERCEPTOR, useClass: RequestLoggingInterceptor },
  ],
})
export class AppModule {}
