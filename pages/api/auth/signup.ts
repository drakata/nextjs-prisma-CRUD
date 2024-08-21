import { NextApiRequest, NextApiResponse } from 'next';
import argon2 from 'argon2';
import nodemailer from 'nodemailer';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../../lib/prisma';

type SignupRequestBody = {
    email: string;
    password: string;
};

type ApiResponse = {
    message: string;
    error?: string;
};

export default async function signup(
    req: NextApiRequest,
    res: NextApiResponse<ApiResponse>
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
        let passwordHash;
        try {
            passwordHash = await argon2.hash(password);
            console.log('Password hashed:', passwordHash);
        } catch (error: any) {
            console.error('Argon2 error:', error.message);
            return res.status(500).json({ message: 'Error hashing password.', error: error.message });
        }

        // Generate an email verification token
        const emailToken = uuidv4();
        console.log('Email token generated:', emailToken);

        // Create the user in the database
        let user;
        try {
            user = await prisma.user.create({
                data: {
                    email,
                    passwordHash,
                    emailVerified: false,
                    emailToken,
                },
            });
            console.log('User created:', user);
        } catch (error: any) {
            console.error('Prisma error:', error.message);
            return res.status(500).json({ message: 'Error creating user in the database.', error: error.message });
        }

        // Set up the email transporter
        let transporter;
        try {
            transporter = nodemailer.createTransport({
                host: process.env.EMAIL_SERVER_HOST,
                port: parseInt(process.env.EMAIL_SERVER_PORT || '587'),
                secure: false, // true for 465, false for other ports
                auth: {
                    user: process.env.EMAIL_SERVER_USER,
                    pass: process.env.EMAIL_SERVER_PASSWORD,
                },
            });
            console.log('Email transporter created');
        } catch (error: any) {
            console.error('Nodemailer setup error:', error.message);
            return res.status(500).json({ message: 'Error setting up email transporter.', error: error.message });
        }

        const verificationLink = `${process.env.NEXT_PUBLIC_BASE_URL}/email-verification?token=${emailToken}`;

        // Send the verification email
        try {
            const info = await transporter.sendMail({
                from: process.env.EMAIL_FROM,
                to: email,
                subject: 'Please verify your email',
                text: `Please verify your email by clicking on the following link: ${verificationLink}`,
                html: `<p>Please verify your email by clicking on the following link:</p><a href="${verificationLink}">${verificationLink}</a>`,
            });
            console.log('Verification email sent:', info.response);
        } catch (error: any) {
            console.error('Nodemailer error:', error.message);
            return res.status(500).json({ message: 'Error sending verification email.', error: error.message });
        }

        // Respond with success
        res.status(200).json({ message: 'Sign up successful! Please check your email to verify your account.' });
    } catch (error: any) {
        console.error('Unexpected signup error:', error.message);
        console.error('Stack trace:', error.stack);
        res.status(500).json({ message: 'An unexpected error occurred during signup.', error: error.message });
    }
}
