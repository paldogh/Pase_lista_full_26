import dotenv from 'dotenv';
dotenv.config();

import pg from 'pg';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const { Pool } = pg;

const pool = new Pool({
  user: 'postgres',
  password: '1234',
  host: 'localhost',
  port: 5432,
  database: 'pase_lista_qr'
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter
});

export default prisma;