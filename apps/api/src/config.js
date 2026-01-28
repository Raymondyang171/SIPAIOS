import 'dotenv/config';

export const config = {
  port: parseInt(process.env.API_PORT || '3001', 10),
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  },
  db: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '55432', 10),
    database: process.env.POSTGRES_DB || 'sipaios',
    user: process.env.POSTGRES_USER || 'sipaios',
    password: process.env.POSTGRES_PASSWORD || 'H123150869h!',
  },
};
