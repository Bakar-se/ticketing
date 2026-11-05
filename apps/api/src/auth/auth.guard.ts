import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { IS_PUBLIC_KEY } from './public/public.decorator.js';
import { Reflector } from '@nestjs/core';

export type SessionUser = {
  id: string;
  email: string;
  name: string;
}

// The auth service is outside this app. Tests replace this reader.
@Injectable()
export class SessionReader {
  async read(request: {
    headers: { cookie?: string };
  }): Promise<{ user?: SessionUser } | null> {
    const cookie = request.headers.cookie;
    const response = await fetch(`${process.env.AUTH_URL}/api/auth/get-session`, {
      headers: cookie ? { cookie } : {},
    });
    if (!response.ok) throw new UnauthorizedException();
    return (await response.json()) as { user?: SessionUser } | null;
  }
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessions: SessionReader,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    const request = context.switchToHttp().getRequest();
    const body = await this.sessions.read(request);
    if (!body?.user) {
      throw new UnauthorizedException();
    }
    request.user = body.user;
    return true;
  }
}
