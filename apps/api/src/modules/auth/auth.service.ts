import {
    Injectable,
    UnauthorizedException,
    ConflictException,
    Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { AuthRepository } from './auth.repository';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '@prisma/client';

// ============================================================================
// TYPES
// ============================================================================

export interface RegisterDto {
    email: string;
    password: string;
    name?: string;
    tenantName: string;
    tenantSlug: string;
}

export interface LoginDto {
    email: string;
    password: string;
    tenantId?: string;
}

export interface JwtPayload {
    sub: string;        // userId
    email: string;
    tenantId: string;
    role: Role;
}

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}

// ============================================================================
// SERVICE
// ============================================================================

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);
    private readonly BCRYPT_ROUNDS = 12;

    constructor(
        private readonly authRepository: AuthRepository,
        private readonly jwtService: JwtService,
        private readonly prisma: PrismaService,
    ) { }

    /**
     * Register a new user + create their first tenant.
     * The registering user becomes the OWNER of the new tenant.
     */
    async register(dto: RegisterDto) {
        // Check if email already exists
        const existingUser = await this.authRepository.findUserByEmail(dto.email);
        if (existingUser) {
            throw new ConflictException('Email already registered');
        }

        // Hash password
        const passwordHash = await bcrypt.hash(dto.password, this.BCRYPT_ROUNDS);

        // Create user, tenant, and membership in a transaction
        const result = await this.prisma.$transaction(async (tx) => {
            // 1. Create user
            const user = await tx.user.create({
                data: {
                    email: dto.email,
                    passwordHash,
                    name: dto.name,
                },
            });

            // 2. Create tenant
            const tenant = await tx.tenant.create({
                data: {
                    name: dto.tenantName,
                    slug: dto.tenantSlug,
                },
            });

            // 3. Create tenant membership (OWNER role)
            const tenantUser = await tx.tenantUser.create({
                data: {
                    userId: user.id,
                    tenantId: tenant.id,
                    role: Role.OWNER,
                },
            });

            // 4. Create default inventory for the tenant
            await tx.inventory.create({
                data: {
                    tenantId: tenant.id,
                    name: 'Main Warehouse',
                },
            });

            return { user, tenant, tenantUser };
        });

        // Generate tokens
        const tokens = await this.generateTokens({
            sub: result.user.id,
            email: result.user.email,
            tenantId: result.tenant.id,
            role: Role.OWNER,
        });

        this.logger.log(`User registered: ${dto.email} | Tenant: ${dto.tenantSlug}`);

        return {
            user: {
                id: result.user.id,
                email: result.user.email,
                name: result.user.name,
            },
            tenant: {
                id: result.tenant.id,
                name: result.tenant.name,
                slug: result.tenant.slug,
            },
            ...tokens,
        };
    }

    /**
     * Authenticate user with email + password.
     * If user belongs to multiple tenants, tenantId must be provided.
     */
    async login(dto: LoginDto) {
        const user = await this.authRepository.findUserByEmail(dto.email);
        if (!user) {
            throw new UnauthorizedException('Invalid email or password');
        }

        if (!user.isActive) {
            throw new UnauthorizedException('Account is deactivated');
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid email or password');
        }

        // Determine tenant
        const activeTenants = user.tenants.filter(
            (tu: any) => tu.isActive && tu.tenant.isActive,
        );

        if (activeTenants.length === 0) {
            throw new UnauthorizedException('No active tenant memberships found');
        }

        let selectedMembership: any;

        if (dto.tenantId) {
            // Specific tenant requested
            selectedMembership = activeTenants.find((tu: any) => tu.tenantId === dto.tenantId);
            if (!selectedMembership) {
                throw new UnauthorizedException('You are not a member of the specified tenant');
            }
        } else if (activeTenants.length === 1) {
            // Auto-select single tenant
            selectedMembership = activeTenants[0];
        } else {
            // Multiple tenants — return tenant list for selection
            return {
                requireTenantSelection: true,
                tenants: activeTenants.map((tu: any) => ({
                    tenantId: tu.tenantId,
                    tenantName: tu.tenant.name,
                    tenantSlug: tu.tenant.slug,
                    role: tu.role,
                })),
            };
        }

        // Generate tokens
        const tokens = await this.generateTokens({
            sub: user.id,
            email: user.email,
            tenantId: selectedMembership.tenantId,
            role: selectedMembership.role,
        });

        this.logger.log(`User logged in: ${dto.email} | Tenant: ${selectedMembership.tenantId}`);

        return {
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
            },
            tenant: {
                id: selectedMembership.tenant.id,
                name: selectedMembership.tenant.name,
                slug: selectedMembership.tenant.slug,
            },
            role: selectedMembership.role,
            ...tokens,
        };
    }

    /**
     * Refresh access token using a valid refresh token.
     * Implements refresh token rotation — old token is revoked.
     */
    async refreshTokens(refreshToken: string) {
        const storedToken = await this.authRepository.findRefreshToken(refreshToken);

        if (!storedToken || storedToken.revoked || storedToken.expiresAt < new Date()) {
            throw new UnauthorizedException('Invalid or expired refresh token');
        }

        // Revoke the old refresh token (rotation)
        await this.authRepository.revokeRefreshToken(refreshToken);

        // Find user's active tenant membership
        const user = await this.authRepository.findUserById(storedToken.userId);
        if (!user || !user.isActive) {
            throw new UnauthorizedException('User account is deactivated');
        }

        const activeMembership = user.tenants.find((tu: any) => tu.isActive);
        if (!activeMembership) {
            throw new UnauthorizedException('No active tenant membership');
        }

        // Generate new tokens
        const tokens = await this.generateTokens({
            sub: user.id,
            email: user.email,
            tenantId: activeMembership.tenantId,
            role: activeMembership.role,
        });

        return {
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
            },
            ...tokens,
        };
    }

    /**
     * Logout — revoke all refresh tokens for the user.
     */
    async logout(userId: string) {
        await this.authRepository.revokeAllUserTokens(userId);
        this.logger.log(`User logged out: ${userId}`);
        return { message: 'Logged out successfully' };
    }

    /**
     * Get current user profile with tenant info.
     */
    async getProfile(userId: string, tenantId: string) {
        const user = await this.authRepository.findUserById(userId);
        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        const membership = user.tenants.find((tu: any) => tu.tenantId === tenantId);

        return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: membership?.role,
            tenant: membership?.tenant
                ? {
                    id: membership.tenant.id,
                    name: membership.tenant.name,
                    slug: membership.tenant.slug,
                    plan: membership.tenant.plan,
                }
                : null,
        };
    }

    // ============================================================================
    // PRIVATE HELPERS
    // ============================================================================

    private async generateTokens(payload: JwtPayload): Promise<AuthTokens> {
        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync(payload, {
                secret: process.env.JWT_SECRET,
                expiresIn: process.env.JWT_EXPIRY || '15m',
            }),
            this.createRefreshToken(payload.sub),
        ]);

        return { accessToken, refreshToken };
    }

    private async createRefreshToken(userId: string): Promise<string> {
        const token = randomBytes(64).toString('hex');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

        await this.authRepository.createRefreshToken({
            token,
            userId,
            expiresAt,
        });

        return token;
    }
}
