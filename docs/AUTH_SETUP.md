# Auth setup checklist

The app code now supports **Google one-tap**, **email 6-digit code (OTP)**, and
**password** sign-in, plus a stronger client-side password policy. A few things
must be turned on in the Supabase dashboard and Google Cloud for the new paths to
work in production. None of these are in code.

## 1. Password security (do this first — biggest win)

Note: in the dashboard sidebar, **Authentication → Policies** (the item with the
↗) opens the *database RLS policies*, NOT the password settings. The password
settings live in two other places:

- **Authentication → Sign In / Providers** → expand the **Email** provider → set
  **Minimum password length = 8** (matches the app's client check) and,
  optionally, Password Requirements. (Length + the breach check below beats
  arcane composition rules, so composition is optional.)
- **Authentication → Attack Protection** → enable **"Prevent use of leaked
  passwords"** (HaveIBeenPwned). This is the real protection; the in-app strength
  meter only guides the user, it does not check breaches.

The app already blocks common/repeated/sequential passwords client-side and shows
a strength meter, and will surface any server rejection (e.g. a breached
password) as an error.

## 2. Google sign-in

1. **Google Cloud Console** → create an OAuth 2.0 Client ID (type: Web
   application).
   - Authorized redirect URI: `https://<your-project-ref>.supabase.co/auth/v1/callback`
     (Supabase shows this exact value on the provider page — copy it from there).
2. **Supabase Dashboard → Authentication → Sign In / Providers → Google**: enable
   it, paste the Client ID and Client Secret, save.
3. **Supabase Dashboard → Authentication → URL Configuration**:
   - Site URL: `https://app.superadditive.co`
   - Redirect URLs: add `https://app.superadditive.co/auth/callback` (and any
     staging/localhost URLs you use, e.g. `http://localhost:3000/auth/callback`).

The app sends users to `/auth/callback`, which exchanges the code and creates a
profile row on first sign-in. No code changes needed.

## 3. Email 6-digit code (OTP)

The code flow calls `signInWithOtp` then `verifyOtp`. By default Supabase's email
shows a **magic link**, not a **code**, so you must expose the token in the
template:

- **Supabase Dashboard → Authentication → Emails → Templates → Magic Link**: make
  sure the body includes the code token, e.g.

  ```
  <p>Your sign-in code is: <strong>{{ .Token }}</strong></p>
  ```

  (You can keep the link too; the app uses the code.)
- If you use a custom SMTP sender (recommended for deliverability, especially to
  Gmail/Android users in India), configure it in the same **Authentication →
  Emails** section (SMTP settings). Supabase's built-in email has low rate limits
  and is not meant for production volume.

## 4. Confirm the redirect allow-list

Both Google and OTP rely on the same **Redirect URLs** list from step 2.3. If a
URL isn't on the list, Supabase blocks the redirect. Add every origin you serve
from.

---

Once 1–4 are done: password sign-in is stronger immediately, "Continue with
Google" works, and "Email me a 6-digit code" sends a code that logs the user in.
