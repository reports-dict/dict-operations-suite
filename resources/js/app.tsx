import '../css/app.css';

import { createInertiaApp, ResolvedComponent } from '@inertiajs/react';
import { createRoot } from 'react-dom/client';

const appName = import.meta.env.VITE_APP_NAME || 'DICT Operations Suite';

createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    resolve: (name) => {
        const pages = import.meta.glob<{ default: ResolvedComponent }>('./Pages/**/*.tsx', { eager: true });
        const page = pages[`./Pages/${name}.tsx`];

        if (!page) {
            throw new Error(`Page not found: ./Pages/${name}.tsx`);
        }

        return page.default;
    },
    setup({ el, App, props }) {
        if (!el) {
            throw new Error('Missing root element #app');
        }

        createRoot(el).render(<App {...props} />);
    },
});
