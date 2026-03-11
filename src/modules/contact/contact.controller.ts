import { Request, Response, NextFunction } from 'express';
import { contactService } from './contact.service.js';
import {
  submitContactSchema,
  updateStatusSchema,
  addNoteSchema,
} from './contact.validator.js';
import { formatResponse } from '../../core/utils/formatResponse.js';
import { AppError } from '../../core/errors/AppError.js';

export const contactController = {

  async submit(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = submitContactSchema.safeParse(req.body);
      
      if (!parsed.success) {
        // FIX 1: We use '.issues' instead of '.errors' for Zod compatibility.
        // FIX 2: We use '?.' (optional chaining) to safely check if the first issue exists.
        // FIX 3: We use '||' to provide a fallback string, ensuring AppError always gets a string and keeping TypeScript happy.
        const errorMessage = parsed.error.issues[0]?.message || 'Invalid input provided';
        throw new AppError(errorMessage, 400);
      }

      const { name, email, message } = parsed.data;
      const submission = await contactService.submitContactForm(name, email, message);

      res.status(201).json(
        formatResponse(true, 'Your message has been received. We will be in touch shortly.', {
          id: submission._id,
        })
      );
    } catch (err) {
      next(err);
    }
  },

  async getAllSubmissions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const submissions = await contactService.getAllSubmissions();

      res.status(200).json(
        formatResponse(true, 'Contact submissions retrieved.', {
          submissions,
          total: submissions.length,
        })
      );
    } catch (err) {
      next(err);
    }
  },

  async getSubmissionById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // FIX 4: Express types URL params as potentially 'undefined'. 
      // We cast it 'as string' to tell TypeScript: "Trust me, I know this ID is a string."
      const id = req.params.id as string;
      const result = await contactService.getSubmissionById(id);

      res.status(200).json(
        formatResponse(true, 'Contact submission retrieved.', result)
      );
    } catch (err) {
      next(err);
    }
  },

  async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = updateStatusSchema.safeParse(req.body);
      
      if (!parsed.success) {
        // Safely extract the first Zod error message with a fallback
        const errorMessage = parsed.error.issues[0]?.message || 'Invalid status provided';
        throw new AppError(errorMessage, 400);
      }

      // Explicitly cast the URL param as a string
      const id = req.params.id as string;
      const submission = await contactService.updateStatus(id, parsed.data.status);

      res.status(200).json(
        formatResponse(true, 'Status updated.', submission)
      );
    } catch (err) {
      next(err);
    }
  },

  async addNote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = addNoteSchema.safeParse(req.body);
      
      if (!parsed.success) {
        // Safely extract the first Zod error message with a fallback
        const errorMessage = parsed.error.issues[0]?.message || 'Invalid note provided';
        throw new AppError(errorMessage, 400);
      }

      // Explicitly cast the URL param as a string
      const id = req.params.id as string;
      const adminId = req.adminId!;
      const adminEmail = req.adminEmail!;

      const note = await contactService.addNote(id, parsed.data.note, adminId, adminEmail);

      res.status(201).json(
        formatResponse(true, 'Note added.', note)
      );
    } catch (err) {
      next(err);
    }
  },
};