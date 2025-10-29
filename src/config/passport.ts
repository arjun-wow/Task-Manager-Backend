import passport from 'passport';
import { Strategy as GoogleStrategy, Profile, VerifyCallback } from 'passport-google-oauth20';
import { prisma } from '../utils/prismaClient';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.BACKEND_URL) {
  console.error("ERROR: Missing necessary OAuth environment variables (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, BACKEND_URL). Google login might not work.");
}

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.BACKEND_URL) {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${process.env.BACKEND_URL}/api/auth/google/callback`, 
        scope: ['profile', 'email'], 
      },
      async (accessToken: string, refreshToken: string | undefined, profile: Profile, done: VerifyCallback) => {
        try {

          let user = await prisma.user.findFirst({
            where: {
              provider: 'google',
              providerId: profile.id, 
            },
          });

          if (user) {
            console.log(`Google OAuth: Found existing user by providerId: ${user.email}`);
            return done(null, user); 
          }

          const email = profile.emails?.[0]?.value;
          if (!email) {
             console.error("Google OAuth Error: No email returned from profile. Profile:", JSON.stringify(profile));
             return done(new Error('Google profile did not return an email address required for login/signup.'), undefined);
          }
          console.log(`Google OAuth: Profile email received: ${email}`);

          user = await prisma.user.findUnique({ where: { email } });

          if (user) {
             console.log(`Google OAuth: Found existing user by email, linking Google ID: ${email}`);
             user = await prisma.user.update({
              where: { email },
              data: {
                provider: 'google',         
                providerId: profile.id,    
                name: user.name || profile.displayName || email.split('@')[0], 
                avatarUrl: user.avatarUrl || profile.photos?.[0]?.value || `https://api.dicebear.com/8.x/bottts-neutral/svg?seed=${encodeURIComponent(email)}`, // Use Google photo if local is empty
              },
            });
            return done(null, user); 
          }

          console.log(`Google OAuth: No existing user found, creating new user: ${email}`);
          const newUser = await prisma.user.create({
            data: {
              email: email,
              name: profile.displayName || email.split('@')[0], 
              provider: 'google',           
              providerId: profile.id,       
              password: null,               
              avatarUrl: profile.photos?.[0]?.value || `https://api.dicebear.com/8.x/bottts-neutral/svg?seed=${encodeURIComponent(email)}`, // Use Google photo or generate DiceBear avatar
            },
          });
          return done(null, newUser); 

        } catch (error: any) {
          console.error("Error in Google OAuth Strategy DB operations:", error);
          return done(error, undefined); 
        }
      }
    ));
} else {
    console.warn("Google OAuth strategy not configured due to missing GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, or BACKEND_URL environment variables.");
}


passport.serializeUser((user: any, done) => {
  done(null, user.id); 
});

passport.deserializeUser(async (id: number, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
     if (!user) {
         console.warn(`DeserializeUser: User with ID ${id} not found.`);
         return done(null, false); 
     }
    done(null, user);
  } catch (error) {
    console.error("Error during user deserialization:", error);
    done(error, null);
  }
});

