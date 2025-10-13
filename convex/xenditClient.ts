import { Xendit } from 'xendit-node';

const secretKey = process.env.XENDIT_SECRET_KEY;
if (!secretKey) {
  throw new Error('XENDIT_SECRET_KEY environment variable is required');
}

export const xendit = new Xendit({ secretKey });
export const { Invoice } = xendit;
