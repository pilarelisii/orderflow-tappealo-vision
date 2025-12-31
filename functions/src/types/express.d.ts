import "express";
import type { ResolvedVenue } from "./resolvedVenue";

declare global {
  namespace Express {
    interface Request {
      venue?: ResolvedVenue;
    }
  }
}

export {};