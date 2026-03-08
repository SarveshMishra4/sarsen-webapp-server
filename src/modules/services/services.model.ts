/**
 * FILE: modules/services/services.model.ts
 *
 * PURPOSE
 * Stores consulting services offered by the platform.
 */

import mongoose from "mongoose";

/**
 * Service Interface
 */
export interface ServiceRecord {
  _id?: string;
  title: string;
  description: string;
  price: number;
  duration: string;
  status: "ACTIVE" | "INACTIVE";
  createdAt: Date;
}

/**
 * MongoDB Schema
 */
const serviceSchema = new mongoose.Schema<ServiceRecord>({
  title: {
    type: String,
    required: true,
    trim: true,
  },

  description: {
    type: String,
    required: true,
  },

  price: {
    type: Number,
    required: true,
  },

  duration: {
    type: String,
    required: true,
  },

  status: {
    type: String,
    enum: ["ACTIVE", "INACTIVE"],
    default: "ACTIVE",
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

/**
 * MongoDB Model
 */
export const ServiceModel = mongoose.model<ServiceRecord>(
  "Service",
  serviceSchema
);

/**
 * Create new service
 */
export const createService = async (
  title: string,
  description: string,
  price: number,
  duration: string
) => {
  return ServiceModel.create({
    title,
    description,
    price,
    duration,
  });
};

/**
 * Fetch all services
 */
export const getAllServices = async () => {
  return ServiceModel.find().sort({ createdAt: -1 });
};

/**
 * Fetch active services
 */
export const getActiveServices = async () => {
  return ServiceModel.find({ status: "ACTIVE" });
};

/**
 * Update service
 */
export const updateService = async (
  id: string,
  updateData: Partial<ServiceRecord>
) => {
  return ServiceModel.findByIdAndUpdate(id, updateData, { new: true });
};

/**
 * Delete service
 */
export const deleteService = async (id: string) => {
  return ServiceModel.findByIdAndDelete(id);
};