import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

if (!process.env.JWT_SECRET) {
	if (process.env.NODE_ENV === 'production') {
		throw new Error('CRITICAL: JWT_SECRET environment variable is missing!');
	} else {
		console.warn('WARNING: JWT_SECRET is missing. Falling back to default insecure key for development.');
	}
}

const SECRET_KEY = new TextEncoder().encode(
	process.env.JWT_SECRET || 'stocksync-offline-secret-key-2024-very-secure',
);

const COOKIE_NAME = 'stocksync-session';

// Public routes that don't require authentication
const publicRoutes = ['/login'];

export async function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl;

	// Skip middleware for API routes, static files, etc.
	if (
		pathname.startsWith('/_next') ||
		pathname.startsWith('/api') ||
		pathname.includes('.') // static files
	) {
		return NextResponse.next();
	}

	const token = request.cookies.get(COOKIE_NAME)?.value;
	const isPublicRoute = publicRoutes.some((route) =>
		pathname.startsWith(route),
	);

	// Check if token is valid
	let isAuthenticated = false;
	if (token) {
		try {
			await jwtVerify(token, SECRET_KEY);
			isAuthenticated = true;
		} catch {
			// Token is invalid or expired
			isAuthenticated = false;
		}
	}

	// Redirect to login if not authenticated and trying to access protected route
	if (!isAuthenticated && !isPublicRoute) {
		const loginUrl = new URL('/login', request.url);
		return NextResponse.redirect(loginUrl);
	}

	// Redirect root to dashboard or login
	if (pathname === '/') {
		if (isAuthenticated) {
			return NextResponse.redirect(new URL('/dashboard', request.url));
		} else {
			return NextResponse.redirect(new URL('/login', request.url));
		}
	}

	return NextResponse.next();
}

export const config = {
	matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
