const publicCacheSeconds = 60;
const imageCacheSeconds = 60 * 60 * 24 * 30;

export const publicCacheHeaders = (req, res, next) => {
  if (req.method === 'GET') {
    res.setHeader('Cache-Control', `public, max-age=${publicCacheSeconds}, stale-while-revalidate=300`);
  }
  next();
};

export const imageCacheHeaders = (req, res, next) => {
  if (req.method === 'GET' && /\.(?:avif|webp|png|jpe?g|gif|svg)$/i.test(req.path)) {
    res.setHeader('Cache-Control', `public, max-age=${imageCacheSeconds}, immutable`);
  }
  next();
};
