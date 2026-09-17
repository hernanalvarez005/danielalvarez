import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";

// Reachable without a session.
const PUBLIC_PATHS = ["/login"];

/**
 * Refreshes the Supabase auth session on every request and protects
 * private routes. Called from the root `proxy.ts`.
 *
 * This only ever decides AUTHENTICATION ("is there a user?"), never
 * AUTHORIZATION ("does this user have an active organization
 * membership?") -- that second question is answered once, in
 * `getAuthContext()` / `app/(app)/layout.tsx`, which routes a
 * no-membership user to `/sin-acceso`. Keeping that logic out of here on
 * purpose is what makes a loop structurally impossible: this function
 * only ever redirects to `/login` (when there's no user) or to
 * `/dashboard` (when there's a user on `/login`), and `/sin-acceso`
 * itself is a normal authenticated route from this function's point of
 * view -- it's simply not `/login`, so the "already logged in" redirect
 * never touches it, and its own page doesn't call getAuthContext() at
 * all, so it can never bounce back into `/login` on its own.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path));

  if (!user && !isPublicPath) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}
