import express from 'express';
import dotenv from 'dotenv';
import { connectDB } from './config/db';
import authRoutes from './routes/auth.routes';
import { errorHandler } from './middleware/error';
import userRoutes from './routes/user.routes';
import subscriptionRoutes from './routes/subscriptionRoutes';
import settingsRoutes from './routes/settings.routes';
dotenv.config();

const app = express();

// ✅ Allow only these frontend origins (for dev)
const allowedOrigins = ['https://www.12crate.in', 'http://localhost:8080'];

// ✅ Simple CORS handling — no cookies involved
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    // ✅ No Access-Control-Allow-Credentials needed since you're not setting cookies
  }

  // ✅ Preflight request
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
});

// ✅ Parse JSON body
app.use(express.json());

// ✅ API routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api', subscriptionRoutes);
app.use('/api', settingsRoutes);
// ✅ Global error handler
app.use(errorHandler);

// ✅ Start server after DB connects
connectDB().then(() => {
  const port = process.env.PORT || 5000;
  app.listen(port, () => {
    console.log(`🚀 Server running on port ${port}`);
  });
});
