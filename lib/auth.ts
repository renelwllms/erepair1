import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "./db";
import { authConfig } from "@/auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsedCredentials = z
          .object({
            email: z.string().email(),
            password: z.string().min(6),
          })
          .safeParse(credentials);

        if (!parsedCredentials.success) {
          return null;
        }

        const { email, password } = parsedCredentials.data;

        try {
          const user = await db.user.findUnique({
            where: { email },
          });

          if (!user || !user.isActive) {
            return null;
          }

          const passwordMatch = await bcrypt.compare(password, user.password);

          if (!passwordMatch) {
            return null;
          }

          // Update last login
          await db.user.update({
            where: { id: user.id },
            data: { lastLogin: new Date() },
          });

          return {
            id: user.id,
            email: user.email,
            name: `${user.firstName} ${user.lastName}`,
            role: user.role,
            firstName: user.firstName,
            lastName: user.lastName,
          };
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Handle Google OAuth sign-in
      if (account?.provider === "google" && user.email) {
        // Check if email domain is @erepair.co.nz
        if (!user.email.endsWith("@erepair.co.nz")) {
          // Redirect to unauthorized page
          return "/auth/unauthorized";
        }

        try {
          // Only allow OAuth sign-in for pre-provisioned users.
          const dbUser = await db.user.findUnique({
            where: { email: user.email },
          });

          if (!dbUser) {
            return "/auth/unauthorized";
          }

          // Update last login
          await db.user.update({
            where: { id: dbUser.id },
            data: { lastLogin: new Date() },
          });

          // Check if user is active
          if (!dbUser.isActive) {
            return false;
          }

          // Attach user data to the user object for JWT callback
          user.role = dbUser.role;
          user.firstName = dbUser.firstName;
          user.lastName = dbUser.lastName;
          user.id = dbUser.id;

          return true;
        } catch (error) {
          console.error("Google sign-in error:", error);
          return false;
        }
      }
      return true;
    },
    ...authConfig.callbacks,
  },
});
