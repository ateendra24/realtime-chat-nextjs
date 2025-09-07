import { auth, clerkClient } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { currentPassword, newPassword } = await request.json();

        if (!currentPassword || !newPassword) {
            return NextResponse.json({ error: 'Current password and new password are required' }, { status: 400 });
        }

        if (newPassword.length < 8) {
            return NextResponse.json({ error: 'New password must be at least 8 characters long' }, { status: 400 });
        }

        // Get the user from Clerk
        const client = await clerkClient();
        const user = await client.users.getUser(userId);

        // Check if user has a password (not OAuth only)
        if (!user.passwordEnabled) {
            return NextResponse.json({ error: 'Password change not available for OAuth users' }, { status: 400 });
        }

        try {
            // Update the user's password using Clerk
            await client.users.updateUser(userId, {
                password: newPassword,
            });

            return NextResponse.json({ success: true });
        } catch (clerkError: unknown) {
            console.error('Clerk error changing password:', clerkError);

            // Handle specific Clerk errors
            if (clerkError && typeof clerkError === 'object' && 'errors' in clerkError) {
                const errors = (clerkError as { errors: Array<{ code: string; message: string }> }).errors;
                if (errors && errors.length > 0) {
                    const error = errors[0];
                    if (error.code === 'form_password_incorrect') {
                        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 });
                    }
                    if (error.code === 'form_password_pwned') {
                        return NextResponse.json({ error: 'This password has been found in a data breach. Please choose a different password.' }, { status: 400 });
                    }
                    if (error.code === 'form_password_size_in_bytes') {
                        return NextResponse.json({ error: 'Password is too long' }, { status: 400 });
                    }
                }
            }

            return NextResponse.json({ error: 'Failed to change password' }, { status: 500 });
        }
    } catch (error) {
        console.error('Error changing password:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
