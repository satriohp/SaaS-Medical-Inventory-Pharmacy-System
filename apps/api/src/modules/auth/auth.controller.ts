import {
    Controller,
    Post,
    Get,
    Body,
    HttpCode,
    HttpStatus,
    UseGuards,
} from '@nestjs/common';
import { AuthService, RegisterDto, LoginDto } from './auth.service';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { z } from 'zod';

const registerSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),
    name: z.string().min(2).max(100).optional(),
    tenantName: z.string().min(2, 'Tenant name must be at least 2 characters').max(100),
    tenantSlug: z
        .string()
        .min(2)
        .max(50)
        .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
});

const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
    tenantId: z.string().optional(),
});

const refreshSchema = z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
});

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('register')
    async register(@Body(new ZodValidationPipe(registerSchema)) dto: RegisterDto) {
        return this.authService.register(dto);
    }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(@Body(new ZodValidationPipe(loginSchema)) dto: LoginDto) {
        return this.authService.login(dto);
    }

    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    async refresh(@Body(new ZodValidationPipe(refreshSchema)) body: { refreshToken: string }) {
        return this.authService.refreshTokens(body.refreshToken);
    }

    @Post('logout')
    @UseGuards(JwtGuard)
    @HttpCode(HttpStatus.OK)
    async logout(@CurrentUser('sub') userId: string) {
        return this.authService.logout(userId);
    }

    @Get('profile')
    @UseGuards(JwtGuard)
    async getProfile(@CurrentUser() user: any) {
        return this.authService.getProfile(user.sub, user.tenantId);
    }
}
