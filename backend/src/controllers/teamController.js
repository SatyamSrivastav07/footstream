export const getAssignedTeam = (req, res) => {
  res.json({ success: true, data: { team: req.user.team } });
};

