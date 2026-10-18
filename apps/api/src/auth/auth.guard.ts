import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { IS_PUBLIC_KEY } from './public/public.decorator.js';
import { Reflector } from '@nestjs/core';

export type SessionUser = {
  id: string;
  email: string;
  name: string;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    const request = context.switchToHttp().getRequest();
    const cookie = request.headers.cookie as string | undefined;
    const response = await fetch(`${process.env.AUTH_URL}/api/auth/get-session`, {
      headers: cookie ? { cookie } : {} ,
    });

    if(!response.ok) {
      throw new UnauthorizedException();
    }

    const body = (await response.json()) as { user: SessionUser } | null;
    if (!body?.user) {
      throw new UnauthorizedException();
    }
    request.user = body.user;
    return true;
  }
}
