import NextAuth, { type NextAuthConfig } from 'next-auth'
import GitHub from 'next-auth/providers/github'
import { env } from './env'

export function isAdminLogin(login: string | undefined | null): boolean {
  return !!login && login === env.ADMIN_GITHUB_LOGIN
}

export const authConfig: NextAuthConfig = {
  providers: [GitHub({ clientId: env.AUTH_GITHUB_ID, clientSecret: env.AUTH_GITHUB_SECRET })],
  secret: env.AUTH_SECRET,
  callbacks: {
    async signIn({ profile }) {
      const login = (profile as { login?: string } | undefined)?.login
      return isAdminLogin(login)
    },
  },
  pages: { signIn: '/api/auth/signin' },
}

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)
