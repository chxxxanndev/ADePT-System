import AccountService from './account.service.js';

export const updateProfile = async (req, res) => {
    try {
        const { fullName, username } = req.body;
        if (!fullName?.trim() || !username?.trim()) {
            return res.status(400).json({ error: 'Full name and username are required.' });
        }

        const result = await AccountService.updateProfile(req.user.id, { fullName, username });
        res.status(200).json({ message: 'Profile updated.', data: result });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

export const uploadPhoto = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded.' });
        }
        if (!req.file.mimetype.startsWith('image/')) {
            return res.status(400).json({ error: 'File must be an image.' });
        }
        if (req.file.size > 5 * 1024 * 1024) {
            return res.status(400).json({ error: 'Image must be smaller than 5MB.' });
        }

        const avatarUrl = await AccountService.uploadPhoto(req.user.id, req.file);
        res.status(200).json({ message: 'Photo updated.', avatarUrl });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

export const updateEmail = async (req, res) => {
    try {
        const { email } = req.body;
        const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '');
        if (!isValidEmail) {
            return res.status(400).json({ error: 'Enter a valid email address.' });
        }

        const result = await AccountService.updateEmail(req.user.id, email);
        res.status(200).json({ message: 'Email updated.', data: result });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

export const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current and new password are required.' });
        }
        if (newPassword.length < 8) {
            return res.status(400).json({ error: 'New password must be at least 8 characters.' });
        }

        const result = await AccountService.changePassword(
            req.user.id,
            req.user.email,
            currentPassword,
            newPassword
        );
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

export const setAccountStatus = async (req, res) => {
    try {
        const { disabled } = req.body;
        if (typeof disabled !== 'boolean') {
            return res.status(400).json({ error: '"disabled" must be true or false.' });
        }

        const result = await AccountService.setAccountStatus(req.user.id, disabled);
        res.status(200).json({ message: 'Account status updated.', data: result });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};