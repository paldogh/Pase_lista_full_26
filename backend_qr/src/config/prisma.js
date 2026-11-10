import dotenv from 'dotenv';
dotenv.config();

import pg from 'pg';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter
});


// Prueba de conexión con PostgreSQL
pool.query(`
  SELECT
    current_database() AS database,
    current_user AS usuario,
    inet_server_addr()::text AS servidor
`)
.then(({ rows }) => {
  console.log('=================================');
  console.log(' CONEXIÓN A POSTGRESQL EXITOSA');
  console.log('=================================');
  console.log('Base de datos:', rows[0].database);
  console.log('Usuario:', rows[0].usuario);
  console.log('Servidor:', rows[0].servidor);
})
.catch((error) => {
  console.error('ERROR DE CONEXIÓN A POSTGRESQL:', error.message);
});
export default prisma;