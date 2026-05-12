import { creatorBioRepository } from "../repositories/creator-bio-repository.js";
import { syncCreatorSocialContent } from "../services/social-content/social-content-sync-service.js";

export const creatorBioController = {
  async show(req, res) {
    const identifier = String(req.params.identifier || "").trim();

    if (!identifier) {
      return res.status(400).json({
        error: "Creator identifier is required."
      });
    }

    try {
      const page = await creatorBioRepository.findPublicByIdentifier(identifier);
      if (!page) {
        return res.status(404).json({
          error: "Creator bio page not found."
        });
      }

      return res.status(200).json(page);
    } catch (error) {
      return res.status(500).json({
        error: error.message || "Failed to load creator bio page."
      });
    }
  },

  async sync(req, res) {
    const creatorId = String(req.body?.creator_id || "").trim();

    if (!creatorId) {
      return res.status(400).json({
        error: "creator_id is required."
      });
    }

    try {
      const results = await syncCreatorSocialContent({ creatorId });
      return res.status(200).json({
        creator_id: creatorId,
        results
      });
    } catch (error) {
      return res.status(500).json({
        error: error.message || "Failed to sync creator social content."
      });
    }
  }
};
