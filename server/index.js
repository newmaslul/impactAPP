import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import employeeRoutes from './routes/employees.js';
import activityRoutes from './routes/activity.js';
import schoolRoutes from './routes/schools.js';
import classRoutes from './routes/classes.js';
import { seedActivityDemo } from './scoring/seedDemo.js';
import { startDailyJobScheduler } from './scoring/dailyJob.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/admin/employees', employeeRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/admin/schools', schoolRoutes);
app.use('/api/admin/classes', classRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'שגיאת שרת' });
});

seedActivityDemo();
startDailyJobScheduler();

app.listen(PORT, () => {
  console.log(`maslul-impact backend listening on http://localhost:${PORT}`);
});
