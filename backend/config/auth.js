const { betterAuth } = require("better-auth");
const { mongodbAdapter } = require("better-auth/adapters/mongodb");
const { bearer } = require("better-auth/plugins");
const mongoose = require("mongoose");
const { sendVerificationEmail } = require("../services/emailService");

const getMongoDb = () => {
  const db = mongoose.connection?.db;
  if (!db) {
    throw new Error("MongoDB connection is not ready. Call connectDB() before loading auth.");
  }
  return db;
};

const normalizeBaseURL = (value) => {
  if (!value) return value;
  return value.endsWith("/") ? value.slice(0, -1) : value;
};

const buildAuthBaseURL = () => {
  if (process.env.BETTER_AUTH_URL) {
    return normalizeBaseURL(process.env.BETTER_AUTH_URL);
  }

  const fallbackBase = normalizeBaseURL(
    process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 8000}`
  );

  if (fallbackBase.endsWith("/api/auth")) {
    return fallbackBase;
  }

  return `${fallbackBase}/api/auth`;
};

const auth = betterAuth({
  baseURL: buildAuthBaseURL(),
  database: mongodbAdapter(getMongoDb()),
  plugins: [bearer()],
  emailAndPassword: {
    enabled: true,
    // Enable email verification only when RESEND_API_KEY is configured.
    // Without a working email provider, enabling this would lock all new users out.
    requireEmailVerification: !!process.env.RESEND_API_KEY,
  },
  // Email verification is active when RESEND_API_KEY is set (see above).
  ...(process.env.RESEND_API_KEY ? {
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: false,
      sendVerificationEmail,
    },
  } : {}),
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  user: {
    additionalFields: {
      username: {
        type: "string",
        required: true,
      },
      age: {
        type: "number",
        required: false,
      },
      sexe: {
        type: "string",
        required: false,
      },
      ville: {
        type: "string",
        required: false,
      },
      role: {
        type: "string",
        defaultValue: "user",
      },
      isAnonymous: {
        type: "boolean",
        defaultValue: false,
      },
      avatarUrl: {
        type: "string",
        required: false,
      }
    }
  }
});

module.exports = auth;
