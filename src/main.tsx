import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { ConvexReactClient } from 'convex/react';
import { ConvexAuthProvider } from '@convex-dev/auth/react';
import { Analytics } from '@vercel/analytics/react';
import './styles.css';
import { AppRoutes } from './ui/AppRoutes';

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConvexAuthProvider client={convex}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </ConvexAuthProvider>
    <Analytics />
  </StrictMode>,
);
