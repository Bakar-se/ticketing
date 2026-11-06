import {
  INestApplication,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './app.module.js';
import { SessionReader } from './auth/auth.guard.js';
import { PrismaService } from './prisma/prisma.service.js';
import {
  NotificationsService,
  type NotificationJob,
} from './queue/notifications.service.js';

process.env.DATABASE_URL =
  process.env.TEAM_TEST_DATABASE_URL ??
  'postgresql://postgres:postgres@127.0.0.1:5432/tickets_test';
process.env.AUTH_URL = 'http://auth.invalid';
process.env.REDIS_URL = 'redis://127.0.0.1:6379';
process.env.WEB_ORIGIN = 'http://localhost:3000';

const alex = { id: 'alex', name: 'Alex Doe', email: 'alex@company.com' };
const sam = { id: 'sam', name: 'Sam Kim', email: 'sam@company.com' };
const jordan = {
  id: 'jordan',
  name: 'Jordan Lee',
  email: 'jordan@company.com',
};

type User = { id: string; name: string; email: string };

const sessions = {
  async read(request: { headers: Record<string, string | undefined> }) {
    const header = request.headers['x-test-user'];
    if (!header) return null;
    return { user: JSON.parse(header) as User };
  },
};

const mail = {
  jobs: [] as NotificationJob[],
  fail: false,
  async enqueue(job: NotificationJob) {
    if (mail.fail) return false;
    mail.jobs.push(job);
    return true;
  },
  async onModuleDestroy() {},
};

describe('project team', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(SessionReader)
      .useValue(sessions)
      .overrideProvider(NotificationsService)
      .useValue(mail)
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    mail.jobs = [];
    mail.fail = false;
    await prisma.project.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  function http(user: User) {
    const server = app.getHttpServer();
    const header = JSON.stringify(user);
    return {
      get: (url: string) =>
        request(server).get(url).set('x-test-user', header),
      post: (url: string) =>
        request(server).post(url).set('x-test-user', header),
      patch: (url: string) =>
        request(server).patch(url).set('x-test-user', header),
      delete: (url: string) =>
        request(server).delete(url).set('x-test-user', header),
    };
  }

  async function createProject(
    user: User,
    key = 'WEB',
    name = 'Web app',
  ) {
    const res = await http(user)
      .post('/projects')
      .send({ name, key, description: 'Ship the app' });
    expect(res.status).toBe(201);
    return res.body as { id: string; key: string; name: string };
  }

  it('allows the same 2000-character description when creating as when editing', async () => {
    const fits = await http(alex)
      .post('/projects')
      .send({ name: 'Web app', key: 'WEB', description: 'a'.repeat(2000) });
    expect(fits.status).toBe(201);
    expect(fits.body.description).toHaveLength(2000);

    const tooLong = await http(alex)
      .post('/projects')
      .send({ name: 'Mobile', key: 'MOB', description: 'a'.repeat(2001) });
    expect(tooLong.status).toBe(400);
  });

  it('makes the creator the Owner and hides the project from everyone else', async () => {
    const project = await createProject(alex);
    const team = await http(alex).get(`/projects/${project.id}/team`);
    expect(team.status).toBe(200);
    expect(team.body.members).toEqual([
      expect.objectContaining({
        userId: 'alex',
        name: 'Alex Doe',
        email: 'alex@company.com',
        role: 'OWNER',
      }),
    ]);
    expect(team.body.invites).toEqual([]);

    const hidden = await http(sam).get(`/projects/${project.id}`);
    expect(hidden.status).toBe(404);
    expect(hidden.body.message).toBe('Project not found');
    const list = await http(sam).get('/projects');
    expect(list.status).toBe(200);
    expect(list.body).toEqual([]);
  });

  it('lets a member open and edit a ticket they did not report', async () => {
    const project = await createProject(alex);
    const invited = await http(alex)
      .post(`/projects/${project.id}/invites`)
      .send({ email: 'sam@company.com' });
    expect(invited.status).toBe(201);
    const accepted = await http(sam).get('/projects');
    expect(accepted.body).toEqual([
      expect.objectContaining({
        id: project.id,
        role: 'MEMBER',
        counts: { backlog: 0, todo: 0, inProgress: 0, done: 0 },
      }),
    ]);

    const created = await http(alex)
      .post(`/projects/${project.id}/tickets`)
      .send({ title: 'First ticket' });
    expect(created.status).toBe(201);
    const edited = await http(sam)
      .patch(`/tickets/${created.body.id}`)
      .send({ title: 'Shared ticket' });
    expect(edited.status).toBe(200);
    expect(edited.body.title).toBe('Shared ticket');
    expect(edited.body.createdById).toBe('alex');

    const listed = await http(sam).get(`/projects/${project.id}/tickets`);
    expect(listed.body.total).toBe(1);
    const outsider = await http(jordan).get(`/tickets/${created.body.id}`);
    expect(outsider.status).toBe(404);
    expect(outsider.body.message).toBe('Ticket not found');
    const hiddenList = await http(jordan).get(
      `/projects/${project.id}/tickets`,
    );
    expect(hiddenList.status).toBe(404);
  });

  it('counts every ticket on a member projects list', async () => {
    const project = await createProject(alex);
    await http(alex)
      .post(`/projects/${project.id}/invites`)
      .send({ email: sam.email });
    await http(sam).get('/projects');
    await http(alex)
      .post(`/projects/${project.id}/tickets`)
      .send({ title: 'One' });
    await http(sam)
      .post(`/projects/${project.id}/tickets`)
      .send({ title: 'Two' });
    const list = await http(sam).get('/projects');
    expect(list.body[0].counts).toEqual({
      backlog: 2,
      todo: 0,
      inProgress: 0,
      done: 0,
    });
  });

  it('refuses a second pending invite and tells the Owner to resend', async () => {
    const project = await createProject(alex);
    const first = await http(alex)
      .post(`/projects/${project.id}/invites`)
      .send({ email: 'Jordan@Company.com' });
    expect(first.status).toBe(201);
    expect(first.body.email).toBe('jordan@company.com');
    expect(new Date(first.body.expiresAt).getTime() - new Date(first.body.sentAt).getTime()).toBe(
      7 * 24 * 60 * 60 * 1000,
    );
    expect(mail.jobs).toEqual([
      expect.objectContaining({
        type: 'project.invite',
        recipientEmail: 'jordan@company.com',
        projectName: 'Web app',
        boardUrl: `http://localhost:3000/projects/${project.id}`,
      }),
    ]);

    const again = await http(alex)
      .post(`/projects/${project.id}/invites`)
      .send({ email: 'jordan@company.com' });
    expect(again.status).toBe(409);
    expect(again.body.message).toBe(
      'An invite is already waiting for that email. Resend it instead.',
    );

    const member = await http(alex)
      .post(`/projects/${project.id}/invites`)
      .send({ email: 'alex@company.com' });
    expect(member.status).toBe(409);
    expect(member.body.message).toBe(
      'That person is already a member of this project.',
    );

    const bad = await http(alex)
      .post(`/projects/${project.id}/invites`)
      .send({ email: 'not-an-email' });
    expect(bad.status).toBe(400);
    expect(JSON.stringify(bad.body)).toContain('Enter a valid email');
  });

  it('keeps an invite when the email cannot be queued', async () => {
    const project = await createProject(alex);
    mail.fail = true;
    const invited = await http(alex)
      .post(`/projects/${project.id}/invites`)
      .send({ email: 'jordan@company.com' });
    expect(invited.status).toBe(201);
    expect(invited.body.sendFailed).toBe(true);
    const team = await http(alex).get(`/projects/${project.id}/team`);
    expect(team.body.invites).toEqual([
      expect.objectContaining({
        email: 'jordan@company.com',
        sendFailed: true,
      }),
    ]);
  });

  it('does not accept an expired invite until it is resent', async () => {
    const project = await createProject(alex);
    const invited = await http(alex)
      .post(`/projects/${project.id}/invites`)
      .send({ email: jordan.email });
    await prisma.projectInvite.update({
      where: { id: invited.body.id },
      data: { expiresAt: new Date('2020-01-01T00:00:00.000Z') },
    });
    const missed = await http(jordan).get('/projects');
    expect(missed.body).toEqual([]);
    const still = await http(alex).get(`/projects/${project.id}/team`);
    expect(still.body.invites).toHaveLength(1);

    const resent = await http(alex).post(
      `/projects/${project.id}/invites/${invited.body.id}/resend`,
    );
    expect(resent.status).toBe(201);
    expect(resent.body.sendFailed).toBe(false);
    const joined = await http({ ...jordan, email: 'Jordan@Company.com' }).get(
      '/projects',
    );
    expect(joined.body.map((item: { id: string }) => item.id)).toEqual([
      project.id,
    ]);
  });

  it('cancels a pending invite', async () => {
    const project = await createProject(alex);
    const invited = await http(alex)
      .post(`/projects/${project.id}/invites`)
      .send({ email: jordan.email });
    const cancelled = await http(alex).delete(
      `/projects/${project.id}/invites/${invited.body.id}`,
    );
    expect(cancelled.status).toBe(200);
    const team = await http(alex).get(`/projects/${project.id}/team`);
    expect(team.body.invites).toEqual([]);
    const joined = await http(jordan).get('/projects');
    expect(joined.body).toEqual([]);
  });

  it('refuses team changes from a Member', async () => {
    const project = await createProject(alex);
    await http(alex)
      .post(`/projects/${project.id}/invites`)
      .send({ email: sam.email });
    await http(sam).get('/projects');
    const invite = await http(sam)
      .post(`/projects/${project.id}/invites`)
      .send({ email: jordan.email });
    expect(invite.status).toBe(403);
    expect(invite.body.message).toBe('Only an Owner can do that');
  });

  it('keeps the last Owner and lets another Owner take the role', async () => {
    const project = await createProject(alex);
    const demote = await http(alex)
      .patch(`/projects/${project.id}/members/alex`)
      .send({ role: 'MEMBER' });
    expect(demote.status).toBe(409);
    expect(demote.body.message).toBe(
      'This project needs an Owner. Hand the role to another member first.',
    );
    const leaving = await http(alex).post(`/projects/${project.id}/leave`);
    expect(leaving.status).toBe(409);

    await http(alex)
      .post(`/projects/${project.id}/invites`)
      .send({ email: sam.email });
    await http(sam).get('/projects');
    const promoted = await http(alex)
      .patch(`/projects/${project.id}/members/sam`)
      .send({ role: 'OWNER' });
    expect(promoted.status).toBe(200);
    expect(promoted.body.role).toBe('OWNER');

    const steppedDown = await http(alex)
      .patch(`/projects/${project.id}/members/alex`)
      .send({ role: 'MEMBER' });
    expect(steppedDown.status).toBe(200);
    const team = await http(sam).get(`/projects/${project.id}/team`);
    expect(team.body.members).toEqual([
      expect.objectContaining({ userId: 'alex', role: 'MEMBER' }),
      expect.objectContaining({ userId: 'sam', role: 'OWNER' }),
    ]);
  });

  it('keeps one Owner when two demotions overlap', async () => {
    const project = await createProject(alex);
    await http(alex)
      .post(`/projects/${project.id}/invites`)
      .send({ email: sam.email });
    await http(sam).get('/projects');
    await http(alex)
      .patch(`/projects/${project.id}/members/sam`)
      .send({ role: 'OWNER' });

    const [first, second] = await Promise.all([
      http(alex).patch(`/projects/${project.id}/members/sam`).send({ role: 'MEMBER' }),
      http(sam).patch(`/projects/${project.id}/members/alex`).send({ role: 'MEMBER' }),
    ]);
    const statuses = [first.status, second.status].sort((a, b) => a - b);
    expect(statuses).toEqual([200, 409]);
    const owners = await prisma.projectMember.count({
      where: { projectId: project.id, role: 'OWNER' },
    });
    expect(owners).toBe(1);
  });

  it('unassigns a removed member and keeps their tickets and comments', async () => {
    const project = await createProject(alex);
    await http(alex)
      .post(`/projects/${project.id}/invites`)
      .send({ email: sam.email });
    await http(sam).get('/projects');
    const ticket = await http(sam)
      .post(`/projects/${project.id}/tickets`)
      .send({ title: 'Sam wrote this' });
    await http(alex)
      .patch(`/tickets/${ticket.body.id}`)
      .send({ assigneeId: 'sam' });
    const comment = await http(sam)
      .post(`/tickets/${ticket.body.id}/comments`)
      .send({ body: 'Still here' });
    expect(comment.status).toBe(201);

    const removed = await http(alex).delete(
      `/projects/${project.id}/members/sam`,
    );
    expect(removed.status).toBe(200);
    const after = await http(alex).get(`/tickets/${ticket.body.id}`);
    expect(after.body.assigneeId).toBeNull();
    expect(after.body.createdById).toBe('sam');
    const comments = await http(alex).get(
      `/tickets/${ticket.body.id}/comments`,
    );
    expect(comments.body).toEqual([
      expect.objectContaining({ body: 'Still here', createdById: 'sam' }),
    ]);
    const gone = await http(sam).get(`/projects/${project.id}`);
    expect(gone.status).toBe(404);
  });

  it('lets the reporter or an Owner delete a ticket, and nobody else', async () => {
    const project = await createProject(alex);
    await http(alex)
      .post(`/projects/${project.id}/invites`)
      .send({ email: sam.email });
    await http(sam).get('/projects');
    const ticket = await http(sam)
      .post(`/projects/${project.id}/tickets`)
      .send({ title: 'Mine' });
    const refused = await http(alex).delete(`/tickets/${ticket.body.id}`);
    // Alex is the Owner, so this one is allowed. Create another member who is not.
    expect(refused.status).toBe(200);

    const second = await http(alex)
      .post(`/projects/${project.id}/tickets`)
      .send({ title: 'Alex wrote this' });
    const member = await http(sam).delete(`/tickets/${second.body.id}`);
    expect(member.status).toBe(403);
    expect(member.body.message).toBe(
      'Only the reporter or an Owner can delete this ticket.',
    );
    const owner = await http(alex).delete(`/tickets/${second.body.id}`);
    expect(owner.status).toBe(200);
  });

  it('leaves a non-member assignee in place until the assignee changes', async () => {
    const project = await createProject(alex);
    const ticket = await http(alex)
      .post(`/projects/${project.id}/tickets`)
      .send({ title: 'Old assignment' });
    await prisma.ticket.update({
      where: { id: ticket.body.id },
      data: { assigneeId: 'former' },
    });
    const saved = await http(alex)
      .patch(`/tickets/${ticket.body.id}`)
      .send({ title: 'Renamed' });
    expect(saved.status).toBe(200);
    expect(saved.body.assigneeId).toBe('former');
    const rejected = await http(alex)
      .patch(`/tickets/${ticket.body.id}`)
      .send({ assigneeId: 'stranger' });
    expect(rejected.status).toBe(400);
    expect(rejected.body.message).toBe(
      'Assignee is not a member of this project',
    );
  });

  it('lets only an Owner change project settings, archive, and delete', async () => {
    const project = await createProject(alex);
    await http(alex)
      .post(`/projects/${project.id}/invites`)
      .send({ email: sam.email });
    await http(sam).get('/projects');

    const refused = await http(sam)
      .patch(`/projects/${project.id}`)
      .send({ name: 'Hijack' });
    expect(refused.status).toBe(403);

    const renamed = await http(alex)
      .patch(`/projects/${project.id}`)
      .send({ name: 'Web app renamed', description: null, targetDate: '2026-12-01' });
    expect(renamed.status).toBe(200);
    expect(renamed.body.name).toBe('Web app renamed');

    const archived = await http(alex)
      .patch(`/projects/${project.id}`)
      .send({ archived: true });
    expect(archived.status).toBe(200);
    const active = await http(sam).get('/projects');
    expect(active.body).toEqual([]);
    const stored = await http(sam).get('/projects?archived=true');
    expect(stored.body.map((item: { id: string }) => item.id)).toEqual([
      project.id,
    ]);
    const opened = await http(sam).get(`/projects/${project.id}`);
    expect(opened.status).toBe(200);

    const blocked = await http(sam).delete(`/projects/${project.id}`);
    expect(blocked.status).toBe(403);
    const removed = await http(alex).delete(`/projects/${project.id}`);
    expect(removed.status).toBe(200);
    const missing = await http(alex).get(`/projects/${project.id}`);
    expect(missing.status).toBe(404);
  });

  it('lets a member comment on any ticket and only the author delete that comment', async () => {
    const project = await createProject(alex);
    await http(alex)
      .post(`/projects/${project.id}/invites`)
      .send({ email: sam.email });
    await http(sam).get('/projects');
    const ticket = await http(alex)
      .post(`/projects/${project.id}/tickets`)
      .send({ title: 'Discuss' });
    const comment = await http(sam)
      .post(`/tickets/${ticket.body.id}/comments`)
      .send({ body: 'From Sam' });
    expect(comment.status).toBe(201);
    const denied = await http(alex).delete(`/comments/${comment.body.id}`);
    expect(denied.status).toBe(404);
    const removed = await http(sam).delete(`/comments/${comment.body.id}`);
    expect(removed.status).toBe(200);
  });

  it('reading the team does not add the caller as a member', async () => {
    const project = await createProject(alex);
    await http(alex).get(`/projects/${project.id}/members`);
    const team = await http(alex).get(`/projects/${project.id}/team`);
    expect(team.body.members).toHaveLength(1);
  });

  it('shows a member under their new name and email after they change their profile', async () => {
    const web = await createProject(alex);
    const mobile = await createProject(alex, 'MOB', 'Mobile');
    const renamed = { ...alex, name: 'Alexandra Doe', email: 'alexandra@company.com' };

    // The next request with the updated session refreshes every copy
    const list = await http(renamed).get('/projects');
    expect(list.status).toBe(200);

    for (const project of [web, mobile]) {
      const team = await http(renamed).get(`/projects/${project.id}/team`);
      expect(team.body.members).toEqual([
        expect.objectContaining({
          userId: 'alex',
          name: 'Alexandra Doe',
          email: 'alexandra@company.com',
        }),
      ]);
    }
  });

  it('makes a pre-team creator the Owner when they next sign in', async () => {
    const project = await prisma.project.create({
      data: { key: 'OLD', name: 'Legacy', createdById: alex.id },
    });
    const list = await http(alex).get('/projects');
    expect(list.status).toBe(200);
    expect(list.body).toEqual([
      expect.objectContaining({ id: project.id, role: 'OWNER', name: 'Legacy' }),
    ]);
    const team = await http(alex).get(`/projects/${project.id}/team`);
    expect(team.body.members).toEqual([
      expect.objectContaining({
        userId: 'alex',
        name: 'Alex Doe',
        email: 'alex@company.com',
        role: 'OWNER',
      }),
    ]);
  });
});
