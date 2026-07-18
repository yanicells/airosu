import { defineApp } from 'convex/server';
import migrations from '@convex-dev/migrations/convex.config';
import aggregate from '@convex-dev/aggregate/convex.config';

const app = defineApp();
app.use(migrations);
app.use(aggregate, { name: 'globalBoard' });
app.use(aggregate, { name: 'countryBoard' });
export default app;
