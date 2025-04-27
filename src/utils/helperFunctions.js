import { Readable } from 'stream';

// Helper function to upload buffer to Cloudinary via stream
export const bufferToStream = (buffer) => {
  const readable = new Readable({
    read() {
      this.push(buffer);
      this.push(null);
    }
  });
  return readable;
};