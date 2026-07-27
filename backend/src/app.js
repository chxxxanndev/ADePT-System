import express from 'express';
import cors from 'cors';
import authRoutes from './modules/auth/auth.routes.js';
import healthRoutes from './routes/health.routes.js';
import requestRoutes from './modules/requests/request.routes.js';
import taxDeclarationRoutes from './modules/taxDeclarations/taxDeclaration.routes.js';
import landholdingRoutes from './modules/landholding/landholding.routes.js';
import noLandholdingRoutes from './modules/nolandholding/nolandholding.routes.js';
import userRoutes from './modules/users/user.routes.js';
import accountRoutes from './modules/account/account.routes.js';
import notificationRoutes from './modules/notification/notification.routes.js'; 

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
app.use('/api/notifications', notificationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/account', accountRoutes);

// server.js (at the very bottom, after app.use('/api/...'))

// This is a Global Error Middleware
app.use((err, req, res, next) => {
    console.error("❌ GLOBAL ERROR CAUGHT:");
    console.error(err.stack); // This will print the exact line number of the crash
    res.status(500).json({
        error: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : {}
    });
});

export default app;