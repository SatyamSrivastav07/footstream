import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createNotificationForUsers,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  unreadCount,
} from '../src/services/notificationService.js';

const ids = {
  userA: '66a000000000000000000001',
  userB: '66a000000000000000000002',
  team: '66b000000000000000000001',
  fixture: '66c000000000000000000001',
  notification: '66d000000000000000000001',
};

const baseNotification = (overrides = {}) => ({
  _id: ids.notification,
  recipientUser: ids.userA,
  recipientTeam: ids.team,
  type: 'match_scheduled',
  title: 'New fixture scheduled',
  message: 'FC KIET scheduled a fixture.',
  entityType: 'match',
  entityId: ids.fixture,
  actionUrl: '/team/matches',
  dedupeKey: `fixture:${ids.fixture}:scheduled`,
  isRead: false,
  readAt: null,
  createdAt: new Date('2035-01-01T10:00:00Z'),
  ...overrides,
});

const createMemoryNotificationModel = (seed = []) => {
  const records = new Map(seed.map((notification) => [String(notification._id), { ...notification }]));
  let nextId = 1;

  const model = {
    records,
    updateOne: async (filter, update) => {
      const existing = [...records.values()].find((notification) => (
        String(notification.recipientUser) === String(filter.recipientUser)
        && notification.dedupeKey === filter.dedupeKey
      ));
      if (existing) return { matchedCount: 1, upsertedCount: 0 };
      const value = { _id: `66d0000000000000000000${String(nextId).padStart(2, '0')}`, ...update.$setOnInsert };
      nextId += 1;
      records.set(String(value._id), value);
      return { matchedCount: 0, upsertedCount: 1 };
    },
    countDocuments: async (filter) => [...records.values()].filter((notification) => (
      String(notification.recipientUser) === String(filter.recipientUser)
      && (filter.isRead === undefined || notification.isRead === filter.isRead)
    )).length,
    find: (filter) => {
      const matches = [...records.values()].filter((notification) => (
        String(notification.recipientUser) === String(filter.recipientUser)
        && (filter.isRead === undefined || notification.isRead === filter.isRead)
      ));
      const chain = {
        sort: () => chain,
        skip: () => chain,
        limit: () => chain,
        lean: async () => matches,
      };
      return chain;
    },
    findOne: async (filter) => {
      const value = [...records.values()].find((notification) => (
        String(notification._id) === String(filter._id)
        && String(notification.recipientUser) === String(filter.recipientUser)
      ));
      if (!value) return null;
      return {
        ...value,
        async save() {
          records.set(String(value._id), { ...this });
          return this;
        },
        toObject() {
          return { ...this };
        },
      };
    },
    updateMany: async (filter, update) => {
      let modifiedCount = 0;
      for (const [id, notification] of records.entries()) {
        if (String(notification.recipientUser) === String(filter.recipientUser) && notification.isRead === filter.isRead) {
          records.set(id, { ...notification, ...update.$set });
          modifiedCount += 1;
        }
      }
      return { modifiedCount };
    },
  };
  return model;
};

test('notification creation de-duplicates retry attempts per recipient', async () => {
  const notificationModel = createMemoryNotificationModel();
  const payload = {
    notificationModel,
    recipients: [ids.userA, ids.userA, ids.userB],
    recipientTeam: ids.team,
    type: 'match_scheduled',
    title: 'New fixture scheduled',
    message: 'FC KIET scheduled a fixture.',
    entityType: 'match',
    entityId: ids.fixture,
    actionUrl: '/team/matches',
    dedupeKey: `fixture:${ids.fixture}:scheduled`,
  };
  await createNotificationForUsers(payload);
  await createNotificationForUsers(payload);
  assert.equal(notificationModel.records.size, 2);
});

test('notification list and unread count are scoped to the authenticated user', async () => {
  const notificationModel = createMemoryNotificationModel([
    baseNotification(),
    baseNotification({ _id: '66d000000000000000000002', recipientUser: ids.userB }),
  ]);
  const result = await listNotifications({ notificationModel, userId: ids.userA });
  const count = await unreadCount({ notificationModel, userId: ids.userA });
  assert.equal(result.notifications.length, 1);
  assert.equal(count.count, 1);
  assert.equal('recipientUser' in result.notifications[0], false);
  assert.equal('dedupeKey' in result.notifications[0], false);
});

test('mark read and mark all read only affect own notifications', async () => {
  const notificationModel = createMemoryNotificationModel([
    baseNotification(),
    baseNotification({ _id: '66d000000000000000000002', recipientUser: ids.userB }),
  ]);
  const read = await markNotificationRead({
    notificationModel,
    userId: ids.userA,
    notificationId: ids.notification,
    now: new Date('2035-01-01T11:00:00Z'),
  });
  assert.equal(read.isRead, true);
  await assert.rejects(markNotificationRead({
    notificationModel,
    userId: ids.userA,
    notificationId: '66d000000000000000000002',
  }), (error) => error.code === 'NOTIFICATION_NOT_FOUND');
  const updated = await markAllNotificationsRead({ notificationModel, userId: ids.userB });
  assert.equal(updated.updated, 1);
});
