import { ContactMessage, AdminNote, IContactMessage, IAdminNote } from './contact.model.js';
import { AppError } from '../../core/errors/AppError.js';
import { logger } from '../../core/logger/logger.js';

export const contactService = {

  async submitContactForm(
    name: string,
    email: string,
    message: string
  ): Promise<IContactMessage> {
    const submission = await ContactMessage.create({ name, email, message });

    logger.info('[Contact] New contact form submitted', {
      id: submission._id.toString(),
      email,
    });

    // TODO (Stage 16): Replace with notificationService.createNotification()
    logger.info('[Contact] NOTIFY ADMIN: new contact form submission received', {
      submissionId: submission._id.toString(),
      from: email,
    });

    return submission;
  },

  async getAllSubmissions(): Promise<IContactMessage[]> {
    return ContactMessage.find().sort({ createdAt: -1 });
  },

  async getSubmissionById(
    id: string
  ): Promise<{ submission: IContactMessage; notes: IAdminNote[] }> {
    const submission = await ContactMessage.findById(id);
    if (!submission) throw new AppError('Contact submission not found', 404);

    const notes = await AdminNote.find({ contactMessageId: id }).sort({ createdAt: -1 });

    return { submission, notes };
  },

  async updateStatus(
    id: string,
    status: 'new' | 'in_progress' | 'resolved' | 'ignored'
  ): Promise<IContactMessage> {
    const submission = await ContactMessage.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );
    if (!submission) throw new AppError('Contact submission not found', 404);

    logger.info('[Contact] Status updated', {
      id,
      status,
    });

    return submission;
  },

  async addNote(
    contactMessageId: string,
    note: string,
    adminId: string,
    adminEmail: string
  ): Promise<IAdminNote> {
    const submission = await ContactMessage.findById(contactMessageId);
    if (!submission) throw new AppError('Contact submission not found', 404);

    const adminNote = await AdminNote.create({
      contactMessageId,
      note,
      adminId,
      adminEmail,
    });

    logger.info('[Contact] Admin note added', {
      contactMessageId,
      adminEmail,
    });

    return adminNote;
  },
};
