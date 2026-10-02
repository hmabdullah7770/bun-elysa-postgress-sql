import { Elysia } from "elysia";

let requestCount = 0;
const activeRequests = new Set<Request>();

const finishRequest = (request: Request) => {
  activeRequests.delete(request);
};

export const clusterTracking = new Elysia({ name: "cluster-tracking" })
  .onRequest(({ request }) => {
    requestCount += 1;
    activeRequests.add(request);
  })
  .onAfterHandle(({ request }) => {
    finishRequest(request);
  })
  .onError(({ request }) => {
    finishRequest(request);
  });

export const getClusterStats = () => ({
  requestCount,
  activeRequests: activeRequests.size,
});