import * as appText from '@clog/domain';
/** Validate account-session configuration. Credentials live only in PostgreSQL. */
import { isIP } from 'node:net';
import { isAbsolute } from 'node:path';
import { readSecret } from '@clog/database/dist/secrets.js';

export interface AuthConfig {
  origin: string;
  secret: string;
  secure: boolean;
  bootstrapPassword?: string;
}
export interface BotConfig {
  token: string;
  guildId: string;
}
export function readConfig(env: NodeJS.ProcessEnv = process.env) {
  const proofDirectory = env.PROOF_STORAGE_PATH?.trim() || undefined;
  if (proofDirectory && !isAbsolute(proofDirectory))
    throw new Error(appText.apiConfigProofStoragePathMustBeAbsolute);
  const iconDirectory = env.ICON_STORAGE_PATH?.trim() || undefined;
  if (iconDirectory && !isAbsolute(iconDirectory))
    throw new Error(appText.apiConfigIconStoragePathMustBeAbsolute);
  if (!['true', 'false', undefined, ''].includes(env.AUTH_ENABLED))
    throw new Error(appText.apiConfigAuthEnabledMustBeTrueOrFalse);
  const trusted = (env.TRUSTED_PROXY_CIDRS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  for (const entry of trusted) {
    const [ip, prefix, extra] = entry.split('/');
    const family = isIP(ip ?? '');
    if (
      !family ||
      extra !== undefined ||
      (prefix !== undefined &&
        (!/^\d+$/u.test(prefix) || Number(prefix) > (family === 4 ? 32 : 128)))
    )
      throw new Error(
        appText.apiConfigTrustedProxyCidrsMustContainIpAddressesOrCidrs,
      );
  }
  if (
    !['database', 'environment', 'disabled', undefined, ''].includes(
      env.BOT_SETTINGS_MODE,
    )
  )
    throw new Error(
      appText.apiConfigBotSettingsModeMustBeDatabaseEnvironmentOrDisabled,
    );
  const legacyBot =
    !env.BOT_SETTINGS_MODE || env.BOT_SETTINGS_MODE === 'environment';
  const botToken = legacyBot
    ? (readSecret('BOT_API_TOKEN', env)?.trim() ?? '')
    : '';
  const botGuildId = legacyBot ? (env.DISCORD_GUILD_ID?.trim() ?? '') : '';
  if (!!botToken !== !!botGuildId)
    throw new Error(appText.apiConfigBotApiTokenAndDiscordGuildIdMustBeSet);
  if (
    botToken &&
    (!/^[a-fA-F0-9]{64,}$/u.test(botToken) || !/^\d{17,20}$/u.test(botGuildId))
  )
    throw new Error(appText.apiConfigBotTokenMustBe32RandomBytesAsHexAnd);
  const bot: BotConfig | undefined = botToken
    ? { token: botToken, guildId: botGuildId }
    : undefined;
  if (env.AUTH_ENABLED !== 'true')
    return {
      auth: undefined,
      iconDirectory,
      proofDirectory,
      bot,
      trustProxy: trusted.length ? trusted : (false as const),
    };
  let origin: URL;
  try {
    origin = new URL(env.PUBLIC_ORIGIN ?? '');
  } catch {
    throw new Error(appText.apiConfigAdminAuthRequiresAValidPublicOrigin);
  }
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(
    origin.hostname,
  );
  if (
    origin.username ||
    origin.password ||
    origin.search ||
    origin.hash ||
    origin.pathname !== '/' ||
    (origin.protocol !== 'https:' &&
      !(
        origin.protocol === 'http:' &&
        loopback &&
        env.NODE_ENV === 'development'
      ))
  )
    throw new Error(
      appText.apiConfigPublicOriginMustUseHttpsHttpLoopbackOnlyInDevelopment,
    );
  const secret = readSecret('SESSION_SECRET', env)?.trim() ?? '';
  if (!/^[a-f\d]{64,}$/iu.test(secret))
    throw new Error(
      appText.apiConfigSessionSecretMustContainAtLeast32RandomBytesEncoded,
    );
  const bootstrapPassword = readSecret('ADMIN_BOOTSTRAP_PASSWORD', env);
  if (
    bootstrapPassword !== undefined &&
    !/^[a-f\d]{64,256}$/iu.test(bootstrapPassword)
  )
    throw new Error(
      appText.apiConfigAdminBootstrapPasswordMustContain32128RandomBytesEncoded,
    );
  return {
    iconDirectory,
    proofDirectory,
    auth: {
      origin: origin.origin,
      secret,
      secure: origin.protocol === 'https:',
      ...(bootstrapPassword === undefined ? {} : { bootstrapPassword }),
    } satisfies AuthConfig,
    bot,
    trustProxy: trusted.length ? trusted : (false as const),
  };
}
