import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import GitHub from 'next-auth/providers/github'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      try {
        await connectDB()
        const existingUser = await User.findOne({ email: user.email })
        if (!existingUser) {
          await User.create({
            name: user.name || 'User',
            email: user.email || '',
            image: user.image || '',
            provider: account?.provider || 'oauth',
          })
        }
        return true
      } catch (error) {
        console.error('SignIn error:', error)
        return false
      }
    },
    async session({ session }) {
      if (session.user?.email) {
        await connectDB()
        const dbUser = await User.findOne({ email: session.user.email })
        if (dbUser) {
          session.user.id = dbUser._id.toString()
        }
      }
      return session
    },
    async jwt({ token }) {
      return token
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: { strategy: 'jwt' },
})
