import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

let supabase = null;
let useMock = true;

if (supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('placeholder')) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    useMock = false;
    console.log('Successfully initialized Supabase connection.');
  } catch (error) {
    console.error('Failed to initialize Supabase. Falling back to Mock mode.', error.message);
  }
} else {
  console.log('No valid Supabase credentials found or placeholder is active. Running in Mock Mode.');
}

// In-memory user database for fallback Mock Mode
const mockUsers = [
  {
    firstName: "Juan",
    lastName: "Dela Cruz",
    email: "JuanDelaCruz@gmail.com",
    username: "admin",
    password: "Password123!",
  }
];

// Helper to validate password strength
const validatePassword = (password) => {
  return password.length >= 6;
};

// --- AUTH ROUTER ---

// 1. Register Endpoint
app.post('/api/auth/register', async (req, res) => {
  const { firstName, lastName, email, username, password } = req.body;

  if (!firstName || !lastName || !email || !username || !password) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  if (!validatePassword(password)) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
  }

  console.log(`[Auth Register] Request for username: ${username}, email: ${email}`);

  if (useMock) {
    // Check if username or email already exists
    const exists = mockUsers.some(u => u.username === username || u.email === email);
    if (exists) {
      return res.status(400).json({ error: 'Username or Email already registered.' });
    }

    // Register user in memory
    const newUser = { firstName, lastName, email, username, password };
    mockUsers.push(newUser);
    console.log(`[Auth Register] Successfully registered user in Mock DB:`, username);
    return res.status(201).json({
      message: 'User registered successfully (Mock Mode).',
      user: { firstName, lastName, email, username }
    });
  } else {
    // Real Supabase auth flow
    try {
      // Supabase Auth requires an email and password. We store metadata for first name, last name, and username.
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            username: username
          }
        }
      });

      if (error) throw error;

      console.log(`[Auth Register] Supabase sign up successful:`, email);
      return res.status(201).json({
        message: 'User registered successfully in Supabase.',
        user: {
          id: data.user?.id,
          email: data.user?.email,
          firstName,
          lastName,
          username
        }
      });
    } catch (error) {
      console.error('[Auth Register] Supabase error:', error.message);
      return res.status(400).json({ error: error.message });
    }
  }
});

// 2. Login Endpoint
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  console.log(`[Auth Login] Login attempt for: ${username}`);

  if (useMock) {
    // Check local database (supports login by username OR email)
    const user = mockUsers.find(u => (u.username === username || u.email === username) && u.password === password);

    if (!user) {
      return res.status(401).json({ error: 'Invalid username/email or password.' });
    }

    console.log(`[Auth Login] Login successful (Mock Mode) for:`, user.username);
    return res.status(200).json({
      message: 'Login successful.',
      token: 'mock-jwt-token-xyz',
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        username: user.username
      }
    });
  } else {
    // Real Supabase auth flow.
    // If username is actually an email:
    let email = username;
    
    // If they supplied a username instead of email, we might need a custom table mapping username to email.
    // Let's check if the username contains '@'. If not, we can query a custom 'profiles' table or try direct sign-in.
    // For general robustness, if it does not contain '@', we will search the profiles table (if it exists) or assume it's email.
    try {
      if (!username.includes('@')) {
        // Find email by username
        // Note: This assumes a 'profiles' table exists in Supabase.
        const { data: profile, error: profileErr } = await supabase
          .from('profiles')
          .select('email')
          .eq('username', username)
          .single();
        
        if (!profileErr && profile) {
          email = profile.email;
        }
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      console.log(`[Auth Login] Supabase login successful for:`, email);
      return res.status(200).json({
        message: 'Login successful.',
        token: data.session?.access_token,
        user: {
          id: data.user?.id,
          email: data.user?.email,
          firstName: data.user?.user_metadata?.first_name || '',
          lastName: data.user?.user_metadata?.last_name || '',
          username: data.user?.user_metadata?.username || username
        }
      });
    } catch (error) {
      console.error('[Auth Login] Supabase error:', error.message);
      return res.status(401).json({ error: error.message });
    }
  }
});

// 3. Healthcheck Endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', mode: useMock ? 'mock' : 'supabase' });
});

app.listen(PORT, () => {
  console.log(`ADePT Backend running on port ${PORT}`);
});
