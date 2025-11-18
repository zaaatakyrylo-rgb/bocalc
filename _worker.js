// Simple worker to serve Next.js static files
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // Redirect root to /ru/login
    if (url.pathname === '/') {
      return Response.redirect(new URL('/ru/login', request.url), 302);
    }
    
    // Serve static files from .next
    return env.ASSETS.fetch(request);
  },
};

