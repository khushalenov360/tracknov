import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });
console.log("Environment loaded in load-env.ts. GEMINI_API_KEY length:", process.env.GEMINI_API_KEY?.length ?? 0);
