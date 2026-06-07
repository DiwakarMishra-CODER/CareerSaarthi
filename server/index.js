require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Validate required Supabase env vars at startup
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/profiles',   require('./routes/profiles'));
app.use('/api/resumes',    require('./routes/resumes'));
app.use('/api/roadmaps',   require('./routes/roadmaps'));
app.use('/api/interviews', require('./routes/interviews'));
app.use('/api/upload',     require('./routes/upload'));
app.use('/api/jobs',       require('./routes/jobs'));

// Health check
app.get('/health', (req, res) =>
  res.json({ status: 'OK', database: 'Supabase (PostgreSQL)', timestamp: new Date() })
);

if (!process.env.VERCEL) {
  // Start server with self-healing EADDRINUSE recycling
  const server = app.listen(PORT, () =>
    console.log(`🚀 CareerSaarthi server running on http://localhost:${PORT} (Supabase)`)
  );

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`⚠️ Port ${PORT} is busy. Automatically self-healing and recycling port...`);
      const { exec } = require('child_process');
      // Forcibly clear port 4000 on macOS/Linux
      exec(`kill -9 $(lsof -t -i:${PORT}) 2>/dev/null || true`, () => {
        setTimeout(() => {
          try {
            server.listen(PORT, () => {
              console.log(`🚀 CareerSaarthi server running on http://localhost:${PORT} (Supabase)`);
            });
          } catch (retryErr) {
            console.error('Self-healing port recycle failed:', retryErr);
            process.exit(1);
          }
        }, 500); // 500ms delay to let the OS release the TCP socket
      });
    } else {
      throw err;
    }
  });
}

module.exports = app;

