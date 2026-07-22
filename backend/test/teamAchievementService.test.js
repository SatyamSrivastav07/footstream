import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import test from 'node:test';
import {
  createAchievement,
  listPlayerTrophies,
  safeAchievement,
  safePlayerTrophy,
  syncPlayerTrophies,
} from '../src/services/teamAchievementService.js';

const teamId = '66a000000000000000000001';
const playerOne = '66b000000000000000000001';
const playerTwo = '66b000000000000000000002';
const achievementId = '66c000000000000000000001';

const achievement = {
  _id: achievementId,
  team: teamId,
  tournamentName: 'Inter College Cup',
  position: 'Winner',
  year: 2026,
  category: 'inter_college',
  trophyImage: {
    imageUrl: 'https://cdn.example.com/trophy.jpg',
    publicId: 'private-cloudinary-id',
  },
  trophyImages: [{ imageUrl: 'https://cdn.example.com/trophy-2.jpg', caption: 'Stage trophy' }],
  celebrationPhotos: [{ imageUrl: 'https://cdn.example.com/celebration.jpg', caption: 'Final whistle' }],
  description: 'Champions after a strong final.',
  winningSquad: {
    registeredPlayers: [
      { player: playerOne, name: 'Aman Keeper', position: 'GK', jerseyNumber: 1, photoUrl: 'https://cdn.example.com/player.jpg' },
      { player: playerTwo, name: 'Dev Defender', position: 'CB', jerseyNumber: 4, photoUrl: '' },
    ],
    manualPlayers: [{ name: 'Historical Guest', position: 'ST', jerseyNumber: 9 }],
  },
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

test('achievement serializer exposes trophy cabinet-safe public fields only', () => {
  const serialized = safeAchievement({
    ...achievement,
    team: { _id: teamId, name: 'FC KIET', slug: 'fc-kiet', logo: { imageUrl: 'https://cdn.example.com/logo.png', publicId: 'private-logo' } },
    createdBy: 'hidden-user',
  });

  assert.equal(serialized.teamName, 'FC KIET');
  assert.equal(serialized.trophyImages.length, 2);
  assert.equal(serialized.trophyImages[0].imageUrl, 'https://cdn.example.com/trophy.jpg');
  assert.equal(serialized.winningSquad.registeredPlayers[0].playerId, playerOne);
  assert.equal(serialized.createdBy, undefined);
  assert.equal(serialized.trophyImage.publicId, undefined);
});

test('syncPlayerTrophies upserts current registered winners and deactivates removed trophies', async () => {
  const updates = [];
  const teamModel = {
    findById: () => ({
      select: () => ({
        lean: async () => ({ _id: teamId, name: 'FC KIET', slug: 'fc-kiet', logo: { imageUrl: 'https://cdn.example.com/logo.png' } }),
      }),
    }),
  };
  const trophyModel = {
    updateMany: async (filter, update) => {
      updates.push({ kind: 'many', filter, update });
    },
    findOneAndUpdate: async (filter, update, options) => {
      updates.push({ kind: 'one', filter, update, options });
      return update.$set;
    },
  };

  const result = await syncPlayerTrophies({ trophyModel, teamModel, achievement });

  assert.equal(result.synced, 2);
  assert.equal(updates[0].kind, 'many');
  assert.deepEqual(updates[0].update, { $set: { isActive: false } });
  assert.equal(updates.filter((item) => item.kind === 'one').length, 2);
  assert.equal(updates[1].update.$set.teamName, 'FC KIET');
  assert.equal(updates[1].update.$set.trophyImages.length, 2);
});

test('player trophy serializer hides internal ids and builds public achievement route', async () => {
  const trophyModel = {
    find: () => ({
      sort: () => ({
        lean: async () => [{
          _id: '66d000000000000000000001',
          achievement: achievementId,
          player: playerOne,
          tournamentName: 'Inter College Cup',
          position: 'Winner',
          year: 2026,
          category: 'inter_college',
          teamName: 'FC KIET',
          teamSlug: 'fc-kiet',
          teamLogo: 'https://cdn.example.com/logo.png',
          trophyImages: [{ imageUrl: 'https://cdn.example.com/trophy.jpg', publicId: 'hidden' }],
          celebrationPhotos: [],
          description: 'Champions.',
        }],
      }),
    }),
  };

  const [trophy] = await listPlayerTrophies({ trophyModel, playerId: playerOne });
  const serialized = safePlayerTrophy({ ...trophy, secret: 'hidden' });

  assert.equal(trophy.achievementUrl, `/teams/fc-kiet/achievements/${achievementId}`);
  assert.equal(serialized.trophyImages[0].publicId, undefined);
  assert.equal(serialized.secret, undefined);
});

test('achievement create uploads extra trophy and celebration images through Cloudinary metadata', async () => {
  const uploads = [];
  const storage = {
    upload: async ({ folder, publicId }) => {
      uploads.push({ folder, publicId });
      return {
        secure_url: `https://cdn.example.com/${uploads.length}.jpg`,
        public_id: publicId,
        width: 800,
        height: 450,
        format: 'jpg',
        bytes: 1234,
      };
    },
    destroy: async () => ({ result: 'ok' }),
  };
  const playerModel = {
    find: () => ({
      select: () => ({
        lean: async () => [],
      }),
    }),
  };
  const teamModel = {
    findById: () => ({
      select: () => ({
        lean: async () => ({ _id: teamId, name: 'FC KIET', slug: 'fc-kiet', logo: '' }),
      }),
    }),
  };
  const trophyModel = {
    updateMany: async () => {},
    findOneAndUpdate: async () => {},
  };
  let createdPayload;
  const achievementModel = {
    create: async (payload) => {
      createdPayload = payload;
      return {
        _id: achievementId,
        ...payload,
        toJSON() { return { _id: achievementId, ...payload }; },
      };
    },
  };

  await createAchievement({
    achievementModel,
    storage,
    teamId,
    userId: '66f000000000000000000001',
    input: { tournamentName: 'Cup', position: 'Winner', year: 2026 },
    file: { buffer: Buffer.from([0xff, 0xd8, 0xff]), size: 3 },
    files: {
      trophyImages: [{ buffer: Buffer.from([0xff, 0xd8, 0xff]), size: 3 }],
      celebrationPhotos: [{ buffer: Buffer.from([0xff, 0xd8, 0xff]), size: 3 }],
    },
    playerModel,
    trophyModel,
    teamModel,
  });

  assert.equal(uploads.length, 3);
  assert.equal(createdPayload.trophyImage.imageUrl, 'https://cdn.example.com/1.jpg');
  assert.equal(createdPayload.trophyImages[0].imageUrl, 'https://cdn.example.com/2.jpg');
  assert.equal(createdPayload.celebrationPhotos[0].imageUrl, 'https://cdn.example.com/3.jpg');
});
