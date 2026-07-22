import crypto from 'node:crypto';
import path from 'node:path';
import env from '../config/env.js';
import { cloudinaryClient } from '../config/cloudinary.js';
import Team from '../models/Team.js';
import TeamGalleryPost from '../models/TeamGalleryPost.js';
import AppError from '../utils/AppError.js';
import { metadataFromUpload } from './imageAssetService.js';
import { logTeamActivity } from './teamActivityService.js';

const idString = (value) => String(value?._id || value || '');
const safeName = (name) => path.basename(name || 'image').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 255);

export const safeGalleryPost = (post) => ({
  id: idString(post._id || post.id),
  team: idString(post.team),
  caption: post.caption || '',
  category: post.category,
  images: (post.images || []).map((image) => ({
    imageUrl: image.imageUrl,
    width: image.width || 0,
    height: image.height || 0,
    format: image.format || '',
    bytes: image.bytes || 0,
    originalName: image.originalName || '',
  })),
  createdAt: post.createdAt,
  updatedAt: post.updatedAt,
});

const assertTeam = async ({ teamModel, teamId, requirePublished = false }) => {
  const filter = { _id: teamId, isArchived: false };
  if (requirePublished) filter.isPublished = true;
  const team = await teamModel.findOne(filter).lean();
  if (!team) throw new AppError('Team not found.', 404, 'TEAM_NOT_FOUND');
  return team;
};

export const listTeamGalleryPosts = async ({ postModel = TeamGalleryPost, teamId, query = {} }) => {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 18, 1), 30);
  const filter = { team: teamId, isActive: true };
  if (query.category) filter.category = query.category;
  const [posts, total] = await Promise.all([
    postModel.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    postModel.countDocuments(filter),
  ]);
  return { posts: posts.map(safeGalleryPost), pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
};

export const createTeamGalleryPost = async ({
  teamModel = Team,
  postModel = TeamGalleryPost,
  storage = cloudinaryClient,
  teamId,
  userId,
  files = [],
  input = {},
}) => {
  if (!files.length) throw new AppError('Select at least one gallery image.', 400, 'GALLERY_IMAGES_REQUIRED');
  if (files.length > 6) throw new AppError('A gallery post can contain at most 6 images.', 400, 'GALLERY_IMAGE_LIMIT');
  await assertTeam({ teamModel, teamId });
  const uploaded = [];
  try {
    for (const file of files) {
      const result = await storage.upload({
        buffer: file.buffer,
        folder: `${env.cloudinary.folder}/teams/${teamId}/gallery`,
        publicId: `${Date.now()}-${crypto.randomUUID()}`,
      });
      uploaded.push({ ...metadataFromUpload(result, file.size), originalName: safeName(file.originalname) });
    }
    const post = await postModel.create({
      team: teamId,
      caption: input.caption || '',
      category: input.category || 'general_post',
      images: uploaded,
      postedBy: userId,
    });
    await logTeamActivity({
      teamId,
      actor: userId,
      type: 'gallery_post_added',
      title: 'Gallery post added',
      message: input.caption || 'A new team gallery post was added.',
      metadata: { postId: post._id },
    });
    return { post: safeGalleryPost(post) };
  } catch (error) {
    await Promise.allSettled(uploaded.map((image) => storage.destroy(image.publicId)));
    throw error;
  }
};

export const updateTeamGalleryPost = async ({ postModel = TeamGalleryPost, teamId, postId, input = {} }) => {
  const allowed = {};
  if (Object.hasOwn(input, 'caption')) allowed.caption = input.caption || '';
  if (Object.hasOwn(input, 'category')) allowed.category = input.category;
  const post = await postModel.findOneAndUpdate({ _id: postId, team: teamId, isActive: true }, { $set: allowed }, { new: true, runValidators: true }).lean();
  if (!post) throw new AppError('Gallery post not found.', 404, 'GALLERY_POST_NOT_FOUND');
  return { post: safeGalleryPost(post) };
};

export const deleteTeamGalleryPost = async ({ postModel = TeamGalleryPost, storage = cloudinaryClient, teamId, postId }) => {
  const post = await postModel.findOne({ _id: postId, team: teamId, isActive: true });
  if (!post) throw new AppError('Gallery post not found.', 404, 'GALLERY_POST_NOT_FOUND');
  await Promise.allSettled((post.images || []).map((image) => image.publicId && storage.destroy(image.publicId)));
  post.isActive = false;
  await post.save();
  return { message: 'Gallery post deleted.' };
};

export const listPublicGalleryPosts = async ({ teamModel = Team, postModel = TeamGalleryPost, teamSlug, query = {} }) => {
  const team = await teamModel.findOne({ slug: teamSlug, isPublished: true, isArchived: false }).select('_id name slug logo coverPhoto').lean();
  if (!team) throw new AppError('Team not found.', 404, 'TEAM_NOT_FOUND');
  return { team, ...(await listTeamGalleryPosts({ postModel, teamId: team._id, query })) };
};
