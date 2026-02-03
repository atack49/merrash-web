import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { authConfig } from './auth.config';

export const { handlers, auth, signIn, signOut } = NextAuth({
    ...authConfig,
    providers: [
        Credentials({
            async authorize(credentials) {
                if (credentials?.username === 'admin1' && credentials?.password === 'merrash2024') {
                    return { id: '1', name: 'Admin 1', role: 'admin' };
                }
                if (credentials?.username === 'admin2' && credentials?.password === 'merrash2024') {
                    return { id: '2', name: 'Admin 2', role: 'admin' };
                }
                return null;
            },
        }),
    ],
});
