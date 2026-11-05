import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import type { SessionUser } from '../auth/auth.guard.js';
import { MembershipService } from './membership.service.js';

@Injectable()
export class AcceptInvitesInterceptor implements NestInterceptor {
  constructor(private readonly membership: MembershipService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest<{ user?: SessionUser }>();
    if (request.user) {
      await this.membership.ensureCreator(request.user);
      await this.membership.acceptPending(request.user);
    }
    return next.handle();
  }
}
