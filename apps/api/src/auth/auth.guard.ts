import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';

// Only enforces JWT auth when ENABLE_GOOGLE_AUTH is true
@Injectable()
export class OptionalJwtGuard implements CanActivate {
  private readonly enabled: boolean;
  private readonly jwtGuard: CanActivate;

  constructor(private readonly config: ConfigService) {
    this.enabled = this.config.get<string>('ENABLE_GOOGLE_AUTH', 'false') === 'true';
    this.jwtGuard = new (AuthGuard('jwt'))();
  }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    if (!this.enabled) return true;
    return this.jwtGuard.canActivate(context) as boolean | Promise<boolean>;
  }
}
