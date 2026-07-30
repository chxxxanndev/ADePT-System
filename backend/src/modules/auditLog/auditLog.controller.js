import AuditLogService from './auditLog.service.js';

export const createAuditEntry = async (req, res) => {
  try {
    const { type, description, details } = req.body;
    if (!type || !description) {
      return res.status(400).json({ error: 'type and description are required.' });
    }
    const entry = await AuditLogService.createEntry({
      // Whichever requireAuth ran actually populated one of these two —
      // see the note on the service above.
      actorStaffId: req.staffId,
      actorAuthId: req.user?.id,
      type,
      description,
      details,
    });
    res.status(201).json({ entry });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const listAuditEntries = async (req, res) => {
  try {
    const entries = await AuditLogService.listEntries();
    res.status(200).json({ entries });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
