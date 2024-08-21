import { prisma } from '../../../lib/prisma';
import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse): void {
    console.log('EMAIL_SERVER_HOST:', process.env.EMAIL_SERVER_HOST);
    console.log('EMAIL_SERVER_PORT:', process.env.EMAIL_SERVER_PORT);
    console.log('NEXT_PUBLIC_BASE_URL:', process.env.NEXT_PUBLIC_BASE_URL);

    res.status(200).json({ message: 'Environment variables logged to console' });
}
