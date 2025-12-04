/**
 * Main entry point for the sampleapp-dimensions-node application.
 *
 * - Sets up Express server, session management, and middleware.
 * - Serves static files and HTML views.
 * - Registers authentication and QuickBooks dimension routes.
 * - Starts the server on the configured port.
 */
import express from 'express';
import session from 'express-session';
import path from 'path';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import ejs from 'ejs';
import authRoutes from './routes/oauth.js';
import dimensionQuickBookRoutes from './routes/dimension.js';

dotenv.config();
const app = express();
const PORT = process.env.PORT;

const baseDir = path.dirname(decodeURI(new URL(import.meta.url).pathname));

/**
 * Session middleware setup
 * Uses express-session to manage user sessions for authentication and QuickBooks integration.
 * The session secret should be set in environment variables for security.
 */
app.use(session({
  secret: process.env.SESSION_SECRET || 'your_secret_key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Set to true if using HTTPS
}));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(baseDir, '/public')));
app.engine('html', ejs.renderFile);

app.set('view engine', 'html');
app.use(bodyParser.json());
app.use(express.static(path.join(baseDir, 'pages')));

/**
 * Serves the main HTML page for the application root.
 */
app.get('/', (req, res) => {
  res.sendFile(path.join(baseDir, 'pages', 'index.html'));
});

app.use('/api/auth', authRoutes);

app.use('/api/quickbook', dimensionQuickBookRoutes);

/**
 * Starts the Express server on the configured port.
 */
app.listen(PORT, () => {
  console.log('server up on PORT ', PORT);
});