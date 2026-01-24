import 'reflect-metadata';
import 'dotenv/config';
import { App } from '@/infrastructure/config/app';
import { validateEnvVars } from '@/infrastructure/config/env';

validateEnvVars();

const app = new App();
app.listen();
