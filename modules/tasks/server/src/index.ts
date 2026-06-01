import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

import taskRoutes from './routes/tasks';
import subtaskRoutes from './routes/subtasks';
import attachmentRoutes from './routes/attachments';
import commentRoutes from './routes/comments';
import catalogRoutes from './routes/catalogs';
import authRoutes from './routes/auth';

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : true;
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/subtasks', subtaskRoutes);
app.use('/api/attachments', attachmentRoutes);
app.use('/api', commentRoutes);
app.use('/api', catalogRoutes);

app.get('/api/health', (_req, res) => res.json({ status: 'ok', time: new Date() }));

app.listen(PORT, () => {
  console.log(`🚀 Servidor CyC Tasks corriendo en http://localhost:${PORT}`);
});

export default app;
