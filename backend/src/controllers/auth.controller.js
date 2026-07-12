import AuthService from '../services/auth.service.js';
import { validatePassword } from '../utils/validators.js';

export const register = async (req, res) => {
  try {
    const { firstName, lastName, email, username, password } = req.body;

    if (!firstName || !lastName || !email || !username || !password) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const result = await AuthService.registerUser(req.body);
    res.status(201).json({
      message: `User registered successfully (${result.mode === 'mock' ? 'Mock Mode' : 'Supabase'}).`,
      user: result.user
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const result = await AuthService.loginUser({ username, password });
    res.status(200).json({ message: 'Login successful.', ...result });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
};