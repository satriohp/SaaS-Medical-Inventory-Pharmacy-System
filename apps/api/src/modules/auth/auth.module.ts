import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';

@Module({
    imports: [
        JwtModule.registerAsync({
            global: true,
            useFactory: () => ({
                secret: process.env.JWT_SECRET || 'fallback-secret-change-in-production',
                signOptions: { expiresIn: '15m' } as const,
            }),
        }),
    ],
    controllers: [AuthController],
    providers: [AuthService, AuthRepository],
    exports: [AuthService],
})
export class AuthModule { }
