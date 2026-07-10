import mongoose from 'mongoose';
import { USER_ROLES } from '../models/User.js';
import AppError from '../utils/AppError.js';

export const requireTeamOwnership = (resolveTeamId = (req) => req.params.teamId) =>
  (req, _res, next) => {
    if (req.user?.role === USER_ROLES.SUPER_ADMIN) return next();

    const requestedTeamId = resolveTeamId(req);
    const assignedTeamId = req.user?.team?._id || req.user?.team;

    if (
      !requestedTeamId ||
      !assignedTeamId ||
      !mongoose.isValidObjectId(requestedTeamId) ||
      assignedTeamId.toString() !== requestedTeamId.toString()
    ) {
      return next(new AppError('You can only access your assigned team.', 403, 'TEAM_ACCESS_DENIED'));
    }

    return next();
  };

