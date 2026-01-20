import 'reflect-metadata';
import 'dotenv/config';
import { App } from '@/infrastructure/config/app';

const app = new App();
app.listen();
