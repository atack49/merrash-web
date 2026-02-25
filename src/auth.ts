import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { authConfig } from './auth.config';
import { prisma } from '@/lib/db';
import { comparePassword } from '@/lib/hash';

export const { handlers, auth, signIn, signOut } = NextAuth({
    ...authConfig,
    providers: [
        Credentials({
            async authorize(credentials) {
                try {
                    if (!credentials?.email || !credentials?.password) {
                        return null;
                    }

                    // Find user in database
                    const user = await prisma.user.findUnique({
                        where: { email: credentials.email as string },
                    });

                    if (!user) {
                        return null;
                    }

                    // Compare password
                    const isValidPassword = await comparePassword(
                        credentials.password as string,
                        user.password
                    );

                    if (!isValidPassword) {
                        return null;
                    }

                    // Return user data without password
                    return {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        role: user.role,
                    };
                } catch (error) {
                    console.error('Authorization error:', error);
                    return null;
                }
            },
        }),
    ],
});
