import type { Context, Next } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';

const GALLERY_SESSION_COOKIE = 'gallery_auth';
const SESSION_DURATION = 24 * 60 * 60; // 24 hours in seconds

export async function galleryAuthMiddleware(c: Context, next: Next) {
    const galleryPassword = process.env.GALLERY_PASSWORD;

    if (!galleryPassword) {
        return c.text('Gallery password not configured', 500);
    }

    // Check if user has valid session cookie
    const sessionToken = getCookie(c, GALLERY_SESSION_COOKIE);

    if (sessionToken === galleryPassword) {
        await next();
        return;
    }

    // Check for password in request (login attempt)
    const password = c.req.query('password') || c.req.header('x-gallery-password');

    if (password === galleryPassword) {
        // Set session cookie
        setCookie(c, GALLERY_SESSION_COOKIE, galleryPassword, {
            maxAge: SESSION_DURATION,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Strict',
            path: '/'
        });
        await next();
        return;
    }

    // Return login page
    return c.html(getLoginPage());
}

function getLoginPage() {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gallery Login - OM Storage</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2rem;
        }

        .login-container {
            background: rgba(30, 41, 59, 0.8);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(99, 102, 241, 0.3);
            border-radius: 1.5rem;
            padding: 3rem;
            max-width: 450px;
            width: 100%;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
            animation: slideUp 0.5s ease-out;
        }

        @keyframes slideUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .logo {
            text-align: center;
            margin-bottom: 2rem;
        }

        .logo h1 {
            font-size: 2.5rem;
            background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: 0.5rem;
        }

        .logo p {
            color: #94a3b8;
            font-size: 1rem;
        }

        .form-group {
            margin-bottom: 1.5rem;
        }

        label {
            display: block;
            color: #f1f5f9;
            font-weight: 600;
            margin-bottom: 0.5rem;
            font-size: 0.95rem;
        }

        input[type="password"] {
            width: 100%;
            padding: 1rem 1.25rem;
            background: rgba(15, 23, 42, 0.6);
            border: 2px solid #334155;
            border-radius: 0.75rem;
            color: #f1f5f9;
            font-size: 1rem;
            transition: all 0.3s ease;
        }

        input[type="password"]:focus {
            outline: none;
            border-color: #6366f1;
            box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }

        .btn-login {
            width: 100%;
            padding: 1rem;
            background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
            border: none;
            border-radius: 0.75rem;
            color: white;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            margin-top: 1rem;
        }

        .btn-login:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 30px rgba(99, 102, 241, 0.4);
        }

        .btn-login:active {
            transform: translateY(0);
        }

        .error-message {
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid #ef4444;
            color: #fca5a5;
            padding: 1rem;
            border-radius: 0.75rem;
            margin-bottom: 1.5rem;
            font-size: 0.9rem;
            display: none;
        }

        .error-message.show {
            display: block;
            animation: shake 0.5s ease-in-out;
        }

        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-10px); }
            75% { transform: translateX(10px); }
        }

        .lock-icon {
            font-size: 3rem;
            text-align: center;
            margin-bottom: 1rem;
        }

        @media (max-width: 480px) {
            .login-container {
                padding: 2rem;
            }

            .logo h1 {
                font-size: 2rem;
            }
        }
    </style>
</head>
<body>
    <div class="login-container">
        <div class="logo">
            <div class="lock-icon">🔒</div>
            <h1>Gallery Access</h1>
            <p>Enter password to continue</p>
        </div>

        <div id="errorMessage" class="error-message">
            Incorrect password. Please try again.
        </div>

        <form id="loginForm">
            <div class="form-group">
                <label for="password">Password</label>
                <input 
                    type="password" 
                    id="password" 
                    name="password" 
                    placeholder="Enter gallery password"
                    required
                    autofocus
                >
            </div>
            <button type="submit" class="btn-login">
                🔓 Unlock Gallery
            </button>
        </form>
    </div>

    <script>
        const form = document.getElementById('loginForm');
        const errorMessage = document.getElementById('errorMessage');
        const passwordInput = document.getElementById('password');

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const password = passwordInput.value;
            
            // Redirect with password as query parameter
            window.location.href = window.location.pathname + '?password=' + encodeURIComponent(password);
        });

        // Check if there's an error in URL (redirected back after failed attempt)
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('password')) {
            errorMessage.classList.add('show');
            passwordInput.value = '';
            
            // Clear the password from URL for security
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    </script>
</body>
</html>
    `;
}
