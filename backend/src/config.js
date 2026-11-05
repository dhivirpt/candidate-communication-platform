module.exports = {
  port: process.env.PORT || 5000,
  providerUrl: process.env.PROVIDER_URL || 'http://localhost:4000',
  providerApiKey: process.env.PROVIDER_API_KEY || 'dummy-key',
  webhookSecret: process.env.WEBHOOK_SECRET || 'dummy-webhook-secret',
  publicUrl: process.env.PUBLIC_URL || 'http://localhost:5000', // where the provider calls us back
  providerTimeoutMs: 5000,
};
