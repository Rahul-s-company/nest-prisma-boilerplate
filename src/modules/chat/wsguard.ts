import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Observable, catchError, map, of } from 'rxjs';
import { Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class WsAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const ctx = context.switchToWs();
    const client: Socket = ctx.getClient();
    const authToken = client.handshake.headers['authorization'];

    // console.log(authToken);
    if (!authToken) {
      return false; // No token provided
    }

    return of(authToken).pipe(
      map((token) => this.validateToken(token)),
      catchError(() => of(false)),
    );
  }

  private validateToken(token: string): boolean {
    try {
      const decoded = this.jwtService.verify(token);
      console.log('decode', decoded);
      // Optionally, you can check the decoded token's content here
      return !!decoded; // Return true if the decoded token is valid
    } catch (e) {
      return false; // Token is invalid
    }
  }
}
