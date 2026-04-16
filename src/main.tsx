import './style.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { TooltipProvider } from './components/ui/tooltip';

const root = document.getElementById('app');
if (!root) throw new Error('No #app element found');

createRoot(root).render(
    <StrictMode>
        <TooltipProvider>
            <App />
        </TooltipProvider>
    </StrictMode>,
);
