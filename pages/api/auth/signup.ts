import { NextApiRequest, NextApiResponse } from 'next';
import argon2 from 'argon2';
import nodemailer from 'nodemailer';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../../lib/prisma';

type SignupRequestBody = {
    email: string;
    password: string;
};

export default async function signup(
    req: NextApiRequest,
    res: NextApiResponse
): Promise<void> {
    try {
        console.log('Request received:', req.body);
        const { email, password } = req.body as SignupRequestBody;

        // Check if email and password are provided
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required.' });
        }

        console.log('Email and password provided');

        // Hash the password before saving using argon2
        const passwordHash = await argon2.hash(password);

        console.log('Password hashed');

        // Generate an email verification token
        const emailToken = uuidv4();

        console.log('Email token generated');

        // Create the user in the database
        const user = await prisma.user.create({
            data: {
                email,
                passwordHash,
                emailVerified: false,
                emailToken,
            },
        });

        console.log('User created:', user);

        // Set up the email transporter
        const transporter = nodemailer.createTransport({
            host: process.env.EMAIL_SERVER_HOST,
            port: parseInt(process.env.EMAIL_SERVER_PORT || '587'),
            secure: false,
            auth: {
                user: process.env.EMAIL_SERVER_USER,
                pass: process.env.EMAIL_SERVER_PASSWORD,
            },
        });

        console.log('Email transporter created');

        const verificationLink = `${process.env.NEXT_PUBLIC_BASE_URL}/email-verification?token=${emailToken}`;

        // Send the verification email
        await transporter.sendMail({
            from: process.env.EMAIL_FROM,
            to: email,
            subject: 'Please verify your email',
            text: `Please verify your email by clicking on the following link: ${verificationLink}`,
            html: `<p>Please verify your email by clicking on the following link:</p><a href="${verificationLink}">${verificationLink}</a>`,
        });

        console.log('Verification email sent');

        // Respond with success
        res.status(200).json({ message: 'Sign up successful! Please check your email to verify your account.' });
    } catch (error: any) {
        console.error('Signup error:', error.message);
        console.error('Stack trace:', error.stack);
        res.status(500).json({ message: 'An error occurred during signup.', error: error.message });
    }
}
