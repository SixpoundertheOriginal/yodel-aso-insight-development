import express from 'express';
const app = express();
app.use(express.json());
let orgs = [
  {
    id: '1',
    name: 'Org One',
    slug: 'org-one',
    domain: 'org1.com',
    subscription_tier: 'starter',
    user_count: 5,
    active_users_30d: 3,
    last_activity: new Date().toISOString(),
    created_at: new Date().toISOString()
  }
];
app.get('/api/admin/organizations', (req, res) => {
  res.json(orgs);
});
app.post('/api/admin/organizations', (req, res) => {
  const newOrg = {
    id: String(orgs.length + 1),
    user_count: 0,
    active_users_30d: 0,
    last_activity: new Date().toISOString(),
    created_at: new Date().toISOString(),
    ...req.body
  };
  orgs.push(newOrg);
  res.status(201).json({ organization: newOrg });
});
app.put('/api/admin/organizations/:id', (req, res) => {
  const org = orgs.find(o => o.id === req.params.id);
  if (!org) return res.status(404).json({ error: 'Not found' });
  Object.assign(org, req.body);
  res.json(org);
});
app.delete('/api/admin/organizations/:id', (req, res) => {
  orgs = orgs.filter(o => o.id !== req.params.id);
  res.json({ message: 'Organization deleted' });
});
app.listen(3002, () => console.log('Mock server listening on port 3002'));
