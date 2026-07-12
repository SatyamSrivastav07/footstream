import { eventPresentation } from "./eventPresentation.js";

export const enqueuePresentation = (queue, input) => [
  ...queue,
  eventPresentation(input),
];

export const nextNotification = (queue) => ({
  active: queue[0] || null,
  rest: queue.slice(1),
});
