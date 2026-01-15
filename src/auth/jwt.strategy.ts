import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { sha256 } from '../common/utils/hash.util';
import { AuthService } from './auth.service';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get<string>('JWT_SECRET') ?? 'dev-secret',
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtPayload) {
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
    if (!token) {
      throw new UnauthorizedException('Missing token');
    }

    const user = await this.authService.validateTokenSession(payload, token);

    const roles = user.roles.map((r) => r.role.name);
    const permissions = user.roles.flatMap((r) =>
      r.role.permissions.map((p) => p.permission.key),
    );

    return {
      id: user.id,
      dni: user.dni,
      chapterId: user.chapterId,
      roles,
      permissions: Array.from(new Set(permissions)),
      sessionTokenHash: sha256(token),
    };
  }
}
