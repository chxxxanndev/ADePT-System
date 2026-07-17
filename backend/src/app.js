import express from 'express';
import cors from 'cors';
import authRoutes from './modules/auth/auth.routes.js';
import healthRoutes from './routes/health.routes.js';
import requestRoutes from './modules/requests/request.routes.js';
import taxDeclarationRoutes from './modules/taxDeclarations/taxDeclaration.routes.js';
import landholdingRoutes from './modules/landholding/landholding.routes.js';
import noLandholdingRoutes from './modules/nolandholding/nolandholding.routes.js';
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/tax-declarations', taxDeclarationRoutes);
app.use('/api/landholding', landholdingRoutes);
app.use('/api/nolandholding', noLandholdingRoutes);

export default app;