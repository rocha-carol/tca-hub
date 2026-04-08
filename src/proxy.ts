import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Proxy (Next.js 16): proteção de rotas para autenticação.
 *
 * Regras MVP:
 * - /dashboard*, /groups*, /advisors* e /profile/setup* exigem usuário autenticado
 * - /auth/login e /auth/signup redirecionam usuário autenticado
 * - usuário autenticado com profile incompleto é redirecionado para /profile/setup
 */
export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));

          supabaseResponse = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isAuthPage = pathname === "/auth/login" || pathname === "/auth/signup";
  const isProfileSetupPage = pathname.startsWith("/profile/setup");
  const isProtectedPage =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/groups") ||
    pathname.startsWith("/advisors") ||
    pathname.startsWith("/profile/setup");

  let profileIsComplete = false;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", user.id)
      .maybeSingle();

    profileIsComplete = typeof profile?.name === "string" && profile.name.trim().length >= 3;
  }

  // Não autenticado tentando acessar rota protegida
  if (!user && isProtectedPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  // Autenticado com profile incompleto deve concluir setup antes de acessar áreas do app
  if (user && !profileIsComplete && !isProfileSetupPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/profile/setup";
    return NextResponse.redirect(url);
  }

  // Autenticado com profile já completo não precisa ficar no setup
  if (user && profileIsComplete && isProfileSetupPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Autenticado tentando acessar tela de login/cadastro
  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = profileIsComplete ? "/dashboard" : "/profile/setup";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/auth/login",
    "/auth/signup",
    "/profile/setup",
    "/profile/setup/:path*",
    "/dashboard/:path*",
    "/groups/:path*",
    "/advisors/:path*",
  ],
};
