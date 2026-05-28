import { google } from "googleapis";
import { db } from "./db";

const OAuth2 = google.auth.OAuth2;
const GOOGLE_WORKSPACE_SCOPES = [
  "https://mail.google.com/",
  "https://www.googleapis.com/auth/calendar.readonly",
];

/**
 * Creates OAuth2 client for Gmail API
 */
export async function createGmailOAuth2Client(redirectUri?: string) {
  const settings = await db.settings.findFirst();

  if (!settings?.googleClientId || !settings?.googleClientSecret) {
    throw new Error("Gmail OAuth credentials not configured in settings");
  }

  const oauth2Client = new OAuth2(
    settings.googleClientId,
    settings.googleClientSecret,
    redirectUri || `${process.env.NEXTAUTH_URL}/api/settings/gmail-callback` // Redirect URL
  );

  // Set credentials if we have a refresh token
  if (settings.googleRefreshToken) {
    oauth2Client.setCredentials({
      refresh_token: settings.googleRefreshToken,
    });
  }

  return oauth2Client;
}

/**
 * Get access token for Gmail
 */
export async function getGmailAccessToken(): Promise<string> {
  const oauth2Client = await createGmailOAuth2Client();
  const settings = await db.settings.findFirst();

  if (!settings?.googleRefreshToken) {
    throw new Error("Gmail not authorized. Please authorize in settings.");
  }

  const { token } = await oauth2Client.getAccessToken();

  if (!token) {
    throw new Error("Failed to get Gmail access token");
  }

  return token;
}

/**
 * Generate authorization URL for Gmail OAuth
 */
export async function generateGmailAuthUrl(
  redirectUri?: string,
  state?: string
): Promise<string> {
  const oauth2Client = await createGmailOAuth2Client(redirectUri);

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: GOOGLE_WORKSPACE_SCOPES,
    prompt: "consent", // Force consent to get refresh token
    state,
  });

  return authUrl;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeGmailCode(code: string, redirectUri?: string) {
  const oauth2Client = await createGmailOAuth2Client(redirectUri);
  const { tokens } = await oauth2Client.getToken(code);

  if (!tokens.refresh_token) {
    throw new Error("No refresh token received. Please revoke access and try again.");
  }

  // Save refresh token to database
  await db.settings.updateMany({
    data: {
      googleRefreshToken: tokens.refresh_token,
      googleAccessToken: tokens.access_token || null,
    },
  });

  return tokens;
}

/**
 * Revoke Gmail OAuth access
 */
export async function revokeGmailAccess() {
  const oauth2Client = await createGmailOAuth2Client();
  const settings = await db.settings.findFirst();

  if (settings?.googleAccessToken) {
    await oauth2Client.revokeToken(settings.googleAccessToken);
  }

  // Clear tokens from database
  await db.settings.updateMany({
    data: {
      googleRefreshToken: null,
      googleAccessToken: null,
    },
  });
}
