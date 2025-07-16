import mongoose, { Schema, Document } from 'mongoose';

interface Address {
  label: string;
  addressLine: string;
  latitude: number;
  longitude: number;
}

export interface ISettings extends Document {
  userId: mongoose.Types.ObjectId;
  deliveryAddresses: Address[];
  notificationPreferences: {
    email: boolean;
    push: boolean;
  };
}

const addressSchema = new Schema({
  label: { type: String },
  addressLine: { type: String },
  latitude: { type: Number },
  longitude: { type: Number }
});

const settingsSchema = new Schema<ISettings>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    deliveryAddresses: [addressSchema],
    notificationPreferences: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: false }
    }
  },
  { timestamps: true }
);

export const Settings = mongoose.model<ISettings>('Settings', settingsSchema);
