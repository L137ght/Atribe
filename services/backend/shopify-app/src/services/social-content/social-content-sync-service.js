import { creatorBioRepository } from "../../repositories/creator-bio-repository.js";
import { fetchLatestSocialContent } from "./index.js";

export async function syncCreatorSocialContent({ creatorId, limit = 6 }) {
  const accounts = await creatorBioRepository.findSyncableSocialAccountsByCreatorId(creatorId);
  const results = [];

  for (const { account, credentials } of accounts) {
    const result = await fetchLatestSocialContent({
      account,
      credentials,
      limit
    });

    if (result.status === "synced") {
      await creatorBioRepository.upsertContentItems({
        socialAccountId: account.id,
        platform: account.platform,
        items: result.items
      });
      await creatorBioRepository.markSocialAccountSynced({
        socialAccountId: account.id,
        status: "connected"
      });
    }

    results.push({
      socialAccountId: account.id,
      platform: account.platform,
      status: result.status,
      itemCount: result.items.length
    });
  }

  return results;
}
