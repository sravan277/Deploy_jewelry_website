import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
  try {
    const MONGODB_URI = process.env.MONGO_URI;

    if (!MONGODB_URI) {
      console.error('FATAL ERROR: MONGO_URI is not defined in the environment variables.');
      process.exit(1);
    }

    await mongoose.connect(MONGODB_URI);

    console.log('Successfully connected to MongoDB.');

  } catch (error) {
    console.error('FATAL ERROR: Could not connect to MongoDB.');
    console.error(error);
    process.exit(1); // Exit process with failure
  }
};

export default connectDB;