const REQUIRED_SERVER_VARS = [
  'PUSHER_APP_ID',
  'PUSHER_KEY',
  'PUSHER_SECRET',
  'PUSHER_CLUSTER',
] as const;

const OPTIONAL_SERVER_VARS: Record<string, string> = {
  UPSTASH_REDIS_REST_URL: 'Redis — rooms will use in-memory storage (lost on restart)',
  UPSTASH_REDIS_REST_TOKEN: 'Redis token — required with UPSTASH_REDIS_REST_URL',
  ANTHROPIC_API_KEY: 'Claude AI judge — random fallback judge will be used',
  ADMIN_USERNAME: 'Admin dashboard — admin panel will be inaccessible',
  ADMIN_PASSWORD: 'Admin dashboard — admin panel will be inaccessible',
};

export function validateEnv(): void {
  const missing = REQUIRED_SERVER_VARS.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missing.map((v) => `  • ${v}`).join('\n')}\n\nCopy .env.example to .env.local and fill in your Pusher credentials.`
    );
  }

  const warnings: string[] = [];
  for (const [key, hint] of Object.entries(OPTIONAL_SERVER_VARS)) {
    if (!process.env[key]) warnings.push(`  • ${key} not set — ${hint}`);
  }
  if (warnings.length > 0 && process.env.NODE_ENV !== 'test') {
    // Use process.stderr directly so it appears during startup without polluting logs
    process.stderr.write(`[vikas75] Optional env vars missing:\n${warnings.join('\n')}\n`);
  }
}
