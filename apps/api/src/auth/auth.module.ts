import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { GoogleStrategy } from './google.strategy';
import { JwtStrategy } from './jwt.strategy';
import { OptionalJwtGuard } from './auth.guard';
import { User } from './entities/user.entity';

// Conditionally include Google strategy only if auth is enabled
const conditionalProviders = process.env.ENABLE_GOOGLE_AUTH === 'true'
  ? [GoogleStrategy, JwtStrategy, OptionalJwtGuard]
  : [JwtStrategy, OptionalJwtGuard];

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'dev-jwt-secret'),
        signOptions: { expiresIn: '7d' },
      }),
    }),
    TypeOrmModule.forFeature([User]),
  ],
  controllers: [AuthController],
  providers: conditionalProviders,
  exports: [OptionalJwtGuard, JwtModule],
})
export class AuthModule { }
