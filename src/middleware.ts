import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  
  // Protéger uniquement les routes qui commencent par /admin
  if (url.pathname.startsWith('/admin')) {
    const basicAuth = req.headers.get('authorization');
    
    if (basicAuth) {
      const authValue = basicAuth.split(' ')[1];
      const [user, pwd] = atob(authValue).split(':');
      
      // Identifiants d'accès (vous pourrez les changer plus tard)
      if (user === 'mangani' && pwd === 'corse2026') {
        return NextResponse.next(); // Accès autorisé
      }
    }
    
    // Si pas connecté ou mauvais mot de passe, afficher la fenêtre de connexion du navigateur
    return new NextResponse('Accès refusé', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Zone Administrateur Sécurisée"'
      }
    });
  }
  
  return NextResponse.next();
}

// On applique ce middleware uniquement sur /admin
export const config = {
  matcher: ['/admin/:path*'],
};
