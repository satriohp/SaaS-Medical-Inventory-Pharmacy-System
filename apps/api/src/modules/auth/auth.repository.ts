import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class AuthRepository {
    constructor(private readonly prisma: PrismaService) { }

    async findUserByEmail(email: string) {
        return this.prisma.user.findUnique({
            where: { email },
            include: {
                tenants: {
                    include: { tenant: true },
                    where: { isActive: true },
                },
            },
        });
    }

    async findUserById(id: string) {
        return this.prisma.user.findUnique({
            where: { id },
            include: {
                tenants: {
                    include: { tenant: true },
                    where: { isActive: true },
                },
            },
        });
    }

    async createUser(data: Prisma.UserCreateInput) {
        return this.prisma.user.create({
            data,
            include: {
                tenants: {
                    include: { tenant: true },
                },
            },
        });
    }

    // ================ REFRESH TOKENS ================

    async createRefreshToken(data: {
        token: string;
        userId: string;
        expiresAt: Date;
    }) {
        return this.prisma.refreshToken.create({ data });
    }

    async findRefreshToken(token: string) {
        return this.prisma.refreshToken.findUnique({
            where: { token },
            include: { user: true },
        });
    }

    async revokeRefreshToken(token: string) {
        return this.prisma.refreshToken.update({
            where: { token },
            data: { revoked: true },
        });
    }

    async revokeAllUserTokens(userId: string) {
        return this.prisma.refreshToken.updateMany({
            where: { userId, revoked: false },
            data: { revoked: true },
        });
    }

    async deleteExpiredTokens() {
        return this.prisma.refreshToken.deleteMany({
            where: {
                OR: [
                    { expiresAt: { lt: new Date() } },
                    { revoked: true },
                ],
            },
        });
    }
}
