import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import employeeRoutes from './routes/employees.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/admin/employees', employeeRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'שגיאת שרת' });
});

app.listen(PORT, () => {
  console.log(`maslul-impact backend listening on http://localhost:${PORT}`);
});
