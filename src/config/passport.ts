import passport from 'passport';
import { Strategy as GoogleStrategy, Profile, VerifyCallback } from 'passport-google-oauth20';
import { prisma } from '../utils/prismaClient';
import dotenv from 'dotenv';

dotenv.config();

// Input validation: Ensure environment variables are set
if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.BACKEND_URL) {
  console.error("ERROR: Missing necessary OAuth environment variables (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, BACKEND_URL). Google login might not work.");
  // Decide if you want to exit if keys are missing in production: process.exit(1);
}

// --- Google Strategy ---
// Only configure if keys are actually present
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.BACKEND_URL) {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${process.env.BACKEND_URL}/api/auth/google/callback`, // Construct callback URL dynamically
        scope: ['profile', 'email'], // Request user's profile info and email address
      },
      // This is the "verify" function that runs after Google confirms the user
      async (accessToken: string, refreshToken: string | undefined, profile: Profile, done: VerifyCallback) => {
        try {
          // Log profile data received from Google (optional, for debugging)
          // console.log("Google Profile Data:", JSON.stringify(profile, null, 2));

          // 1. Try to find an existing user linked to this Google account
          let user = await prisma.user.findFirst({
            where: {
              provider: 'google',
              providerId: profile.id, // Google's unique ID for this user
            },
          });

          // 2. If found, log them in (return the user)
          if (user) {
            console.log(`Google OAuth: Found existing user by providerId: ${user.email}`);
            return done(null, user); // Pass the user object to Passport
          }

          // 3. If not found by Google ID, check if a user exists with the SAME EMAIL
          // This handles cases where they signed up with email/password first
          const email = profile.emails?.[0]?.value;
          if (!email) {
             // Google MUST return an email based on the 'email' scope we requested
             console.error("Google OAuth Error: No email returned from profile. Profile:", JSON.stringify(profile));
             // Pass an error to Passport
             return done(new Error('Google profile did not return an email address required for login/signup.'), undefined);
          }
          console.log(`Google OAuth: Profile email received: ${email}`);

          user = await prisma.user.findUnique({ where: { email } });

          if (user) {
            // User exists, but logged in locally before. Link their Google account now.
             console.log(`Google OAuth: Found existing user by email, linking Google ID: ${email}`);
             user = await prisma.user.update({
              where: { email },
              data: {
                provider: 'google',         // Set the provider
                providerId: profile.id,     // Store Google's ID
                // Optionally update name/avatar if they are missing or different from Google's
                name: user.name || profile.displayName || email.split('@')[0], // Use Google name if local is empty
                avatarUrl: user.avatarUrl || profile.photos?.[0]?.value || `https://api.dicebear.com/8.x/bottts-neutral/svg?seed=${encodeURIComponent(email)}`, // Use Google photo if local is empty
              },
            });
            return done(null, user); // Pass the updated user object
          }

          // 4. If no user found by Google ID or by email, create a BRAND NEW user
          console.log(`Google OAuth: No existing user found, creating new user: ${email}`);
          const newUser = await prisma.user.create({
            data: {
              email: email,
              name: profile.displayName || email.split('@')[0], // Use Google name or generate from email
              provider: 'google',           // Mark as Google user
              providerId: profile.id,       // Store Google's ID
              password: null,               // NO password for OAuth users
              avatarUrl: profile.photos?.[0]?.value || `https://api.dicebear.com/8.x/bottts-neutral/svg?seed=${encodeURIComponent(email)}`, // Use Google photo or generate DiceBear avatar
            },
          });
          return done(null, newUser); // Pass the newly created user object

        } catch (error: any) {
          // Handle any unexpected errors during database operations
          console.error("Error in Google OAuth Strategy DB operations:", error);
          return done(error, undefined); // Pass the error to Passport
        }
      }
    ));
} else {
    // Log a warning if the keys aren't set, so Google login won't be available
    console.warn("Google OAuth strategy not configured due to missing GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, or BACKEND_URL environment variables.");
}

// --- Passport Session Management ---
// These functions tell Passport how to store user info in the session (cookie)
// and how to retrieve it on subsequent requests.

// Stores just the user ID in the session cookie to keep it small
passport.serializeUser((user: any, done) => {
  // console.log("Serializing user ID:", user.id); // Debug log
  done(null, user.id); // Only store the user's ID in the session
});

// Retrieves the full user object from the database using the ID stored in the session
passport.deserializeUser(async (id: number, done) => {
   // console.log("Deserializing user ID:", id); // Debug log
  try {
    // Fetch the user from DB based on the ID from the session
    const user = await prisma.user.findUnique({ where: { id } });
     if (!user) {
         // If user is not found (e.g., deleted while session was active), handle it
         console.warn(`DeserializeUser: User with ID ${id} not found.`);
         return done(null, false); // Indicate user not found, Passport will clear the session
     }
    // console.log("Deserialized user object:", user); // Debug log (can be verbose)
    // Attach the fetched user object to req.user for use in subsequent middleware/routes
    done(null, user);
  } catch (error) {
    // Handle database errors during deserialization
    console.error("Error during user deserialization:", error);
    done(error, null);
  }
});

