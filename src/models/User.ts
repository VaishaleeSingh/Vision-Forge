import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IUser extends Document {
  name: string
  email: string
  image?: string
  provider: string
  tokensUsed: number
  imagesGenerated: number
  documentsUploaded: number
  createdAt: Date
  updatedAt: Date
}

const UserSchema = new Schema<IUser>(
  {
    name:               { type: String, required: true },
    email:              { type: String, required: true, unique: true, lowercase: true },
    image:              { type: String },
    provider:           { type: String, default: 'credentials' },
    tokensUsed:         { type: Number, default: 0 },
    imagesGenerated:    { type: Number, default: 0 },
    documentsUploaded:  { type: Number, default: 0 },
  },
  { timestamps: true }
)

const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>('User', UserSchema)

export default User
