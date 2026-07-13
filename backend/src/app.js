import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes.js';
import healthRoutes from './routes/health.routes.js';
import requestRoutes from './routes/request.routes.js';
import taxDeclarationRoutes from './routes/taxDeclaration.routes.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/tax-declarations', taxDeclarationRoutes);

export default app;