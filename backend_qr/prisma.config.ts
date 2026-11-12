
import 'dotenv/config';

export default {
  datasource: {
    url: process.env.DIRECT_URL || process.env.DATABASE_URL,
  },
};
